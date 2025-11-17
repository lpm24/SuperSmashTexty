// Settings system - handles game settings and preferences

const SETTINGS_KEY = 'superSmashTexty_settings';

// Default settings
const DEFAULT_SETTINGS = {
    version: 1,
    audio: {
        masterVolume: 1.0, // 0.0 to 1.0
        sfxVolume: 1.0,
        musicVolume: 1.0
    },
    controls: {
        // Key bindings (stored as key codes/names)
        moveUp: 'w',
        moveDown: 's',
        moveLeft: 'a',
        moveRight: 'd',
        pause: 'escape',
        interact: 'space'
    },
    visual: {
        showParticles: true,
        showScreenShake: true,
        showDamageNumbers: true,
        compactHUD: false
    },
    gameplay: {
        autoPause: false // Auto-pause on level up (already implemented, but can be toggled)
    }
};

// Load settings from localStorage
export function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            // Merge with defaults to handle missing fields
            return mergeDeep(DEFAULT_SETTINGS, data);
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

// Deep merge helper
function mergeDeep(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Save settings to localStorage
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

// Get current settings
export function getSettings() {
    return loadSettings();
}

// Update a specific setting
export function updateSetting(category, key, value) {
    const settings = loadSettings();
    if (!settings[category]) {
        settings[category] = {};
    }
    settings[category][key] = value;
    saveSettings(settings);
    return settings;
}

// Get a specific setting value
export function getSetting(category, key) {
    const settings = loadSettings();
    return settings[category]?.[key] ?? DEFAULT_SETTINGS[category]?.[key];
}

// Reset settings to defaults
export function resetSettings() {
    saveSettings({ ...DEFAULT_SETTINGS });
    return { ...DEFAULT_SETTINGS };
}



