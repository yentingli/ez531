// 全局存儲組合數據和選擇的槓鈴
let combinationDataStore = {};
let selectedBarbellStore = {};

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
