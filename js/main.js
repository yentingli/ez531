// 立即初始化
initializeEquipment();
loadSelectedBarbells();

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
window.removeBarbell = removeBarbell;
window.selectBarbell = selectBarbell;
window.selectCombination = selectCombination;
window.toggleEquipmentSection = toggleEquipmentSection;
