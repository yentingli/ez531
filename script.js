// 預設設備配置
const DEFAULT_EQUIPMENT = {
    barbells: [
        {
            id: 'barbell-1',
            name: '標準槓鈴',
            weight: 20,
            maxWeight: 400,
            applicableExercises: ['squat', 'ohp', 'deadlift', 'bench'] // 預設所有動作都適用
        }
    ],
    plates: {
        1.25: 4,
        2.5: 4,
        5: 4,
        10: 4,
        15: 4,
        20: 4,
        25: 4
    }
};

// 設備管理
let equipment = null;

// 初始化設備配置
function initializeEquipment() {
    let savedBarbells = null;
    let savedPlates = null;

    try {
        const barbellsData = localStorage.getItem('barbells');
        const platesData = localStorage.getItem('plates');

        if (barbellsData) {
            savedBarbells = JSON.parse(barbellsData);
        }

        if (platesData) {
            try {
                const parsed = JSON.parse(platesData);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const firstKey = Object.keys(parsed)[0];
                    if (firstKey && parsed[firstKey] && typeof parsed[firstKey] === 'object' && !Array.isArray(parsed[firstKey])) {
                        // 舊格式：按槓鈴ID存儲，需要合併
                        savedPlates = {};
                        Object.values(parsed).forEach(plateSet => {
                            if (plateSet && typeof plateSet === 'object' && !Array.isArray(plateSet)) {
                                Object.keys(plateSet).forEach(weight => {
                                    const count = plateSet[weight];
                                    if (savedPlates[weight]) {
                                        savedPlates[weight] = Math.max(savedPlates[weight], count);
                                    } else {
                                        savedPlates[weight] = count;
                                    }
                                });
                            }
                        });
                    } else {
                        // 新格式：直接是槓片配置對象
                        savedPlates = parsed;
                    }
                }
            } catch (e) {
                savedPlates = null;
            }
        }
    } catch (e) {
        // 讀取失敗，繼續使用預設值
    }

    // 初始化設備配置
    if (!savedBarbells || savedBarbells.length === 0) {
        savedBarbells = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.barbells));
    }

    equipment = {
        barbells: savedBarbells,
        plates: savedPlates || {}
    };

    // 確保每個槓鈴都有 maxWeight 和 applicableExercises 字段
    equipment.barbells.forEach(barbell => {
        if (!barbell.maxWeight) {
            barbell.maxWeight = 400;
        }
        // 如果沒有適用動作列表，預設所有動作都適用
        if (!barbell.applicableExercises || !Array.isArray(barbell.applicableExercises)) {
            barbell.applicableExercises = ['squat', 'ohp', 'deadlift', 'bench'];
        }
    });

    // 如果沒有載入到槓片配置，使用預設值
    if (!savedPlates || Object.keys(savedPlates).length === 0) {
        equipment.plates = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.plates));
        try {
            localStorage.setItem('plates', JSON.stringify(equipment.plates));
        } catch (e) {
            // 保存失敗，繼續執行
        }
    }

    // 初始化時保存不顯示通知
    saveEquipment(false);
}

// 保存設備配置
function saveEquipment(showNotification = true) {
    try {
        const barbells = equipment.barbells.map(b => ({
            id: b.id,
            name: b.name,
            weight: b.weight,
            maxWeight: b.maxWeight || 400,
            applicableExercises: b.applicableExercises || ['squat', 'ohp', 'deadlift', 'bench']
        }));

        const plates = equipment.plates || {};

        localStorage.setItem('barbells', JSON.stringify(barbells));
        localStorage.setItem('plates', JSON.stringify(plates));

        if (showNotification) {
            showSaveMessage('設備配置已成功保存！', 'success');
        }
        return true;
    } catch (e) {
        // 保存失敗
        if (showNotification) {
            showSaveMessage('設備配置保存失敗，請檢查瀏覽器設定或儲存空間', 'error');
        }
        console.error('保存設備配置失敗:', e);
        return false;
    }
}

// 保存所有設定
function saveAllSettings() {
    let success = true;

    // 在 saveAllSettings 中不顯示單獨的通知，統一在最後顯示
    if (!saveEquipment(false)) {
        success = false;
    }

    try {
        const squat1RM = parseFloat(document.getElementById('squat-1rm')?.value) || 0;
        const ohp1RM = parseFloat(document.getElementById('ohp-1rm')?.value) || 0;
        const deadlift1RM = parseFloat(document.getElementById('deadlift-1rm')?.value) || 0;
        const bench1RM = parseFloat(document.getElementById('bench-1rm')?.value) || 0;
        const trainingMax = parseFloat(document.getElementById('training-max')?.value) || 0.9;
        const tolerance = getTolerance();

        if (squat1RM > 0 || ohp1RM > 0 || deadlift1RM > 0 || bench1RM > 0) {
            if (!save1RMValues(squat1RM, ohp1RM, deadlift1RM, bench1RM, trainingMax, tolerance)) {
                success = false;
            }
        }
    } catch (e) {
        success = false;
    }

    try {
        localStorage.setItem('selectedBarbells', JSON.stringify(selectedBarbellStore));
    } catch (e) {
        success = false;
        console.error('保存選擇的槓鈴失敗:', e);
    }

    // 顯示統一的保存結果訊息
    if (success) {
        showSaveMessage('所有設定已成功保存！', 'success');
    } else {
        showSaveMessage('部分設定保存失敗，請檢查瀏覽器設定或儲存空間', 'error');
    }
    return success;
}

