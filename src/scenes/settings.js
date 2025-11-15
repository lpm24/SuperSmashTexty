// Settings scene - allows players to configure game options
import { getSettings, updateSetting, resetSettings, saveSettings } from '../systems/settings.js';

export function setupSettingsScene(k) {
    k.scene('settings', (args) => {
        // Check if we came from game (pause menu)
        const fromGame = args?.fromGame || false;
        
        let settings = getSettings();
        let currentTab = 'audio'; // audio, controls, visual, gameplay
        
        // Background
        k.add([
            k.rect(k.width(), k.height()),
            k.pos(0, 0),
            k.anchor('topleft'),
            k.color(20, 20, 30),
            k.fixed(),
            k.z(0)
        ]);
        
        // Title
        k.add([
            k.text('SETTINGS', { size: 36 }),
            k.pos(k.width() / 2, 40),
            k.anchor('center'),
            k.color(255, 255, 255),
            k.fixed(),
            k.z(1000)
        ]);
        
        // Tab buttons
        const tabY = 90;
        const tabSpacing = 120;
        const tabWidth = 100;
        const tabHeight = 30;
        
        const tabs = [
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
                k.z(1000)
            ]);
            
            const tabLabel = k.add([
                k.text(tab.label, { size: 16 }),
                k.pos(tabX, tabY),
                k.anchor('center'),
                k.color(isActive ? 255 : 150, isActive ? 255 : 150, isActive ? 255 : 150),
                k.fixed(),
                k.z(1001)
            ]);
            
            tabBg.onClick(() => {
                currentTab = tab.key;
                refreshSettings();
            });
            
            tabButtons.push({ bg: tabBg, label: tabLabel, key: tab.key });
        });
        
        // Content area
        const contentY = 140;
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
                        k.z(1000)
                    ]);
                    
                    // Key display (moved right for more space)
                    const keyDisplay = k.add([
                        k.rect(100, 30),
                        k.pos(500, y),
                        k.anchor('center'),
                        k.color(50, 50, 70),
                        k.outline(2, k.rgb(100, 100, 120)),
                        k.fixed(),
                        k.z(1000)
                    ]);
                    
                    const keyText = k.add([
                        k.text(control.value.toUpperCase(), { size: 16 }),
                        k.pos(500, y),
                        k.anchor('center'),
                        k.color(255, 255, 255),
                        k.fixed(),
                        k.z(1001)
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
                        k.z(1000)
                    ]);
                    settingsItems.push(noteText);
                }
                
            } else if (currentTab === 'visual') {
                // Show Particles
                currentY = addToggle(k, 'Show Particles', settings.visual.showParticles, currentY, (value) => {
                    updateSetting('visual', 'showParticles', value);
                });
                
                // Show Screen Shake
                currentY = addToggle(k, 'Show Screen Shake', settings.visual.showScreenShake, currentY, (value) => {
                    updateSetting('visual', 'showScreenShake', value);
                });
                
                // Show Damage Numbers
                currentY = addToggle(k, 'Show Damage Numbers', settings.visual.showDamageNumbers, currentY, (value) => {
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
                        k.z(1000)
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
                k.z(1000)
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
                k.z(1000)
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
                k.z(1001)
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
                k.z(1000)
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
                k.z(1000)
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
                k.z(1000)
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
                k.z(1001)
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
            k.z(1000)
        ]);
        
        const resetText = k.add([
            k.text('Reset to Defaults', { size: 14 }),
            k.pos(k.width() / 2, k.height() - 80),
            k.anchor('center'),
            k.color(255, 200, 200),
            k.fixed(),
            k.z(1001)
        ]);
        
        resetButton.onClick(() => {
            resetSettings();
            refreshSettings();
        });
        
        // Initial refresh
        refreshSettings();
        
        // Back button (centered, above reset button)
        const backButton = k.add([
            k.rect(120, 35),
            k.pos(k.width() / 2, k.height() - 125),
            k.anchor('center'),
            k.color(80, 80, 100),
            k.outline(2, k.rgb(150, 150, 150)),
            k.area(),
            k.fixed(),
            k.z(1000)
        ]);
        
        const backText = k.add([
            k.text('Back', { size: 14 }),
            k.pos(k.width() / 2, k.height() - 125),
            k.anchor('center'),
            k.color(200, 200, 200),
            k.fixed(),
            k.z(1001)
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

