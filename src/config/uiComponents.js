/**
 * Reusable UI Component Factories
 *
 * Centralized component creation for consistent UI across all game scenes
 */

import {
    UI_SIZES,
    UI_TEXT_SIZES,
    UI_COLORS,
    UI_SPACING,
    UI_Z_LAYERS,
    formatButtonText
} from './uiConfig.js';
import { playMenuNav, playMenuSelect } from '../systems/sounds.js';

// =============================================================================
// BUTTON COMPONENT
// =============================================================================

/**
 * Create a standardized button with hover states
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {string} options.text - Button text
 * @param {string} options.size - Button size: 'XS', 'SM', 'MD', 'LG', 'XL'
 * @param {string} options.variant - Color variant: 'primary', 'secondary', 'danger', 'neutral', 'gold'
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {Function} options.onClick - Click handler
 * @param {boolean} options.disabled - Whether button is disabled
 * @returns {Object} - Button object with bg, label, and control methods
 */
export function createButton(k, options = {}) {
    const {
        text = 'Button',
        size = 'MD',
        variant = 'secondary',
        x = 0,
        y = 0,
        onClick = null,
        disabled = false
    } = options;

    // Get dimensions from size
    const dimensions = UI_SIZES.BUTTON[size] || UI_SIZES.BUTTON.MD;
    const { width, height } = dimensions;

    // Get colors from variant
    const variantColors = {
        primary: { bg: UI_COLORS.PRIMARY, hover: UI_COLORS.PRIMARY_HOVER },
        secondary: { bg: UI_COLORS.SECONDARY, hover: UI_COLORS.SECONDARY_HOVER },
        danger: { bg: UI_COLORS.DANGER, hover: UI_COLORS.DANGER_HOVER },
        neutral: { bg: UI_COLORS.NEUTRAL, hover: UI_COLORS.NEUTRAL_HOVER },
        gold: { bg: UI_COLORS.GOLD, hover: UI_COLORS.GOLD_HOVER },
        tertiary: { bg: UI_COLORS.TERTIARY, hover: UI_COLORS.TERTIARY_HOVER }
    };

    const colors = variantColors[variant] || variantColors.secondary;

    // Text size based on button size
    const textSizes = {
        XS: UI_TEXT_SIZES.TINY,
        SM: UI_TEXT_SIZES.SMALL,
        MD: UI_TEXT_SIZES.BODY,
        LG: UI_TEXT_SIZES.H2,
        XL: UI_TEXT_SIZES.H1
    };
    const textSize = textSizes[size] || UI_TEXT_SIZES.BODY;

    // Create button background
    const bg = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...(disabled ? UI_COLORS.BG_DISABLED : colors.bg)),
        k.outline(2, k.rgb(...UI_COLORS.BORDER)),
        k.area(),
        k.fixed(),
        k.scale(1),
        k.z(UI_Z_LAYERS.UI_ELEMENTS),
        'uiButton'
    ]);

    // Create button label
    const label = k.add([
        k.text(formatButtonText(text), { size: textSize }),
        k.pos(x, y),
        k.anchor('center'),
        k.color(...(disabled ? UI_COLORS.TEXT_DISABLED : UI_COLORS.TEXT_PRIMARY)),
        k.fixed(),
        k.scale(1),
        k.z(UI_Z_LAYERS.UI_TEXT),
        'uiButtonText'
    ]);

    // Store state on bg
    bg.isHovered = false;
    bg.isDisabled = disabled;
    bg.originalColor = [...colors.bg];
    bg.hoverColor = [...colors.hover];
    bg.label = label;

    // Hover effects
    bg.onHoverUpdate(() => {
        if (bg.isDisabled) return;
        if (!bg.isHovered) {
            bg.isHovered = true;
            playMenuNav();
        }
        bg.color = k.rgb(...bg.hoverColor);
        bg.outline.color = k.rgb(...UI_COLORS.BORDER_HOVER);
        bg.scale = k.vec2(1.02, 1.02);
        label.scale = k.vec2(1.02, 1.02);
    });

    bg.onHoverEnd(() => {
        if (bg.isDisabled) return;
        bg.isHovered = false;
        bg.color = k.rgb(...bg.originalColor);
        bg.outline.color = k.rgb(...UI_COLORS.BORDER);
        bg.scale = k.vec2(1, 1);
        label.scale = k.vec2(1, 1);
    });

    // Click handler
    if (onClick) {
        bg.onClick(() => {
            if (bg.isDisabled) return;
            playMenuSelect();
            onClick();
        });
    }

    // Methods
    const setDisabled = (isDisabled) => {
        bg.isDisabled = isDisabled;
        if (isDisabled) {
            bg.color = k.rgb(...UI_COLORS.BG_DISABLED);
            label.color = k.rgb(...UI_COLORS.TEXT_DISABLED);
        } else {
            bg.color = k.rgb(...bg.originalColor);
            label.color = k.rgb(...UI_COLORS.TEXT_PRIMARY);
        }
    };

    const setText = (newText) => {
        label.text = formatButtonText(newText);
    };

    const destroy = () => {
        if (bg.exists()) k.destroy(bg);
        if (label.exists()) k.destroy(label);
    };

    return {
        bg,
        label,
        setDisabled,
        setText,
        destroy
    };
}