// 顯示保存訊息
function showSaveMessage(message, type) {
    const existingMsg = document.getElementById('save-message');
    if (existingMsg) {
        existingMsg.remove();
    }

    const msgElement = document.createElement('div');
    msgElement.id = 'save-message';
    msgElement.className = `save-message save-message-${type}`;
    msgElement.textContent = message;

    const equipmentSection = document.querySelector('.equipment-section');
    if (equipmentSection) {
        equipmentSection.insertBefore(msgElement, equipmentSection.firstChild);
        setTimeout(() => {
            msgElement.style.opacity = '0';
            msgElement.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                msgElement.remove();
            }, 300);
        }, 3000);
    }
}

// 載入1RM值
function load1RMValues() {
    try {
        const saved1RM = localStorage.getItem('1rmValues');
        if (saved1RM) {
            const values = JSON.parse(saved1RM);
            if (values.squat) document.getElementById('squat-1rm').value = values.squat;
            if (values.ohp) document.getElementById('ohp-1rm').value = values.ohp;
            if (values.deadlift) document.getElementById('deadlift-1rm').value = values.deadlift;
            if (values.bench) document.getElementById('bench-1rm').value = values.bench;
            if (values.trainingMax) document.getElementById('training-max').value = values.trainingMax;
            if (values.tolerance) document.getElementById('tolerance').value = values.tolerance;
        }
    } catch (e) {
        // 載入失敗
    }
}

// 保存1RM值
function save1RMValues(squat, ohp, deadlift, bench, trainingMax, tolerance) {
    try {
        const values = {
            squat: squat,
            ohp: ohp,
            deadlift: deadlift,
            bench: bench,
            trainingMax: trainingMax,
            tolerance: tolerance
        };
        localStorage.setItem('1rmValues', JSON.stringify(values));
        return true;
    } catch (e) {
        // 保存失敗
        console.error('保存1RM值失敗:', e);
        return false;
    }
}

// 獲取容忍度
function getTolerance() {
    const toleranceInput = document.getElementById('tolerance');
    if (toleranceInput) {
        const tolerance = parseFloat(toleranceInput.value);
        if (!isNaN(tolerance) && tolerance > 0) {
            return tolerance;
        }
    }
    return 1;
}

// 全局存儲組合數據和選擇的槓鈴
let combinationDataStore = {};
let selectedBarbellStore = {};

// 載入選擇的槓鈴
function loadSelectedBarbells() {
    try {
        const saved = localStorage.getItem('selectedBarbells');
        if (saved) {
            selectedBarbellStore = JSON.parse(saved);
        }
    } catch (e) {
        // 載入失敗
    }
}

// 立即初始化
initializeEquipment();
loadSelectedBarbells();

// 訓練動作配置
const EXERCISES = {
    squat: { name: '深蹲', day: 1 },
    ohp: { name: '肩推', day: 2 },
    deadlift: { name: '硬舉', day: 3 },
    bench: { name: '臥推', day: 4 }
};

// 週次訓練配置
const WEEK_PROGRAMS = {
    1: [
        { percentage: 65, reps: 5 },
        { percentage: 75, reps: 5 },
        { percentage: 85, reps: '5+' }
    ],
    2: [
        { percentage: 70, reps: 3 },
        { percentage: 80, reps: 3 },
        { percentage: 90, reps: '3+' }
    ],
    3: [
        { percentage: 75, reps: 5 },
        { percentage: 85, reps: 3 },
        { percentage: 95, reps: '1+' }
    ],
    4: [
        { percentage: 40, reps: 5, sets: 2 },
        { percentage: 50, reps: 5, sets: 2 },
        { percentage: 60, reps: 5, sets: 2 }
    ]
};

