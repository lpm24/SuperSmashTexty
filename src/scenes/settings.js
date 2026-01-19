// Settings scene - allows players to configure game options
import { getSettings, updateSetting, resetSettings, saveSettings } from '../systems/settings.js';
import { getPlayerName, setPlayerName, getInviteCode } from '../systems/metaProgression.js';
import { generateRandomName } from '../systems/nameGenerator.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
    formatButtonText,
    createMenuParticles,
    createAnimatedTitle
} from '../config/uiConfig.js';

/**
 * Show reset confirmation dialog
 */
function showResetConfirmationDialog(k, onConfirm) {
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


    // Store dialog entities for cleanup
    const dialogEntities = [];

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
        k.pos(k.width() / 2 - 60, k.height() / 2 + 50),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(2, k.rgb(...UI_COLORS.TEXT_PRIMARY)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    const cancelText = k.add([
        k.text('Cancel', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 50),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    cancelButton.onClick(() => {
        closeDialog();
    });
    dialogEntities.push(overlay, dialogBg, cancelButton, cancelText);

    // Confirm button
    const confirmButton = k.add([
        k.rect(100, 30),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 50),
        k.anchor('center'),
        k.color(100, 50, 50),
        k.outline(2, k.rgb(150, 100, 100)),
        k.area(),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);

    const confirmText = k.add([
        k.text('Reset', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 50),
        k.anchor('center'),
        k.color(255, 200, 200),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    confirmButton.onClick(() => {
        closeDialog();
        onConfirm();
    });
    dialogEntities.push(confirmButton, confirmText);

    // Add title and message to cleanup list
    const titleText = k.add([
        k.text('Reset to Defaults?', { size: UI_TEXT_SIZES.LABEL }),
        k.pos(k.width() / 2, k.height() / 2 - 50),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);
    dialogEntities.push(titleText);

    const messageText = k.add([
        k.text('This will reset all settings to their default values.', { size: UI_TEXT_SIZES.SMALL }),
        k.pos(k.width() / 2, k.height() / 2 - 10),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 2)
    ]);
    dialogEntities.push(messageText);

    const escapeHandler = k.onKeyPress('escape', () => {
        closeDialog();
        escapeHandler.cancel();
    });
}

/**
 * Show name edit dialog
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
    k.add([
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

    // Close function
    function closeDialog() {
        k.destroy(overlay);
        k.destroy(dialogBg);
        inputBg.destroy();
        inputDisplay.destroy();
        infoMsg.destroy();
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

    k.add([
        k.text('Cancel', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 - 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    cancelButton.onClick(() => {
        closeDialog();
    });

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

    k.add([
        k.text('Save', { size: UI_TEXT_SIZES.SMALL - 2 }),
        k.pos(k.width() / 2 + 60, k.height() / 2 + 60),
        k.anchor('center'),
        k.color(...UI_COLORS.GOLD),
        k.fixed(),
        k.z(UI_Z_LAYERS.OVERLAY + 3)
    ]);

    saveButton.onClick(() => {
        if (inputText.trim().length > 0) {
            onSave(inputText.trim());
            closeDialog();
        } else {
            infoMsg.text = 'Name cannot be empty!';
            infoMsg.color = k.rgb(255, 100, 100);
        }
    });

    // Keyboard input
    k.onCharInput((ch) => {
        // Allow letters, numbers, spaces
        if (inputText.length < 20 && /[a-zA-Z0-9 ]/.test(ch)) {
            inputText += ch;
            inputDisplay.text = inputText;
            infoMsg.text = '(Max 20 characters)';
            infoMsg.color = k.rgb(...UI_COLORS.TEXT_SECONDARY);
        }
    });

    k.onKeyPress('backspace', () => {
        if (inputText.length > 0) {
            inputText = inputText.slice(0, -1);
            inputDisplay.text = inputText || ' '; // Show space if empty
        }
    });

    k.onKeyPress('escape', () => {
        closeDialog();
    });

    k.onKeyPress('enter', () => {
        if (inputText.trim().length > 0) {
            onSave(inputText.trim());
            closeDialog();
        }
    });
}

export function setupSettingsScene(k) {
    k.scene('settings', (args) => {
        // Check if we came from game (pause menu)
        const fromGame = args?.fromGame || false;
        
        let settings = getSettings();
        let currentTab = 'player'; // player, audio, controls, visual, gameplay
        
        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(...UI_COLORS.BG_DARK),
            k.fixed(),
            k.z(UI_Z_LAYERS.BACKGROUND)
        ]);

        // Background particle effects
        createMenuParticles(k, { patternCount: 10, particleCount: 15 });

        // Title (moved up to avoid collision with tabs)
        createAnimatedTitle(k, 'OPTIONS', k.width() / 2, 35, 8);

        // Tab buttons
        const tabY = 80;
        const tabSpacing = 120;
        const tabWidth = 100;
        const tabHeight = 30;
        
        const tabs = [
            { key: 'player', label: 'Player' },
            { key: 'audio', label: 'Audio' },
            { key: 'controls', label: 'Controls' },
            { key: 'visual', label: 'Visual' },
            { key: 'gameplay', label: 'Gameplay' }
        ];
        
        // Calculate centered positions for tabs
        const totalTabWidth = (tabs.length - 1) * tabSpacing;
        const firstTabX = k.width() / 2 - totalTabWidth / 2;
        
        const tabButtons = [];
        tabs.forEach((tab, index) => {
            const tabX = firstTabX + index * tabSpacing;
            const isActive = currentTab === tab.key;
            
            const tabBg = k.add([
                k.rect(tabWidth, tabHeight),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(isActive ? 100 : 50, isActive ? 100 : 50, isActive ? 150 : 80),
                k.outline(2, k.rgb(150, 150, 150)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            const tabLabel = k.add([
                k.text(tab.label, { size: 16 }),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(isActive ? 255 : 150, isActive ? 255 : 150, isActive ? 255 : 150),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            
            tabBg.onClick(() => {
                currentTab = tab.key;
                refreshSettings();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, key: tab.key });
        });
        
        // Content area
        const contentY = 120;
        const itemSpacing = 50; // Spacing between settings items
        const bottomButtonArea = 150; // Space reserved for buttons at bottom (prevents overlap)
        // TODO: Add scrolling support if content exceeds available space
        let settingsItems = [];
        
        // Refresh settings display
        function refreshSettings() {
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
            settingsItems.forEach(item => {
                if (item.exists()) k.destroy(item);
            });
            settingsItems = [];
            
            // Reload settings
            settings = getSettings();
            
            // Display settings based on current tab
            const startY = contentY + 20;
            let currentY = startY;

            if (currentTab === 'player') {
                // Player Name Section
                const nameLabel = k.add([
                    k.text('Player Name:', { size: UI_TEXT_SIZES.LABEL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);
                settingsItems.push(nameLabel);
                currentY += 40;

                // Current name display with edit button
                let currentName = getPlayerName();
                const nameDisplayBg = k.add([
                    k.rect(300, 40),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.BG_LIGHT),
                    k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const nameDisplay = k.add([
                    k.text(currentName, { size: UI_TEXT_SIZES.LABEL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                settingsItems.push(nameDisplayBg, nameDisplay);
                currentY += 60;

                // Edit Name button
                const editButton = k.add([
                    k.rect(140, 35),
                    k.pos(k.width() / 2 - 80, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.BG_MEDIUM),
                    k.outline(2, k.rgb(...UI_COLORS.TEXT_PRIMARY)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const editText = k.add([
                    k.text('Edit Name', { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(k.width() / 2 - 80, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                editButton.onClick(() => {
                    showNameEditDialog(k, currentName, (newName) => {
                        setPlayerName(newName);
                        nameDisplay.text = newName;
                        currentName = newName;
                    });
                });

                // Randomize button
                const randomButton = k.add([
                    k.rect(140, 35),
                    k.pos(k.width() / 2 + 80, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.BG_MEDIUM),
                    k.outline(2, k.rgb(...UI_COLORS.GOLD)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const randomText = k.add([
                    k.text('Randomize', { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(k.width() / 2 + 80, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                randomButton.onClick(() => {
                    const newName = generateRandomName();
                    setPlayerName(newName);
                    nameDisplay.text = newName;
                    currentName = newName;
                });

                settingsItems.push(editButton, editText, randomButton, randomText);
                currentY += 60;

                // Invite Code Section
                const codeLabel = k.add([
                    k.text('Your Invite Code:', { size: UI_TEXT_SIZES.LABEL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);
                settingsItems.push(codeLabel);
                currentY += 40;

                const inviteCode = getInviteCode();
                const codeDisplay = k.add([
                    k.text(inviteCode, { size: UI_TEXT_SIZES.TITLE }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.GOLD),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);
                settingsItems.push(codeDisplay);
                currentY += 50;

                const codeNote = k.add([
                    k.text('Share this code with friends to join your party!', { size: UI_TEXT_SIZES.SMALL - 2 }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);
                settingsItems.push(codeNote);

            } else if (currentTab === 'audio') {
                // Master Volume
                currentY = addVolumeSlider(k, 'Master Volume', settings.audio.masterVolume, currentY, (value) => {
                    updateSetting('audio', 'masterVolume', value);
                });
                
                // SFX Volume
                currentY = addVolumeSlider(k, 'SFX Volume', settings.audio.sfxVolume, currentY, (value) => {
                    updateSetting('audio', 'sfxVolume', value);
                });
                
                // Music Volume
                currentY = addVolumeSlider(k, 'Music Volume', settings.audio.musicVolume, currentY, (value) => {
                    updateSetting('audio', 'musicVolume', value);
                });
                
            } else if (currentTab === 'controls') {
                // Display current key bindings
                const controls = settings.controls;
                
                const controlLabels = [
                    { label: 'Move Up', key: 'moveUp', value: controls.moveUp },
                    { label: 'Move Down', key: 'moveDown', value: controls.moveDown },
                    { label: 'Move Left', key: 'moveLeft', value: controls.moveLeft },
                    { label: 'Move Right', key: 'moveRight', value: controls.moveRight },
                    { label: 'Pause', key: 'pause', value: controls.pause },
                    { label: 'Interact', key: 'interact', value: controls.interact }
                ];
                
                controlLabels.forEach((control, index) => {
                    const y = startY + index * itemSpacing;
                    
                    // Label (moved left for consistency)
                    const labelText = k.add([
                        k.text(control.label + ':', { size: 16 }),
                        k.pos(150, y),
                        k.anchor('left'),
                        k.color(200, 200, 200),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    
                    // Key display (moved right for more space)
                    const keyDisplay = k.add([
                        k.rect(100, 30),
                        k.pos(500, y),
                        k.anchor('center'),
                        k.color(50, 50, 70),
                        k.outline(2, k.rgb(100, 100, 120)),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    
                    const keyText = k.add([
                        k.text(control.value.toUpperCase(), { size: 16 }),
                        k.pos(500, y),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_TEXT)
                    ]);
                    
                    settingsItems.push(labelText, keyDisplay, keyText);
                });
                
                // Note about remapping (positioned to avoid button overlap)
                const maxContentY = startY + controlLabels.length * itemSpacing;
                if (maxContentY < k.height() - bottomButtonArea) {
                    const noteText = k.add([
                        k.text('(Key remapping coming soon)', { size: 12 }),
                        k.pos(k.width() / 2, maxContentY + 20),
                        k.anchor('center'),
                        k.color(150, 150, 150),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    settingsItems.push(noteText);
                }
                
            } else if (currentTab === 'visual') {
                // Show Particles
                currentY = addToggle(k, 'Show Particles', settings.visual.showParticles, currentY, (value) => {
                    updateSetting('visual', 'showParticles', value);
                });
                
                // Show Screen Shake
                currentY = addToggle(k, 'Screen Shake', settings.visual.showScreenShake, currentY, (value) => {
                    updateSetting('visual', 'showScreenShake', value);
                });

                // Show Hit Freeze
                currentY = addToggle(k, 'Hit Freeze', settings.visual.showHitFreeze, currentY, (value) => {
                    updateSetting('visual', 'showHitFreeze', value);
                });

                // Show Damage Numbers
                currentY = addToggle(k, 'Damage Numbers', settings.visual.showDamageNumbers, currentY, (value) => {
                    updateSetting('visual', 'showDamageNumbers', value);
                });
                
                // Compact HUD
                currentY = addToggle(k, 'Compact HUD', settings.visual.compactHUD, currentY, (value) => {
                    updateSetting('visual', 'compactHUD', value);
                });
                
            } else if (currentTab === 'gameplay') {
                // Auto-pause on level up
                currentY = addToggle(k, 'Auto-pause on Level Up', settings.gameplay.autoPause, currentY, (value) => {
                    updateSetting('gameplay', 'autoPause', value);
                });
                
                // Note (positioned to avoid button overlap)
                if (currentY < k.height() - bottomButtonArea) {
                    const noteText = k.add([
                        k.text('(More gameplay options coming soon)', { size: 12 }),
                        k.pos(k.width() / 2, currentY + 20),
                        k.anchor('center'),
                        k.color(150, 150, 150),
                        k.fixed(),
                        k.z(UI_Z_LAYERS.UI_ELEMENTS)
                    ]);
                    settingsItems.push(noteText);
                }
            }
        }
        
        // Helper function to add volume slider
        function addVolumeSlider(k, label, value, y, onChange) {
            // Label (moved left for more space)
            const labelText = k.add([
                k.text(label + ':', { size: 16 }),
                k.pos(150, y),
                k.anchor('left'),
                k.color(200, 200, 200),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            // Slider track (moved right for more space)
            const trackWidth = 300;
            const trackHeight = 20;
            const track = k.add([
                k.rect(trackWidth, trackHeight),
                k.pos(500, y),
                k.anchor('center'),
                k.color(50, 50, 70),
                k.outline(2, k.rgb(100, 100, 120)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            // Helper function to get gradient color based on value (0-1)
            // Red (low) -> Yellow (mid) -> Green (high)
            // Returns an object with r, g, b values for use with k.color()
            function getGradientColor(val) {
                if (val < 0.5) {
                    // Red to Yellow
                    const t = val * 2; // 0 to 1
                    return {
                        r: 255, // Red stays max
                        g: Math.round(255 * t), // Green increases
                        b: 0 // Blue stays 0
                    };
                } else {
                    // Yellow to Green
                    const t = (val - 0.5) * 2; // 0 to 1
                    return {
                        r: Math.round(255 * (1 - t)), // Red decreases
                        g: 255, // Green stays max
                        b: 0 // Blue stays 0
                    };
                }
            }
            
            // Slider fill (use k.color() to properly set the gradient color)
            const fillWidth = trackWidth * value;
            const fillColor = getGradientColor(value);
            const fill = k.add([
                k.rect(fillWidth, trackHeight - 4),
                k.pos(500 - (trackWidth - fillWidth) / 2, y),
                k.anchor('center'),
                k.color(fillColor.r, fillColor.g, fillColor.b),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            
            // Slider handle
            const handleX = 500 - trackWidth / 2 + fillWidth;
            const handle = k.add([
                k.rect(20, trackHeight + 4),
                k.pos(handleX, y),
                k.anchor('center'),
                k.color(200, 200, 255),
                k.outline(2, k.rgb(150, 150, 200)),
                k.area(),
                k.fixed(),
                k.z(1002)
            ]);
            
            // Value text (moved further right to avoid clipping)
            const valueText = k.add([
                k.text(Math.round(value * 100) + '%', { size: 14 }),
                k.pos(650 + 30, y),
                k.anchor('left'),
                k.color(255, 255, 255),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            // Slider interaction
            let dragging = false;
            let lastPreviewValue = -1; // Track last value we previewed sound at
            
            track.onClick(() => {
                const mouseX = k.mousePos().x;
                const trackLeft = 500 - trackWidth / 2;
                const localX = mouseX - trackLeft;
                const newValue = Math.max(0, Math.min(1, localX / trackWidth));
                updateSlider(newValue);
            });
            
            handle.onClick(() => {
                dragging = true;
            });
            
            k.onMouseMove(() => {
                if (dragging && k.isMouseDown()) {
                    const mouseX = k.mousePos().x;
                    const trackLeft = 500 - trackWidth / 2;
                    const localX = mouseX - trackLeft;
                    const newValue = Math.max(0, Math.min(1, localX / trackWidth));
                    updateSlider(newValue);
                } else {
                    dragging = false;
                }
            });
            
            k.onMouseRelease(() => {
                dragging = false;
            });
            
            function updateSlider(newValue) {
                const newFillWidth = trackWidth * newValue;
                fill.width = newFillWidth;
                fill.pos.x = 500 - (trackWidth - newFillWidth) / 2;
                handle.pos.x = 500 - trackWidth / 2 + newFillWidth;
                valueText.text = Math.round(newValue * 100) + '%';
                
                // Update gradient color
                const newColor = getGradientColor(newValue);
                fill.color = k.rgb(newColor.r, newColor.g, newColor.b);
                
                // Preview sound at specific intervals (0%, 25%, 50%, 75%, 100%)
                // Only play if we cross a threshold to avoid spam
                const thresholds = [0, 0.25, 0.5, 0.75, 1.0];
                const crossedThreshold = thresholds.some(threshold => {
                    const wasBelow = lastPreviewValue < threshold;
                    const isAbove = newValue >= threshold;
                    return wasBelow && isAbove;
                });
                
                if (crossedThreshold) {
                    // Note: Audio preview would go here when audio system is implemented
                    // Example: k.play('volumePreview', { volume: newValue });
                    lastPreviewValue = newValue;
                }
                
                onChange(newValue);
            }
            
            settingsItems.push(labelText, track, fill, handle, valueText);
            return y + itemSpacing;
        }
        
        // Helper function to add toggle
        function addToggle(k, label, value, y, onChange) {
            // Label (moved left for more space, with max width to prevent overflow)
            const labelText = k.add([
                k.text(label + ':', { size: 16, width: 250 }),
                k.pos(150, y),
                k.anchor('left'),
                k.color(200, 200, 200),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            // Toggle background (moved right for more space)
            const toggleWidth = 60;
            const toggleHeight = 30;
            const toggleBg = k.add([
                k.rect(toggleWidth, toggleHeight),
                k.pos(500, y),
                k.anchor('center'),
                k.color(value ? 50 : 70, value ? 150 : 50, value ? 50 : 70),
                k.outline(2, k.rgb(100, 100, 120)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);
            
            // Toggle handle
            const handleSize = 24;
            const handleX = value ? 500 + toggleWidth / 2 - handleSize / 2 - 4 : 500 - toggleWidth / 2 + handleSize / 2 + 4;
            const toggleHandle = k.add([
                k.rect(handleSize, handleSize),
                k.pos(handleX, y),
                k.anchor('center'),
                k.color(255, 255, 255),
                k.outline(1, k.rgb(200, 200, 200)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);
            
            // Toggle text
            const toggleText = k.add([
                k.text(value ? 'ON' : 'OFF', { size: 14 }),
                k.pos(500, y),
                k.anchor('center'),
                k.color(value ? 100 : 150, value ? 255 : 150, value ? 100 : 150),
                k.fixed(),
                k.z(1002)
            ]);
            
            // Click handler
            toggleBg.onClick(() => {
                const newValue = !value;
                toggleBg.color = k.rgb(
                    newValue ? 50 : 70,
                    newValue ? 150 : 50,
                    newValue ? 50 : 70
                );
                toggleHandle.pos.x = newValue ? 500 + toggleWidth / 2 - handleSize / 2 - 4 : 500 - toggleWidth / 2 + handleSize / 2 + 4;
                toggleText.text = newValue ? 'ON' : 'OFF';
                toggleText.color = k.rgb(
                    newValue ? 100 : 150,
                    newValue ? 255 : 150,
                    newValue ? 100 : 150
                );
                onChange(newValue);
            });
            
            settingsItems.push(labelText, toggleBg, toggleHandle, toggleText);
            return y + itemSpacing;
        }
        
        // Reset button (created outside refreshSettings to avoid destruction on refresh)
        const resetButton = k.add([
            k.rect(150, 35),
            k.pos(k.width() / 2, k.height() - 80),
            k.anchor('center'),
            k.color(100, 50, 50),
            k.outline(2, k.rgb(150, 100, 100)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);
        
        const resetText = k.add([
            k.text('Reset to Defaults', { size: 14 }),
            k.pos(k.width() / 2, k.height() - 80),
            k.anchor('center'),
            k.color(255, 200, 200),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
        resetButton.onClick(() => {
            // Show confirmation dialog
            showResetConfirmationDialog(k, () => {
                resetSettings();
                refreshSettings();
            });
        });
        
        // Initial refresh
        refreshSettings();
        
        // Back button (standardized, matches other menus)
        const backButton = k.add([
            k.rect(120, 35),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);
        
        const backText = k.add([
            k.text(formatButtonText('Back'), { size: UI_TEXT_SIZES.BODY }),
            k.pos(k.width() / 2, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_SECONDARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        
        backButton.onClick(() => {
            if (fromGame) {
                k.go('game');
            } else {
                k.go('menu');
            }
        });
        
        k.onKeyPress('escape', () => {
            if (fromGame) {
                k.go('game');
            } else {
                k.go('menu');
            }
        });
    });
}

