// 生成訓練計劃
function generateProgram() {
    try {
        // 清空前一次計算結果，確保每次生成都是全新的計算
        combinationDataStore = {};

        const squat1RM = parseFloat(document.getElementById('squat-1rm').value);
        const ohp1RM = parseFloat(document.getElementById('ohp-1rm').value);
        const deadlift1RM = parseFloat(document.getElementById('deadlift-1rm').value);
        const bench1RM = parseFloat(document.getElementById('bench-1rm').value);
        const trainingMaxMultiplier = parseFloat(document.getElementById('training-max').value);

        // 驗證輸入
        if (isNaN(squat1RM) || squat1RM <= 0 || isNaN(ohp1RM) || ohp1RM <= 0 ||
            isNaN(deadlift1RM) || deadlift1RM <= 0 || isNaN(bench1RM) || bench1RM <= 0) {
            alert('請輸入有效的 1RM 值（必須大於 0）');
            return;
        }

        // 確保設備配置已載入
        if (!equipment || !equipment.barbells || equipment.barbells.length === 0) {
            equipment = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT));
        }

        const tolerance = getTolerance();
        save1RMValues(squat1RM, ohp1RM, deadlift1RM, bench1RM, trainingMaxMultiplier, tolerance);

        // 計算 Training Max
        const trainingMaxes = {
            squat: Math.round(squat1RM * trainingMaxMultiplier * 10) / 10,
            ohp: Math.round(ohp1RM * trainingMaxMultiplier * 10) / 10,
            deadlift: Math.round(deadlift1RM * trainingMaxMultiplier * 10) / 10,
            bench: Math.round(bench1RM * trainingMaxMultiplier * 10) / 10
        };

        // 生成表格
        const tableHTML = generateTable(trainingMaxes);
        const programTableElement = document.getElementById('program-table');
        const programSectionElement = document.getElementById('program-section');

        if (!programTableElement || !programSectionElement) {
            alert('找不到顯示區域，請重新載入頁面');
            return;
        }

        programTableElement.innerHTML = tableHTML;
        programSectionElement.style.display = 'block';
        programSectionElement.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('產生訓練計劃時發生錯誤');
    }
}