// 計算可用的槓片組合
function calculatePlateCombinations(targetWeight, barbells) {
    const results = [];
    const tolerance = getTolerance();

    // 準備槓片庫存
    const plateInventory = {};
    const availablePlates = [];
    for (const [weight, count] of Object.entries(equipment.plates || {})) {
        const plateWeight = parseFloat(weight);
        plateInventory[plateWeight] = count;
        for (let i = 0; i < count; i++) {
            availablePlates.push(plateWeight);
        }
    }
    availablePlates.sort((a, b) => b - a);

    // 對每個槓鈴進行計算
    for (let barbellIndex = 0; barbellIndex < barbells.length; barbellIndex++) {
        const barbell = barbells[barbellIndex];
        const barbellWeight = barbell.weight;
        const maxWeight = barbell.maxWeight || 400;
        const neededWeight = (targetWeight - barbellWeight) / 2;

        // 基本檢查：目標重量必須在合理範圍內
        if (targetWeight < barbellWeight || targetWeight > maxWeight) {
            continue;
        }

        // 檢查是否只使用槓鈴即可
        const barbellOnlyDifference = Math.abs(barbellWeight - targetWeight);
        if (barbellOnlyDifference <= tolerance && barbellWeight <= maxWeight) {
            results.push({
                barbellId: barbell.id,
                barbellName: barbell.name,
                barbellWeight: barbellWeight,
                barbellIndex: barbellIndex,
                plates: [],
                totalWeight: Math.round(barbellWeight * 10) / 10,
                difference: Math.round(barbellOnlyDifference * 10) / 10,
                rawDifference: Math.round((barbellWeight - targetWeight) * 10) / 10,
                isOver: barbellWeight > targetWeight
            });
        }

        // 如果需要槓片，計算組合
        if (neededWeight > 0) {
            const combinations = findPlateCombinations(neededWeight, availablePlates, plateInventory);

            for (const combo of combinations) {
                // 驗證組合是否有效
                const comboPlateCounts = {};
                combo.forEach(plate => {
                    comboPlateCounts[plate] = (comboPlateCounts[plate] || 0) + 1;
                });

                // 檢查庫存
                let isValid = true;
                for (const [weight, count] of Object.entries(comboPlateCounts)) {
                    const plateWeight = parseFloat(weight);
                    const totalNeeded = count * 2;
                    const available = plateInventory[plateWeight] || 0;
                    if (totalNeeded > available) {
                        isValid = false;
                        break;
                    }
                }

                if (!isValid) {
                    continue;
                }

                // 計算總重量並檢查上限
                const totalWeight = barbellWeight + combo.reduce((sum, plate) => sum + plate * 2, 0);
                if (totalWeight > maxWeight) {
                    continue;
                }

                // 添加到結果
                const difference = totalWeight - targetWeight;
                const absDifference = Math.abs(difference);
                results.push({
                    barbellId: barbell.id,
                    barbellName: barbell.name,
                    barbellWeight: barbellWeight,
                    barbellIndex: barbellIndex,
                    plates: combo,
                    totalWeight: Math.round(totalWeight * 10) / 10,
                    difference: Math.round(absDifference * 10) / 10,
                    rawDifference: Math.round(difference * 10) / 10,
                    isOver: difference > 0
                });
            }
        }
    }

    // 排序：先按槓鈴順序，再按差異絕對值，最後優先負偏差
    results.sort((a, b) => {
        if (a.barbellIndex !== b.barbellIndex) {
            return a.barbellIndex - b.barbellIndex;
        }
        if (a.difference !== b.difference) {
            return a.difference - b.difference;
        }
        if (a.isOver !== b.isOver) {
            return a.isOver ? 1 : -1;
        }
        return 0;
    });

    // 每個槓鈴只取最佳組合
    const finalResults = [];
    const barbellResults = {};
    for (const result of results) {
        if (!barbellResults[result.barbellId]) {
            barbellResults[result.barbellId] = result;
        } else if (result.difference < barbellResults[result.barbellId].difference) {
            barbellResults[result.barbellId] = result;
        } else if (result.difference === barbellResults[result.barbellId].difference && !result.isOver && barbellResults[result.barbellId].isOver) {
            barbellResults[result.barbellId] = result;
        }
    }

    // 按照原始槓鈴順序返回結果
    for (let i = 0; i < barbells.length; i++) {
        const barbellId = barbells[i].id;
        if (barbellResults[barbellId]) {
            finalResults.push(barbellResults[barbellId]);
        }
    }

    return finalResults;
}

// 尋找槓片組合（貪心算法）
function findPlateCombinations(targetWeight, availablePlates, plateInventory) {
    const tolerance = getTolerance();

    if (availablePlates.length === 0) {
        return [];
    }

    const sortedPlates = [...availablePlates].sort((a, b) => b - a);
    const combo = [];
    let currentSum = 0;
    const usedPlates = {};

    for (const plate of sortedPlates) {
        const newSum = currentSum + plate;
        const newDiff = Math.abs(newSum - targetWeight);

        // 檢查庫存
        const currentUsedCount = usedPlates[plate] || 0;
        const newUsedCount = currentUsedCount + 1;
        const totalNeeded = newUsedCount * 2;
        const available = plateInventory[plate] || 0;

        if (totalNeeded > available) {
            continue;
        }

        // 如果差異在容忍範圍內，加入
        if (newDiff <= tolerance) {
            combo.push(plate);
            currentSum = newSum;
            usedPlates[plate] = newUsedCount;

            if (newDiff <= tolerance * 0.5) {
                break;
            }
        } else {
            // 檢查是否應該跳過
            if (Math.abs(currentSum - targetWeight) <= tolerance && newSum > targetWeight + tolerance) {
                continue;
            }
            if (currentSum < targetWeight - tolerance && newSum > targetWeight + tolerance) {
                continue;
            }
            // 嘗試加入
            combo.push(plate);
            currentSum = newSum;
            usedPlates[plate] = newUsedCount;
        }
    }

    // 檢查結果是否在容忍範圍內
    const diff = Math.abs(currentSum - targetWeight);
    if (combo.length > 0 && diff <= tolerance) {
        return [combo];
    }

    return [];
}

// 格式化槓片組合顯示
function formatPlateCombination(combo) {
    if (!combo || combo.length === 0) {
        return '無';
    }

    const plateCounts = {};
    combo.forEach(plate => {
        plateCounts[plate] = (plateCounts[plate] || 0) + 1;
    });

    const parts = [];
    for (const [weight, count] of Object.entries(plateCounts).sort((a, b) => parseFloat(b) - parseFloat(a))) {
        parts.push(`${weight}kg × ${count}`);
    }

    return parts.join(', ') || '無';
}

// 計算訓練重量
function calculateTrainingWeight(percentage, trainingMax) {
    return Math.round((trainingMax * percentage / 100) * 10) / 10;
}

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

