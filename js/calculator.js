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

// 計算訓練重量
function calculateTrainingWeight(percentage, trainingMax) {
    return Math.round((trainingMax * percentage / 100) * 10) / 10;
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
