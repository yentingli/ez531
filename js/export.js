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
