// Upgrade draft UI scene
import { getRandomUpgrades, applyUpgrade, getUpgradeDescription } from '../systems/upgrades.js';
import { trackUpgrade, checkAndApplySynergies } from '../systems/synergies.js';
import { playUpgradeSelect, playMenuNav } from '../systems/sounds.js';
import { isMultiplayerActive, getUpgradeRNG, broadcastUpgradeSelected, broadcastSynergyActivated } from '../systems/multiplayerGame.js';
import { getPermanentUpgradeLevel } from '../systems/metaProgression.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS
} from '../config/uiConfig.js';

// Track if upgrade draft is currently showing
let upgradeDraftActive = false;

export function showUpgradeDraft(k, player, onSelect, playerName = null, levelOverride = null, rerollsAvailable = null) {
    // Don't show if already showing
    if (upgradeDraftActive) return;

    // Mark upgrade draft as active
    upgradeDraftActive = true;

    // Pause the game (but not in multiplayer mode)
    const inMultiplayer = isMultiplayerActive();
    if (!inMultiplayer) {
        k.paused = true;
    }

    // Save tooltip state and hide it (accessed from k.gameData if available)
    if (k.gameData && k.gameData.saveTooltipState && k.gameData.hideTooltip) {
        k.gameData.tooltipSavedState = k.gameData.saveTooltipState();
        k.gameData.hideTooltip();
    }

    // Save current minimap mode (accessed from k.gameData if available)
    // Note: We just save the mode here - actual update happens AFTER overlay is created
    // to hide any visual artifacts from the minimap redrawing
    let minimapNeedsUpdate = false;
    if (k.gameData && k.gameData.minimap) {
        k.gameData.minimapSavedMode = k.gameData.minimap.mode;
        // Mark that we need to update minimap after overlay is created
        if (k.gameData.minimap.mode !== 'maximized') {
            minimapNeedsUpdate = true;
        }
    }

    // Get permanent upgrade levels for Tough Choices and Mulligan
    const toughChoicesLevel = getPermanentUpgradeLevel('toughChoices');
    const mulliganLevel = getPermanentUpgradeLevel('mulligan');

    // Calculate number of upgrade options (base 3 + toughChoices level)
    const numUpgradeOptions = 3 + toughChoicesLevel;

    // Track rerolls remaining for this draft
    // Use passed rerollsAvailable if provided (per-run persistence), otherwise fallback to mulliganLevel
    let rerollsRemaining = rerollsAvailable !== null ? rerollsAvailable : mulliganLevel;
    let rerollSeed = 0; // Increment each reroll for different results

    // Get random upgrades (weapon-aware)
    // In multiplayer, use seeded RNG for deterministic upgrade generation
    // Use levelOverride if provided to ensure different upgrades for sequential level ups
    function generateUpgrades() {
        let upgradeRng = null;
        if (isMultiplayerActive()) {
            const playerIndex = player.playerIndex !== undefined ? player.playerIndex : 0;
            const playerLevel = levelOverride || player.level || 1;
            upgradeRng = getUpgradeRNG(playerIndex, playerLevel + rerollSeed * 100);
        }
        return getRandomUpgrades(numUpgradeOptions, player, upgradeRng);
    }

    let upgrades = generateUpgrades();

    // Create overlay background FIRST with full opacity to immediately cover everything
    // This prevents visual artifacts from minimap updates or other UI changes showing through
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.anchor('topleft'),
        k.color(...UI_COLORS.BG_DARK),
        k.opacity(1.0), // Start fully opaque to hide any visual artifacts
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL),
        'upgradeOverlay'
    ]);

    // Now update the minimap (after overlay is created to hide visual artifacts)
    if (minimapNeedsUpdate && k.gameData && k.gameData.minimap) {
        k.gameData.minimap.mode = 'maximized';
        k.gameData.minimap.update();
    }

    // Fade overlay to target opacity after a brief moment (allows clean UI creation)
    k.wait(0.05, () => {
        if (overlay.exists()) {
            overlay.opacity = 0.9;
        }
    });

    // Title - show player name on its own smaller line in multiplayer
    // Player name on a separate line so the main title never clips at 800px
    if (inMultiplayer && playerName) {
        k.add([
            k.text(playerName, { size: UI_TEXT_SIZES.H2, width: k.width() - 80 }),
            k.pos(k.width() / 2, 56),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            'upgradeUI'
        ]);
    }
    const title = k.add([
        k.text('Level Up! Choose an Upgrade', { size: UI_TEXT_SIZES.H1, width: k.width() - 80 }),
        k.pos(k.width() / 2, 80),
        k.anchor('center'),
        k.color(...UI_COLORS.WARNING),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1),
        'upgradeUI'
    ]);

    // Function to create upgrade cards (called on initial and reroll)
    function createUpgradeCards() {
        // Clear existing cards
        k.get('upgradeCard').forEach(obj => k.destroy(obj));

        // Dynamic card sizing based on number of options
        const baseCardWidth = 200;
        const baseCardHeight = 150;
        const maxTotalWidth = k.width() - 40; // Leave margins

        // Calculate card size and spacing based on number of upgrades
        let cardWidth, cardHeight, spacing;
        if (upgrades.length <= 3) {
            cardWidth = baseCardWidth;
            cardHeight = baseCardHeight;
            spacing = 250;
        } else if (upgrades.length <= 5) {
            cardWidth = 160;
            cardHeight = 130;
            spacing = 180;
        } else {
            // For 6+ cards, scale down further
            const availableWidth = maxTotalWidth / upgrades.length;
            cardWidth = Math.min(140, availableWidth - 10);
            cardHeight = 120;
            spacing = cardWidth + 10;
        }

        const startX = k.width() / 2 - (spacing * (upgrades.length - 1)) / 2;
        const cardY = k.height() / 2;

        const cards = [];

        upgrades.forEach((upgrade, index) => {
            const cardX = startX + (index * spacing);

            // Category color (passive=SUCCESS, weapon=WARNING, other=INFO)
            // Used for both the icon tint and the card outline so category is scannable
            const categoryColor = upgrade.category === 'passive'
                ? UI_COLORS.SUCCESS
                : (upgrade.weaponKey ? UI_COLORS.WARNING : UI_COLORS.INFO);

            // Card background
            const cardBg = k.add([
                k.rect(cardWidth, cardHeight),
                k.pos(cardX, cardY),
                k.anchor('center'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...categoryColor)),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 1),
                k.area(),
                k.scale(1),
                'upgradeUI',
                'upgradeCard'
            ]);

            // Hover feedback: brighten, white border, slight scale up, nav sound
            cardBg.isHovered = false;
            cardBg.onHoverUpdate(() => {
                if (!cardBg.isHovered) {
                    cardBg.isHovered = true;
                    playMenuNav();
                }
                k.setCursor('pointer');
                cardBg.color = k.rgb(...UI_COLORS.BG_LIGHT);
                cardBg.outline.color = k.rgb(...UI_COLORS.BORDER_HOVER);
                cardBg.scale = k.vec2(1.04, 1.04);
            });
            cardBg.onHoverEnd(() => {
                cardBg.isHovered = false;
                cardBg.color = k.rgb(...UI_COLORS.BG_MEDIUM);
                cardBg.outline.color = k.rgb(...categoryColor);
                cardBg.scale = k.vec2(1, 1);
            });

            // Upgrade icon (scale based on card size)
            const iconSize = cardWidth <= 140 ? 32 : 48;
            if (upgrade.icon) {
                const iconColor = categoryColor;

                k.add([
                    k.text(upgrade.icon, { size: iconSize }),
                    k.pos(cardX, cardY - cardHeight/3),
                    k.anchor('center'),
                    k.color(...iconColor),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.MODAL + 2),
                    'upgradeUI',
                    'upgradeCard'
                ]);
            }

            // Upgrade name (scale text size based on card width)
            const nameSize = cardWidth <= 140 ? UI_TEXT_SIZES.TINY : UI_TEXT_SIZES.BUTTON;
            k.add([
                k.text(upgrade.name, { size: nameSize, width: cardWidth - 10 }),
                k.pos(cardX, cardY - 5),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 2),
                'upgradeUI',
                'upgradeCard'
            ]);

            // Upgrade description (scale text size based on card width)
            const descSize = cardWidth <= 140 ? 10 : UI_TEXT_SIZES.BODY;
            const description = getUpgradeDescription(upgrade, player);
            k.add([
                k.text(description, { size: descSize, width: cardWidth - 10 }),
                k.pos(cardX, cardY + 25),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 2),
                'upgradeUI',
                'upgradeCard'
            ]);

            // Selection number (top-right corner of card)
            const numSize = cardWidth <= 140 ? UI_TEXT_SIZES.SMALL : UI_TEXT_SIZES.HEADER;
            k.add([
                k.text(`${index + 1}`, { size: numSize }),
                k.pos(cardX + cardWidth / 2 - 15, cardY - cardHeight / 2 + 12),
                k.anchor('center'),
                k.color(...UI_COLORS.WARNING),
                k.fixed(),
                k.z(UI_Z_LAYERS.MODAL + 2),
                'upgradeUI',
                'upgradeCard'
            ]);

            cards.push({
                card: cardBg,
                upgrade: upgrade,
                index: index
            });

            // Make card clickable
            cardBg.onClick(() => {
                if (!upgradeDraftActive) return;
                selectUpgrade(index);
            });
        });

        return cards;
    }

    // Create initial cards
    let cards = createUpgradeCards();

    // Create reroll button if player has rerolls
    let rerollText = null;
    let rerollBox = null;
    if (mulliganLevel > 0) {
        const rerollButton = k.add([
            k.rect(120, 35),
            k.pos(k.width() / 2, k.height() - 60),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.WARNING)),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 1),
            k.area(),
            k.scale(1),
            'upgradeUI'
        ]);
        rerollBox = rerollButton;

        // Hover feedback (only while rerolls remain)
        rerollButton.isHovered = false;
        rerollButton.onHoverUpdate(() => {
            if (rerollsRemaining <= 0) return;
            if (!rerollButton.isHovered) {
                rerollButton.isHovered = true;
                playMenuNav();
            }
            k.setCursor('pointer');
            rerollButton.color = k.rgb(...UI_COLORS.BG_LIGHT);
            rerollButton.outline.color = k.rgb(...UI_COLORS.BORDER_HOVER);
            rerollButton.scale = k.vec2(1.02, 1.02);
        });
        rerollButton.onHoverEnd(() => {
            rerollButton.isHovered = false;
            if (rerollsRemaining <= 0) return;
            rerollButton.color = k.rgb(...UI_COLORS.BG_MEDIUM);
            rerollButton.outline.color = k.rgb(...UI_COLORS.WARNING);
            rerollButton.scale = k.vec2(1, 1);
        });

        // Using parentheses instead of square brackets to avoid KAPLAY styled text tag parsing
        rerollText = k.add([
            k.text(`(R) Reroll (${rerollsRemaining})`, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, k.height() - 60),
            k.anchor('center'),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.z(UI_Z_LAYERS.MODAL + 2),
            'upgradeUI'
        ]);

        rerollButton.onClick(() => {
            if (upgradeDraftActive && rerollsRemaining > 0) {
                performReroll();
            }
        });
    }

    // Reroll function
    function performReroll() {
        if (rerollsRemaining <= 0) return;

        rerollsRemaining--;
        rerollSeed++;
        upgrades = generateUpgrades();
        cards = createUpgradeCards();

        // Update reroll button text
        if (rerollText && rerollText.exists()) {
            rerollText.text = `(R) Reroll (${rerollsRemaining})`;
            if (rerollsRemaining === 0) {
                rerollText.color = k.rgb(...UI_COLORS.TEXT_DISABLED);
            }
        }

        // Gray out the button box once rerolls are exhausted (mirrors disabled Confirm)
        if (rerollBox && rerollBox.exists() && rerollsRemaining === 0) {
            rerollBox.color = k.rgb(...UI_COLORS.BG_DISABLED);
            rerollBox.outline.color = k.rgb(...UI_COLORS.BG_DARK);
            rerollBox.scale = k.vec2(1, 1);
        }
    }
    
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
        const activatedSynergies = checkAndApplySynergies(k, player);

        // Broadcast upgrade selection in multiplayer
        if (isMultiplayerActive() && player.slotIndex !== undefined) {
            broadcastUpgradeSelected(player.slotIndex, selected.key);

            // Broadcast synergy activation if any synergies were activated
            if (activatedSynergies && activatedSynergies.length > 0) {
                const synergyNames = activatedSynergies.map(s => s.name);
                broadcastSynergyActivated(player.slotIndex, synergyNames);
            }
        }

        // Remove UI
        k.get('upgradeUI').forEach(obj => k.destroy(obj));
        k.get('upgradeOverlay').forEach(obj => k.destroy(obj));

        // Restore minimap mode
        if (k.gameData && k.gameData.minimap && k.gameData.minimapSavedMode !== undefined) {
            k.gameData.minimap.mode = k.gameData.minimapSavedMode;
            k.gameData.minimap.update();
            k.gameData.minimapSavedMode = undefined;
        }

        // Unpause game (unless in multiplayer - game should stay unpaused)
        if (!inMultiplayer) {
            k.paused = false;
        }

        // Restore tooltip state after unpausing
        if (k.gameData && k.gameData.restoreTooltipState && k.gameData.tooltipSavedState) {
            k.gameData.restoreTooltipState(k.gameData.tooltipSavedState);
            k.gameData.tooltipSavedState = undefined;
        }
        
        // Callback (call after unpausing)
        // Pass remaining rerolls so game state can be updated for per-run persistence
        k.wait(0.1, () => {
            if (onSelect) {
                onSelect(selected, rerollsRemaining);
            }
        });
    }
    
    // Keyboard selection (1-9, 0 for 10)
    k.onKeyPress('1', () => {
        if (upgradeDraftActive && upgrades.length >= 1) selectUpgrade(0);
    });
    k.onKeyPress('2', () => {
        if (upgradeDraftActive && upgrades.length >= 2) selectUpgrade(1);
    });
    k.onKeyPress('3', () => {
        if (upgradeDraftActive && upgrades.length >= 3) selectUpgrade(2);
    });
    k.onKeyPress('4', () => {
        if (upgradeDraftActive && upgrades.length >= 4) selectUpgrade(3);
    });
    k.onKeyPress('5', () => {
        if (upgradeDraftActive && upgrades.length >= 5) selectUpgrade(4);
    });
    k.onKeyPress('6', () => {
        if (upgradeDraftActive && upgrades.length >= 6) selectUpgrade(5);
    });
    k.onKeyPress('7', () => {
        if (upgradeDraftActive && upgrades.length >= 7) selectUpgrade(6);
    });
    k.onKeyPress('8', () => {
        if (upgradeDraftActive && upgrades.length >= 8) selectUpgrade(7);
    });
    k.onKeyPress('9', () => {
        if (upgradeDraftActive && upgrades.length >= 9) selectUpgrade(8);
    });
    k.onKeyPress('0', () => {
        if (upgradeDraftActive && upgrades.length >= 10) selectUpgrade(9);
    });

    // Reroll key handler
    k.onKeyPress('r', () => {
        if (upgradeDraftActive && rerollsRemaining > 0) {
            performReroll();
        }
    });
}

// Export function to check if upgrade draft is active (for pause menu)
export function isUpgradeDraftActive() {
    return upgradeDraftActive;
}