// =============================================================================
// CARD COMPONENT
// =============================================================================

/**
 * Create a styled card container
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {string} options.size - Card size: 'FULL', 'HALF', 'ICON'
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {string} options.title - Optional card title
 * @param {string} options.status - Optional status: 'default', 'success', 'warning', 'error', 'selected'
 * @returns {Object} - Card object with elements and content area info
 */
export function createCard(k, options = {}) {
    const {
        size = 'FULL',
        x = 0,
        y = 0,
        title = null,
        status = 'default'
    } = options;

    // Get dimensions from size
    const dimensions = UI_SIZES.CARD[size] || UI_SIZES.CARD.FULL;
    const { width, height } = dimensions;

    // Get border color from status
    const statusColors = {
        default: UI_COLORS.BORDER,
        success: UI_COLORS.SUCCESS,
        warning: UI_COLORS.WARNING,
        error: UI_COLORS.ERROR,
        selected: UI_COLORS.BORDER_ACTIVE
    };
    const borderColor = statusColors[status] || statusColors.default;

    // Background color
    const bgColor = status === 'selected' ? UI_COLORS.BG_LIGHT : UI_COLORS.BG_MEDIUM;

    const elements = [];

    // Card background
    const bg = k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.anchor('topleft'),
        k.color(...bgColor),
        k.outline(2, k.rgb(...borderColor)),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS)
    ]);
    elements.push(bg);

    // Title if provided
    let titleElement = null;
    let contentStartY = y + UI_SPACING.SM;

    if (title) {
        titleElement = k.add([
            k.text(title, { size: UI_TEXT_SIZES.SMALL }),
            k.pos(x + UI_SPACING.SM, y + UI_SPACING.SM),
            k.anchor('topleft'),
            k.color(...UI_COLORS.TEXT_PRIMARY),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);
        elements.push(titleElement);
        contentStartY = y + UI_SPACING.SM + UI_TEXT_SIZES.SMALL + UI_SPACING.XS;
    }

    // Methods
    const setStatus = (newStatus) => {
        const newBorderColor = statusColors[newStatus] || statusColors.default;
        const newBgColor = newStatus === 'selected' ? UI_COLORS.BG_LIGHT : UI_COLORS.BG_MEDIUM;
        bg.color = k.rgb(...newBgColor);
        bg.outline.color = k.rgb(...newBorderColor);
    };

    const destroy = () => {
        elements.forEach(el => {
            if (el.exists()) k.destroy(el);
        });
    };

    return {
        bg,
        title: titleElement,
        elements,
        contentArea: {
            x: x + UI_SPACING.SM,
            y: contentStartY,
            width: width - UI_SPACING.SM * 2,
            height: height - (contentStartY - y) - UI_SPACING.SM
        },
        setStatus,
        destroy
    };
}

// =============================================================================
// TAB SYSTEM COMPONENT
// =============================================================================

/**
 * Create a tab navigation system
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {Array} options.tabs - Array of { key, label } objects
 * @param {string} options.activeTab - Currently active tab key
 * @param {number} options.y - Y position
 * @param {Function} options.onSelect - Callback when tab is selected
 * @returns {Object} - Tab system object with elements and control methods
 */