// 渲染設備配置
function renderEquipment() {
    if (!equipment) {
        equipment = { barbells: [], plates: {} };
    }
    if (!equipment.plates) {
        equipment.plates = {};
    }

    renderBarbells();
    renderPlates();
    // 渲染時保存不顯示通知
    saveEquipment(false);
}

// 渲染槓鈴配置
function renderBarbells() {
    const container = document.getElementById('barbells-container');
    if (!container) return;

    container.innerHTML = '';

    equipment.barbells.forEach((barbell, index) => {
        if (!barbell.maxWeight) {
            barbell.maxWeight = 400;
        }
        // 確保有適用動作列表
        if (!barbell.applicableExercises || !Array.isArray(barbell.applicableExercises)) {
            barbell.applicableExercises = ['squat', 'ohp', 'deadlift', 'bench'];
        }

        // 生成適用動作的勾選框
        const exerciseCheckboxes = Object.keys(EXERCISES).map(exKey => {
            const exercise = EXERCISES[exKey];
            const isChecked = barbell.applicableExercises.includes(exKey);
            return `
                <label class="exercise-checkbox-label">
                    <input type="checkbox"
                           id="barbell-exercise-${index}-${exKey}"
                           ${isChecked ? 'checked' : ''}
                           onchange="updateBarbellExercises(${index}, '${exKey}', this.checked)">
                    ${exercise.name}
                </label>
            `;
        }).join('');

        const barbellHTML = `
            <div class="barbell-item">
                <div class="barbell-header">
                    <input type="text" class="barbell-name-input" id="barbell-name-${index}" value="${barbell.name}"
                           onchange="updateBarbellName(${index})" placeholder="槓鈴名稱">
                    <button class="btn-remove" onclick="removeBarbell(${index})">移除</button>
                </div>
                <div class="barbell-weight-row">
                    <div class="input-group">
                        <label>槓鈴重量 (kg):</label>
                        <input type="number" id="barbell-weight-${index}" value="${barbell.weight}" step="0.1" min="0" onchange="updateBarbellWeight(${index})">
                    </div>
                    <div class="input-group">
                        <label>承重上限 (kg):</label>
                        <input type="number" id="barbell-max-weight-${index}" value="${barbell.maxWeight}" step="0.1" min="0" onchange="updateBarbellMaxWeight(${index})">
                    </div>
                </div>
                <div class="barbell-exercises-row">
                    <label class="exercises-label">適用動作：</label>
                    <div class="exercises-checkboxes">
                        ${exerciseCheckboxes}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += barbellHTML;
    });
}

// 渲染槓片配置
function renderPlates() {
    const container = document.getElementById('plates-container');
    if (!container) return;

    container.innerHTML = '';

    if (!equipment) {
        initializeEquipment();
        return;
    }

    if (!equipment.plates) {
        equipment.plates = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.plates));
        saveEquipment();
    }

    const plateSectionHTML = `
        <div class="plate-config">
            ${Object.keys(equipment.plates).sort((a, b) => parseFloat(b) - parseFloat(a)).map((weight, plateIndex) => `
                <div class="plate-item">
                    <input type="number" class="plate-weight-input" id="plate-weight-${plateIndex}"
                           value="${weight}" step="0.1" min="0" placeholder="重量"
                           onchange="updatePlateWeight('${weight}', this.value)">
                    <span>kg ×</span>
                    <input type="number" class="plate-count-input" id="plate-count-${weight}"
                           value="${equipment.plates[weight]}" min="0" step="1" placeholder="片數"
                           onchange="updatePlate('${weight}', this.value)">
                    <span>片</span>
                    <button class="btn-remove-plate" onclick="removePlateType('${weight}')" title="移除">×</button>
                </div>
            `).join('')}
            ${Object.keys(equipment.plates).length === 0 ? '<div class="no-plates">尚未配置槓片</div>' : ''}
        </div>
    `;
    container.innerHTML = plateSectionHTML;
}

// 更新槓鈴名稱
function updateBarbellName(index) {
    const name = document.getElementById(`barbell-name-${index}`).value.trim();
    if (name) {
        equipment.barbells[index].name = name;
        saveEquipment();
    }
}

// 更新槓鈴重量
function updateBarbellWeight(index) {
    const weight = parseFloat(document.getElementById(`barbell-weight-${index}`).value);
    if (!isNaN(weight) && weight >= 0) {
        equipment.barbells[index].weight = weight;
        saveEquipment();
    }
}

// 更新槓鈴承重上限
function updateBarbellMaxWeight(index) {
    const maxWeight = parseFloat(document.getElementById(`barbell-max-weight-${index}`).value);
    if (!isNaN(maxWeight) && maxWeight > 0) {
        equipment.barbells[index].maxWeight = maxWeight;
        saveEquipment();
    } else {
        equipment.barbells[index].maxWeight = 400;
        document.getElementById(`barbell-max-weight-${index}`).value = 400;
        saveEquipment();
    }
}

// 更新槓鈴適用動作
function updateBarbellExercises(index, exerciseKey, isChecked) {
    if (!equipment.barbells[index].applicableExercises) {
        equipment.barbells[index].applicableExercises = [];
    }

    if (isChecked) {
        // 添加動作
        if (!equipment.barbells[index].applicableExercises.includes(exerciseKey)) {
            equipment.barbells[index].applicableExercises.push(exerciseKey);
        }
    } else {
        // 移除動作
        equipment.barbells[index].applicableExercises = equipment.barbells[index].applicableExercises.filter(
            ex => ex !== exerciseKey
        );
    }

    saveEquipment();
}

// 更新槓片數量
function updatePlate(weight, newCount) {
    const count = parseInt(newCount);
    if (!isNaN(count) && count >= 0) {
        if (!equipment || !equipment.plates) {
            if (!equipment) {
                equipment = { plates: {} };
            } else {
                equipment.plates = {};
            }
        }
        equipment.plates[weight] = count;
        saveEquipment();
    }
}

// 更新槓片重量
function updatePlateWeight(oldWeight, newWeight) {
    const weight = parseFloat(newWeight);
    if (!isNaN(weight) && weight > 0 && oldWeight !== String(weight)) {
        if (!equipment || !equipment.plates) {
            if (!equipment) {
                equipment = { plates: {} };
            } else {
                equipment.plates = {};
            }
        }
        const count = equipment.plates[oldWeight] || 0;
        delete equipment.plates[oldWeight];
        equipment.plates[weight] = count;
        saveEquipment();
        renderPlates();
    }
}

// 新增槓片類型
function addPlateType() {
    const weight = parseFloat(prompt('請輸入槓片重量 (kg):', '2.5'));
    if (!isNaN(weight) && weight > 0) {
        if (!equipment || !equipment.plates) {
            if (!equipment) {
                equipment = { plates: {} };
            } else {
                equipment.plates = {};
            }
        }
        if (!equipment.plates[weight]) {
            equipment.plates[weight] = 0;
            saveEquipment();
            renderPlates();
        } else {
            alert('此重量的槓片已存在');
        }
    }
}

// 移除槓片類型
function removePlateType(weight) {
    if (confirm(`確定要移除 ${weight} kg 的槓片類型嗎？`)) {
        if (equipment && equipment.plates) {
            delete equipment.plates[weight];
            saveEquipment();
            renderPlates();
        }
    }
}

// 新增槓鈴
function addBarbell() {
    const newId = `barbell-${Date.now()}`;
    const newBarbell = {
        id: newId,
        name: `槓鈴 ${equipment.barbells.length + 1}`,
        weight: 20,
        maxWeight: 400,
        applicableExercises: ['squat', 'ohp', 'deadlift', 'bench'] // 預設所有動作都適用
    };
    equipment.barbells.push(newBarbell);
    renderBarbells();
    saveEquipment();
}

// 移除槓鈴
function removeBarbell(index) {
    if (equipment.barbells.length > 1) {
        equipment.barbells.splice(index, 1);
        renderEquipment();
    } else {
        alert('至少需要保留一個槓鈴');
    }
}

// 重置槓鈴配置
function resetBarbells() {
    if (confirm('確定要重置槓鈴配置為預設值嗎？')) {
        if (!equipment) {
            equipment = {};
        }
        equipment.barbells = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.barbells));
        saveEquipment();
        renderBarbells();
    }
}

// 重置槓片配置
function resetPlates() {
    if (confirm('確定要重置槓片配置為預設值嗎？')) {
        if (!equipment) {
            equipment = {};
        }
        equipment.plates = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.plates));
        saveEquipment();
        renderPlates();
    }
}

// 選擇槓鈴（按天選擇）
function selectBarbell(dayId, barbellId) {
    selectedBarbellStore[dayId] = barbellId;
    localStorage.setItem('selectedBarbells', JSON.stringify(selectedBarbellStore));

    // 更新按鈕狀態
    const selectorId = `barbell-selector-${dayId}`;
    const selector = document.getElementById(selectorId);
    if (selector) {
        const buttons = selector.querySelectorAll('.barbell-btn');
        buttons.forEach(btn => {
            const btnBarbellId = btn.getAttribute('data-barbell-id');
            if (btnBarbellId === barbellId) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    // 解析 dayId 獲取 week 和 day
    const [week, day] = dayId.split('-');

    // 嘗試從 localStorage 讀取緩存的組合數據
    let combinationsByBarbell = combinationDataStore[dayId];
    if (!combinationsByBarbell) {
        try {
            const cacheKey = `combinations_${dayId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                combinationsByBarbell = JSON.parse(cached);
                combinationDataStore[dayId] = combinationsByBarbell;
            }
        } catch (e) {
            // 讀取緩存失敗，使用空對象
            combinationsByBarbell = {};
        }
    }

    // 更新這一天所有組的組合選項
    if (combinationsByBarbell && combinationsByBarbell[barbellId]) {
        const setsForBarbell = combinationsByBarbell[barbellId];
        const selectedBarbell = equipment.barbells.find(b => b.id === barbellId);

        Object.keys(setsForBarbell).forEach(setIndex => {
            // 跳過非數字鍵（如 _excluded）
            if (isNaN(parseInt(setIndex))) {
                return;
            }

            const setId = `week-${week}-day-${day}-set-${setIndex}`;
            const setData = setsForBarbell[setIndex];
            const comboSelector = document.getElementById(setId);

            if (comboSelector) {
                comboSelector.innerHTML = '';

                // 檢查是否被排除（兼容舊格式）
                let isExcluded = false;
                let combinations = [];
                let exclusionReason = null;

                if (setData && typeof setData === 'object') {
                    if (setData.excluded !== undefined) {
                        // 新格式：對象包含 combinations 和 excluded
                        isExcluded = setData.excluded === true;
                        combinations = setData.combinations || [];
                        exclusionReason = setData.exclusionReason;
                    } else if (Array.isArray(setData)) {
                        // 舊格式：直接是數組
                        combinations = setData;
                    }
                }

                if (isExcluded) {
                    // 顯示被排除的原因
                    if (selectedBarbell) {
                        const maxWeight = selectedBarbell.maxWeight || 400;
                        const exclusionMsg = document.createElement('div');
                        exclusionMsg.className = 'no-combination';
                        if (exclusionReason === 'exceeds_max') {
                            exclusionMsg.textContent = `目標重量超過此槓鈴承重上限 ${maxWeight} kg，無法達成`;
                        } else if (exclusionReason === 'below_barbell_weight') {
                            exclusionMsg.textContent = `目標重量小於槓鈴重量 ${selectedBarbell.weight} kg，無法達成`;
                        } else {
                            exclusionMsg.textContent = '此槓鈴無法達成此重量';
                        }
                        comboSelector.appendChild(exclusionMsg);
                    } else {
                        const exclusionMsg = document.createElement('div');
                        exclusionMsg.className = 'no-combination';
                        exclusionMsg.textContent = '無法達成此重量';
                        comboSelector.appendChild(exclusionMsg);
                    }
                } else if (combinations.length > 0) {
                    // 顯示組合選項
                    combinations.forEach((combo, comboIndex) => {
                        const isSelected = comboIndex === 0 ? 'selected' : '';
                        const plateText = formatPlateCombination(combo.plates);
                        let diffText = '';
                        if (combo.difference > 0.1) {
                            const sign = combo.isOver ? '+' : '-';
                            diffText = ` (${sign}${combo.difference}kg)`;
                        }

                        const option = document.createElement('div');
                        option.className = `combo-option ${isSelected}`;
                        option.onclick = () => selectCombination(setId, barbellId, comboIndex);
                        option.innerHTML = `
                            <span class="combo-plates">每邊: ${plateText}</span>
                            <span class="combo-total">${combo.totalWeight}kg${diffText}</span>
                        `;
                        comboSelector.appendChild(option);
                    });
                } else {
                    // 沒有可用組合
                    const noComboMsg = document.createElement('div');
                    noComboMsg.className = 'no-combination';
                    noComboMsg.textContent = '此槓鈴無法達成此重量';
                    comboSelector.appendChild(noComboMsg);
                }
            }
        });
    }
}

