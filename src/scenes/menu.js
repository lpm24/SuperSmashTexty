// Main menu scene
import { getCurrency, getCurrencyName, getPlayerName, getSelectedCharacter, isUnlocked, addCurrency, getPlayerLevel, getXPProgress, getTotalXP, getXPForNextLevel, getSelectedPortrait } from '../systems/metaProgression.js';
import { PORTRAITS, getPortraitById } from '../data/portraits.js';
import { initParty, getPartyDisplayInfo, isMultiplayerAvailable, broadcastGameStart, getPartySize, getDisplayInviteCode, getParty, toggleReady, isLocalPlayerReady, getCountdownState, areAllPlayersReady } from '../systems/partySystem.js';
import { initAudio, resumeAudioContext, playMenuSelect, playMenuNav, playMenuMusic, setMusicVolume, setMasterVolume, setSfxVolume, setUiSoundsEnabled, setCombatSoundsEnabled } from '../systems/sounds.js';
import { getSettings } from '../systems/settings.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { getDailyRunInfo, hasCompletedDailyToday, getTodayDailyCharacter } from '../systems/dailyRuns.js';
import {
    UI_SIZES,
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_SPACING,
    UI_BUTTON,
    UI_Z_LAYERS,
    formatButtonText,
    createCreditIndicator
} from '../config/uiConfig.js';

// Layout constants for three-column grid
const LAYOUT = {
    LEFT_COLUMN_X: 20,
    LEFT_COLUMN_WIDTH: 200,
    RIGHT_COLUMN_WIDTH: 200,
    PANEL_PADDING: 10,
    TOP_MARGIN: 20
};

/**
 * Create an interactive menu button
 */
function createMenuButton(k, text, x, y, width = UI_BUTTON.WIDTH, height = UI_BUTTON.HEIGHT, fontSize = UI_TEXT_SIZES.BUTTON) {
    const primaryColor = UI_COLORS.SECONDARY;
    const hoverColor = UI_COLORS.SECONDARY_HOVER;
    const textColor = UI_COLORS.TEXT_PRIMARY;
    const borderColor = UI_COLORS.BORDER;

    const bg = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...primaryColor),
        k.outline(2, k.rgb(...borderColor)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS),
        'menuButton'
    ]);

    const formattedText = formatButtonText(text);
    const label = k.add([
        k.text(formattedText, { size: fontSize }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...textColor),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_TEXT),
        'menuButtonText'
    ]);

    bg.originalColor = [...primaryColor];
    bg.hoverColor = [...hoverColor];
    bg.borderColor = [...borderColor];
    bg.isHovered = false;
    bg.disabled = false;
    bg.label = label;
    bg.labels = [label];

    bg.onHoverUpdate(() => {
        if (bg.disabled) return;
        if (!bg.isHovered) {
            bg.isHovered = true;
            playMenuNav();
        }
        bg.color = k.rgb(...bg.hoverColor);
        bg.outline.color = k.rgb(...UI_COLORS.BORDER_HOVER);
        bg.scale = k.vec2(UI_BUTTON.HOVER_SCALE, UI_BUTTON.HOVER_SCALE);
        label.scale = k.vec2(UI_BUTTON.HOVER_SCALE, UI_BUTTON.HOVER_SCALE);
    });

    bg.onHoverEnd(() => {
        if (bg.disabled) return;
        bg.isHovered = false;
        bg.color = k.rgb(...bg.originalColor);
        bg.outline.color = k.rgb(...bg.borderColor);
        bg.scale = k.vec2(1, 1);
        label.scale = k.vec2(1, 1);
    });

    bg.setDisabled = (isDisabled) => {
        bg.disabled = isDisabled;
        if (isDisabled) {
            bg.color = k.rgb(...UI_COLORS.BG_DISABLED);
            label.color = k.rgb(...UI_COLORS.TEXT_DISABLED);
        } else {
            bg.color = k.rgb(...bg.originalColor);
            label.color = k.rgb(...textColor);
        }
    };

    return bg;
}

// Helper function to convert HSL to RGB
function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

