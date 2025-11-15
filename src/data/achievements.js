// Achievement definitions - basic achievements for progression tracking

export const ACHIEVEMENTS = {
    // Floor progression achievements
    floor2: {
        id: 'floor2',
        name: 'Floor 2 Reached',
        description: 'Reach Floor 2',
        category: 'progression',
        icon: '2️⃣',
        unlocked: false
    },
    floor3: {
        id: 'floor3',
        name: 'Floor 3 Reached',
        description: 'Reach Floor 3',
        category: 'progression',
        icon: '3️⃣',
        unlocked: false
    },
    floor5: {
        id: 'floor5',
        name: 'Floor 5 Reached',
        description: 'Reach Floor 5',
        category: 'progression',
        icon: '5️⃣',
        unlocked: false
    },
    floor10: {
        id: 'floor10',
        name: 'Floor 10 Reached',
        description: 'Reach Floor 10',
        category: 'progression',
        icon: '🔟',
        unlocked: false
    },
    
    // Combat achievements
    firstKill: {
        id: 'firstKill',
        name: 'First Blood',
        description: 'Kill your first enemy',
        category: 'combat',
        icon: '⚔️',
        unlocked: false
    },
    kill100: {
        id: 'kill100',
        name: 'Enemy Slayer',
        description: 'Kill 100 enemies',
        category: 'combat',
        icon: '🗡️',
        unlocked: false
    },
    kill500: {
        id: 'kill500',
        name: 'Massacre',
        description: 'Kill 500 enemies',
        category: 'combat',
        icon: '💀',
        unlocked: false
    },
    kill1000: {
        id: 'kill1000',
        name: 'Genocide',
        description: 'Kill 1000 enemies',
        category: 'combat',
        icon: '☠️',
        unlocked: false
    },
    
    // Boss achievements
    firstBoss: {
        id: 'firstBoss',
        name: 'Boss Hunter',
        description: 'Defeat your first boss',
        category: 'boss',
        icon: '👑',
        unlocked: false
    },
    boss5: {
        id: 'boss5',
        name: 'Boss Slayer',
        description: 'Defeat 5 bosses',
        category: 'boss',
        icon: '🏆',
        unlocked: false
    },
    
    // Run achievements
    firstRun: {
        id: 'firstRun',
        name: 'First Run',
        description: 'Complete your first run',
        category: 'run',
        icon: '🎮',
        unlocked: false
    },
    run10: {
        id: 'run10',
        name: 'Veteran',
        description: 'Complete 10 runs',
        category: 'run',
        icon: '⭐',
        unlocked: false
    },
    run50: {
        id: 'run50',
        name: 'Dedicated',
        description: 'Complete 50 runs',
        category: 'run',
        icon: '🌟',
        unlocked: false
    },
    
    // Upgrade achievements
    level10: {
        id: 'level10',
        name: 'Level 10',
        description: 'Reach level 10 in a single run',
        category: 'upgrade',
        icon: '📈',
        unlocked: false
    },
    level20: {
        id: 'level20',
        name: 'Level 20',
        description: 'Reach level 20 in a single run',
        category: 'upgrade',
        icon: '📊',
        unlocked: false
    },
    
    // Currency achievements
    earn100: {
        id: 'earn100',
        name: 'Rich',
        description: 'Earn 100 credits total',
        category: 'currency',
        icon: '💰',
        unlocked: false
    },
    earn500: {
        id: 'earn500',
        name: 'Wealthy',
        description: 'Earn 500 credits total',
        category: 'currency',
        icon: '💎',
        unlocked: false
    },
    earn1000: {
        id: 'earn1000',
        name: 'Millionaire',
        description: 'Earn 1000 credits total',
        category: 'currency',
        icon: '💵',
        unlocked: false
    }
};

// Get achievements by category
export function getAchievementsByCategory(category) {
    return Object.values(ACHIEVEMENTS).filter(ach => ach.category === category);
}

// Get all achievement categories
export function getAchievementCategories() {
    const categories = new Set();
    Object.values(ACHIEVEMENTS).forEach(ach => categories.add(ach.category));
    return Array.from(categories);
}


