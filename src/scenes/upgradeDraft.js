// Upgrade draft UI scene
import { getRandomUpgrades, applyUpgrade, getUpgradeDescription } from '../systems/upgrades.js';
import { trackUpgrade, checkAndApplySynergies } from '../systems/synergies.js';

// Track if upgrade draft is currently showing
let upgradeDraftActive = false;

export function showUpgradeDraft(k, player, onSelect) {
    // Don't show if already showing
    if (upgradeDraftActive) return;
    
    // Mark upgrade draft as active
    upgradeDraftActive = true;
    
    // Pause the game
    k.paused = true;
    
    // Get 3 random upgrades (weapon-aware)
    const upgrades = getRandomUpgrades(3, player);
    
    // Debug: Log that we're creating the draft
    console.log('Creating upgrade draft with', upgrades.length, 'upgrades');
    
    // Create overlay background
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.anchor('topleft'),
        k.color(0, 0, 0),
        k.opacity(0.8),
        k.fixed(),
        k.z(1000),
        'upgradeOverlay'
    ]);
    
    // Title
    const title = k.add([
        k.text('Level Up! Choose an Upgrade', { size: 32 }),
        k.pos(k.width() / 2, 80),
        k.anchor('center'),
        k.color(255, 255, 100),
        k.fixed(),
        k.z(1001),
        'upgradeUI'
    ]);
    
    // Debug: Test if title is visible
    console.log('Title created at', k.width() / 2, 80);
    
    // Create upgrade cards
    const cardWidth = 200;
    const cardHeight = 150;
    const spacing = 250;
    const startX = k.width() / 2 - (spacing * (upgrades.length - 1)) / 2;
    const cardY = k.height() / 2;
    
    const cards = [];
    
    upgrades.forEach((upgrade, index) => {
        const cardX = startX + (index * spacing);
        
        // Card background
        const cardBg = k.add([
            k.rect(cardWidth, cardHeight),
            k.pos(cardX, cardY),
            k.anchor('center'),
            k.color(50, 50, 50),
            k.outline(2, k.rgb(150, 150, 150)),
            k.fixed(),
            k.z(1001),
            k.area(),
            'upgradeUI',
            'upgradeCard'
        ]);
        
        // Upgrade name (with width constraint to prevent overflow)
        const nameText = k.add([
            k.text(upgrade.name, { size: 20, width: cardWidth - 20 }),
            k.pos(cardX, cardY - 40),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(1002),
            'upgradeUI'
        ]);
        
        // Upgrade description (with stack count, width constraint to prevent overflow)
        const description = getUpgradeDescription(upgrade, player);
        const descText = k.add([
            k.text(description, { size: 16, width: cardWidth - 20 }),
            k.pos(cardX, cardY + 10),
            k.anchor('center'),
            k.color(200, 200, 200),
            k.fixed(),
            k.z(1002),
            'upgradeUI'
        ]);
        
        // Selection number
        const numText = k.add([
            k.text(`${index + 1}`, { size: 24 }),
            k.pos(cardX, cardY - 60),
            k.anchor('center'),
            k.color(255, 255, 100),
            k.fixed(),
            k.z(1002),
            'upgradeUI'
        ]);
        
        cards.push({
            card: cardBg,
            upgrade: upgrade,
            index: index
        });
        
        // Make card clickable - card background handles all clicks
        cardBg.onClick(() => {
            if (!upgradeDraftActive) return;
            selectUpgrade(index);
        });
    });
    
    // Selection function
    function selectUpgrade(index) {
        if (!upgradeDraftActive) return; // Prevent double-selection
        
        const selected = upgrades[index];
        
        // Mark upgrade draft as inactive first to prevent re-entry
        upgradeDraftActive = false;
        
        // Note: Key handlers don't need to be removed - they check upgradeDraftActive flag
        // and will return early if the draft is not active
        
        // Apply upgrade
        applyUpgrade(player, selected.key);
        
        // Track upgrade for synergies
        trackUpgrade(player, selected.key);
        
        // Check and apply synergies
        checkAndApplySynergies(k, player);
        
        // Remove UI
        k.get('upgradeUI').forEach(obj => k.destroy(obj));
        k.get('upgradeOverlay').forEach(obj => k.destroy(obj));
        
        // Unpause game
        k.paused = false;
        
        // Callback (call after unpausing)
        k.wait(0.1, () => {
            if (onSelect) {
                onSelect(selected);
            }
        });
    }
    
    // Keyboard selection (1, 2, 3)
    const keyHandler1 = () => {
        if (upgradeDraftActive && upgrades.length >= 1) {
            selectUpgrade(0);
        }
    };
    const keyHandler2 = () => {
        if (upgradeDraftActive && upgrades.length >= 2) {
            selectUpgrade(1);
        }
    };
    const keyHandler3 = () => {
        if (upgradeDraftActive && upgrades.length >= 3) {
            selectUpgrade(2);
        }
    };
    
    k.onKeyPress('1', keyHandler1);
    k.onKeyPress('2', keyHandler2);
    k.onKeyPress('3', keyHandler3);
}

// Export function to check if upgrade draft is active (for pause menu)
export function isUpgradeDraftActive() {
    return upgradeDraftActive;
}