// 生成單個動作的訓練內容
function generateExerciseContent(exerciseKey, trainingMax, weekProgram, week, day) {
    const dayId = `${week}-${day}`;

    // 過濾出適用於當前動作的槓鈴
    const applicableBarbells = equipment.barbells.filter(barbell => {
        const applicableExercises = barbell.applicableExercises || ['squat', 'ohp', 'deadlift', 'bench'];
        return applicableExercises.includes(exerciseKey);
    });

    // 為這一天的所有組計算所有槓鈴的組合
    // 確保每支槓鈴都會被計算
    const combinationsByBarbell = {};
    const allWeights = [];

    // 先計算所有組的重量
    weekProgram.forEach((set, setIndex) => {
        const weight = calculateTrainingWeight(set.percentage, trainingMax);
        allWeights.push({ setIndex, weight });
    });

    // 對每個重量，計算所有適用槓鈴的組合
    // 確保每隻槓鈴都會被計算，即使被排除也要記錄
    allWeights.forEach(({ setIndex, weight }) => {
        const combinations = calculatePlateCombinations(weight, applicableBarbells);

        // 初始化所有適用槓鈴的記錄（確保每隻槓鈴都有記錄）
        applicableBarbells.forEach(barbell => {
            if (!combinationsByBarbell[barbell.id]) {
                combinationsByBarbell[barbell.id] = {};
            }
            if (!combinationsByBarbell[barbell.id][setIndex]) {
                combinationsByBarbell[barbell.id][setIndex] = {
                    combinations: [],
                    excluded: false,
                    exclusionReason: null
                };
            }
        });

        // 按槓鈴分組存儲計算結果
        combinations.forEach(combo => {
            combinationsByBarbell[combo.barbellId][setIndex].combinations.push(combo);
        });

        // 記錄被排除的槓鈴（目標重量大於承重上限或小於槓鈴重量）
        applicableBarbells.forEach(barbell => {
            const maxWeight = barbell.maxWeight || 400;
            if (weight < barbell.weight || weight > maxWeight) {
                // 標記此槓鈴在此重量下被排除
                combinationsByBarbell[barbell.id][setIndex].excluded = true;
                combinationsByBarbell[barbell.id][setIndex].exclusionReason =
                    weight > maxWeight ? 'exceeds_max' : 'below_barbell_weight';
            }
        });
    });

    // 保存計算結果到 localStorage（用於切換槓鈴時快速讀取）
    try {
        const cacheKey = `combinations_${dayId}`;
        localStorage.setItem(cacheKey, JSON.stringify(combinationsByBarbell));
    } catch (e) {
        // 保存失敗，繼續執行
    }

    // 存儲到全局變量
    combinationDataStore[dayId] = combinationsByBarbell;

    // 獲取或設置默認選擇的槓鈴
    // 找出至少有一組有可用組合的槓鈴
    const availableBarbellIds = Object.keys(combinationsByBarbell).filter(barbellId => {
        const sets = combinationsByBarbell[barbellId];
        return Object.keys(sets).some(setIndex => {
            const setData = sets[setIndex];
            return setData && !setData.excluded && setData.combinations && setData.combinations.length > 0;
        });
    });

    // 如果沒有可用的槓鈴，使用所有已計算的槓鈴（包括被排除的）
    const allCalculatedBarbellIds = Object.keys(combinationsByBarbell);
    const barbellIdsToShow = availableBarbellIds.length > 0 ? availableBarbellIds : allCalculatedBarbellIds;

    const defaultBarbellId = selectedBarbellStore[dayId] ||
        (barbellIdsToShow.length > 0 ? barbellIdsToShow[0] : null);
    selectedBarbellStore[dayId] = defaultBarbellId;

    // 生成槓鈴選擇按鈕
    // 顯示所有已計算的槓鈴（包括被排除的），讓用戶可以看到所有選項
    // 只顯示適用於當前動作的槓鈴
    let barbellSelectorHTML = '';
    if (allCalculatedBarbellIds.length > 0) {
        barbellSelectorHTML = `<div class="barbell-selector" id="barbell-selector-${dayId}">`;
        // 按照適用槓鈴的順序顯示（保持與設備配置順序一致）
        applicableBarbells.forEach(barbell => {
            if (allCalculatedBarbellIds.includes(barbell.id)) {
                const hasAvailableCombos = availableBarbellIds.includes(barbell.id);
                if (allCalculatedBarbellIds.length > 1) {
                    const isSelected = barbell.id === defaultBarbellId ? 'selected' : '';
                    const disabledClass = !hasAvailableCombos ? 'disabled' : '';
                    barbellSelectorHTML += `<button class="barbell-btn ${isSelected} ${disabledClass}" data-barbell-id="${barbell.id}" onclick="selectBarbell('${dayId}', '${barbell.id}')">${barbell.name}</button>`;
                } else {
                    barbellSelectorHTML += `<span class="barbell-label">${barbell.name}</span>`;
                }
            }
        });
        barbellSelectorHTML += `</div>`;
    }

    let content = '';

    // 生成每一組的內容
    weekProgram.forEach((set, setIndex) => {
        const weight = calculateTrainingWeight(set.percentage, trainingMax);
        const reps = set.reps;
        const sets = set.sets || 1;

        const setId = `week-${week}-day-${day}-set-${setIndex}`;

        // 獲取當前選擇槓鈴的組合
        const currentSetData = defaultBarbellId && combinationsByBarbell[defaultBarbellId] && combinationsByBarbell[defaultBarbellId][setIndex]
            ? combinationsByBarbell[defaultBarbellId][setIndex]
            : { combinations: [], excluded: false, exclusionReason: null };

        // 檢查是否為排除標記
        const isExcluded = currentSetData.excluded === true;
        const currentCombinations = !isExcluded && currentSetData.combinations ? currentSetData.combinations : [];

        content += `<div class="set-info">`;

        // 只在第一組顯示槓鈴選擇器
        if (setIndex === 0) {
            content += barbellSelectorHTML;
        }

        content += `<div class="set-header">`;
        content += `<strong>組 ${setIndex + 1}:</strong> ${weight} kg × ${reps}${sets > 1 ? ` (${sets}組)` : ''}`;
        content += `</div>`;

        // 顯示當前槓鈴的組合選項
        if (isExcluded) {
            // 顯示被排除的原因
            const selectedBarbell = applicableBarbells.find(b => b.id === defaultBarbellId);
            if (selectedBarbell) {
                const maxWeight = selectedBarbell.maxWeight || 400;
                if (currentSetData.exclusionReason === 'exceeds_max') {
                    content += `<div class="no-combination">目標重量 ${weight} kg 超過此槓鈴承重上限 ${maxWeight} kg，無法達成</div>`;
                } else if (currentSetData.exclusionReason === 'below_barbell_weight') {
                    content += `<div class="no-combination">目標重量 ${weight} kg 小於槓鈴重量 ${selectedBarbell.weight} kg，無法達成</div>`;
                } else {
                    content += `<div class="no-combination">此槓鈴無法達成此重量</div>`;
                }
            } else {
                content += `<div class="no-combination">無法達成此重量</div>`;
            }
        } else if (currentCombinations.length > 0) {
            content += `<div class="combination-selector" id="${setId}">`;
            currentCombinations.forEach((combo, comboIndex) => {
                const isSelected = comboIndex === 0 ? 'selected' : '';
                const plateText = formatPlateCombination(combo.plates);
                let diffText = '';
                if (combo.difference > 0.1) {
                    const sign = combo.isOver ? '+' : '-';
                    diffText = ` (${sign}${combo.difference}kg)`;
                }

                content += `<div class="combo-option ${isSelected}" onclick="selectCombination('${setId}', '${defaultBarbellId}', ${comboIndex})">`;
                content += `<span class="combo-plates">每邊: ${plateText}</span>`;
                content += `<span class="combo-total">${combo.totalWeight}kg${diffText}</span>`;
                content += `</div>`;
            });
            content += `</div>`;
        } else {
            const selectedBarbell = applicableBarbells.find(b => b.id === defaultBarbellId);
            if (selectedBarbell && weight < selectedBarbell.weight) {
                content += `<div class="no-combination">目標重量 ${weight} kg 小於槓鈴重量 ${selectedBarbell.weight} kg，無法達成</div>`;
            } else if (defaultBarbellId) {
                content += `<div class="no-combination">此槓鈴無法達成此重量</div>`;
            } else {
                content += `<div class="no-combination">無法達成此重量</div>`;
            }
        }

        content += `</div>`;
    });

    return content;
}