// 選擇組合
function selectCombination(setId, barbellId, comboIndex) {
    const selector = document.getElementById(setId);
    if (!selector) return;

    const options = selector.querySelectorAll('.combo-option');
    options.forEach((opt, index) => {
        if (index === comboIndex) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
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

// 生成 Markdown 格式的課表
function generateMarkdownSchedule() {
    const programSection = document.getElementById('program-section');
    if (!programSection || programSection.style.display === 'none') {
        alert('請先產生訓練計劃');
        return '';
    }

    // 獲取訓練參數
    const squat1RM = parseFloat(document.getElementById('squat-1rm').value) || 0;
    const ohp1RM = parseFloat(document.getElementById('ohp-1rm').value) || 0;
    const deadlift1RM = parseFloat(document.getElementById('deadlift-1rm').value) || 0;
    const bench1RM = parseFloat(document.getElementById('bench-1rm').value) || 0;
    const trainingMaxMultiplier = parseFloat(document.getElementById('training-max').value) || 0.9;

    // 計算 Training Max
    const trainingMaxes = {
        squat: Math.round(squat1RM * trainingMaxMultiplier * 10) / 10,
        ohp: Math.round(ohp1RM * trainingMaxMultiplier * 10) / 10,
        deadlift: Math.round(deadlift1RM * trainingMaxMultiplier * 10) / 10,
        bench: Math.round(bench1RM * trainingMaxMultiplier * 10) / 10
    };

    let markdown = '';

    // 加入訓練參數
    markdown += `# 訓練參數\n\n`;
    markdown += `- 深蹲 1RM: ${squat1RM} kg (Training Max: ${trainingMaxes.squat} kg)\n`;
    markdown += `- 肩推 1RM: ${ohp1RM} kg (Training Max: ${trainingMaxes.ohp} kg)\n`;
    markdown += `- 硬舉 1RM: ${deadlift1RM} kg (Training Max: ${trainingMaxes.deadlift} kg)\n`;
    markdown += `- 臥推 1RM: ${bench1RM} kg (Training Max: ${trainingMaxes.bench} kg)\n`;
    markdown += `- Training Max 倍數: ${(trainingMaxMultiplier * 100).toFixed(0)}%\n\n`;

    // 遍歷所有周次
    for (let week = 1; week <= 4; week++) {
        markdown += `# Week ${week}\n\n`;
        const weekProgram = WEEK_PROGRAMS[week];

        // 遍歷所有動作（Day 1-4）
        const exercises = [
            { key: 'squat', day: 1, trainingMax: trainingMaxes.squat, name: '深蹲', oneRM: squat1RM },
            { key: 'ohp', day: 2, trainingMax: trainingMaxes.ohp, name: '肩推', oneRM: ohp1RM },
            { key: 'deadlift', day: 3, trainingMax: trainingMaxes.deadlift, name: '硬舉', oneRM: deadlift1RM },
            { key: 'bench', day: 4, trainingMax: trainingMaxes.bench, name: '臥推', oneRM: bench1RM }
        ];

        exercises.forEach(exercise => {
            const dayId = `${week}-${exercise.day}`;
            markdown += `## D${exercise.day}_${exercise.key}\n`;

            // 獲取選擇的槓鈴
            const selectedBarbellId = selectedBarbellStore[dayId];
            if (!selectedBarbellId) {
                markdown += `- bar: 尚未選擇槓鈴\n`;
                markdown += `\n`;
                return;
            }

            const selectedBarbell = equipment.barbells.find(b => b.id === selectedBarbellId);
            if (!selectedBarbell) {
                markdown += `- bar: 找不到選擇的槓鈴\n`;
                markdown += `\n`;
                return;
            }

            // 顯示槓鈴名稱和重量
            markdown += `- bar: ${selectedBarbell.name} (${selectedBarbell.weight} kg)\n`;

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

            // 生成每一組的內容
            weekProgram.forEach((set, setIndex) => {
                const weight = calculateTrainingWeight(set.percentage, exercise.trainingMax);
                const reps = set.reps;
                const sets = set.sets || 1;
                const setId = `week-${week}-day-${exercise.day}-set-${setIndex}`;

                // 從 DOM 獲取選中的組合索引
                const comboSelector = document.getElementById(setId);
                let selectedComboIndex = 0;
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
                        if (selectedComboIndex >= 0 && selectedComboIndex < setData.combinations.length) {
                            selectedCombo = setData.combinations[selectedComboIndex];
                        } else {
                            selectedCombo = setData.combinations[0];
                        }
                    }
                }

                // 格式化槓片組合為文字
                let plateText = '';
                let actualWeight = weight; // 預設使用目標重量

                if (selectedCombo && selectedCombo.plates && selectedCombo.plates.length > 0) {
                    const plateCounts = {};
                    selectedCombo.plates.forEach(plate => {
                        plateCounts[plate] = (plateCounts[plate] || 0) + 1;
                    });
                    const plateParts = [];
                    for (const [plateWeight, count] of Object.entries(plateCounts).sort((a, b) => parseFloat(b) - parseFloat(a))) {
                        plateParts.push(`${plateWeight} kg * ${count}`);
                    }
                    plateText = `, (${plateParts.join(', ')})`;
                    // 使用實際總重量（槓鈴+槓片）
                    actualWeight = selectedCombo.totalWeight;
                } else if (selectedCombo && selectedCombo.totalWeight) {
                    // 如果沒有槓片但有總重量（只有槓鈴的情況）
                    actualWeight = selectedCombo.totalWeight;
                }

                // 生成訓練內容行（使用實際總重量）
                const setsText = sets > 1 ? ` (${sets}組)` : '';
                markdown += `- ${actualWeight} kg * ${reps}${setsText}${plateText}\n`;
            });

            markdown += `\n`;
        });
    }

    return markdown;
}

//  Markdown 格式的課表
function exportToMarkdown() {
    const markdown = generateMarkdownSchedule();

    if (!markdown) {
        return; // 如果沒有內容，直接返回（已經顯示過提示）
    }

    // 創建一個臨時的 textarea 來複製內容
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        alert('Markdown 格式的課表已複製到剪貼簿！');
    } catch (err) {
        // 如果複製失敗，顯示在彈窗中讓用戶手動複製
        const markdownWindow = window.open('', '_blank');
        markdownWindow.document.write(`
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <title>課表 Markdown</title>
                <style>
                    body {
                        font-family: monospace;
                        padding: 20px;
                        white-space: pre-wrap;
                        background: #f5f5f5;
                    }
                    textarea {
                        width: 100%;
                        height: 90vh;
                        font-family: monospace;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <h2>課表 Markdown</h2>
                <textarea>${markdown}</textarea>
            </body>
            </html>
        `);
        markdownWindow.document.close();
    }

    document.body.removeChild(textarea);
}

