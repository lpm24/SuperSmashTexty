// Statistics and Achievements scene
import { getSaveStats, getUnlockedAchievements } from '../systems/metaProgression.js';
import { ACHIEVEMENTS, getAchievementCategories, getAchievementsByCategory } from '../data/achievements.js';

export function setupStatisticsScene(k) {
    k.scene('statistics', () => {
        const stats = getSaveStats();
        const unlockedAchievements = getUnlockedAchievements();
        let currentTab = 'stats'; // stats or achievements
        
        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(20, 20, 30),
            k.fixed(),
            k.z(0)
        ]);
        
        // Title
        k.add([
            k.text('STATISTICS & ACHIEVEMENTS', { size: 32 }),
            k.pos(k.width() / 2, 40),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Tab buttons
        const tabY = 90;
        const tabSpacing = 150;
        const tabWidth = 150;
        const tabHeight = 30;
        
        const tabs = [
            { key: 'stats', label: 'Statistics' },
            { key: 'achievements', label: 'Achievements' }
        ];
        
        const tabButtons = [];
        tabs.forEach((tab, index) => {
            const tabX = k.width() / 2 - (tabs.length * tabSpacing) / 2 + index * tabSpacing;
            const isActive = currentTab === tab.key;
            
            const tabBg = k.add([
                k.rect(tabWidth, tabHeight),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(isActive ? 100 : 50, isActive ? 100 : 50, isActive ? 150 : 80),
                k.outline(2, k.rgb(150, 150, 150)),
                k.area(),
                k.fixed(),
                k.z(1000)
            ]);
            
            const tabLabel = k.add([
                k.text(tab.label, { size: 16 }),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(isActive ? 255 : 150, isActive ? 255 : 150, isActive ? 255 : 150),
                k.fixed(),
                k.z(1001)
            ]);
            
            tabBg.onClick(() => {
                currentTab = tab.key;
                refreshContent();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, key: tab.key });
        });
        
        // Content area
        const contentY = 140;
        let contentItems = [];
        
        // Refresh content display
        function refreshContent() {
            // Update tab visuals
            tabButtons.forEach(tab => {
                const isActive = currentTab === tab.key;
                tab.bg.color = k.rgb(
                    isActive ? 100 : 50,
                    isActive ? 100 : 50,
                    isActive ? 150 : 80
                );
                tab.label.color = k.rgb(
                    isActive ? 255 : 150,
                    isActive ? 255 : 150,
                    isActive ? 255 : 150
                );
            });
            
            // Clear existing items
            contentItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            contentItems = [];
            
            if (currentTab === 'stats') {
                // Display statistics
                const statsY = contentY + 20;
                const statsSpacing = 30;
                
                const statLabels = [
                    { label: 'Total Runs', value: stats.totalRuns || 0 },
                    { label: 'Best Floor', value: stats.bestFloor || 1 },
                    { label: 'Best Room', value: stats.bestRoom || 1 },
                    { label: 'Best Level', value: stats.bestLevel || 1 },
                    { label: 'Total Enemies Killed', value: stats.totalEnemiesKilled || 0 },
                    { label: 'Total Bosses Killed', value: stats.totalBossesKilled || 0 },
                    { label: 'Total Rooms Cleared', value: stats.totalRoomsCleared || 0 },
                    { label: 'Total Floors Reached', value: stats.totalFloorsReached || 0 },
                    { label: 'Total Currency Earned', value: stats.totalCurrencyEarned || 0 }
                ];
                
                statLabels.forEach((stat, index) => {
                    const y = statsY + index * statsSpacing;
                    
                    // Label
                    const labelText = k.add([
                        k.text(stat.label + ':', { size: 18 }),
                        k.pos(200, y),
                        k.anchor('left'),
                        k.color(200, 200, 200),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    // Value
                    const valueText = k.add([
                        k.text(stat.value.toString(), { size: 18 }),
                        k.pos(500, y),
                        k.anchor('left'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    contentItems.push(labelText, valueText);
                });
                
            } else if (currentTab === 'achievements') {
                // Display achievements by category
                const categories = getAchievementCategories();
                let currentY = contentY + 20;
                
                categories.forEach(category => {
                    // Category header
                    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                    const headerText = k.add([
                        k.text(categoryName, { size: 20 }),
                        k.pos(k.width() / 2, currentY),
                        k.anchor('center'),
                        k.color(255, 200, 100),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    contentItems.push(headerText);
                    currentY += 35;
                    
                    // Achievements in this category
                    const categoryAchievements = getAchievementsByCategory(category);
                    categoryAchievements.forEach((achievement, index) => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        const y = currentY + index * 50;
                        
                        // Achievement card
                        const cardBg = k.add([
                            k.rect(700, 45),
                            k.pos(k.width() / 2, y),
                            k.anchor('center'),
                            k.color(isUnlocked ? 40 : 30, isUnlocked ? 40 : 30, isUnlocked ? 50 : 30),
                            k.outline(2, k.rgb(isUnlocked ? 100 : 50, isUnlocked ? 100 : 50, isUnlocked ? 150 : 50)),
                            k.fixed(),
                            k.z(1000)
                        ]);
                        
                        // Icon
                        const iconText = k.add([
                            k.text(achievement.icon, { size: 24 }),
                            k.pos(50, y),
                            k.anchor('left'),
                            k.color(isUnlocked ? 255 : 100, isUnlocked ? 255 : 100, isUnlocked ? 255 : 100),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        
                        // Name
                        const nameText = k.add([
                            k.text(achievement.name, { size: 18 }),
                            k.pos(100, y - 10),
                            k.anchor('left'),
                            k.color(isUnlocked ? 255 : 150, isUnlocked ? 255 : 150, isUnlocked ? 255 : 150),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        
                        // Description
                        const descText = k.add([
                            k.text(achievement.description, { size: 14 }),
                            k.pos(100, y + 10),
                            k.anchor('left'),
                            k.color(isUnlocked ? 200 : 100, isUnlocked ? 200 : 100, isUnlocked ? 200 : 100),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        
                        // Status
                        const statusText = k.add([
                            k.text(isUnlocked ? 'UNLOCKED' : 'LOCKED', { size: 14 }),
                            k.pos(650, y),
                            k.anchor('right'),
                            k.color(isUnlocked ? 100 : 150, isUnlocked ? 255 : 150, isUnlocked ? 100 : 150),
                            k.fixed(),
                            k.z(1001)
                        ]);
                        
                        contentItems.push(cardBg, iconText, nameText, descText, statusText);
                    });
                    
                    currentY += categoryAchievements.length * 50 + 20;
                });
                
                // Achievement progress
                const totalAchievements = Object.keys(ACHIEVEMENTS).length;
                const unlockedCount = unlockedAchievements.length;
                const progressText = k.add([
                    k.text(`Progress: ${unlockedCount}/${totalAchievements} (${Math.round(unlockedCount / totalAchievements * 100)}%)`, { size: 18 }),
                    k.pos(k.width() / 2, k.height() - 80),
                    k.anchor('center'),
                    k.color(200, 200, 255),
                    k.fixed(),
                    k.z(1000)
                ]);
                contentItems.push(progressText);
            }
        }
        
        // Initial refresh
        refreshContent();
        
        // Back button
        const backButton = k.add([
            k.rect(120, 35),
            k.pos(20, k.height() - 40),
            k.anchor('topleft'),
            k.color(80, 80, 100),
            k.outline(2, k.rgb(150, 150, 150)),
            k.area(),
            k.fixed(),
            k.z(1000)
        ]);
        
        const backText = k.add([
            k.text('ESC: Back', { size: 16 }),
            k.pos(80, k.height() - 22),
            k.anchor('center'),
            k.color(200, 200, 200),
            k.fixed(),
            k.z(1001)
        ]);
        
        backButton.onClick(() => {
            k.go('menu');
        });
        
        k.onKeyPress('escape', () => {
            k.go('menu');
        });
    });
}

