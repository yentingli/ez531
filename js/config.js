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
