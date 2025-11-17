// Main menu scene
import { getCurrency, getCurrencyName, getPlayerName, getInviteCode, getSelectedCharacter, isUnlocked, addCurrency } from '../systems/metaProgression.js';
import { initParty, getPartyDisplayInfo, joinPartyAsClient, isMultiplayerAvailable } from '../systems/partySystem.js';
import { initAudio, playMenuSelect, playMenuNav } from '../systems/sounds.js';
import { CHARACTER_UNLOCKS } from '../data/unlocks.js';
import { isValidInviteCode } from '../systems/nameGenerator.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_SPACING,
    UI_BUTTON,
    UI_Z_LAYERS,
    formatButtonText,
    createCreditIndicator
} from '../config/uiConfig.js';

// Track if a dialog is currently open (to disable menu hotkeys)
let isDialogOpen = false;

/**
 * Create an interactive menu button
 * @param {Object} k - Kaplay instance
 * @param {string} text - Button text
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Button width (optional)
 * @param {number} height - Button height (optional)
 * @param {number} fontSize - Font size (optional)
 * @returns {Object} - Button group object
 */
function createMenuButton(k, text, x, y, width = UI_BUTTON.WIDTH, height = UI_BUTTON.HEIGHT, fontSize = UI_TEXT_SIZES.BUTTON) {
    const primaryColor = UI_COLORS.SECONDARY;
    const hoverColor = UI_COLORS.SECONDARY_HOVER;
    const textColor = UI_COLORS.TEXT_PRIMARY;
    const borderColor = UI_COLORS.BORDER;
    const disabled = false;
    const hotkey = null;

    // Button background
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

    // Button text with hotkey highlighting
    const formattedText = formatButtonText(text);
    const labels = [];

    // Check if hotkey exists in text
    if (hotkey && formattedText.toUpperCase().includes(hotkey.toUpperCase())) {
        const hotkeyIndex = formattedText.toUpperCase().indexOf(hotkey.toUpperCase());
        const beforeHotkey = formattedText.substring(0, hotkeyIndex);
        const hotkeyChar = formattedText.charAt(hotkeyIndex);
        const afterHotkey = formattedText.substring(hotkeyIndex + 1);

        // Create full text for measurement
        const fullLabel = k.add([
            k.text(formattedText, { size: fontSize }),
            k.pos(x, y),
            k.anchor('center'),
            k.opacity(0), // Invisible, just for measurement
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        // Calculate positions for each part
        const charWidth = fullLabel.width / formattedText.length;
        const startX = x - fullLabel.width / 2;

        // Text before hotkey
        if (beforeHotkey) {
            const beforeLabel = k.add([
                k.text(beforeHotkey, { size: fontSize }),
                k.pos(startX + (beforeHotkey.length / 2) * charWidth, y),
                k.anchor('center'),
                k.color(...textColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT),
                'menuButtonText'
            ]);
            labels.push(beforeLabel);
        }

        // Hotkey (highlighted)
        const hotkeyLabel = k.add([
            k.text(hotkeyChar, { size: fontSize }),
            k.pos(startX + (hotkeyIndex + 0.5) * charWidth, y),
            k.anchor('center'),
            k.color(0, 0, 0),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT),
            'menuButtonText'
        ]);
        labels.push(hotkeyLabel);

        // Text after hotkey
        if (afterHotkey) {
            const afterStartX = startX + (hotkeyIndex + 1 + afterHotkey.length / 2) * charWidth;
            const afterLabel = k.add([
                k.text(afterHotkey, { size: fontSize }),
                k.pos(afterStartX, y),
                k.anchor('center'),
                k.color(...textColor),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT),
                'menuButtonText'
            ]);
            labels.push(afterLabel);
        }

        // Destroy measurement label
        k.destroy(fullLabel);
    } else {
        // No hotkey or hotkey not found in text - regular label
        const label = k.add([
            k.text(formattedText, { size: fontSize }),
            k.pos(x, y),
            k.anchor('center'),
            k.color(...textColor),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT),
            'menuButtonText'
        ]);
        labels.push(label);
    }

    const label = labels[0]; // Keep reference to first label for compatibility

    // Store original colors
    bg.originalColor = [...primaryColor];
    bg.hoverColor = [...hoverColor];
    bg.borderColor = [...borderColor];
    bg.isHovered = false;
    bg.disabled = disabled;

    // Hover effect
    bg.onHoverUpdate(() => {
        if (bg.disabled) return;
        if (!bg.isHovered) {
            bg.isHovered = true;
            playMenuNav();
        }
        bg.color = k.rgb(...bg.hoverColor);
        bg.outline.color = k.rgb(...UI_COLORS.BORDER_HOVER);
        // Slight scale effect
        bg.scale = k.vec2(UI_BUTTON.HOVER_SCALE, UI_BUTTON.HOVER_SCALE);
        labels.forEach(lbl => lbl.scale = k.vec2(UI_BUTTON.HOVER_SCALE, UI_BUTTON.HOVER_SCALE));
    });

    bg.onHoverEnd(() => {
        if (bg.disabled) return;
        bg.isHovered = false;
        bg.color = k.rgb(...bg.originalColor);
        bg.outline.color = k.rgb(...bg.borderColor);
        bg.scale = k.vec2(1, 1);
        labels.forEach(lbl => lbl.scale = k.vec2(1, 1));
    });

    // Click handler support - onClick can be attached after creation
    // Users can call button.onClick(() => { ... }) after creating the button

    // Keyboard shortcut support
    bg.label = label;
    bg.labels = labels; // Store all labels
    bg.setDisabled = (isDisabled) => {
        bg.disabled = isDisabled;
        if (isDisabled) {
            bg.color = k.rgb(...UI_COLORS.BG_DISABLED);
            labels.forEach(lbl => lbl.color = k.rgb(...UI_COLORS.TEXT_DISABLED));
        } else {
            bg.color = k.rgb(...bg.originalColor);
            // Restore original colors (hotkey stays black)
            labels.forEach((lbl, idx) => {
                if (hotkey && idx === 1 && labels.length > 1) {
                    lbl.color = k.rgb(0, 0, 0); // Keep hotkey black
                } else {
                    lbl.color = k.rgb(...textColor);
                }
            });
        }
    };

    return bg;
}

