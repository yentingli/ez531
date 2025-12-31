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
