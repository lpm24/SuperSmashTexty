// Profile scene - displays player profile with XP, level, portraits, and stats
import {
    getPlayerName, setPlayerName, getPlayerLevel, getTotalXP,
    getXPProgress, getXPForNextLevel, getXPRequiredForLevel,
    getSelectedPortrait, setSelectedPortrait, isPortraitUnlocked,
    getUnlockedPortraits, unlockPortrait, getSaveStats, loadSave
} from '../systems/metaProgression.js';
import { generateRandomName } from '../systems/nameGenerator.js';
import { playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    PORTRAITS, getPortraitById, getAllPortraits,
    checkPortraitUnlockCondition, getPortraitUnlockDescription,
    getPortraitUnlockProgress, PORTRAIT_CATEGORIES
} from '../data/portraits.js';
import {
    UI_SIZES,
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    createMenuParticles,
    createAnimatedTitle
} from '../config/uiConfig.js';

/**
 * Show name edit dialog (same as settings scene)
 */
function showNameEditDialog(k, currentName, onSave) {
    // Overlay
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.7),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY)
    ]);

    // Dialog box
    const dialogWidth = 400;
    const dialogHeight = 180;
    const dialogBg = k.add([
        k.rect(dialogWidth, dialogHeight),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(3, k.rgb(...UI_COLORS.BORDER)),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 1)
    ]);

    // Title
    const titleText = k.add([
        k.text('Edit Player Name', { size: UI_TEXT_SIZES.LABEL }),
        k.pos(k.width() / 2, k.height() / 2 - 60),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    // Input display background
    const inputBg = k.add([
        k.rect(300, 40),
        k.pos(k.width() / 2, k.height() / 2 - 10),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_LIGHT),
        k.outline(2, k.rgb(...UI_COLORS.GOLD)),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    // Input display
    let inputText = currentName;
    const inputDisplay = k.add([
        k.text(inputText, { size: UI_TEXT_SIZES.LABEL }),
        k.pos(k.width() / 2, k.height() / 2 - 10),
        k.anchor('center'),
        k.color(...UI_COLORS.GOLD),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    // Error/Info message
    const infoMsg = k.add([
        k.text('(Max 20 characters)', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2, k.height() / 2 + 25),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    // Store all dialog entities
    const dialogEntities = [overlay, dialogBg, titleText, inputBg, inputDisplay, infoMsg];

    // Close function
    function closeDialog() {
        dialogEntities.forEach(entity => {
            if (entity && entity.exists && entity.exists()) {
                k.destroy(entity);
            }
        });
    }

    // Cancel button
    const cancelButton = k.add([
        k.rect(100, 30),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(2, k.rgb(...UI_COLORS.TEXT_PRIMARY)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    const cancelText = k.add([
        k.text('Cancel', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    cancelButton.onClick(() => {
        playMenuNav();
        closeDialog();
    });
    dialogEntities.push(cancelButton, cancelText);

    // Save button
    const saveButton = k.add([
        k.rect(100, 30),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(2, k.rgb(...UI_COLORS.GOLD)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    const saveText = k.add([
        k.text('Save', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.GOLD),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    saveButton.onClick(() => {
        if (inputText.trim().length > 0) {
            playMenuSelect();
            onSave(inputText.trim());
            closeDialog();
        } else {
            infoMsg.text = 'Name cannot be empty!';
            infoMsg.color = k.rgb(255, 100, 100);
        }
    });
    dialogEntities.push(saveButton, saveText);

    // Keyboard input handlers
    const charHandler = k.onCharInput((ch) => {
        if (inputText.length < 20 && /[a-zA-Z0-9 ]/.test(ch)) {
            inputText += ch;
            inputDisplay.text = inputText;
            infoMsg.text = '(Max 20 characters)';
            infoMsg.color = k.rgb(...UI_COLORS.TEXT_SECONDARY);
        }
    });

    const backspaceHandler = k.onKeyPress('backspace', () => {
        if (inputText.length > 0) {
            inputText = inputText.slice(0, -1);
            inputDisplay.text = inputText || ' ';
        }
    });

    const escapeHandler = k.onKeyPress('escape', () => {
        closeDialog();
        charHandler.cancel();
        backspaceHandler.cancel();
        escapeHandler.cancel();
        enterHandler.cancel();
    });

    const enterHandler = k.onKeyPress('enter', () => {
        if (inputText.trim().length > 0) {
            playMenuSelect();
            onSave(inputText.trim());
            closeDialog();
            charHandler.cancel();
            backspaceHandler.cancel();
            escapeHandler.cancel();
            enterHandler.cancel();
        }
    });
}

export function setupProfileScene(k) {
    k.scene('profile', (args = {}) => {
        // Check if viewing another player's profile
        const externalProfile = args.externalProfile || null;
        const isViewingOther = externalProfile !== null;

        // Get profile data from external source or local save
        const saveData = isViewingOther ? externalProfile : loadSave();
        let selectedPortraitId = isViewingOther ? externalProfile.selectedPortrait : getSelectedPortrait();

        // Extract data based on source
        const profileStats = isViewingOther ? externalProfile.stats : getSaveStats();
        const profileLevel = isViewingOther ? externalProfile.playerLevel : getPlayerLevel();
        const profileXP = isViewingOther ? externalProfile.totalXP : getTotalXP();
        const profileName = isViewingOther ? externalProfile.playerName : (getPlayerName() || 'Player');
        const profileAchievements = isViewingOther ? externalProfile.achievements : [];
        const profileUnlockedPortraits = isViewingOther ? externalProfile.unlockedPortraits : getUnlockedPortraits();

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(...UI_COLORS.BG_DARK),
            k.fixed(),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Background particles
        createMenuParticles(k, { patternCount: 8, particleCount: 12 });

        // Title - show player name when viewing another player
        if (isViewingOther) {
            k.add([
                k.text(`${profileName}'s Profile`, { size: UI_TEXT_SIZES.H1 }),
                k.pos(k.width() / 2, 35),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        } else {
            createAnimatedTitle(k, 'PROFILE', k.width() / 2, 35, 8);
        }

        // ==========================================
        // PROFILE CARD SECTION (Top)
        // ==========================================
        const cardY = 80;
        const cardHeight = 140;
        const cardWidth = 580;
        const cardX = k.width() / 2;

        // Card background
        k.add([
            k.rect(cardWidth, cardHeight),
            k.pos(cardX, cardY + cardHeight / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // Portrait frame
        const portraitSize = 80;
        const portraitX = cardX - cardWidth / 2 + 60;
        const portraitY = cardY + cardHeight / 2;
        const currentPortrait = getPortraitById(selectedPortraitId) || PORTRAITS.default;

        k.add([
            k.rect(portraitSize, portraitSize),
            k.pos(portraitX, portraitY),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_LIGHT),
            k.outline(3, k.rgb(...(currentPortrait.color || [200, 200, 200]))),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
        ]);

        // Portrait icon
        const portraitIcon = k.add([
            k.text(currentPortrait.icon, { size: 40 }),
            k.pos(portraitX, portraitY - 5),
            k.anchor('center'),
            k.color(...(currentPortrait.color || [200, 200, 200])),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Level badge on portrait
        k.add([
            k.text(`LV${profileLevel}`, { size: 12 }),
            k.pos(portraitX, portraitY + 28),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Player info (right of portrait)
        const infoX = portraitX + 80;
        let infoY = cardY + 20;

        // Player name
        let playerName = profileName;
        const nameDisplay = k.add([
            k.text(playerName, { size: UI_TEXT_SIZES.H1 }),
            k.pos(infoX, infoY),
            k.anchor('left'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Edit and randomize buttons - only show for local profile
        if (!isViewingOther) {
            const editIconSize = 24;
            const randomButtonX = cardX + cardWidth / 2 - 20;
            const editButtonX = randomButtonX - editIconSize - 8;

            // Edit name button (pencil icon, square)
            const editButton = k.add([
                k.rect(editIconSize, editIconSize),
                k.pos(editButtonX, infoY),
                k.anchor('right'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            k.add([
                k.text('✏', { size: 14 }),
                k.pos(editButtonX - editIconSize / 2, infoY),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            editButton.onClick(() => {
                playMenuSelect();
                showNameEditDialog(k, playerName, (newName) => {
                    setPlayerName(newName);
                    nameDisplay.text = newName;
                    playerName = newName;
                });
            });

            editButton.onHoverUpdate(() => {
                editButton.color = k.rgb(...UI_COLORS.BG_LIGHT);
            });
            editButton.onHoverEnd(() => {
                editButton.color = k.rgb(...UI_COLORS.BG_MEDIUM);
            });

            // Randomize name button (dice icon, square)
            const randomButton = k.add([
                k.rect(editIconSize, editIconSize),
                k.pos(randomButtonX, infoY),
                k.anchor('right'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...UI_COLORS.GOLD)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            k.add([
                k.text('🎲', { size: 14 }),
                k.pos(randomButtonX - editIconSize / 2, infoY),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            randomButton.onClick(() => {
                playMenuSelect();
                const newName = generateRandomName();
                setPlayerName(newName);
                nameDisplay.text = newName;
                playerName = newName;
            });

            randomButton.onHoverUpdate(() => {
                randomButton.color = k.rgb(...UI_COLORS.BG_LIGHT);
            });
            randomButton.onHoverEnd(() => {
                randomButton.color = k.rgb(...UI_COLORS.BG_MEDIUM);
            });
        }

        infoY += 35;

        // Level with stars
        const stars = Math.min(5, Math.floor(profileLevel / 10));
        const starDisplay = '★'.repeat(stars) + '☆'.repeat(5 - stars);
        k.add([
            k.text(`Level ${profileLevel}  ${starDisplay}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(infoX, infoY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        infoY += 30;

        // XP Progress bar
        const barWidth = 250;
        const barHeight = 16;
        const xpProgress = isViewingOther ? 0 : getXPProgress();
        const currentXP = profileXP;
        const nextLevelXP = isViewingOther ? profileXP : getXPForNextLevel();
        const currentLevelXP = getXPRequiredForLevel(profileLevel);

        // Bar background
        k.add([
            k.rect(barWidth, barHeight),
            k.pos(infoX, infoY),
            k.anchor('left'),
            k.color(40, 40, 60),
            k.outline(1, k.rgb(80, 80, 100)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
        ]);

        // Bar fill
        const fillWidth = Math.max(2, barWidth * xpProgress);
        k.add([
            k.rect(fillWidth, barHeight - 4),
            k.pos(infoX + 2, infoY),
            k.anchor('left'),
            k.color(100, 180, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        // XP text
        k.add([
            k.text(`${Math.round(xpProgress * 100)}%`, { size: 10 }),
            k.pos(infoX + barWidth / 2, infoY),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        infoY += 22;

        // XP numbers
        k.add([
            k.text(`${currentXP.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP`, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(infoX, infoY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // ==========================================
        // PORTRAITS SECTION (directly below card since buttons moved to name)
        // ==========================================
        const portraitsY = cardY + cardHeight + 10;
        const portraitsSectionHeight = 180;

        // Section background
        k.add([
            k.rect(cardWidth, portraitsSectionHeight),
            k.pos(cardX, portraitsY + portraitsSectionHeight / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // Section title
        k.add([
            k.text('PORTRAITS', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(cardX, portraitsY + 15),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Portrait grid
        const allPortraits = getAllPortraits();
        const gridStartX = cardX - cardWidth / 2 + 45;
        const gridY = portraitsY + 45;
        const iconSize = 45;
        const iconSpacing = 55;
        const maxPerRow = 9;

        // Selected portrait info display
        let selectedInfoText = null;
        let selectedDescText = null;

        function updateSelectedInfo(portrait) {
            if (selectedInfoText && selectedInfoText.exists()) {
                selectedInfoText.text = `Selected: "${portrait.name}"`;
            }
            if (selectedDescText && selectedDescText.exists()) {
                selectedDescText.text = portrait.description;
            }
        }

        allPortraits.forEach((portrait, index) => {
            const row = Math.floor(index / maxPerRow);
            const col = index % maxPerRow;
            const x = gridStartX + col * iconSpacing;
            const y = gridY + row * (iconSpacing + 5);

            // Check if unlocked - use external data when viewing another player
            const isUnlocked = isViewingOther
                ? profileUnlockedPortraits.includes(portrait.id)
                : checkPortraitUnlockCondition(portrait.id, saveData);
            const isSelected = portrait.id === selectedPortraitId;

            // Portrait box
            const boxColor = isUnlocked
                ? (isSelected ? [80, 100, 140] : UI_COLORS.BG_LIGHT)
                : [40, 40, 50];
            const borderColor = isSelected
                ? UI_COLORS.GOLD
                : (isUnlocked ? portrait.color : [80, 80, 80]);

            const portraitBox = k.add([
                k.rect(iconSize, iconSize),
                k.pos(x, y),
                k.anchor('center'),
                k.color(...boxColor),
                k.outline(isSelected ? 3 : 2, k.rgb(...borderColor)),
                isViewingOther ? null : k.area(), // Only clickable for own profile
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ].filter(Boolean));

            // Portrait icon or lock
            const displayIcon = isUnlocked ? portrait.icon : '🔒';
            const displayColor = isUnlocked ? portrait.color : [100, 100, 100];
            const iconText = k.add([
                k.text(displayIcon, { size: isUnlocked ? 24 : 16 }),
                k.pos(x, y - 3),
                k.anchor('center'),
                k.color(...displayColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Name below
            const nameText = isUnlocked ? portrait.name.substring(0, 8) : '???';
            k.add([
                k.text(nameText, { size: 8 }),
                k.pos(x, y + iconSize / 2 + 8),
                k.anchor('center'),
                k.color(...(isUnlocked ? UI_COLORS.TEXT_SECONDARY : [80, 80, 80])),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Click handler - only for own profile
            if (!isViewingOther) {
                portraitBox.onClick(() => {
                    if (isUnlocked) {
                        playMenuSelect();
                        setSelectedPortrait(portrait.id);
                        selectedPortraitId = portrait.id;
                        // Update UI - would need to refresh scene
                        updateSelectedInfo(portrait);
                        k.go('profile'); // Refresh scene to show new selection
                    } else {
                        playMenuNav();
                        // Show unlock requirement
                        const desc = getPortraitUnlockDescription(portrait.id);
                        if (selectedDescText && selectedDescText.exists()) {
                            selectedDescText.text = `Locked: ${desc}`;
                            selectedDescText.color = k.rgb(...UI_COLORS.DANGER);
                        }
                    }
                });

                portraitBox.onHoverUpdate(() => {
                    if (!isSelected) {
                        portraitBox.color = k.rgb(...(isUnlocked ? [100, 120, 160] : [50, 50, 60]));
                    }
                });
                portraitBox.onHoverEnd(() => {
                    if (!isSelected) {
                        portraitBox.color = k.rgb(...boxColor);
                    }
                });
            }
        });

        // Selected portrait info
        selectedInfoText = k.add([
            k.text(`Selected: "${currentPortrait.name}"`, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(cardX, portraitsY + portraitsSectionHeight - 35),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        selectedDescText = k.add([
            k.text(currentPortrait.description, { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(cardX, portraitsY + portraitsSectionHeight - 18),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // ==========================================
        // STATS SECTION
        // ==========================================
        const statsY = portraitsY + portraitsSectionHeight + 10;
        const statsHeight = 115;

        // Section background
        k.add([
            k.rect(cardWidth, statsHeight),
            k.pos(cardX, statsY + statsHeight / 2),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // Section title
        k.add([
            k.text('STATS SUMMARY', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(cardX, statsY + 15),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Stats display - Two rows (use profileStats for both local and external)
        const stats = profileStats;
        const totalRuns = stats.totalRuns || 0;
        const avgCurrency = totalRuns > 0 ? Math.round((stats.totalCurrencyEarned || 0) / totalRuns) : 0;
        const avgFloors = totalRuns > 0 ? ((stats.totalFloorsReached || 0) / totalRuns).toFixed(1) : '0';

        // Row 1: Main stats
        const row1Stats = [
            { label: 'Total Runs', value: totalRuns },
            { label: 'Best Floor', value: stats.bestFloor || 1 },
            { label: 'Best Level', value: stats.bestLevel || 1 },
            { label: 'Avg Floor', value: avgFloors }
        ];

        const statWidth = cardWidth / row1Stats.length;
        row1Stats.forEach((stat, index) => {
            const x = cardX - cardWidth / 2 + statWidth * index + statWidth / 2;
            const y = statsY + 40;

            k.add([
                k.text(stat.label, { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(x, y),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            k.add([
                k.text(String(stat.value), { size: UI_TEXT_SIZES.LABEL }),
                k.pos(x, y + 18),
                k.anchor('center'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        });

        // Row 2: Secondary stats
        const row2Stats = [
            { label: 'Enemies', value: (stats.totalEnemiesKilled || 0).toLocaleString() },
            { label: 'Bosses', value: stats.totalBossesKilled || 0 },
            { label: 'Avg Money', value: avgCurrency.toLocaleString() },
            { label: 'Total Money', value: (stats.totalCurrencyEarned || 0).toLocaleString() }
        ];

        row2Stats.forEach((stat, index) => {
            const x = cardX - cardWidth / 2 + statWidth * index + statWidth / 2;
            const y = statsY + 75;

            k.add([
                k.text(stat.label, { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(x, y),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            k.add([
                k.text(String(stat.value), { size: UI_TEXT_SIZES.SMALL }),
                k.pos(x, y + 15),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        });

        // Play time at bottom
        const playTime = stats.totalPlayTime || 0;
        const hours = Math.floor(playTime / 3600);
        const minutes = Math.floor((playTime % 3600) / 60);
        k.add([
            k.text(`Play Time: ${hours}h ${minutes}m`, { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(cardX, statsY + statsHeight - 8),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // ==========================================
        // BACK BUTTON
        // ==========================================
        const { SM } = UI_SIZES.BUTTON;

        const backButton = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        k.add([
            k.text('BACK', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        backButton.onClick(() => {
            playMenuNav();
            k.go('menu');
        });

        backButton.onHoverUpdate(() => {
            backButton.color = k.rgb(...UI_COLORS.NEUTRAL_HOVER);
        });
        backButton.onHoverEnd(() => {
            backButton.color = k.rgb(...UI_COLORS.NEUTRAL);
        });

        // Escape key handler
        k.onKeyPress('escape', () => {
            playMenuNav();
            k.go('menu');
        });
    });
}