/**
 * Show join party dialog for entering invite code
 */
function showJoinPartyDialog(k, joinPartyBtn) {
    // Set dialog open flag to disable menu hotkeys
    isDialogOpen = true;

    // Disable the join party button to prevent multiple dialogs
    if (joinPartyBtn) {
        joinPartyBtn.setDisabled(true);
    }

    // Overlay
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.7),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY),
        'joinDialog'
    ]);

    // Dialog box
    const dialogWidth = 400;
    const dialogHeight = 200;
    const dialogBg = k.add([
        k.rect(dialogWidth, dialogHeight),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(3, k.rgb(...UI_COLORS.BORDER)),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 1),
        'joinDialog'
    ]);

    // Close button (X) in top-right corner of dialog
    const closeButtonSize = 24;
    const closeButton = k.add([
        k.rect(closeButtonSize, closeButtonSize),
        k.pos(k.width() / 2 + dialogWidth / 2 - 10, k.height() / 2 - dialogHeight / 2 + 10),
        k.anchor('topright'),
        k.color(...UI_COLORS.BG_DARK),
        k.outline(1, k.rgb(...UI_COLORS.BORDER)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    const closeButtonText = k.add([
        k.text('X', { size: UI_TEXT_SIZES.SMALL }),
        k.pos(k.width() / 2 + dialogWidth / 2 - 10 - closeButtonSize / 2, k.height() / 2 - dialogHeight / 2 + 10 + closeButtonSize / 2),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3),
        'joinDialog'
    ]);

    // Close button hover effect
    closeButton.onHoverUpdate(() => {
        closeButton.color = k.rgb(...UI_COLORS.BG_LIGHT);
        closeButtonText.color = k.rgb(255, 100, 100);
    });

    closeButton.onHoverEnd(() => {
        closeButton.color = k.rgb(...UI_COLORS.BG_DARK);
        closeButtonText.color = k.rgb(...UI_COLORS.TEXT_PRIMARY);
    });

    closeButton.onClick(() => {
        if (isJoining) return;
        playMenuNav();
        closeDialog();
    });

    // Title
    const titleText = k.add([
        k.text('Join Party', { size: UI_TEXT_SIZES.LABEL }),
        k.pos(k.width() / 2, k.height() / 2 - 70),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    // Instruction
    const instructionText = k.add([
        k.text('Enter 6-digit invite code:', { size: UI_TEXT_SIZES.SMALL }),
        k.pos(k.width() / 2, k.height() / 2 - 30),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    // Input display
    let inputCode = '';
    const inputDisplay = k.add([
        k.text('______', { size: UI_TEXT_SIZES.TITLE }),
        k.pos(k.width() / 2, k.height() / 2 + 10),
        k.anchor('center'),
        k.color(...UI_COLORS.GOLD),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    // Error/Status message
    const errorMsg = k.add([
        k.text('', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2, k.height() / 2 + 45),
        k.anchor('center'),
        k.color(255, 100, 100),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    let isJoining = false;

    // Cancel button - created directly with correct z-layers
    const cancelButtonBg = k.add([
        k.rect(100, 30),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 70),
        k.anchor('center'),
        k.color(...UI_COLORS.SECONDARY),
        k.outline(2, k.rgb(...UI_COLORS.BORDER)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    const cancelButtonText = k.add([
        k.text('Cancel', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 70),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3),
        'joinDialog'
    ]);

    // Create cancel button object
    const cancelButton = cancelButtonBg;
    cancelButton.labels = [cancelButtonText];

    // Join button - created directly with correct z-layers
    const joinButtonBg = k.add([
        k.rect(100, 30),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 70),
        k.anchor('center'),
        k.color(...UI_COLORS.SECONDARY),
        k.outline(2, k.rgb(...UI_COLORS.BORDER)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2),
        'joinDialog'
    ]);

    const joinButtonText = k.add([
        k.text('Join', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 70),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3),
        'joinDialog'
    ]);

    // Create join button object with setDisabled method
    const joinButton = joinButtonBg;
    joinButton.labels = [joinButtonText];
    joinButton.setDisabled = (disabled) => {
        if (disabled) {
            joinButtonBg.color = k.rgb(80, 80, 90);
            joinButtonText.color = k.rgb(150, 150, 150);
            joinButton.disabled = true;
        } else {
            joinButtonBg.color = k.rgb(...UI_COLORS.SECONDARY);
            joinButtonText.color = k.rgb(...UI_COLORS.TEXT_PRIMARY);
            joinButton.disabled = false;
        }
    };

    // Initially disable Join button until code is entered
    joinButton.setDisabled(true);

    // Store all dialog entities for cleanup
    const dialogEntities = [
        overlay,
        dialogBg,
        closeButton,
        closeButtonText,
        titleText,
        instructionText,
        inputDisplay,
        errorMsg,
        cancelButton, // bg entity
        ...cancelButton.labels, // label entities
        joinButton, // bg entity
        ...joinButton.labels // label entities
    ];

    // Event handlers (defined here so they can be referenced in closeDialog)
    const charInputHandler = k.onCharInput((ch) => {
        if (isJoining) return;
        if (ch >= '0' && ch <= '9' && inputCode.length < 6) {
            inputCode += ch;
            // Update display with current input + remaining underscores
            const display = inputCode + '______'.substring(inputCode.length);
            inputDisplay.text = display;
            errorMsg.text = '';

            // Auto-join when 6 digits are entered
            if (inputCode.length === 6) {
                joinButton.setDisabled(false);
                // Wait a tiny bit for the display to update, then auto-join
                k.wait(0.1, () => {
                    if (!isJoining && inputCode.length === 6) {
                        // Trigger join button click
                        joinButtonBg.click();
                    }
                });
            }
        }
    });

    const backspaceHandler = k.onKeyPress('backspace', () => {
        if (isJoining) return;
        if (inputCode.length > 0) {
            inputCode = inputCode.slice(0, -1);
            const display = inputCode + '______'.substring(inputCode.length);
            inputDisplay.text = display;

            // Disable Join button if less than 6 digits
            if (inputCode.length < 6) {
                joinButton.setDisabled(true);
            }
        }
    });

    const escapeHandler = k.onKeyPress('escape', () => {
        if (isJoining) return;
        playMenuNav();
        closeDialog();
    });

    const enterHandler = k.onKeyPress('enter', async () => {
        if (isJoining) return;
        if (inputCode.length === 6) {
            // Trigger the join button click
            joinButton.onClick();
        }
    });

    // Close function
    function closeDialog() {
        // Clear dialog open flag to re-enable menu hotkeys
        isDialogOpen = false;

        // Destroy all dialog entities
        dialogEntities.forEach(entity => {
            if (entity && entity.exists && entity.exists()) {
                k.destroy(entity);
            }
        });

        // Cleanup event handlers
        charInputHandler.cancel();
        backspaceHandler.cancel();
        escapeHandler.cancel();
        enterHandler.cancel();

        // Re-enable the join party button
        if (joinPartyBtn) {
            joinPartyBtn.setDisabled(false);
        }
    }

    cancelButton.onClick(() => {
        playMenuNav();
        closeDialog();
    });

    joinButton.onClick(async () => {
        if (joinButton.disabled || isJoining) return; // Prevent clicks when disabled

        // Validate invite code format
        if (inputCode.length === 6) {
            if (!isValidInviteCode(inputCode)) {
                errorMsg.color = k.rgb(255, 100, 100);
                errorMsg.text = 'Invalid code format';
                return;
            }

            playMenuSelect();
            isJoining = true;
            joinButton.setDisabled(true);
            errorMsg.color = k.rgb(255, 255, 100); // Yellow for status
            errorMsg.text = 'Connecting...';

            try {
                console.log('Joining party with code:', inputCode);

                // Create a timeout promise that rejects after 10 seconds
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('timeout')), 10000);
                });

                // Race between joining and timeout
                const success = await Promise.race([
                    joinPartyAsClient(inputCode),
                    timeoutPromise
                ]);

                if (success) {
                    errorMsg.color = k.rgb(100, 255, 100); // Green for success
                    errorMsg.text = 'Connected! Joined party.';

                    // Close dialog after brief delay
                    k.wait(1, () => {
                        closeDialog();
                        // Refresh the menu scene to show updated party
                        k.go('menu');
                    });
                } else {
                    errorMsg.color = k.rgb(255, 100, 100); // Red for error
                    errorMsg.text = 'Failed to find party';
                    isJoining = false;
                    joinButton.setDisabled(false);
                }
            } catch (err) {
                console.error('Join error:', err);
                errorMsg.color = k.rgb(255, 100, 100);

                // Check if it was a timeout
                if (err.message === 'timeout') {
                    errorMsg.text = 'Failed to find party';
                } else {
                    errorMsg.text = 'Failed to find party';
                }

                isJoining = false;
                joinButton.setDisabled(false);
            }
        } else {
            errorMsg.color = k.rgb(255, 100, 100);
            errorMsg.text = 'Please enter 6 digits';
        }
    });
}

export function setupMenuScene(k) {
    k.scene('menu', () => {
        // Initialize audio context on first user interaction
        initAudio();

        const currency = getCurrency();
        const currencyName = getCurrencyName();

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(...UI_COLORS.BG_DARK),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Decorative top border
        k.add([
            k.rect(k.width(), 4),
            k.pos(0, 0),
            k.color(...UI_COLORS.BORDER),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // Decorative bottom border
        k.add([
            k.rect(k.width(), 4),
            k.pos(0, k.height() - 4),
            k.color(...UI_COLORS.BORDER),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // ==========================================
        // PARTY SYSTEM UI (Top Left)
        // ==========================================
        initParty(); // Initialize party system (async but fire-and-forget is ok here)

        const partyPanelX = 20;
        const partyPanelY = 20;
        const partyPanelWidth = 188;
        const slotHeight = 24; // Reduced from 32 to 24
        const slotSpacing = 3; // Reduced from 4 to 3
        const titlePadding = 10; // Small padding at top instead of 35
        const partyPanelHeight = titlePadding + (slotHeight * 4) + (slotSpacing * 3) + 60; // No title, just slots + invite area

        // Party panel background
        k.add([
            k.rect(partyPanelWidth, partyPanelHeight),
            k.pos(partyPanelX, partyPanelY),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        // Get party info
        const partySlots = getPartyDisplayInfo();

        // Create party slot UI elements
        const slotsStartY = partyPanelY + titlePadding;
        partySlots.forEach((slot, index) => {
            const slotY = slotsStartY + (index * (slotHeight + slotSpacing));

            // Slot background
            const slotBg = k.add([
                k.rect(partyPanelWidth - 20, slotHeight),
                k.pos(partyPanelX + 10, slotY),
                k.color(slot.isEmpty ? UI_COLORS.BG_DARK : UI_COLORS.BG_LIGHT),
                k.outline(1, k.rgb(...UI_COLORS.TEXT_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BACKGROUND + 1)
            ]);

            // Slot number
            k.add([
                k.text(`${slot.slotNumber}`, { size: UI_TEXT_SIZES.SMALL }),
                k.pos(partyPanelX + 20, slotY + slotHeight / 2),
                k.anchor('left'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Player name or "Empty Slot"
            k.add([
                k.text(slot.playerName, { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(partyPanelX + 45, slotY + slotHeight / 2),
                k.anchor('left'),
                k.color(slot.isEmpty ? UI_COLORS.TEXT_DISABLED : (slot.isLocal ? UI_COLORS.GOLD : UI_COLORS.TEXT_PRIMARY)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // "You" indicator for local player
            if (slot.isLocal) {
                k.add([
                    k.text('(You)', { size: UI_TEXT_SIZES.SMALL - 4 }),
                    k.pos(partyPanelX + partyPanelWidth - 20, slotY + slotHeight / 2),
                    k.anchor('right'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
            }
        });

        // Invite code section
        const inviteCodeY = slotsStartY + (4 * (slotHeight + slotSpacing)) + 10;

        // Label on the left
        k.add([
            k.text('Invite Code:', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(partyPanelX + 10, inviteCodeY),
            k.anchor('left'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        const inviteCode = getInviteCode();

        // Check if multiplayer is available
        const multiplayerAvailable = isMultiplayerAvailable();

        // Code/status on the right (same line)
        if (multiplayerAvailable) {
            k.add([
                k.text(inviteCode, { size: UI_TEXT_SIZES.SMALL }),
                k.pos(partyPanelX + partyPanelWidth - 10, inviteCodeY),
                k.anchor('right'),
                k.color(...UI_COLORS.GOLD),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        } else {
            // Show offline status
            k.add([
                k.text('OFFLINE', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(partyPanelX + partyPanelWidth - 10, inviteCodeY),
                k.anchor('right'),
                k.color(...UI_COLORS.TEXT_DISABLED),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }

        // Join Party button (moved up since we removed a line)
        const joinButtonY = inviteCodeY + 25;
        const joinButton = createMenuButton(
            k,
            'JOIN PARTY',
            partyPanelX + partyPanelWidth / 2,
            joinButtonY,
            120,
            30,
            UI_TEXT_SIZES.SMALL - 2
        );

        joinButton.onClick(() => {
            playMenuSelect();
            // Show join party input dialog, passing the button reference
            showJoinPartyDialog(k, joinButton);
        });

        // Currency display (standardized)
        const creditIndicator = createCreditIndicator(k, currency, currencyName);

        // ==========================================
        // SELECTED CHARACTER DISPLAY (Bottom Right)
        // ==========================================
        // Temporarily disabled to debug error
        /*
        const selectedCharKey = getSelectedCharacter();
        const selectedCharData = CHARACTER_UNLOCKS[selectedCharKey];

        // Only show character panel if character data exists
        if (selectedCharData) {
            const isCharUnlocked = isUnlocked('characters', selectedCharKey) || selectedCharData.unlockedByDefault;

            const charPanelWidth = 200;
            const charPanelHeight = 120;
            const charPanelX = k.width() - 20;
            const charPanelY = k.height() - 20;

            // Character panel background
            k.add([
                k.rect(charPanelWidth, charPanelHeight),
                k.pos(charPanelX, charPanelY),
                k.anchor('bottomright'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BACKGROUND)
            ]);

            // "Selected Character" label
            k.add([
                k.text('SELECTED CHARACTER', { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(charPanelX - charPanelWidth / 2, charPanelY - charPanelHeight + 15),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_SECONDARY),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Character visual (large)
            k.add([
                k.text(selectedCharData.char, { size: 48 }),
                k.pos(charPanelX - charPanelWidth / 2, charPanelY - charPanelHeight / 2 + 5),
                k.anchor('center'),
                k.color(...(isCharUnlocked ? selectedCharData.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Character name
            k.add([
                k.text(selectedCharData.name, { size: UI_TEXT_SIZES.SMALL }),
                k.pos(charPanelX - charPanelWidth / 2, charPanelY - 15),
                k.anchor('center'),
                k.color(...(isCharUnlocked ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }
        */

        // ASCII Art Title with Animation
        const titleY = 130;

        // ASCII Art Title
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

        // Create animated ASCII title
        const titleLines = [];
        const lineSpacing = 12;
        const startY = titleY - (asciiTitle.length * lineSpacing) / 2;

        asciiTitle.forEach((line, index) => {
            const titleLine = k.add([
                k.text(line, { size: 10, font: 'monospace' }),
                k.pos(k.width() / 2, startY + index * lineSpacing),
                k.anchor('center'),
                k.color(...UI_COLORS.TEXT_PRIMARY),
                k.z(UI_Z_LAYERS.UI_TEXT),
                'titleLine'
            ]);
            titleLines.push(titleLine);
        });

        // Animated color wave effect
        let colorTime = 0;
        k.onUpdate(() => {
            colorTime += k.dt();
            titleLines.forEach((line, index) => {
                // Rainbow wave effect
                const hue = (colorTime * 50 + index * 20) % 360;
                const color = hslToRgb(hue, 80, 60);
                line.color = k.rgb(...color);

                // Subtle floating animation
                const offset = Math.sin(colorTime * 2 + index * 0.3) * 2;
                line.pos.y = startY + index * lineSpacing + offset;

                // Glitch effect (random chance)
                if (Math.random() < 0.001) {
                    line.pos.x = k.width() / 2 + (Math.random() - 0.5) * 10;
                    k.wait(0.1, () => {
                        if (line.exists()) {
                            line.pos.x = k.width() / 2;
                        }
                    });
                }
            });
        });

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

        // Button layout
        const buttonStartY = 280;
        const buttonSpacing = UI_SPACING.BUTTON_VERTICAL;
        const centerX = k.width() / 2;

        // Main buttons
        const playButton = createMenuButton(
            k, 'Start', centerX, buttonStartY,
            350, 55, UI_TEXT_SIZES.HEADER
        );
        playButton.onClick(() => {
            playMenuSelect();
            k.go('game', { resetState: true });
        });

        const characterButton = createMenuButton(
            k, 'Characters', centerX, buttonStartY + buttonSpacing,
            350, 50, UI_TEXT_SIZES.BUTTON
        );
        characterButton.onClick(() => {
            playMenuSelect();
            k.go('characterSelect');
        });

        // Selected character display (to the right of Character Select button)
        const selectedCharKey = getSelectedCharacter();
        const selectedCharData = CHARACTER_UNLOCKS[selectedCharKey];

        if (selectedCharData) {
            const isCharUnlocked = isUnlocked('characters', selectedCharKey) || selectedCharData.unlockedByDefault;
            const charDisplayX = centerX + 175 + 60; // Button half-width + spacing
            const charDisplayY = buttonStartY + buttonSpacing;
            const charDisplaySize = 50;

            // Character background
            k.add([
                k.rect(charDisplaySize, charDisplaySize),
                k.pos(charDisplayX, charDisplayY),
                k.anchor('center'),
                k.color(...UI_COLORS.BG_MEDIUM),
                k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_BACKGROUND)
            ]);

            // Character icon
            k.add([
                k.text(selectedCharData.char, { size: 36 }),
                k.pos(charDisplayX, charDisplayY),
                k.anchor('center'),
                k.color(...(isCharUnlocked ? selectedCharData.color : UI_COLORS.BG_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Character name below
            k.add([
                k.text(selectedCharData.name, { size: UI_TEXT_SIZES.SMALL - 2 }),
                k.pos(charDisplayX, charDisplayY + 35),
                k.anchor('center'),
                k.color(...(isCharUnlocked ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_DISABLED)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
        }

        const shopButton = createMenuButton(
            k, 'Shop', centerX, buttonStartY + buttonSpacing * 2,
            350, 50, UI_TEXT_SIZES.BUTTON
        );
        shopButton.onClick(() => {
            playMenuSelect();
            k.go('shop');
        });

        const statisticsButton = createMenuButton(
            k, 'Stats', centerX, buttonStartY + buttonSpacing * 3,
            350, 50, UI_TEXT_SIZES.BUTTON
        );
        statisticsButton.onClick(() => {
            playMenuSelect();
            k.go('statistics');
        });

        const settingsButton = createMenuButton(
            k, 'Options', centerX, buttonStartY + buttonSpacing * 4,
            350, 50, UI_TEXT_SIZES.BUTTON
        );
        settingsButton.onClick(() => {
            playMenuSelect();
            k.go('settings');
        });

        // Store all menu buttons for animation
        const menuButtons = [
            playButton,
            characterButton,
            shopButton,
            statisticsButton,
            settingsButton
        ];

        // Animate button colors in a wave pattern
        let buttonColorTime = 0;
        k.onUpdate(() => {
            buttonColorTime += k.dt();
            menuButtons.forEach((button, index) => {
                if (!button.exists()) return;

                // Don't animate if button is being hovered
                if (button.isHovered) return;

                // Rainbow wave effect - each button offset in the wave
                const hue = (buttonColorTime * 60 + index * 50) % 360;
                const color = hslToRgb(hue, 70, 50);

                // Update button background color (safer approach)
                try {
                    const newColor = k.rgb(color[0], color[1], color[2]);
                    button.color = newColor;

                    // Store this as the "original" color so hover returns to current wave color
                    button.originalColor = color;
                } catch (e) {
                    // Silently ignore color update errors
                    console.error('Color update error:', e);
                }
            });
        });

        // Keyboard shortcuts (disabled when dialog is open)
        const spaceHandler = k.onKeyPress('space', () => {
            if (isDialogOpen) return;
            playMenuSelect();
            k.go('game', { resetState: true });
        });

        const cHandler = k.onKeyPress('c', () => {
            if (isDialogOpen) return;
            playMenuNav();
            k.go('characterSelect');
        });

        const sHandler = k.onKeyPress('s', () => {
            if (isDialogOpen) return;
            playMenuNav();
            k.go('shop');
        });

        const oHandler = k.onKeyPress('o', () => {
            if (isDialogOpen) return;
            playMenuNav();
            k.go('settings');
        });

        const tHandler = k.onKeyPress('t', () => {
            if (isDialogOpen) return;
            playMenuNav();
            k.go('statistics');
        });

        // Cleanup handlers when scene ends
        k.onSceneLeave(() => {
            spaceHandler.cancel();
            cHandler.cancel();
            sHandler.cancel();
            oHandler.cancel();
            tHandler.cancel();
        });

        // Animated ASCII creatures moving across screen
        const asciiCreatures = [
            ['<o>', '(o)', '<O>', '(O)'], // Eyes
            ['~@~', '^@^', '~o~', '^o^'], // Happy faces
            ['[#]', '{#}', '<#>', '(#)'], // Boxes
            ['===', '---', '___', '~~~'], // Lines
            ['<>', '><', '^v', 'vA']      // Arrows
        ];

        for (let i = 0; i < 8; i++) {
            const creatureSet = asciiCreatures[Math.floor(Math.random() * asciiCreatures.length)];
            const creature = k.add([
                k.text(creatureSet[0], { size: 16, font: 'monospace' }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(...UI_COLORS.BG_LIGHT),
                k.opacity(0.2 + Math.random() * 0.2),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            creature.speed = 30 + Math.random() * 50;
            creature.direction = Math.random() < 0.5 ? 1 : -1;
            creature.animFrame = 0;
            creature.creatureSet = creatureSet;

            creature.onUpdate(() => {
                // Move horizontally
                creature.pos.x += creature.speed * creature.direction * k.dt();

                // Animate through different ASCII frames
                creature.animFrame += k.dt() * 4;
                const frameIndex = Math.floor(creature.animFrame) % creature.creatureSet.length;
                creature.text = creature.creatureSet[frameIndex];

                // Wrap around screen
                if (creature.direction > 0 && creature.pos.x > k.width() + 50) {
                    creature.pos.x = -50;
                    creature.pos.y = Math.random() * k.height();
                } else if (creature.direction < 0 && creature.pos.x < -50) {
                    creature.pos.x = k.width() + 50;
                    creature.pos.y = Math.random() * k.height();
                }
            });
        }

        // Falling matrix-style characters
        for (let i = 0; i < 15; i++) {
            const chars = '01アイウエオカキクケコサシスセソ'.split('');
            const matrixChar = k.add([
                k.text(chars[Math.floor(Math.random() * chars.length)], { size: 14, font: 'monospace' }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(50 + Math.random() * 50, 100 + Math.random() * 100, 50 + Math.random() * 50),
                k.opacity(0.2 + Math.random() * 0.3),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            matrixChar.speed = 40 + Math.random() * 80;
            matrixChar.charChangeTimer = 0;
            matrixChar.chars = chars;

            matrixChar.onUpdate(() => {
                matrixChar.pos.y += matrixChar.speed * k.dt();

                // Change character randomly
                matrixChar.charChangeTimer += k.dt();
                if (matrixChar.charChangeTimer > 0.1) {
                    matrixChar.text = matrixChar.chars[Math.floor(Math.random() * matrixChar.chars.length)];
                    matrixChar.charChangeTimer = 0;
                }

                if (matrixChar.pos.y > k.height()) {
                    matrixChar.pos.y = -20;
                    matrixChar.pos.x = Math.random() * k.width();
                }
            });
        }

        // Pulsing geometric ASCII patterns
        const patterns = ['◇', '◆', '○', '●', '□', '■', '△', '▲'];
        for (let i = 0; i < 12; i++) {
            const pattern = k.add([
                k.text(patterns[Math.floor(Math.random() * patterns.length)], { size: 20 }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(...UI_COLORS.BG_LIGHT),
                k.opacity(0.15),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            pattern.pulseTime = Math.random() * Math.PI * 2;
            pattern.pulseSpeed = 1 + Math.random() * 2;

            pattern.onUpdate(() => {
                pattern.pulseTime += k.dt() * pattern.pulseSpeed;
                const scale = 0.8 + Math.sin(pattern.pulseTime) * 0.3;
                pattern.scale = k.vec2(scale, scale);
                pattern.opacity = 0.1 + Math.abs(Math.sin(pattern.pulseTime)) * 0.15;
            });
        }

        // Original particle effects
        for (let i = 0; i < 20; i++) {
            const particle = k.add([
                k.text(['*', '+', '·', '˙'][Math.floor(Math.random() * 4)], { size: 12 }),
                k.pos(Math.random() * k.width(), Math.random() * k.height()),
                k.color(...UI_COLORS.BG_LIGHT),
                k.opacity(0.3 + Math.random() * 0.3),
                k.z(UI_Z_LAYERS.PARTICLES)
            ]);

            particle.speed = 10 + Math.random() * 20;
            particle.onUpdate(() => {
                particle.pos.y += particle.speed * k.dt();
                if (particle.pos.y > k.height()) {
                    particle.pos.y = 0;
                    particle.pos.x = Math.random() * k.width();
                }
            });
        }

        // ==========================================
        // EASTER EGG: Cursor-following ships/asteroids
        // ==========================================
        const cursorFollowers = [];

        // Spawn cursor followers occasionally
        k.loop(5, () => {
            if (cursorFollowers.length < 3 && Math.random() < 0.3) {
                const shipChars = ['◄', '►', '▲', '▼', '◆', '●', '★'];
                const ship = k.add([
                    k.text(shipChars[Math.floor(Math.random() * shipChars.length)], { size: 16 }),
                    k.pos(Math.random() * k.width(), Math.random() * k.height()),
                    k.color(100 + Math.random() * 100, 100 + Math.random() * 100, 200 + Math.random() * 55),
                    k.opacity(0.4 + Math.random() * 0.2),
                    k.rotate(Math.random() * 360),
                    k.z(UI_Z_LAYERS.PARTICLES)
                ]);

                ship.followSpeed = 20 + Math.random() * 30;
                ship.rotationSpeed = 50 + Math.random() * 100;
                ship.lifetime = 15 + Math.random() * 10;

                ship.onUpdate(() => {
                    // Follow mouse cursor
                    const mousePos = k.mousePos();
                    const dir = mousePos.sub(ship.pos);
                    const dist = dir.len();

                    if (dist > 5) {
                        const normalized = dir.scale(1 / dist);
                        ship.pos = ship.pos.add(normalized.scale(ship.followSpeed * k.dt()));
                    }

                    // Rotate slowly
                    ship.angle += ship.rotationSpeed * k.dt();

                    // Fade out over lifetime
                    ship.lifetime -= k.dt();
                    if (ship.lifetime <= 0) {
                        k.destroy(ship);
                        const index = cursorFollowers.indexOf(ship);
                        if (index > -1) cursorFollowers.splice(index, 1);
                    }
                });

                cursorFollowers.push(ship);
            }
        });

        // ==========================================
        // EASTER EGG: Golden enemy flyby
        // ==========================================

        // Spawn golden enemies occasionally
        k.loop(10, () => {
            if (Math.random() < 0.15) { // 15% chance every 10 seconds
                // Vary spawn angle and direction
                const spawnAngle = Math.random() * Math.PI * 2; // Random angle
                const spawnDistance = 100; // Distance from screen edge
                const centerX = k.width() / 2;
                const centerY = k.height() / 2;
                
                // Calculate spawn position based on angle
                const startX = centerX + Math.cos(spawnAngle) * (k.width() / 2 + spawnDistance);
                const startY = centerY + Math.sin(spawnAngle) * (k.height() / 2 + spawnDistance);
                
                // Direction towards center (with some variation)
                const targetX = centerX + (Math.random() - 0.5) * 200;
                const targetY = centerY + (Math.random() - 0.5) * 200;
                const dx = targetX - startX;
                const dy = targetY - startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const directionX = dx / distance;
                const directionY = dy / distance;

                const goldenEnemy = k.add([
                    k.text('$', { size: 24 }),
                    k.pos(startX, startY),
                    k.color(...UI_COLORS.GOLD),
                    k.area({ scale: 2.5 }), // Larger hitbox for easier clicking
                    k.anchor('center'),
                    k.z(UI_Z_LAYERS.PARTICLES + 1),
                    'goldenEnemy'
                ]);

                goldenEnemy.speed = 150 + Math.random() * 100;
                goldenEnemy.directionX = directionX;
                goldenEnemy.directionY = directionY;
                goldenEnemy.pulseTime = 0;

                // Click handler
                goldenEnemy.onClick(() => {
                    if (!goldenEnemy.exists()) return;

                    // Add currency
                    addCurrency(1);

                    // Enhanced explosion effect - more particles, longer duration
                    const particleCount = 24; // Increased from 12
                    for (let i = 0; i < particleCount; i++) {
                        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3; // Add variation
                        const particle = k.add([
                            k.text(['$', '¢', '€', '¥', '★', '✨'][Math.floor(Math.random() * 6)], { size: 16 + Math.random() * 8 }),
                            k.pos(goldenEnemy.pos.x, goldenEnemy.pos.y),
                            k.color(...UI_COLORS.GOLD),
                            k.z(UI_Z_LAYERS.PARTICLES + 2)
                        ]);

                        const speed = 150 + Math.random() * 150; // Increased speed range
                        particle.velocity = k.vec2(
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed
                        );
                        particle.life = 2.5; // Increased from 1 to 2.5 seconds
                        particle.rotation = Math.random() * 360;
                        particle.rotationSpeed = (Math.random() - 0.5) * 360; // Rotation

                        particle.onUpdate(() => {
                            particle.pos = particle.pos.add(particle.velocity.scale(k.dt()));
                            particle.velocity = particle.velocity.scale(0.98); // Slight deceleration
                            particle.life -= k.dt();
                            particle.opacity = particle.life / 2.5;
                            particle.angle += particle.rotationSpeed * k.dt();

                            if (particle.life <= 0) {
                                k.destroy(particle);
                            }
                        });
                    }

                    // Enhanced "+$1" text with larger size and longer duration
                    const rewardText = k.add([
                        k.text('+$1', { size: 32 }), // Increased from 20
                        k.pos(goldenEnemy.pos.x, goldenEnemy.pos.y),
                        k.anchor('center'),
                        k.color(...UI_COLORS.SUCCESS),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);

                    rewardText.life = 2.5; // Increased from 1.5
                    rewardText.onUpdate(() => {
                        rewardText.pos.y -= 60 * k.dt(); // Slightly faster
                        rewardText.life -= k.dt();
                        rewardText.opacity = rewardText.life / 2.5;
                        rewardText.scale = k.vec2(1 + (2.5 - rewardText.life) * 0.2); // Scale up effect

                        if (rewardText.life <= 0) {
                            k.destroy(rewardText);
                        }
                    });

                    // Destroy the golden enemy
                    k.destroy(goldenEnemy);

                    // Refresh the menu to update currency display
                    k.wait(0.1, () => k.go('menu'));
                });

                // Update movement
                goldenEnemy.onUpdate(() => {
                    goldenEnemy.pos.x += goldenEnemy.speed * goldenEnemy.directionX * k.dt();
                    goldenEnemy.pos.y += goldenEnemy.speed * goldenEnemy.directionY * k.dt();

                    // Pulse effect
                    goldenEnemy.pulseTime += k.dt();
                    const pulse = Math.sin(goldenEnemy.pulseTime * 8) * 0.2;
                    goldenEnemy.scale = k.vec2(1 + pulse, 1 + pulse);

                    // Remove when off screen
                    if (goldenEnemy.pos.x < -100 || goldenEnemy.pos.x > k.width() + 100 ||
                        goldenEnemy.pos.y < -100 || goldenEnemy.pos.y > k.height() + 100) {
                        k.destroy(goldenEnemy);
                    }
                });
            }
        });
    });
}
