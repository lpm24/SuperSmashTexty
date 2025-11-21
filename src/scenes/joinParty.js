import { isValidInviteCode } from '../systems/nameGenerator.js';
import { joinPartyAsClient, restoreLocalPlayerToSoloParty, getPlayerName, getInviteCode, getSelectedCharacter } from '../systems/partySystem.js';
import { playMenuNav, playMenuSelect } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS
} from '../config/uiConfig.js';

/**
 * Join Party Scene
 * Dedicated scene for entering a party invite code
 */
export function initJoinPartyScene(k) {
    k.scene('joinParty', () => {
        // Save original party state before any join attempt
        const originalState = {
            name: getPlayerName(),
            inviteCode: getInviteCode(),
            character: getSelectedCharacter()
        };
        let joinCancelled = false;

        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.color(...UI_COLORS.BG_DARK),
            k.fixed(),
            k.z(0)
        ]);

        // Title
        k.add([
            k.text('Join Party', { size: UI_TEXT_SIZES.TITLE }),
            k.pos(k.width() / 2, 100),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(10)
        ]);

        // Instruction
        k.add([
            k.text('Enter 6-digit invite code:', { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() / 2, 180),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(10)
        ]);

        // Input display
        let inputCode = '';
        const inputDisplay = k.add([
            k.text('______', { size: UI_TEXT_SIZES.TITLE * 1.5 }),
            k.pos(k.width() / 2, 280),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(10)
        ]);

        // Error/Status message
        const errorMsg = k.add([
            k.text('', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2, 360),
            k.anchor('center'),
            k.color(255, 100, 100),
            k.fixed(),
            k.z(10)
        ]);

        // Instructions text
        k.add([
            k.text('Press ESC or click Cancel to go back', { size: UI_TEXT_SIZES.SMALL - 2 }),
            k.pos(k.width() / 2, k.height() - 100),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_DISABLED),
            k.fixed(),
            k.z(10)
        ]);

        let isJoining = false;

        // Update display
        function updateDisplay() {
            let display = '';
            for (let i = 0; i < 6; i++) {
                if (i < inputCode.length) {
                    display += inputCode[i];
                } else {
                    display += '_';
                }
            }
            inputDisplay.text = display;
        }

        // Character input handler
        k.onCharInput((ch) => {
            if (isJoining) return;

            // Only accept alphanumeric characters
            if (/[a-zA-Z0-9]/.test(ch) && inputCode.length < 6) {
                playMenuNav();
                inputCode += ch.toUpperCase();
                updateDisplay();
                errorMsg.text = '';

                // Auto-submit when 6 characters entered
                if (inputCode.length === 6) {
                    k.wait(0.2, attemptJoin);
                }
            }
        });

        // Backspace handler
        k.onKeyPress('backspace', () => {
            if (isJoining) return;

            if (inputCode.length > 0) {
                playMenuNav();
                inputCode = inputCode.slice(0, -1);
                updateDisplay();
                errorMsg.text = '';
            }
        });

        // Escape key to cancel (works even during join attempt)
        k.onKeyPress('escape', () => {
            playMenuNav();
            joinCancelled = true;
            isJoining = false;
            // Restore original party state
            restoreLocalPlayerToSoloParty(originalState);
            k.go('menu');
        });

        // Enter key to submit
        k.onKeyPress('enter', () => {
            if (isJoining) return;
            if (inputCode.length === 6) {
                attemptJoin();
            }
        });

        // Attempt to join party
        async function attemptJoin() {
            if (isJoining) return;

            const code = inputCode.trim();

            if (!isValidInviteCode(code)) {
                errorMsg.text = 'Invalid invite code format';
                errorMsg.color = k.rgb(255, 100, 100);
                return;
            }

            isJoining = true;
            errorMsg.text = 'Joining party...';
            errorMsg.color = k.rgb(...UI_COLORS.GOLD);

            try {
                const success = await joinPartyAsClient(code);

                if (success) {
                    // Check if join was cancelled while waiting
                    if (joinCancelled) {
                        return;
                    }
                    playMenuSelect();
                    errorMsg.text = 'Successfully joined party!';
                    errorMsg.color = k.rgb(...UI_COLORS.SUCCESS);

                    // Wait a moment then go to menu (now in party)
                    k.wait(1, () => {
                        if (!joinCancelled) {
                            k.go('menu');
                        }
                    });
                } else {
                    isJoining = false;
                    errorMsg.text = 'Failed to join party. Check the code and try again.';
                    errorMsg.color = k.rgb(255, 100, 100);
                    inputCode = '';
                    updateDisplay();
                }
            } catch (error) {
                isJoining = false;
                console.error('[JoinParty] Error joining party:', error);
                errorMsg.text = 'Connection error. Please try again.';
                errorMsg.color = k.rgb(255, 100, 100);
                inputCode = '';
                updateDisplay();
            }
        }

        // Cancel button
        const cancelButton = k.add([
            k.rect(200, 50),
            k.pos(k.width() / 2, k.height() - 180),
            k.anchor('center'),
            k.color(...UI_COLORS.SECONDARY),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(10)
        ]);

        const cancelText = k.add([
            k.text('Cancel', { size: UI_TEXT_SIZES.BUTTON }),
            k.pos(k.width() / 2, k.height() - 180),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(11)
        ]);

        cancelButton.onClick(() => {
            playMenuNav();
            joinCancelled = true;
            isJoining = false;
            // Restore original party state
            restoreLocalPlayerToSoloParty(originalState);
            k.go('menu');
        });

        cancelButton.onHoverUpdate(() => {
            if (!isJoining) {
                cancelButton.color = k.rgb(...UI_COLORS.SECONDARY_HOVER);
            }
        });

        cancelButton.onHoverEnd(() => {
            cancelButton.color = k.rgb(...UI_COLORS.SECONDARY);
        });
    });
}
