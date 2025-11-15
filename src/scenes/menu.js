// Main menu scene
import { getCurrency, getCurrencyName } from '../systems/metaProgression.js';
import { initAudio, playMenuSelect, playMenuNav } from '../systems/sounds.js';
import {
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_SPACING,
    UI_BUTTON,
    UI_Z_LAYERS,
    formatButtonText
} from '../config/uiConfig.js';

/**
 * Create an interactive menu button
 * @param {Object} k - Kaplay instance
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {Object} options - Button options
 * @returns {Object} - Button group object
 */
function createMenuButton(k, x, y, text, onClick, options = {}) {
    const {
        width = UI_BUTTON.WIDTH,
        height = UI_BUTTON.HEIGHT,
        fontSize = UI_TEXT_SIZES.BUTTON,
        primaryColor = UI_COLORS.SECONDARY,
        hoverColor = UI_COLORS.SECONDARY_HOVER,
        textColor = UI_COLORS.TEXT_PRIMARY,
        borderColor = UI_COLORS.BORDER,
        disabled = false,
        hotkey = null
    } = options;

    // Button background
    const bg = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...primaryColor),
        k.outline(2, k.rgb(...borderColor)),
        k.area(),
        k.fixed(),
        k.z(10),
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
            k.color(...UI_COLORS.GOLD),
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

    // Click handler
    bg.onClick(() => {
        if (bg.disabled) return;
        playMenuSelect();
        if (onClick) onClick();
    });

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
            // Restore original colors (hotkey stays gold)
            labels.forEach((lbl, idx) => {
                if (hotkey && idx === 1 && labels.length > 1) {
                    lbl.color = k.rgb(...UI_COLORS.GOLD); // Keep hotkey gold
                } else {
                    lbl.color = k.rgb(...textColor);
                }
            });
        }
    };

    return bg;
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

        // Currency display (top right) - with background panel
        const currencyPanel = k.add([
            k.rect(200, 40),
            k.pos(k.width() - 20, 20),
            k.anchor('topright'),
            k.color(...UI_COLORS.BG_MEDIUM),
            k.outline(2, k.rgb(...UI_COLORS.GOLD)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_BACKGROUND)
        ]);

        k.add([
            k.text(`${currencyName}: ${currency}`, { size: UI_TEXT_SIZES.LABEL }),
            k.pos(k.width() - 120, 40),
            k.anchor('center'),
            k.color(...UI_COLORS.GOLD),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

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
            k, centerX, buttonStartY,
            'Start Game',
            () => k.go('game', { resetState: true }),
            {
                width: 350,
                height: 55,
                fontSize: UI_TEXT_SIZES.HEADER,
                primaryColor: UI_COLORS.PRIMARY,
                hoverColor: UI_COLORS.PRIMARY_HOVER,
                borderColor: UI_COLORS.PRIMARY
            }
        );

        const characterButton = createMenuButton(
            k, centerX, buttonStartY + buttonSpacing,
            'Character Select',
            () => k.go('characterSelect'),
            {
                width: 350,
                hotkey: 'C',
                height: 50,
                fontSize: UI_TEXT_SIZES.BUTTON,
                primaryColor: UI_COLORS.TERTIARY,
                hoverColor: UI_COLORS.TERTIARY_HOVER,
                borderColor: UI_COLORS.TERTIARY
            }
        );

        const shopButton = createMenuButton(
            k, centerX, buttonStartY + buttonSpacing * 2,
            'Shop',
            () => k.go('shop'),
            {
                width: 350,
                height: 50,
                fontSize: UI_TEXT_SIZES.BUTTON,
                primaryColor: UI_COLORS.GOLD,
                hoverColor: UI_COLORS.GOLD_HOVER,
                borderColor: UI_COLORS.GOLD,
                hotkey: 'S'
            }
        );

        const statisticsButton = createMenuButton(
            k, centerX, buttonStartY + buttonSpacing * 3,
            'Statistics',
            () => k.go('statistics'),
            {
                width: 350,
                height: 50,
                fontSize: UI_TEXT_SIZES.BUTTON,
                hotkey: 'T'
            }
        );

        const settingsButton = createMenuButton(
            k, centerX, buttonStartY + buttonSpacing * 4,
            'Settings',
            () => k.go('settings'),
            {
                width: 350,
                height: 50,
                fontSize: UI_TEXT_SIZES.BUTTON,
                primaryColor: UI_COLORS.NEUTRAL,
                hoverColor: UI_COLORS.NEUTRAL_HOVER,
                borderColor: UI_COLORS.NEUTRAL,
                hotkey: 'O'
            }
        );

        // Keyboard shortcuts (still work)
        k.onKeyPress('space', () => {
            playMenuSelect();
            k.go('game', { resetState: true });
        });

        k.onKeyPress('c', () => {
            playMenuNav();
            k.go('characterSelect');
        });

        k.onKeyPress('s', () => {
            playMenuNav();
            k.go('shop');
        });

        k.onKeyPress('o', () => {
            playMenuNav();
            k.go('settings');
        });

        k.onKeyPress('t', () => {
            playMenuNav();
            k.go('statistics');
        });

        // Animated decorative particles in background
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
    });
}
