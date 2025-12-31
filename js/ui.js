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