export function createTabs(k, options = {}) {
    const {
        tabs = [],
        activeTab = tabs[0]?.key,
        y = 80,
        onSelect = null
    } = options;

    const tabWidth = 85;
    const tabHeight = 30;
    const tabSpacing = 95;

    // Calculate centered positions
    const totalWidth = (tabs.length - 1) * tabSpacing;
    const firstTabX = k.width() / 2 - totalWidth / 2;

    const elements = [];
    const tabElements = [];

    tabs.forEach((tab, index) => {
        const tabX = firstTabX + index * tabSpacing;
        const isActive = activeTab === tab.key;

        const tabBg = k.add([
            k.rect(tabWidth, tabHeight),
            k.pos(tabX, y),
            k.anchor('center'),
            k.color(...(isActive ? UI_COLORS.SECONDARY : UI_COLORS.BG_MEDIUM)),
            k.outline(2, k.rgb(...UI_COLORS.BORDER)),
            k.area(),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_ELEMENTS)
        ]);

        const tabLabel = k.add([
            k.text(tab.label, { size: UI_TEXT_SIZES.BODY }),
            k.pos(tabX, y),
            k.anchor('center'),
            k.color(...(isActive ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_TERTIARY)),
            k.fixed(),
            k.z(UI_Z_LAYERS.UI_TEXT)
        ]);

        tabBg.onClick(() => {
            playMenuNav();
            if (onSelect) {
                onSelect(tab.key);
            }
        });

        elements.push(tabBg, tabLabel);
        tabElements.push({ bg: tabBg, label: tabLabel, key: tab.key });
    });

    // Update active tab visually
    const setActiveTab = (newActiveKey) => {
        tabElements.forEach(tab => {
            const isActive = tab.key === newActiveKey;
            tab.bg.color = k.rgb(...(isActive ? UI_COLORS.SECONDARY : UI_COLORS.BG_MEDIUM));
            tab.label.color = k.rgb(...(isActive ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_TERTIARY));
        });
    };

    const destroy = () => {
        elements.forEach(el => {
            if (el.exists()) k.destroy(el);
        });
    };

    return {
        elements,
        tabElements,
        setActiveTab,
        destroy
    };
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================

/**
 * Create a modal dialog
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content text
 * @param {Array} options.buttons - Array of { text, variant, onClick } objects
 * @returns {Object} - Modal object with elements and close method
 */
export function createModal(k, options = {}) {
    const {
        title = 'Modal',
        content = '',
        buttons = [{ text: 'OK', variant: 'primary', onClick: null }]
    } = options;

    const modalWidth = 400;
    const modalHeight = 200;
    const elements = [];

    // Overlay background
    const overlay = k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(0, 0, 0),
        k.opacity(0.7),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL - 1)
    ]);
    elements.push(overlay);

    // Modal background
    const bg = k.add([
        k.rect(modalWidth, modalHeight),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor('center'),
        k.color(...UI_COLORS.BG_MEDIUM),
        k.outline(3, k.rgb(...UI_COLORS.BORDER)),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL)
    ]);
    elements.push(bg);

    // Title
    const titleEl = k.add([
        k.text(title, { size: UI_TEXT_SIZES.H2 }),
        k.pos(k.width() / 2, k.height() / 2 - 60),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1)
    ]);
    elements.push(titleEl);

    // Content
    const contentEl = k.add([
        k.text(content, { size: UI_TEXT_SIZES.SMALL, width: modalWidth - 40 }),
        k.pos(k.width() / 2, k.height() / 2 - 10),
        k.anchor('center'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.MODAL + 1)
    ]);
    elements.push(contentEl);

    // Buttons
    const buttonY = k.height() / 2 + 50;
    const buttonSpacing = 120;
    const startX = k.width() / 2 - ((buttons.length - 1) * buttonSpacing) / 2;

    buttons.forEach((btn, index) => {
        const buttonX = startX + index * buttonSpacing;
        const button = createButton(k, {
            text: btn.text,
            size: 'SM',
            variant: btn.variant || 'secondary',
            x: buttonX,
            y: buttonY,
            onClick: () => {
                if (btn.onClick) btn.onClick();
                close();
            }
        });
        elements.push(button.bg, button.label);
    });

    // Close method
    const close = () => {
        elements.forEach(el => {
            if (el && el.exists && el.exists()) {
                k.destroy(el);
            }
        });
    };

    // Allow clicking overlay to close
    overlay.onClick(close);

    // Escape to close
    const escHandler = k.onKeyPress('escape', () => {
        close();
        escHandler.cancel();
    });

    return {
        elements,
        close
    };
}

