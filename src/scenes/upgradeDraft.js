// Upgrade draft UI scene
import { getRandomUpgrades, applyUpgrade, getUpgradeDescription } from '../systems/upgrades.js';
import { trackUpgrade, checkAndApplySynergies } from '../systems/synergies.js';
import { playUpgradeSelect } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS
} from '../config/uiConfig.js';

// Track if upgrade draft is currently showing
let upgradeDraftActive = false;

export function showUpgradeDraft(k, player, onSelect) {
    // Don't show if already showing
    if (upgradeDraftActive) return;

    // Mark upgrade draft as active
    upgradeDraftActive = true;

    // Pause the game
    k.paused = true;

    // Save tooltip state and hide it (accessed from k.gameData if available)
    if (k.gameData && k.gameData.saveTooltipState && k.gameData.hideTooltip) {
        k.gameData.tooltipSavedState = k.gameData.saveTooltipState();
        k.gameData.hideTooltip();
    }

    // Save current minimap mode (accessed from k.gameData if available)
    if (k.gameData && k.gameData.minimap) {
        k.gameData.minimapSavedMode = k.gameData.minimap.mode;
        // Set minimap to maximized for better visibility during upgrade selection
        if (k.gameData.minimap.mode !== 'maximized') {
            k.gameData.minimap.mode = 'maximized';
            k.gameData.minimap.update();
        }
    }
    
    // Get 3 random upgrades (weapon-aware)
    const upgrades = getRandomUpgrades(3, player);
    
    // Debug: Log that we're creating the draft
    console.log('Creating upgrade draft with', upgrades.length, 'upgrades');
    
    // Create overlay background
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.anchor('topleft'),
        k.color(...UI_COLORS.BG_DARK),
        k.opacity(0.9),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL),
        'upgradeOverlay'
    ]);

    // Title
    const title = k.add([
        k.text('Level Up! Choose an Upgrade', { size: UI_TEXT_SIZES.TITLE }),
        k.pos(k.width() / 2, 80),
        k.anchor('center'),
        k.color(...UI_COLORS.WARNING),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
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
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            k.area(),
            'upgradeUI',
            'upgradeCard'
        ]);

        // Upgrade icon (large and prominent)
        if (upgrade.icon) {
            const iconColor = upgrade.category === 'passive'
                ? UI_COLORS.SUCCESS
                : (upgrade.weaponKey ? UI_COLORS.WARNING : UI_COLORS.INFO);

            k.add([
                k.text(upgrade.icon, { size: 48 }),
                k.pos(cardX, cardY - 50),
                k.anchor('center'),
                k.color(...iconColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 2),
                'upgradeUI'
            ]);
        }

        // Upgrade name (with width constraint to prevent overflow)
        const nameText = k.add([
            k.text(upgrade.name, { size: UI_TEXT_SIZES.BUTTON, width: cardWidth - 20 }),
            k.pos(cardX, cardY - 5),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 2),
            'upgradeUI'
        ]);

        // Upgrade description (with stack count, width constraint to prevent overflow)
        const description = getUpgradeDescription(upgrade, player);
        const descText = k.add([
            k.text(description, { size: UI_TEXT_SIZES.BODY, width: cardWidth - 20 }),
            k.pos(cardX, cardY + 30),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 2),
            'upgradeUI'
        ]);

        // Selection number (top-right corner of card)
        const numText = k.add([
            k.text(`${index + 1}`, { size: UI_TEXT_SIZES.HEADER }),
            k.pos(cardX + cardWidth / 2 - 20, cardY - cardHeight / 2 + 15),
            k.anchor('center'),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 2),
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

        // Play upgrade selection sound
        playUpgradeSelect();

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

        // Restore minimap mode
        if (k.gameData && k.gameData.minimap && k.gameData.minimapSavedMode !== undefined) {
            k.gameData.minimap.mode = k.gameData.minimapSavedMode;
            k.gameData.minimap.update();
            k.gameData.minimapSavedMode = undefined;
        }

        // Unpause game
        k.paused = false;

        // Restore tooltip state after unpausing
        if (k.gameData && k.gameData.restoreTooltipState && k.gameData.tooltipSavedState) {
            k.gameData.restoreTooltipState(k.gameData.tooltipSavedState);
            k.gameData.tooltipSavedState = undefined;
        }
        
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