export function setupMenuScene(k) {
    k.scene('menu', () => {
        initAudio();

        // Apply saved audio settings
        const settings = getSettings();
        setMasterVolume(settings.audio.masterVolume);
        setMusicVolume(settings.audio.musicVolume);
        setSfxVolume(settings.audio.sfxVolume);

        // Apply UI/Combat sound toggles if they exist in settings
        if (settings.audio.uiSounds !== undefined) {
            setUiSoundsEnabled(settings.audio.uiSounds);
        }
        if (settings.audio.combatSounds !== undefined) {
            setCombatSoundsEnabled(settings.audio.combatSounds);
        }

        // Resume audio context on first user interaction (browser autoplay policy)
        let audioResumed = false;
        const resumeAudio = () => {
            if (!audioResumed) {
                audioResumed = true;
                resumeAudioContext();
                // Try playing music again after context resumes
                playMenuMusic();
            }
        };
        k.onClick(resumeAudio);
        k.onKeyPress(resumeAudio);

        // Start menu music
        playMenuMusic();

        const currency = getCurrency();
        const currencyName = getCurrencyName();

        // Calculate layout dimensions
        const rightColumnX = k.width() - LAYOUT.RIGHT_COLUMN_WIDTH - LAYOUT.LEFT_COLUMN_X;
        const centerX = k.width() / 2;

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(...UI_COLORS.BG_DARK),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Decorative borders
        k.add([
            k.rect(k.width(), 4),
            k.pos(0, 0),
            k.color(...UI_COLORS.BORDER),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);
        k.add([
            k.rect(k.width(), 4),
            k.pos(0, k.height() - 4),
            k.color(...UI_COLORS.BORDER),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // ==========================================
        // PROFILE CARD (Top-left)
        // ==========================================
        const profileCardX = LAYOUT.LEFT_COLUMN_X;
        const profileCardY = LAYOUT.TOP_MARGIN;
        const profileCardWidth = LAYOUT.LEFT_COLUMN_WIDTH;
        const profileCardHeight = 120;

        // Profile card background (clickable)
        const profileCardBg = k.add([
            k.rect(profileCardWidth, profileCardHeight),
            k.pos(profileCardX, profileCardY),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND),
            'profileCard'
        ]);

        // Portrait
        const portrait = getPortraitById(getSelectedPortrait()) || PORTRAITS.default;
        const portraitSize = 50;
        const portraitX = profileCardX + 35;
        const portraitY = profileCardY + 40;

        k.add([
            k.rect(portraitSize, portraitSize),
            k.pos(portraitX, portraitY),
            k.anchor('center'),
            k.color(...UI_COLORS.BG_LIGHT),
            k.outline(2, k.rgb(...(portrait.color || [200, 200, 200]))),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
        ]);

        k.add([
            k.text(portrait.icon, { size: 28 }),
            k.pos(portraitX, portraitY - 2),
            k.anchor('center'),
            k.color(...(portrait.color || [200, 200, 200])),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Player name (with fallback for null/undefined)
        const playerName = getPlayerName() || 'Player';
        const displayName = playerName.length > 12 ? playerName.substring(0, 12) + '..' : playerName;
        k.add([
            k.text(displayName, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(portraitX + portraitSize / 2 + 10, profileCardY + 18),
            k.anchor('left'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Level
        const playerLevel = getPlayerLevel();
        k.add([
            k.text(`Lv.${playerLevel}`, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(portraitX + portraitSize / 2 + 10, profileCardY + 38),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // XP progress bar
        const xpProgress = getXPProgress();
        const xpBarWidth = profileCardWidth - 80;
        const xpBarHeight = 8;
        const xpBarX = portraitX + portraitSize / 2 + 10;
        const xpBarY = profileCardY + 58;

        // Bar background
        k.add([
            k.rect(xpBarWidth, xpBarHeight),
            k.pos(xpBarX, xpBarY),
            k.anchor('left'),
            k.color(40, 40, 60),
            k.outline(1, k.rgb(60, 60, 80)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
        ]);

        // Bar fill (ensure minimum width of 2 to avoid rendering issues)
        const xpFillWidth = Math.max(2, xpBarWidth * xpProgress);
        k.add([
            k.rect(xpFillWidth, xpBarHeight - 2),
            k.pos(xpBarX + 1, xpBarY),
            k.anchor('left'),
            k.color(100, 180, 255),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        // XP percentage
        k.add([
            k.text(`${Math.round(xpProgress * 100)}%`, { size: 10 }),
            k.pos(xpBarX + xpBarWidth + 8, xpBarY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Click hint
        k.add([
            k.text('Click for Profile', { size: 9 }),
            k.pos(profileCardX + profileCardWidth / 2, profileCardY + profileCardHeight - 12),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Profile card click handler
        profileCardBg.onClick(() => {
            playMenuSelect();
            k.go('profile');
        });

        profileCardBg.onHoverUpdate(() => {
            profileCardBg.color = k.rgb(...UI_COLORS.BG_LIGHT);
        });
        profileCardBg.onHoverEnd(() => {
            profileCardBg.color = k.rgb(...UI_COLORS.BG_MEDIUM);
        });

        // ==========================================
        // LEFT COLUMN: Party Panel (Below Profile)
        // ==========================================
        initParty(k);

        const partyPanelX = LAYOUT.LEFT_COLUMN_X;
        const partyPanelY = profileCardY + profileCardHeight + 10;
        const partyPanelWidth = LAYOUT.LEFT_COLUMN_WIDTH;
        const slotHeight = 24;
        const slotSpacing = 3;
        const titlePadding = 8;
        const partyPanelHeight = titlePadding + (slotHeight * 4) + (slotSpacing * 3) + 55;

        // Party panel background
        k.add([
            k.rect(partyPanelWidth, partyPanelHeight),
            k.pos(partyPanelX, partyPanelY),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        const slotsStartY = partyPanelY + titlePadding;
        const slotElements = [];

        function updatePartySlots() {
            slotElements.forEach(elements => {
                elements.forEach(el => {
                    if (el.exists()) k.destroy(el);
                });
            });
            slotElements.length = 0;

            const partySlots = getPartyDisplayInfo();

            partySlots.forEach((slot, index) => {
                const slotY = slotsStartY + (index * (slotHeight + slotSpacing));
                const elementsForThisSlot = [];

                const slotBg = k.add([
                    k.rect(partyPanelWidth - 16, slotHeight),
                    k.pos(partyPanelX + 8, slotY),
                    k.color(slot.isEmpty ? UI_COLORS.BG_DARK : UI_COLORS.BG_LIGHT),
                    k.outline(1, k.rgb(...UI_COLORS.TEXT_DISABLED)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_BACKGROUND + 1),
                    'partySlotUI'
                ]);
                elementsForThisSlot.push(slotBg);

                const slotNum = k.add([
                    k.text(`${slot.slotNumber}`, { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(partyPanelX + 16, slotY + slotHeight / 2),
                    k.anchor('left'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT),
                    'partySlotUI'
                ]);
                elementsForThisSlot.push(slotNum);

                if (!slot.isEmpty) {
                    const charData = CHARACTER_UNLOCKS[slot.selectedCharacter] || CHARACTER_UNLOCKS['survivor'];
                    const charIcon = k.add([
                        k.text(charData.char, { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(partyPanelX + 32, slotY + slotHeight / 2),
                        k.anchor('left'),
                        k.color(...charData.color),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT),
                        'partySlotUI'
                    ]);
                    elementsForThisSlot.push(charIcon);
                }

                const nameText = k.add([
                    k.text(slot.playerName.substring(0, 10), { size: UI_TEXT_SIZES.SMALL - 2 }),
                    k.pos(partyPanelX + (slot.isEmpty ? 40 : 50), slotY + slotHeight / 2),
                    k.anchor('left'),
                    k.color(slot.isEmpty ? UI_COLORS.TEXT_DISABLED : (slot.isLocal ? UI_COLORS.GOLD : UI_COLORS.TEXT_PRIMARY)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT),
                    'partySlotUI'
                ]);
                elementsForThisSlot.push(nameText);

                if (slot.isLocal) {
                    const youText = k.add([
                        k.text('★', { size: UI_TEXT_SIZES.SMALL }),
                        k.pos(partyPanelX + partyPanelWidth - 28, slotY + slotHeight / 2),
                        k.anchor('right'),
                        k.color(...UI_COLORS.GOLD),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT),
                        'partySlotUI'
                    ]);
                    elementsForThisSlot.push(youText);
                }

                if (!slot.isEmpty) {
                    const readyIcon = slot.isReady ? '✓' : '○';
                    const readyColor = slot.isReady ? UI_COLORS.SUCCESS : UI_COLORS.TEXT_DISABLED;
                    const readyText = k.add([
                        k.text(readyIcon, { size: UI_TEXT_SIZES.SMALL - 2 }),
                        k.pos(partyPanelX + partyPanelWidth - 14, slotY + slotHeight / 2),
                        k.anchor('center'),
                        k.color(...readyColor),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT),
                        'partySlotUI'
                    ]);
                    elementsForThisSlot.push(readyText);
                }

                if (slot.isDisconnected) {
                    const dcText = k.add([
                        k.text('⚠', { size: UI_TEXT_SIZES.SMALL - 2 }),
                        k.pos(partyPanelX + partyPanelWidth - 28, slotY + slotHeight / 2),
                        k.anchor('center'),
                        k.color(...UI_COLORS.WARNING),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT),
                        'partySlotUI'
                    ]);
                    elementsForThisSlot.push(dcText);
                }

                slotElements.push(elementsForThisSlot);
            });
        }

        updatePartySlots();

        let lastPartyCheck = 0;
        k.onUpdate(() => {
            lastPartyCheck += k.dt();
            if (lastPartyCheck >= 1.0) {
                lastPartyCheck = 0;
                updatePartySlots();
                if (typeof updateStartButtonState === 'function') {
                    updateStartButtonState();
                }
            }
        });

        // Invite code section
        const inviteCodeY = slotsStartY + (4 * (slotHeight + slotSpacing)) + 6;

        k.add([
            k.text('Code:', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(partyPanelX + 8, inviteCodeY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const inviteCode = getDisplayInviteCode();
        const inviteCodeDisplay = k.add([
            k.text(inviteCode, { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(partyPanelX + partyPanelWidth - 8, inviteCodeY),
            k.anchor('right'),
            k.color(inviteCode === 'OFFLINE' ? [...UI_COLORS.TEXT_DISABLED] : [...UI_COLORS.GOLD]),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        let hasValidCode = inviteCode !== 'OFFLINE';
        inviteCodeDisplay.onUpdate(() => {
            if (!hasValidCode) {
                const currentCode = getDisplayInviteCode();
                if (currentCode && currentCode !== 'OFFLINE') {
                    inviteCodeDisplay.text = currentCode;
                    inviteCodeDisplay.color = k.rgb(...UI_COLORS.GOLD);
                    hasValidCode = true;
                }
            }
        });

        // Join Party button
        const joinButtonY = inviteCodeY + 22;
        const joinButton = createMenuButton(
            k, 'JOIN PARTY', partyPanelX + partyPanelWidth / 2, joinButtonY,
            partyPanelWidth - 20, 28, UI_TEXT_SIZES.SMALL
        );
        joinButton.onClick(() => {
            playMenuSelect();
            k.go('joinParty');
        });

        // Ready button (only visible in party)
        const readyButtonY = joinButtonY + 30;
        let readyButtonElements = [];
        let countdownDisplay = null;

        function updateReadyButton() {
            readyButtonElements.forEach(el => {
                if (el.exists()) k.destroy(el);
            });
            readyButtonElements = [];
            if (countdownDisplay && countdownDisplay.exists()) {
                k.destroy(countdownDisplay);
                countdownDisplay = null;
            }

            const partySize = getPartySize();
            const countdown = getCountdownState();

            if (partySize >= 2) {
                const isReady = isLocalPlayerReady();

                const readyBg = k.add([
                    k.rect(partyPanelWidth - 20, 24),
                    k.pos(partyPanelX + partyPanelWidth / 2, readyButtonY),
                    k.anchor('center'),
                    k.color(isReady ? 100 : 60, isReady ? 150 : 80, isReady ? 100 : 120),
                    k.outline(2, k.rgb(isReady ? 100 : 80, isReady ? 200 : 120, isReady ? 100 : 180)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS),
                    'readyButtonUI'
                ]);
                readyButtonElements.push(readyBg);

                const readyLabel = k.add([
                    k.text(isReady ? '✓ READY' : 'READY UP', { size: UI_TEXT_SIZES.SMALL - 2 }),
                    k.pos(partyPanelX + partyPanelWidth / 2, readyButtonY),
                    k.anchor('center'),
                    k.color(isReady ? 150 : 100, isReady ? 255 : 150, isReady ? 150 : 200),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT),
                    'readyButtonUI'
                ]);
                readyButtonElements.push(readyLabel);

                readyBg.onClick(() => {
                    playMenuSelect();
                    toggleReady();
                    updateReadyButton();
                    updatePartySlots();
                });

                if (countdown.active) {
                    const secondsLeft = Math.ceil(countdown.timeRemaining / 1000);
                    countdownDisplay = k.add([
                        k.text(`Starting in ${secondsLeft}...`, { size: UI_TEXT_SIZES.SMALL - 2 }),
                        k.pos(partyPanelX + partyPanelWidth / 2, readyButtonY + 20),
                        k.anchor('center'),
                        k.color(...UI_COLORS.SUCCESS),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT),
                        'countdownUI'
                    ]);
                }
            }
        }

        updateReadyButton();

        let lastCountdownCheck = 0;
        k.onUpdate(() => {
            lastCountdownCheck += k.dt();
            if (lastCountdownCheck < 0.1) return;
            lastCountdownCheck = 0;

            const countdown = getCountdownState();
            const partySize = getPartySize();

            if (partySize >= 2) {
                updateReadyButton();
            }

            if (countdown.active && countdown.timeRemaining <= 0) {
                const party = getParty();
                if (party.isHost) {
                    playMenuSelect();
                    broadcastGameStart();
                    k.go('game', { resetState: true });
                }
            }
        });

        // ==========================================
        // DAILY RUN PANEL (Top-right)
        // ==========================================
        const dailyPanelWidth = LAYOUT.RIGHT_COLUMN_WIDTH;
        const dailyPanelHeight = 120;
        const dailyPanelX = rightColumnX;
        const dailyRunY = LAYOUT.TOP_MARGIN;
        const dailyInfo = getDailyRunInfo();
        const dailyChar = CHARACTER_UNLOCKS[dailyInfo.character] || CHARACTER_UNLOCKS.survivor;

        k.add([
            k.rect(dailyPanelWidth, dailyPanelHeight),
            k.pos(dailyPanelX, dailyRunY),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        k.add([
            k.text('DAILY RUN', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 12),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        k.add([
            k.text(dailyChar.char, { size: 28 }),
            k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 45),
            k.anchor('center'),
            k.color(...dailyChar.color),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        k.add([
            k.text(dailyChar.name, { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 68),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const initialPartySize = getPartySize();
        const dailyDisabledInMultiplayer = initialPartySize > 1;

        if (dailyInfo.completed) {
            k.add([
                k.text('COMPLETED', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 95),
                k.anchor('center'),
                k.color(...UI_COLORS.SUCCESS),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        } else if (dailyDisabledInMultiplayer) {
            k.add([
                k.text('SOLO ONLY', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 95),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_DISABLED),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        } else {
            const dailyPlayButton = k.add([
                k.rect(dailyPanelWidth - 40, 28),
                k.pos(dailyPanelX + dailyPanelWidth / 2, dailyRunY + 95),
                k.anchor('center'),
                k.color(...UI_COLORS.SECONDARY),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            k.add([
                k.text('PLAY', { size: UI_TEXT_SIZES.SMALL }),
                k.pos(partyPanelX + partyPanelWidth / 2, dailyRunY + 95),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            dailyPlayButton.onClick(() => {
                if (getPartySize() > 1) return;
                playMenuSelect();
                k.go('game', {
                    resetState: true,
                    isDailyRun: true,
                    dailyCharacter: dailyInfo.character,
                    dailySeed: dailyInfo.seed
                });
            });

            dailyPlayButton.onHoverUpdate(() => {
                dailyPlayButton.color = k.rgb(...UI_COLORS.SECONDARY_HOVER);
            });
            dailyPlayButton.onHoverEnd(() => {
                dailyPlayButton.color = k.rgb(...UI_COLORS.SECONDARY);
            });
        }

        // ==========================================
        // RIGHT COLUMN: Credits + Leaderboards
        // ==========================================

        // Credits display (top right of center area)
        const creditIndicator = createCreditIndicator(k, currency, currencyName);

        // Leaderboards panel (below daily run panel on right)
        const leaderboardsY = dailyRunY + dailyPanelHeight + 15;
        const leaderboardsPanelHeight = 100;

        k.add([
            k.rect(LAYOUT.RIGHT_COLUMN_WIDTH, leaderboardsPanelHeight),
            k.pos(rightColumnX, leaderboardsY),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND),
            'leaderboardsPanel'
        ]);

        k.add([
            k.text('LEADERBOARDS', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(rightColumnX + LAYOUT.RIGHT_COLUMN_WIDTH / 2, leaderboardsY + 15),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        k.add([
            k.text('🏆', { size: 32 }),
            k.pos(rightColumnX + LAYOUT.RIGHT_COLUMN_WIDTH / 2, leaderboardsY + 50),
            k.anchor('center'),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        k.add([
            k.text('VIEW', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(rightColumnX + LAYOUT.RIGHT_COLUMN_WIDTH / 2, leaderboardsY + 80),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const leaderboardsPanel = k.get('leaderboardsPanel')[0];
        if (leaderboardsPanel) {
            leaderboardsPanel.onClick(() => {
                playMenuSelect();
                k.go('leaderboards');
            });
            leaderboardsPanel.onHoverUpdate(() => {
                leaderboardsPanel.color = k.rgb(...UI_COLORS.BG_LIGHT);
            });
            leaderboardsPanel.onHoverEnd(() => {
                leaderboardsPanel.color = k.rgb(...UI_COLORS.BG_MEDIUM);
            });
        }

        // ==========================================
        // CENTER: Title + Main Buttons
        // ==========================================

        // ASCII Art Title with Animation
        const titleY = 160;
        const asciiTitle = [
            '███████╗██╗   ██╗██████╗ ███████╗██████╗ ',
            '██╔════╝██║   ██║██╔══██╗██╔════╝██╔══██╗',
            '███████╗██║   ██║██████╔╝█████╗  ██████╔╝',
            '╚════██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗',
            '███████║╚██████╔╝██║     ███████╗██║  ██║',
            '╚══════╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝',
            '',
            '███████╗███╗   ███╗ █████╗ ███████╗██╗  ██╗',
            '██╔════╝████╗ ████║██╔══██╗██╔════╝██║  ██║',
            '███████╗██╔████╔██║███████║███████╗███████║',
            '╚════██║██║╚██╔╝██║██╔══██║╚════██║██╔══██║',
            '███████║██║ ╚═╝ ██║██║  ██║███████║██║  ██║',
            '╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
            '',
            '████████╗███████╗██╗  ██╗████████╗██╗   ██╗',
            '╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝╚██╗ ██╔╝',
            '   ██║   █████╗   ╚███╔╝    ██║    ╚████╔╝ ',
            '   ██║   ██╔══╝   ██╔██╗    ██║     ╚██╔╝  ',
            '   ██║   ███████╗██╔╝ ██╗   ██║      ██║   ',
            '   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝      ╚═╝   '
        ];

        const titleLines = [];
        const lineSpacing = 12;
        const startY = titleY - (asciiTitle.length * lineSpacing) / 2;

        asciiTitle.forEach((line, index) => {
            const titleLine = k.add([
                k.text(line, { size: 10, font: 'monospace' }),
                k.pos(centerX, startY + index * lineSpacing),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.z(UI_Z_LAYERS.UI_TEXT),
                'titleLine'
            ]);
            titleLines.push(titleLine);
        });

        // Animated color wave effect for title
        let colorTime = 0;
        k.onUpdate(() => {
            colorTime += k.dt();
            titleLines.forEach((line, index) => {
                const hue = (colorTime * 50 + index * 20) % 360;
                const color = hslToRgb(hue, 80, 60);
                line.color = k.rgb(...color);

                const offset = Math.sin(colorTime * 2 + index * 0.3) * 2;
                line.pos.y = startY + index * lineSpacing + offset;

                // Glitch effect (random chance)
                if (Math.random() < 0.001) {
                    line.pos.x = centerX + (Math.random() - 0.5) * 10;
                    k.wait(0.1, () => {
                        if (line.exists()) {
                            line.pos.x = centerX;
                        }
                    });
                }
            });
        });

        // Main buttons - centered column using standardized sizes
        const buttonStartY = 310;
        const buttonSpacing = 55;
        const { XL, LG } = UI_SIZES.BUTTON;

        const playButton = createMenuButton(
            k, 'ACTION!', centerX, buttonStartY,
            XL.width, XL.height, UI_TEXT_SIZES.H1
        );
        playButton.onClick(() => {
            if (playButton.disabled) return;
            playMenuSelect();
            const partySize = getPartySize();
            if (partySize > 1) {
                broadcastGameStart();
            }
            k.go('game', { resetState: true });
        });

        function updateStartButtonState() {
            const party = getParty();
            const partySize = getPartySize();
            const shouldDisable = partySize > 1 && !party.isHost;
            playButton.setDisabled(shouldDisable);
        }
        updateStartButtonState();

        const characterButton = createMenuButton(
            k, 'CONTESTANTS', centerX, buttonStartY + buttonSpacing,
            LG.width, LG.height, UI_TEXT_SIZES.H2
        );
        characterButton.onClick(() => {
            playMenuSelect();
            k.go('characterSelect');
        });

        // Selected character icon next to button
        const selectedCharKey = getSelectedCharacter();
        const selectedCharData = CHARACTER_UNLOCKS[selectedCharKey];
        if (selectedCharData) {
            const isCharUnlocked = isUnlocked('characters', selectedCharKey) || selectedCharData.unlockedByDefault;
            const charDisplayX = centerX + LG.width / 2 + 35;
            const charDisplayY = buttonStartY + buttonSpacing;
            const charDisplaySize = 45;

            const charDisplayBg = k.add([
                k.rect(charDisplaySize, charDisplaySize),
                k.pos(charDisplayX, charDisplayY),
                k.anchor('center'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BACKGROUND)
            ]);

            const charDisplayIcon = k.add([
                k.text(selectedCharData.char, { size: 28 }),
                k.pos(charDisplayX, charDisplayY),
                k.anchor('center'),
                k.color(...(isCharUnlocked ? selectedCharData.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            charDisplayBg.onClick(() => {
                playMenuSelect();
                k.go('characterSelect');
            });

            charDisplayBg.onHoverUpdate(() => {
                charDisplayBg.color = k.rgb(...UI_COLORS.BG_LIGHT);
                charDisplayIcon.scale = k.vec2(1.1);
            });
            charDisplayBg.onHoverEnd(() => {
                charDisplayBg.color = k.rgb(...UI_COLORS.BG_MEDIUM);
                charDisplayIcon.scale = k.vec2(1);
            });
        }

        const shopButton = createMenuButton(
            k, 'MERCH', centerX, buttonStartY + buttonSpacing * 2,
            LG.width, LG.height, UI_TEXT_SIZES.H2
        );
        shopButton.onClick(() => {
            playMenuSelect();
            k.go('shop');
        });

        const statisticsButton = createMenuButton(
            k, 'RATINGS', centerX, buttonStartY + buttonSpacing * 3,
            LG.width, LG.height, UI_TEXT_SIZES.H2
        );
        statisticsButton.onClick(() => {
            playMenuSelect();
            k.go('statistics');
        });

        const settingsButton = createMenuButton(
            k, 'OPTIONS', centerX, buttonStartY + buttonSpacing * 4,
            LG.width, LG.height, UI_TEXT_SIZES.H2
        );
        settingsButton.onClick(() => {
            playMenuSelect();
            k.go('settings');
        });

        // Animate button colors
        const menuButtons = [playButton, characterButton, shopButton, statisticsButton, settingsButton];
        let buttonColorTime = 0;
        k.onUpdate(() => {
            buttonColorTime += k.dt();
            menuButtons.forEach((button, index) => {
                if (!button.exists() || button.isHovered) return;
                const hue = (buttonColorTime * 60 + index * 50) % 360;
                const color = hslToRgb(hue, 70, 50);
                try {
                    button.color = k.rgb(color[0], color[1], color[2]);
                    button.originalColor = color;
                } catch (e) {}
            });
        });

        // Keyboard shortcuts
        const spaceHandler = k.onKeyPress('space', () => {
            if (!playButton.disabled) {
                playMenuSelect();
                k.go('game', { resetState: true });
            }
        });
        const cHandler = k.onKeyPress('c', () => { playMenuNav(); k.go('characterSelect'); });
        const sHandler = k.onKeyPress('s', () => { playMenuNav(); k.go('shop'); });
        const oHandler = k.onKeyPress('o', () => { playMenuNav(); k.go('settings'); });
        const tHandler = k.onKeyPress('t', () => { playMenuNav(); k.go('statistics'); });

        k.onSceneLeave(() => {
            spaceHandler.cancel();
            cHandler.cancel();
            sHandler.cancel();
            oHandler.cancel();
            tHandler.cancel();
        });

        // ==========================================
        // Background decorations (reduced)
        // ==========================================

        // Falling particles
        for (let i = 0; i < 12; i++) {
            const particle = k.add([
                k.text(['*', '+', '·'][Math.floor(Math.random() * 3)], { size: 12 }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(...UI_COLORS.BG_LIGHT),
                k.opacity(0.2 + Math.random() * 0.2),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            particle.speed = 15 + Math.random() * 25;
            particle.onUpdate(() => {
                particle.pos.y += particle.speed * k.dt();
                if (particle.pos.y > k.height()) {
                    particle.pos.y = 0;
                    particle.pos.x = Math.random() * k.width();
                }
            });
        }

        // Pulsing patterns
        const patterns = ['◇', '○', '□', '△'];
        for (let i = 0; i < 8; i++) {
            const pattern = k.add([
                k.text(patterns[Math.floor(Math.random() * patterns.length)], { size: 16 }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(...UI_COLORS.BG_LIGHT),
                k.opacity(0.1),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            pattern.pulseTime = Math.random() * Math.PI * 2;
            pattern.pulseSpeed = 1 + Math.random() * 1.5;

            pattern.onUpdate(() => {
                pattern.pulseTime += k.dt() * pattern.pulseSpeed;
                const scale = 0.8 + Math.sin(pattern.pulseTime) * 0.2;
                pattern.scale = k.vec2(scale, scale);
                pattern.opacity = 0.08 + Math.abs(Math.sin(pattern.pulseTime)) * 0.1;
            });
        }

        // ==========================================
        // Version number (Micro text, bottom-right)
        // ==========================================
        k.add([
            k.text(__APP_VERSION__, { size: UI_TEXT_SIZES.MICRO }),
            k.pos(k.width() - 10, k.height() - 10),
            k.anchor('botright'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // ==========================================
        // EASTER EGG: Golden enemy flyby
        // ==========================================
        k.loop(12, () => {
            if (Math.random() < 0.12) {
                const startY = 100 + Math.random() * (k.height() - 200);
                const direction = Math.random() < 0.5 ? 1 : -1;
                const startX = direction > 0 ? -50 : k.width() + 50;

                const goldenEnemy = k.add([
                    k.text('$', { size: 24 }),
                    k.pos(startX, startY),
                    k.color(...UI_COLORS.GOLD),
                    k.area({ scale: 2.5 }),
                    k.anchor('center'),
                    k.z(UI_Z_LAYERS.PARTICLES + 1),
                    'goldenEnemy'
                ]);

                goldenEnemy.speed = 150 + Math.random() * 100;
                goldenEnemy.direction = direction;
                goldenEnemy.pulseTime = 0;

                goldenEnemy.onClick(() => {
                    if (!goldenEnemy.exists()) return;
                    addCurrency(1);

                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 * i) / 8;
                        const particle = k.add([
                            k.text(['$', '¢'][Math.floor(Math.random() * 2)], { size: 12 }),
                            k.pos(goldenEnemy.pos.x, goldenEnemy.pos.y),
                            k.color(...UI_COLORS.GOLD),
                            k.z(UI_Z_LAYERS.PARTICLES + 2)
                        ]);

                        const speed = 80 + Math.random() * 60;
                        particle.velocity = k.vec2(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        particle.life = 0.8;

                        particle.onUpdate(() => {
                            particle.pos = particle.pos.add(particle.velocity.scale(k.dt()));
                            particle.life -= k.dt();
                            particle.opacity = particle.life / 0.8;
                            if (particle.life <= 0) k.destroy(particle);
                        });
                    }

                    const rewardText = k.add([
                        k.text('+$1', { size: 18 }),
                        k.pos(goldenEnemy.pos.x, goldenEnemy.pos.y),
                        k.anchor('center'),
                        k.color(...UI_COLORS.SUCCESS),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);

                    rewardText.life = 1.2;
                    rewardText.onUpdate(() => {
                        rewardText.pos.y -= 40 * k.dt();
                        rewardText.life -= k.dt();
                        rewardText.opacity = rewardText.life / 1.2;
                        if (rewardText.life <= 0) k.destroy(rewardText);
                    });

                    k.destroy(goldenEnemy);
                    k.wait(0.1, () => k.go('menu'));
                });

                goldenEnemy.onUpdate(() => {
                    goldenEnemy.pos.x += goldenEnemy.speed * goldenEnemy.direction * k.dt();
                    goldenEnemy.pulseTime += k.dt();
                    const pulse = Math.sin(goldenEnemy.pulseTime * 8) * 0.15;
                    goldenEnemy.scale = k.vec2(1 + pulse, 1 + pulse);

                    if ((goldenEnemy.direction > 0 && goldenEnemy.pos.x > k.width() + 100) ||
                        (goldenEnemy.direction < 0 && goldenEnemy.pos.x < -100)) {
                        k.destroy(goldenEnemy);
                    }
                });
            }
        });
    });
}