// 列印課表
function printSchedule() {
    const programSection = document.getElementById('program-section');
    if (!programSection || programSection.style.display === 'none') {
        alert('請先產生訓練計劃');
        return;
    }

    // 獲取訓練參數用於列印標題
    const squat1RM = parseFloat(document.getElementById('squat-1rm').value) || 0;
    const ohp1RM = parseFloat(document.getElementById('ohp-1rm').value) || 0;
    const deadlift1RM = parseFloat(document.getElementById('deadlift-1rm').value) || 0;
    const bench1RM = parseFloat(document.getElementById('bench-1rm').value) || 0;
    const trainingMaxMultiplier = parseFloat(document.getElementById('training-max').value) || 0.9;

    // 計算 Training Max
    const trainingMaxes = {
        squat: Math.round(squat1RM * trainingMaxMultiplier * 10) / 10,
        ohp: Math.round(ohp1RM * trainingMaxMultiplier * 10) / 10,
        deadlift: Math.round(deadlift1RM * trainingMaxMultiplier * 10) / 10,
        bench: Math.round(bench1RM * trainingMaxMultiplier * 10) / 10
    };

    // 生成列印版本的表格
    const printTableHTML = generatePrintTable(trainingMaxes);

    // 創建列印視窗
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <title>531 訓練計劃 - 列印</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #667eea;
                }
                .print-header h1 {
                    font-size: 2em;
                    color: #667eea;
                    margin-bottom: 10px;
                }
                .print-params {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 15px;
                    font-size: 0.95em;
                    color: #666;
                }
                .print-params div {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .print-params strong {
                    color: #333;
                    margin-bottom: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    margin-top: 20px;
                }
                thead {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                th {
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                td {
                    padding: 15px;
                    border: 1px solid #ddd;
                    vertical-align: top;
                }
                .week-header {
                    background: #e9ecef;
                    font-weight: 600;
                    text-align: center;
                    vertical-align: middle;
                    width: 60px;
                }
                .set-info {
                    margin: 8px 0;
                    padding: 8px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    border-left: 3px solid #667eea;
                }
                .set-header {
                    font-size: 0.9em;
                    margin-bottom: 6px;
                    color: #333;
                    font-weight: 600;
                }
                .barbell-label {
                    display: inline-block;
                    padding: 4px 8px;
                    background: #667eea;
                    color: white;
                    border-radius: 4px;
                    font-size: 0.8em;
                    font-weight: 500;
                    margin-bottom: 6px;
                }
                .combo-option {
                    padding: 4px 8px;
                    margin: 4px 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.85em;
                }
                .combo-plates {
                    color: #666;
                }
                .combo-total {
                    color: #28a745;
                    font-weight: 600;
                    margin-left: 10px;
                }
                .no-combination {
                    color: #dc3545;
                    font-size: 0.85em;
                    padding: 6px;
                    background: #fff5f5;
                    border-radius: 4px;
                    margin-top: 6px;
                }
                @media print {
                    body {
                        padding: 10px;
                    }
                    .print-header {
                        page-break-after: avoid;
                    }
                    table {
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>531 重量訓練計劃</h1>
                <p style="color: #666; margin-top: 5px;">基於 Jim Wendler 的 5/3/1 訓練法</p>
                <div class="print-params">
                    <div>
                        <strong>深蹲 1RM:</strong> ${squat1RM} kg (Training Max: ${trainingMaxes.squat} kg)
                    </div>
                    <div>
                        <strong>肩推 1RM:</strong> ${ohp1RM} kg (Training Max: ${trainingMaxes.ohp} kg)
                    </div>
                    <div>
                        <strong>硬舉 1RM:</strong> ${deadlift1RM} kg (Training Max: ${trainingMaxes.deadlift} kg)
                    </div>
                    <div>
                        <strong>臥推 1RM:</strong> ${bench1RM} kg (Training Max: ${trainingMaxes.bench} kg)
                    </div>
                </div>
            </div>
            ${printTableHTML}
        </body>
        </html>
    `);
    printWindow.document.close();

    // 等待內容載入後列印
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    if (!equipment) {
        initializeEquipment();
    } else {
        if (!equipment.barbells || equipment.barbells.length === 0) {
            initializeEquipment();
        }
        if (!equipment.plates || Object.keys(equipment.plates).length === 0) {
            equipment.plates = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT.plates));
            saveEquipment();
        }
    }

    load1RMValues();
    renderEquipment();

    const generateBtn = document.getElementById('generate-btn');
    const addBarbellBtn = document.getElementById('add-barbell-btn');
    const resetBarbellsBtn = document.getElementById('reset-barbells-btn');
    const addPlateTypeBtn = document.getElementById('add-plate-type-btn');
    const resetPlatesBtn = document.getElementById('reset-plates-btn');
    const saveAllBtn = document.getElementById('save-all-btn');
    const printBtn = document.getElementById('print-btn');
    const exportMarkdownBtn = document.getElementById('export-markdown-btn');

    if (generateBtn) {
        generateBtn.addEventListener('click', generateProgram);
    }
    if (addBarbellBtn) {
        addBarbellBtn.addEventListener('click', addBarbell);
    }
    if (resetBarbellsBtn) {
        resetBarbellsBtn.addEventListener('click', resetBarbells);
    }
    if (addPlateTypeBtn) {
        addPlateTypeBtn.addEventListener('click', function() {
            addPlateType();
        });
    }
    if (resetPlatesBtn) {
        resetPlatesBtn.addEventListener('click', resetPlates);
    }
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllSettings);
    }
    if (printBtn) {
        printBtn.addEventListener('click', printSchedule);
    }
    if (exportMarkdownBtn) {
        exportMarkdownBtn.addEventListener('click', exportToMarkdown);
    }
});

// 將函數暴露到全局作用域（用於 HTML 中的 onclick）
window.updateBarbellName = updateBarbellName;
window.updateBarbellWeight = updateBarbellWeight;
window.updateBarbellMaxWeight = updateBarbellMaxWeight;
window.updateBarbellExercises = updateBarbellExercises;
window.updatePlate = updatePlate;
window.updatePlateWeight = updatePlateWeight;
window.addPlateType = addPlateType;
window.removePlateType = removePlateType;
window.resetPlates = resetPlates;
// 切換設備配置區塊的展開/摺疊
function toggleEquipmentSection() {
    const equipmentGrid = document.getElementById('equipment-grid');
    const collapseIcon = document.getElementById('equipment-collapse-icon');

    if (equipmentGrid) {
        if (equipmentGrid.style.display === 'none') {
            equipmentGrid.style.display = 'grid';
            collapseIcon.textContent = '▼';
        } else {
            equipmentGrid.style.display = 'none';
            collapseIcon.textContent = '▶';
        }
    }
}

window.removeBarbell = removeBarbell;
window.selectBarbell = selectBarbell;
window.selectCombination = selectCombination;
window.toggleEquipmentSection = toggleEquipmentSection;