// =============================================================================
// STAT BAR COMPONENT (for character stats display)
// =============================================================================

/**
 * Get color based on percentage (red at 0%, yellow at 50%, green at 100%)
 * @param {number} percent - Value from 0 to 1
 * @returns {Array} RGB color array
 */
function getPercentageColor(percent) {
    // Clamp to 0-1
    percent = Math.max(0, Math.min(1, percent));

    if (percent < 0.5) {
        // Red to Yellow (0% to 50%)
        const t = percent * 2; // 0 to 1
        return [255, Math.round(200 * t), 50];
    } else {
        // Yellow to Green (50% to 100%)
        const t = (percent - 0.5) * 2; // 0 to 1
        return [Math.round(255 * (1 - t)), 200 + Math.round(55 * t), 50 + Math.round(100 * t)];
    }
}

/**
 * Create a labeled stat bar
 * @param {Object} k - Kaplay instance
 * @param {Object} options - Configuration options
 * @param {string} options.label - Stat label
 * @param {number} options.value - Current value
 * @param {number} options.maxValue - Maximum value for the bar
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.width - Bar width
 * @param {Array} options.color - Fill color (ignored if usePercentageColor is true)
 * @param {boolean} options.usePercentageColor - If true, color bar based on fill % (red=low, green=high)
 * @returns {Object} - Object with elements and update method
 */
export function createStatBar(k, options = {}) {
    const {
        label = '',
        value = 0,
        maxValue = 100,
        x = 0,
        y = 0,
        width = 80,
        color = UI_COLORS.PRIMARY,
        usePercentageColor = false
    } = options;

    const elements = [];
    const barHeight = 6;

    // Calculate fill color
    const percent = value / maxValue;
    const fillColor = usePercentageColor ? getPercentageColor(percent) : color;

    // Label
    const labelEl = k.add([
        k.text(label, { size: UI_TEXT_SIZES.TINY }),
        k.pos(x, y),
        k.anchor('topleft'),
        k.color(...UI_COLORS.TEXT_SECONDARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_TEXT)
    ]);
    elements.push(labelEl);

    // Bar background
    const barBg = k.add([
        k.rect(width, barHeight),
        k.pos(x, y + 14),
        k.anchor('topleft'),
        k.color(...UI_COLORS.BG_DARK),
        k.outline(1, k.rgb(50, 50, 60)),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS)
    ]);
    elements.push(barBg);

    // Bar fill
    const fillWidth = Math.max(0, (width - 2) * percent);
    const barFill = k.add([
        k.rect(fillWidth, barHeight - 2),
        k.pos(x + 1, y + 15),
        k.anchor('topleft'),
        k.color(...fillColor),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_ELEMENTS + 1)
    ]);
    elements.push(barFill);

    // Value text
    const valueEl = k.add([
        k.text(`${value}`, { size: UI_TEXT_SIZES.MICRO }),
        k.pos(x + width + 4, y + 10),
        k.anchor('left'),
        k.color(...UI_COLORS.TEXT_PRIMARY),
        k.fixed(),
        k.z(UI_Z_LAYERS.UI_TEXT)
    ]);
    elements.push(valueEl);

    const updateValue = (newValue) => {
        const clampedValue = Math.max(0, Math.min(maxValue, newValue));
        const newPercent = clampedValue / maxValue;
        barFill.width = Math.max(0, (width - 2) * newPercent);
        valueEl.text = `${clampedValue}`;
        if (usePercentageColor) {
            const newColor = getPercentageColor(newPercent);
            barFill.color = k.rgb(...newColor);
        }
    };

    const destroy = () => {
        elements.forEach(el => {
            if (el.exists()) k.destroy(el);
        });
    };

    return {
        elements,
        updateValue,
        destroy
    };
}
