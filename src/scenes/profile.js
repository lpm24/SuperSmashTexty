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
        const cardWidth = 720;
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

        const heroPortraitBox = k.add([
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
        const portraitsSectionHeight = 165;

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

        // Portrait grid (no header, 2 rows max with 13 per row = 26 portraits)
        const allPortraits = getAllPortraits();
        const iconSize = 40;
        const iconSpacing = 50;
        const maxPerRow = 13;
        // Center the grid: total width = (maxPerRow - 1) * iconSpacing
        const gridWidth = (maxPerRow - 1) * iconSpacing;
        const gridStartX = cardX - gridWidth / 2;
        const gridY = portraitsY + 28;

        // Selected portrait info display
        let selectedInfoText = null;
        let selectedDescText = null;

        // Track portrait box refs so unlocked selection can update visuals in place
        const portraitBoxRefs = [];

        function updateSelectedInfo(portrait) {
            if (selectedInfoText && selectedInfoText.exists()) {
                selectedInfoText.text = `Selected: "${portrait.name}"`;
                selectedInfoText.color = k.rgb(...UI_COLORS.GOLD);
            }
            if (selectedDescText && selectedDescText.exists()) {
                selectedDescText.text = portrait.description;
                selectedDescText.color = k.rgb(...UI_COLORS.TEXT_SECONDARY);
            }
        }

        // Refresh selection visuals in place (border/box) for all portrait boxes
        function refreshSelectionVisuals() {
            portraitBoxRefs.forEach((ref) => {
                const nowSelected = ref.id === selectedPortraitId;
                ref.isSelected = nowSelected;
                ref.boxColor = ref.isUnlocked
                    ? (nowSelected ? [80, 100, 140] : UI_COLORS.BG_LIGHT)
                    : [40, 40, 50];
                const newBorder = nowSelected
                    ? UI_COLORS.GOLD
                    : (ref.isUnlocked ? ref.portrait.color : [80, 80, 80]);
                if (ref.box && ref.box.exists()) {
                    ref.box.color = k.rgb(...ref.boxColor);
                    ref.box.outline.width = nowSelected ? 3 : 2;
                    ref.box.outline.color = k.rgb(...newBorder);
                }
            });

            // Also refresh the large hero portrait so it reflects the new selection
            // (previously this only updated after a full k.go('profile') scene reload)
            const heroSel = getPortraitById(selectedPortraitId) || PORTRAITS.default;
            if (heroPortraitBox && heroPortraitBox.exists()) {
                heroPortraitBox.outline.color = k.rgb(...(heroSel.color || [200, 200, 200]));
            }
            if (portraitIcon && portraitIcon.exists()) {
                portraitIcon.text = heroSel.icon;
                portraitIcon.color = k.rgb(...(heroSel.color || [200, 200, 200]));
            }
        }

        // Small hover tooltip for locked-portrait requirements (created once, reused).
        // Uses the dedicated TOOLTIP layer so it renders above portrait icons/names.
        const lockTooltipBg = k.add([
            k.rect(10, 22),
            k.pos(0, 0),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_DARK),
            k.outline(2, k.rgb(...UI_COLORS.DANGER)),
            k.fixed(),
            k.opacity(0),
            k.z(UI_Z_LAYERS.TOOLTIP)
        ]);
        const lockTooltipText = k.add([
            k.text('', { size: UI_TEXT_SIZES.TINY }),
            k.pos(0, 0),
            k.anchor('center'),
            k.color(...UI_COLORS.WARNING),
            k.fixed(),
            k.opacity(0),
            k.z(UI_Z_LAYERS.TOOLTIP + 1)
        ]);

        function showLockTooltip(text, x, y) {
            lockTooltipText.text = text;
            // Size bg to fit text (approx TINY char width ~6px) with padding
            const w = Math.max(60, text.length * 6 + 16);
            lockTooltipBg.width = w;
            lockTooltipText.pos = k.vec2(x, y);
            lockTooltipBg.pos = k.vec2(x, y);
            lockTooltipText.opacity = 1;
            lockTooltipBg.opacity = 0.95;
        }

        function hideLockTooltip() {
            lockTooltipText.opacity = 0;
            lockTooltipBg.opacity = 0;
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

            // Register box ref so selection visuals can update in place (no scene reload)
            const boxRef = {
                id: portrait.id,
                portrait,
                box: portraitBox,
                isUnlocked,
                isSelected,
                boxColor
            };
            portraitBoxRefs.push(boxRef);

            // Portrait icon (show icon even when locked, grayed out communicates lock)
            const displayColor = isUnlocked ? portrait.color : [80, 80, 80];
            const iconText = k.add([
                k.text(portrait.icon, { size: 24 }),
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
                    if (boxRef.isUnlocked) {
                        playMenuSelect();
                        setSelectedPortrait(portrait.id);
                        selectedPortraitId = portrait.id;
                        // Update selection visuals in place (no full scene reload)
                        updateSelectedInfo(portrait);
                        refreshSelectionVisuals();
                    } else {
                        playMenuNav();
                        // Show unlock requirement near the clicked icon (tooltip)
                        const desc = getPortraitUnlockDescription(portrait.id);
                        showLockTooltip(`🔒 ${desc}`, x, y - iconSize / 2 - 12);
                    }
                });

                portraitBox.onHoverUpdate(() => {
                    k.setCursor('pointer');
                    if (!boxRef.isSelected) {
                        portraitBox.color = k.rgb(...(boxRef.isUnlocked ? [100, 120, 160] : [50, 50, 60]));
                    }
                    // Show locked requirement as a tooltip by the hovered icon
                    if (!boxRef.isUnlocked) {
                        const desc = getPortraitUnlockDescription(portrait.id);
                        showLockTooltip(`🔒 ${desc}`, x, y - iconSize / 2 - 12);
                    }
                });
                portraitBox.onHoverEnd(() => {
                    k.setCursor('default');
                    if (!boxRef.isSelected) {
                        portraitBox.color = k.rgb(...boxRef.boxColor);
                    }
                    if (!boxRef.isUnlocked) {
                        hideLockTooltip();
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
        const statsHeight = 120;

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

        // Left gutter reserved for row-group labels so the 3-row grouping reads as intentional
        const statsGutter = 64;
        const statsGridX = cardX - cardWidth / 2 + statsGutter;
        const statsGridWidth = cardWidth - statsGutter;

        // Stats display - Three rows (use profileStats for both local and external)
        const stats = profileStats;
        const totalRuns = stats.totalRuns || 0;
        const avgCurrency = totalRuns > 0 ? Math.round((stats.totalCurrencyEarned || 0) / totalRuns) : 0;
        const avgFloors = totalRuns > 0 ? ((stats.totalFloorsReached || 0) / totalRuns).toFixed(1) : '0';
        const avgRooms = totalRuns > 0 ? ((stats.totalRoomsCleared || 0) / totalRuns).toFixed(1) : '0';

        // Format fastest run time
        const fastestTime = stats.fastestRunTime || 0;
        const fastestMin = Math.floor(fastestTime / 60);
        const fastestSec = Math.floor(fastestTime % 60);
        const fastestDisplay = fastestTime > 0 ? `${fastestMin}:${fastestSec.toString().padStart(2, '0')}` : '--:--';

        // Row 1: Main stats (5 columns)
        const row1Stats = [
            { label: 'Total Runs', value: totalRuns },
            { label: 'Best Floor', value: stats.bestFloor || 1 },
            { label: 'Best Level', value: stats.bestLevel || 1 },
            { label: 'Best Room', value: stats.bestRoom || 1 },
            { label: 'Fastest Run', value: fastestDisplay }
        ];

        const statWidth = statsGridWidth / row1Stats.length;

        // Shared renderer so all three rows have identical value styling (size + color).
        // Gold is reserved only for the row-group labels (the intentional accent).
        const ROW_LABEL_OFFSET = 16;
        function renderStatRow(rowStats, rowY, groupLabel) {
            // Row-group label in the left gutter, vertically centered on the row
            k.add([
                k.text(groupLabel, { size: UI_TEXT_SIZES.TINY }),
                k.pos(cardX - cardWidth / 2 + 10, rowY + ROW_LABEL_OFFSET / 2),
                k.anchor('left'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            rowStats.forEach((stat, index) => {
                const x = statsGridX + statWidth * index + statWidth / 2;

                k.add([
                    k.text(stat.label, { size: UI_TEXT_SIZES.SMALL - 2 }),
                    k.pos(x, rowY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                k.add([
                    k.text(String(stat.value), { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(x, rowY + ROW_LABEL_OFFSET),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
            });
        }

        // Subtle separators between the three row-groups
        const statsSepColor = [80, 80, 100];
        [statsY + 38, statsY + 73].forEach((sepY) => {
            k.add([
                k.rect(statsGridWidth - 8, 1),
                k.pos(statsGridX + 4, sepY),
                k.anchor('left'),
                k.color(...statsSepColor),
                k.opacity(0.6),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
            ]);
        });

        renderStatRow(row1Stats, statsY + 12, 'RECORDS');

        // Row 2: Combat stats (5 columns)
        const row2Stats = [
            { label: 'Enemies', value: (stats.totalEnemiesKilled || 0).toLocaleString() },
            { label: 'Bosses', value: stats.totalBossesKilled || 0 },
            { label: 'Rooms', value: (stats.totalRoomsCleared || 0).toLocaleString() },
            { label: 'Avg Floor', value: avgFloors },
            { label: 'Avg Rooms', value: avgRooms }
        ];

        renderStatRow(row2Stats, statsY + 47, 'COMBAT');

        // Row 3: Currency stats (5 columns)
        const row3Stats = [
            { label: 'Total Money', value: (stats.totalCurrencyEarned || 0).toLocaleString() },
            { label: 'Spent', value: (stats.totalCurrencySpent || 0).toLocaleString() },
            { label: 'Avg Money', value: avgCurrency.toLocaleString() },
            { label: 'Floors', value: (stats.totalFloorsReached || 0).toLocaleString() },
            { label: 'Play Time', value: (() => {
                const playTime = stats.totalPlayTime || 0;
                const hours = Math.floor(playTime / 3600);
                const minutes = Math.floor((playTime % 3600) / 60);
                return `${hours}h ${minutes}m`;
            })() }
        ];

        renderStatRow(row3Stats, statsY + 82, 'ECONOMY');

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

        // Esc hint next to BACK
        k.add([
            k.text('(Esc)', { size: UI_TEXT_SIZES.TINY }),
            k.pos(k.width() / 2 + SM.width / 2 + 8, k.height() - 40),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_TERTIARY),
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
