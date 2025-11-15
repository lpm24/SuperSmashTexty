// Achievement checking system - checks and unlocks achievements based on stats

import { getSaveStats, unlockAchievement, isAchievementUnlocked } from './metaProgression.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

// Check all achievements based on current stats
export function checkAchievements(k) {
    const stats = getSaveStats();
    const newlyUnlocked = [];
    
    // Floor progression achievements
    if (stats.bestFloor >= 2 && !isAchievementUnlocked('floor2')) {
        if (unlockAchievement('floor2')) newlyUnlocked.push('floor2');
    }
    if (stats.bestFloor >= 3 && !isAchievementUnlocked('floor3')) {
        if (unlockAchievement('floor3')) newlyUnlocked.push('floor3');
    }
    if (stats.bestFloor >= 5 && !isAchievementUnlocked('floor5')) {
        if (unlockAchievement('floor5')) newlyUnlocked.push('floor5');
    }
    if (stats.bestFloor >= 10 && !isAchievementUnlocked('floor10')) {
        if (unlockAchievement('floor10')) newlyUnlocked.push('floor10');
    }
    
    // Combat achievements
    if (stats.totalEnemiesKilled >= 1 && !isAchievementUnlocked('firstKill')) {
        if (unlockAchievement('firstKill')) newlyUnlocked.push('firstKill');
    }
    if (stats.totalEnemiesKilled >= 100 && !isAchievementUnlocked('kill100')) {
        if (unlockAchievement('kill100')) newlyUnlocked.push('kill100');
    }
    if (stats.totalEnemiesKilled >= 500 && !isAchievementUnlocked('kill500')) {
        if (unlockAchievement('kill500')) newlyUnlocked.push('kill500');
    }
    if (stats.totalEnemiesKilled >= 1000 && !isAchievementUnlocked('kill1000')) {
        if (unlockAchievement('kill1000')) newlyUnlocked.push('kill1000');
    }
    
    // Boss achievements
    if (stats.totalBossesKilled >= 1 && !isAchievementUnlocked('firstBoss')) {
        if (unlockAchievement('firstBoss')) newlyUnlocked.push('firstBoss');
    }
    if (stats.totalBossesKilled >= 5 && !isAchievementUnlocked('boss5')) {
        if (unlockAchievement('boss5')) newlyUnlocked.push('boss5');
    }
    
    // Run achievements
    if (stats.totalRuns >= 1 && !isAchievementUnlocked('firstRun')) {
        if (unlockAchievement('firstRun')) newlyUnlocked.push('firstRun');
    }
    if (stats.totalRuns >= 10 && !isAchievementUnlocked('run10')) {
        if (unlockAchievement('run10')) newlyUnlocked.push('run10');
    }
    if (stats.totalRuns >= 50 && !isAchievementUnlocked('run50')) {
        if (unlockAchievement('run50')) newlyUnlocked.push('run50');
    }
    
    // Upgrade achievements (best level in a run)
    if (stats.bestLevel >= 10 && !isAchievementUnlocked('level10')) {
        if (unlockAchievement('level10')) newlyUnlocked.push('level10');
    }
    if (stats.bestLevel >= 20 && !isAchievementUnlocked('level20')) {
        if (unlockAchievement('level20')) newlyUnlocked.push('level20');
    }
    
    // Currency achievements
    if (stats.totalCurrencyEarned >= 100 && !isAchievementUnlocked('earn100')) {
        if (unlockAchievement('earn100')) newlyUnlocked.push('earn100');
    }
    if (stats.totalCurrencyEarned >= 500 && !isAchievementUnlocked('earn500')) {
        if (unlockAchievement('earn500')) newlyUnlocked.push('earn500');
    }
    if (stats.totalCurrencyEarned >= 1000 && !isAchievementUnlocked('earn1000')) {
        if (unlockAchievement('earn1000')) newlyUnlocked.push('earn1000');
    }
    
    // Show notifications for newly unlocked achievements
    if (newlyUnlocked.length > 0 && k) {
        newlyUnlocked.forEach((achId, index) => {
            const achievement = ACHIEVEMENTS[achId];
            if (achievement) {
                k.wait(index * 0.5, () => {
                    showAchievementNotification(k, achievement);
                });
            }
        });
    }
    
    return newlyUnlocked;
}

// Show achievement unlock notification
function showAchievementNotification(k, achievement) {
    const notification = k.add([
        k.text(`Achievement Unlocked!`, { size: 20 }),
        k.pos(k.width() / 2, k.height() / 2 - 40),
        k.anchor('center'),
        k.color(255, 255, 100),
        k.fixed(),
        k.z(3000)
    ]);
    
    const nameText = k.add([
        k.text(`${achievement.icon} ${achievement.name}`, { size: 24 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor('center'),
        k.color(255, 200, 100),
        k.fixed(),
        k.z(3000)
    ]);
    
    const descText = k.add([
        k.text(achievement.description, { size: 16 }),
        k.pos(k.width() / 2, k.height() / 2 + 30),
        k.anchor('center'),
        k.color(200, 200, 200),
        k.fixed(),
        k.z(3000)
    ]);
    
    // Fade out after 3 seconds
    k.wait(3, () => {
        if (notification.exists()) k.destroy(notification);
        if (nameText.exists()) k.destroy(nameText);
        if (descText.exists()) k.destroy(descText);
    });
}