// 生成表格
function generateTable(trainingMaxes) {
    let html = '<table class="program-table"><thead><tr>';
    html += '<th>週次</th>';
    html += '<th>Day 1<br>深蹲</th>';
    html += '<th>Day 2<br>肩推</th>';
    html += '<th>Day 3<br>硬舉</th>';
    html += '<th>Day 4<br>臥推</th>';
    html += '</tr></thead><tbody>';

    for (let week = 1; week <= 4; week++) {
        const weekProgram = WEEK_PROGRAMS[week];

        html += '<tr>';
        html += `<td class="week-header">${week}</td>`;
        html += `<td>${generateExerciseContent('squat', trainingMaxes.squat, weekProgram, week, 1)}</td>`;
        html += `<td>${generateExerciseContent('ohp', trainingMaxes.ohp, weekProgram, week, 2)}</td>`;
        html += `<td>${generateExerciseContent('deadlift', trainingMaxes.deadlift, weekProgram, week, 3)}</td>`;
        html += `<td>${generateExerciseContent('bench', trainingMaxes.bench, weekProgram, week, 4)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
}

// 生成列印版本的單個動作訓練內容（只顯示選擇的槓鈴和組合）
function generatePrintExerciseContent(exerciseKey, trainingMax, weekProgram, week, day) {
    const dayId = `${week}-${day}`;

    // 獲取選擇的槓鈴
    const selectedBarbellId = selectedBarbellStore[dayId];
    if (!selectedBarbellId) {
        return '<div class="set-info">尚未選擇槓鈴</div>';
    }

    const selectedBarbell = equipment.barbells.find(b => b.id === selectedBarbellId);
    if (!selectedBarbell) {
        return '<div class="set-info">找不到選擇的槓鈴</div>';
    }

    // 獲取組合數據
    let combinationsByBarbell = combinationDataStore[dayId];
    if (!combinationsByBarbell) {
        try {
            const cacheKey = `combinations_${dayId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                combinationsByBarbell = JSON.parse(cached);
            }
        } catch (e) {
            combinationsByBarbell = {};
        }
    }

    let content = '';

    // 生成每一組的內容
    weekProgram.forEach((set, setIndex) => {
        const weight = calculateTrainingWeight(set.percentage, trainingMax);
        const reps = set.reps;
        const sets = set.sets || 1;
        const setId = `week-${week}-day-${day}-set-${setIndex}`;

        content += '<div class="set-info">';

        // 只在第一組顯示槓鈴名稱
        if (setIndex === 0) {
            content += `<span class="barbell-label">${selectedBarbell.name}</span>`;
        }

        content += `<div class="set-header">`;
        content += `<strong>組 ${setIndex + 1}:</strong> ${weight} kg × ${reps}${sets > 1 ? ` (${sets}組)` : ''}`;
        content += `</div>`;

        // 從 DOM 獲取選中的組合索引
        const comboSelector = document.getElementById(setId);
        let selectedComboIndex = 0; // 預設選擇第一個
        let selectedCombo = null;

        if (comboSelector) {
            const options = comboSelector.querySelectorAll('.combo-option');
            options.forEach((opt, index) => {
                if (opt.classList.contains('selected')) {
                    selectedComboIndex = index;
                }
            });
        }

        // 從組合數據中獲取選中的組合
        if (combinationsByBarbell && combinationsByBarbell[selectedBarbellId]) {
            const setData = combinationsByBarbell[selectedBarbellId][setIndex];
            if (setData && !setData.excluded && setData.combinations && setData.combinations.length > 0) {
                // 確保索引在有效範圍內
                if (selectedComboIndex >= 0 && selectedComboIndex < setData.combinations.length) {
                    selectedCombo = setData.combinations[selectedComboIndex];
                } else {
                    // 如果索引無效，使用第一個
                    selectedCombo = setData.combinations[0];
                }
            }
        }

        // 顯示選中的組合或錯誤訊息
        if (selectedCombo) {
            const plateText = formatPlateCombination(selectedCombo.plates);
            let diffText = '';
            if (selectedCombo.difference > 0.1) {
                const sign = selectedCombo.isOver ? '+' : '-';
                diffText = ` (${sign}${selectedCombo.difference}kg)`;
            }

            content += `<div class="combo-option">`;
            content += `<span class="combo-plates">每邊: ${plateText}</span>`;
            content += `<span class="combo-total">${selectedCombo.totalWeight}kg${diffText}</span>`;
            content += `</div>`;
        } else {
            // 檢查是否被排除
            if (combinationsByBarbell && combinationsByBarbell[selectedBarbellId]) {
                const setData = combinationsByBarbell[selectedBarbellId][setIndex];
                if (setData && setData.excluded) {
                    const maxWeight = selectedBarbell.maxWeight || 400;
                    if (setData.exclusionReason === 'exceeds_max') {
                        content += `<div class="no-combination">目標重量 ${weight} kg 超過此槓鈴承重上限 ${maxWeight} kg</div>`;
                    } else if (setData.exclusionReason === 'below_barbell_weight') {
                        content += `<div class="no-combination">目標重量 ${weight} kg 小於槓鈴重量 ${selectedBarbell.weight} kg</div>`;
                    } else {
                        content += `<div class="no-combination">此槓鈴無法達成此重量</div>`;
                    }
                } else {
                    content += `<div class="no-combination">無法達成此重量</div>`;
                }
            } else {
                content += `<div class="no-combination">無法達成此重量</div>`;
            }
        }

        content += `</div>`;
    });

    return content;
}

// 生成列印版本的表格
function generatePrintTable(trainingMaxes) {
    let html = '<table class="program-table"><thead><tr>';
    html += '<th>週次</th>';
    html += '<th>Day 1<br>深蹲</th>';
    html += '<th>Day 2<br>肩推</th>';
    html += '<th>Day 3<br>硬舉</th>';
    html += '<th>Day 4<br>臥推</th>';
    html += '</tr></thead><tbody>';

    for (let week = 1; week <= 4; week++) {
        const weekProgram = WEEK_PROGRAMS[week];

        html += '<tr>';
        html += `<td class="week-header">${week}</td>`;
        html += `<td>${generatePrintExerciseContent('squat', trainingMaxes.squat, weekProgram, week, 1)}</td>`;
        html += `<td>${generatePrintExerciseContent('ohp', trainingMaxes.ohp, weekProgram, week, 2)}</td>`;
        html += `<td>${generatePrintExerciseContent('deadlift', trainingMaxes.deadlift, weekProgram, week, 3)}</td>`;
        html += `<td>${generatePrintExerciseContent('bench', trainingMaxes.bench, weekProgram, week, 4)}</td>`;
        html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
}
