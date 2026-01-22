// Settings scene - allows players to configure game options
import { getSettings, updateSetting, resetSettings, saveSettings } from '../systems/settings.js';
import { setMusicVolume, setMasterVolume, setSfxVolume, setUiSoundsEnabled, setCombatSoundsEnabled, playMenuNav } from '../systems/sounds.js';
import {
    UI_SIZES,
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_Z_LAYERS,
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

export function setupSettingsScene(k) {
    k.scene('settings', (args) => {
        // Check if we came from game (pause menu)
        const fromGame = args?.fromGame || false;
        
        let settings = getSettings();
        let currentTab = 'audio'; // audio, video, gameplay, controls, access, data

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
        const tabSpacing = 100;
        const tabWidth = 90;
        const tabHeight = 30;
        
        const tabs = [
            { key: 'audio', label: 'Audio' },
            { key: 'video', label: 'Video' },
            { key: 'gameplay', label: 'Gameplay' },
            { key: 'controls', label: 'Controls' },
            { key: 'access', label: 'Access.' },
            { key: 'data', label: 'Data' }
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

            if (currentTab === 'audio') {
                // Master Volume
                currentY = addVolumeSlider(k, 'Master Volume', settings.audio?.masterVolume ?? 1.0, currentY, (value) => {
                    updateSetting('audio', 'masterVolume', value);
                    setMasterVolume(value);
                });

                // Music Volume
                currentY = addVolumeSlider(k, 'Music Volume', settings.audio?.musicVolume ?? 0.35, currentY, (value) => {
                    updateSetting('audio', 'musicVolume', value);
                    setMusicVolume(value);
                });

                // SFX Volume
                currentY = addVolumeSlider(k, 'SFX Volume', settings.audio?.sfxVolume ?? 1.0, currentY, (value) => {
                    updateSetting('audio', 'sfxVolume', value);
                    setSfxVolume(value);
                    // Play a preview sound when adjusting
                    playMenuNav();
                });

                // UI Sounds toggle
                currentY = addToggle(k, 'UI Sounds', settings.audio?.uiSounds !== false, currentY, (value) => {
                    updateSetting('audio', 'uiSounds', value);
                    setUiSoundsEnabled(value);
                });

                // Combat Sounds toggle
                currentY = addToggle(k, 'Combat Sounds', settings.audio?.combatSounds !== false, currentY, (value) => {
                    updateSetting('audio', 'combatSounds', value);
                    setCombatSoundsEnabled(value);
                });

            } else if (currentTab === 'video') {
                // Show Particles
                currentY = addToggle(k, 'Show Particles', settings.visual?.showParticles !== false, currentY, (value) => {
                    updateSetting('visual', 'showParticles', value);
                });

                // Show Screen Shake
                currentY = addToggle(k, 'Screen Shake', settings.visual?.showScreenShake !== false, currentY, (value) => {
                    updateSetting('visual', 'showScreenShake', value);
                });

                // Show Hit Freeze
                currentY = addToggle(k, 'Hit Freeze', settings.visual?.showHitFreeze !== false, currentY, (value) => {
                    updateSetting('visual', 'showHitFreeze', value);
                });

                // Show Damage Numbers
                currentY = addToggle(k, 'Damage Numbers', settings.visual?.showDamageNumbers !== false, currentY, (value) => {
                    updateSetting('visual', 'showDamageNumbers', value);
                });

                // FPS Counter
                currentY = addToggle(k, 'FPS Counter', settings.visual?.showFPS || false, currentY, (value) => {
                    updateSetting('visual', 'showFPS', value);
                });

                // Show Timer
                currentY = addToggle(k, 'Show Timer', settings.visual?.showTimer !== false, currentY, (value) => {
                    updateSetting('visual', 'showTimer', value);
                });

            } else if (currentTab === 'controls') {
                // Display current key bindings
                const controls = settings.controls || {};
                
                const controlLabels = [
                    { label: 'Move Up', key: 'moveUp', value: controls.moveUp || 'w' },
                    { label: 'Move Down', key: 'moveDown', value: controls.moveDown || 's' },
                    { label: 'Move Left', key: 'moveLeft', value: controls.moveLeft || 'a' },
                    { label: 'Move Right', key: 'moveRight', value: controls.moveRight || 'd' },
                    { label: 'Pause', key: 'pause', value: controls.pause || 'escape' },
                    { label: 'Interact', key: 'interact', value: controls.interact || 'space' }
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
                
            } else if (currentTab === 'gameplay') {
                // Auto-pause on level up
                currentY = addToggle(k, 'Auto-pause on Level Up', settings.gameplay?.autoPause || false, currentY, (value) => {
                    updateSetting('gameplay', 'autoPause', value);
                });

                // Auto-pickup Currency
                currentY = addToggle(k, 'Auto-pickup Currency', settings.gameplay?.autoPickupCurrency || false, currentY, (value) => {
                    updateSetting('gameplay', 'autoPickupCurrency', value);
                });

                // Auto-pickup XP
                currentY = addToggle(k, 'Auto-pickup XP', settings.gameplay?.autoPickupXP || false, currentY, (value) => {
                    updateSetting('gameplay', 'autoPickupXP', value);
                });

                // Confirm Before Quit
                currentY = addToggle(k, 'Confirm Before Quit', settings.gameplay?.confirmBeforeQuit !== false, currentY, (value) => {
                    updateSetting('gameplay', 'confirmBeforeQuit', value);
                });

                // Skip Intro Animation
                currentY = addToggle(k, 'Skip Intro Animation', settings.gameplay?.skipIntroAnimation || false, currentY, (value) => {
                    updateSetting('gameplay', 'skipIntroAnimation', value);
                });

            } else if (currentTab === 'access') {
                // Accessibility tab

                // Reduced Motion - disables particles, screen shake, and hit freeze
                currentY = addToggle(k, 'Reduced Motion', settings.accessibility?.reducedMotion || false, currentY, (value) => {
                    updateSetting('accessibility', 'reducedMotion', value);
                });

                // Info text explaining reduced motion
                const infoText = k.add([
                    k.text('Disables particles, screen shake, and hit freeze effects', { size: 12 }),
                    k.pos(k.width() / 2, currentY + 10),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                settingsItems.push(infoText);
                currentY += 40;

            } else if (currentTab === 'data') {
                // Data management tab

                // Export Save button
                const exportButton = k.add([
                    k.rect(200, 35),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.BG_MEDIUM),
                    k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const exportText = k.add([
                    k.text('Export Save Data', { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                let exportStatusText = null;

                exportButton.onClick(() => {
                    try {
                        const saveData = localStorage.getItem('superSmashTexty_save') || '{}';
                        // Check if clipboard API is available
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(saveData).then(() => {
                                if (exportStatusText && exportStatusText.exists()) {
                                    exportStatusText.text = 'Copied to clipboard!';
                                    exportStatusText.color = k.rgb(...UI_COLORS.SUCCESS);
                                }
                            }).catch(() => {
                                if (exportStatusText && exportStatusText.exists()) {
                                    exportStatusText.text = 'Failed to copy';
                                    exportStatusText.color = k.rgb(...UI_COLORS.DANGER);
                                }
                            });
                        } else {
                            // Fallback: show the data in console
                            console.log('Save data:', saveData);
                            if (exportStatusText && exportStatusText.exists()) {
                                exportStatusText.text = 'Check browser console (F12)';
                                exportStatusText.color = k.rgb(...UI_COLORS.TEXT_SECONDARY);
                            }
                        }
                    } catch (e) {
                        console.error('Export failed:', e);
                    }
                });
                settingsItems.push(exportButton, exportText);
                currentY += 50;

                // Status text for export
                exportStatusText = k.add([
                    k.text('', { size: UI_TEXT_SIZES.SMALL - 2 }),
                    k.pos(k.width() / 2, currentY - 10),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_SECONDARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);
                settingsItems.push(exportStatusText);
                currentY += 30;

                // Import Save button
                const importButton = k.add([
                    k.rect(200, 35),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.BG_MEDIUM),
                    k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const importText = k.add([
                    k.text('Import Save Data', { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                importButton.onClick(() => {
                    // Check if clipboard API is available
                    if (!navigator.clipboard || !navigator.clipboard.readText) {
                        if (exportStatusText && exportStatusText.exists()) {
                            exportStatusText.text = 'Clipboard not available';
                            exportStatusText.color = k.rgb(...UI_COLORS.DANGER);
                        }
                        return;
                    }
                    navigator.clipboard.readText().then((text) => {
                        try {
                            const data = JSON.parse(text);
                            if (data && typeof data === 'object') {
                                localStorage.setItem('superSmashTexty_save', text);
                                if (exportStatusText && exportStatusText.exists()) {
                                    exportStatusText.text = 'Import successful! Refresh to apply.';
                                    exportStatusText.color = k.rgb(...UI_COLORS.SUCCESS);
                                }
                            }
                        } catch (e) {
                            if (exportStatusText && exportStatusText.exists()) {
                                exportStatusText.text = 'Invalid save data';
                                exportStatusText.color = k.rgb(...UI_COLORS.DANGER);
                            }
                        }
                    }).catch(() => {
                        if (exportStatusText && exportStatusText.exists()) {
                            exportStatusText.text = 'Failed to read clipboard';
                            exportStatusText.color = k.rgb(...UI_COLORS.DANGER);
                        }
                    });
                });
                settingsItems.push(importButton, importText);
                currentY += 60;

                // Reset Progress button
                const resetProgressButton = k.add([
                    k.rect(200, 35),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.DANGER),
                    k.outline(2, k.rgb(...UI_COLORS.BORDER)),
                    k.area(),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);

                const resetProgressText = k.add([
                    k.text('Reset All Progress', { size: UI_TEXT_SIZES.SMALL }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.TEXT_PRIMARY),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_TEXT)
                ]);

                resetProgressButton.onClick(() => {
                    // Double-confirm for dangerous action
                    showResetConfirmationDialog(k, () => {
                        localStorage.removeItem('superSmashTexty_save');
                        if (exportStatusText && exportStatusText.exists()) {
                            exportStatusText.text = 'Progress reset! Refresh to apply.';
                            exportStatusText.color = k.rgb(...UI_COLORS.SUCCESS);
                        }
                    });
                });
                settingsItems.push(resetProgressButton, resetProgressText);
                currentY += 50;

                // Warning note
                const warningText = k.add([
                    k.text('Warning: Reset cannot be undone!', { size: 10 }),
                    k.pos(k.width() / 2, currentY),
                    k.anchor('center'),
                    k.color(...UI_COLORS.DANGER),
                    k.fixed(),
                    k.z(UI_Z_LAYERS.UI_ELEMENTS)
                ]);
                settingsItems.push(warningText);
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
                k.text(label + ':', { size: 16, width: 280 }),
                k.pos(150, y),
                k.anchor('left'),
                k.color(200, 200, 200),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            // Toggle background (wider to fit ON/OFF text, moved further right)
            const toggleWidth = 80;
            const toggleHeight = 30;
            const toggleX = 550;
            const toggleBg = k.add([
                k.rect(toggleWidth, toggleHeight),
                k.pos(toggleX, y),
                k.anchor('center'),
                k.color(value ? 50 : 70, value ? 150 : 50, value ? 50 : 70),
                k.outline(2, k.rgb(100, 100, 120)),
                k.area(),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_ELEMENTS)
            ]);

            // Toggle handle
            const handleSize = 24;
            const handleX = value ? toggleX + toggleWidth / 2 - handleSize / 2 - 4 : toggleX - toggleWidth / 2 + handleSize / 2 + 4;
            const toggleHandle = k.add([
                k.rect(handleSize, handleSize),
                k.pos(handleX, y),
                k.anchor('center'),
                k.color(255, 255, 255),
                k.outline(1, k.rgb(200, 200, 200)),
                k.fixed(),
                k.z(UI_Z_LAYERS.UI_TEXT)
            ]);

            // Toggle text (positioned based on current state)
            const textX = value ? toggleX - 12 : toggleX + 8;
            const toggleText = k.add([
                k.text(value ? 'ON' : 'OFF', { size: 12 }),
                k.pos(textX, y),
                k.anchor('center'),
                k.color(value ? 100 : 150, value ? 255 : 150, value ? 100 : 150),
                k.fixed(),
                k.z(1002)
            ]);

            // Click handler
            toggleBg.onClick(() => {
                const newValue = !value;
                value = newValue; // Update local value for text positioning
                toggleBg.color = k.rgb(
                    newValue ? 50 : 70,
                    newValue ? 150 : 50,
                    newValue ? 50 : 70
                );
                toggleHandle.pos.x = newValue ? toggleX + toggleWidth / 2 - handleSize / 2 - 4 : toggleX - toggleWidth / 2 + handleSize / 2 + 4;
                toggleText.text = newValue ? 'ON' : 'OFF';
                toggleText.pos.x = newValue ? toggleX - 12 : toggleX + 8;
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
        
        // Button sizes
        const { MD, SM } = UI_SIZES.BUTTON;

        // Reset button (created outside refreshSettings to avoid destruction on refresh)
        const resetButton = k.add([
            k.rect(MD.width, MD.height),
            k.pos(k.width() / 2 + 80, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.DANGER),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        const resetText = k.add([
            k.text('RESET', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2 + 80, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
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

        // Back button (SM size - secondary action)
        const backButton = k.add([
            k.rect(SM.width, SM.height),
            k.pos(k.width() / 2 - 80, k.height() - 40),
            k.anchor('center'),
            k.color(...UI_COLORS.NEUTRAL),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        const backText = k.add([
            k.text('BACK', { size: UI_TEXT_SIZES.SMALL }),
            k.pos(k.width() / 2 - 80, k.height() - 40),
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

