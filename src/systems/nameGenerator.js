/**
 * Player Name Generator
 * Generates random player names in the format [Adjective][Noun]
 */

const ADJECTIVES = [
    'Swift', 'Mighty', 'Bold', 'Silent', 'Fierce',
    'Brave', 'Quick', 'Sharp', 'Dark', 'Bright',
    'Wild', 'Cool', 'Hot', 'Frozen', 'Burning',
    'Iron', 'Steel', 'Golden', 'Silver', 'Crimson',
    'Azure', 'Jade', 'Ruby', 'Onyx', 'Electric',
    'Toxic', 'Mystic', 'Ancient', 'Cyber', 'Neon',
    'Phantom', 'Shadow', 'Storm', 'Thunder', 'Frost',
    'Blaze', 'Venom', 'Razor', 'Nitro', 'Turbo',
    'Alpha', 'Omega', 'Prime', 'Elite', 'Epic',
    'Legendary', 'Royal', 'Noble', 'Rogue', 'Savage'
];

const NOUNS = [
    'Wolf', 'Eagle', 'Tiger', 'Dragon', 'Phoenix',
    'Hawk', 'Lion', 'Bear', 'Falcon', 'Raven',
    'Viper', 'Cobra', 'Panther', 'Shark', 'Raptor',
    'Hunter', 'Warrior', 'Knight', 'Ninja', 'Samurai',
    'Ronin', 'Striker', 'Sniper', 'Ranger', 'Scout',
    'Titan', 'Champion', 'Hero', 'Legend', 'Master',
    'Blade', 'Arrow', 'Bullet', 'Rocket', 'Comet',
    'Star', 'Moon', 'Sun', 'Bolt', 'Flash',
    'Storm', 'Flame', 'Wave', 'Wind', 'Quake',
    'Slayer', 'Reaper', 'Wraith', 'Ghost', 'Specter'
];

/**
 * Generate a random player name
 * @returns {string} Random name in format "AdjectiveNoun"
 */
export function generateRandomName() {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adjective}${noun}`;
}

/**
 * Generate a unique 6-digit invite code
 * @returns {string} 6-digit code
 */
export function generateInviteCode() {
    // Generate 6 random digits
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate an invite code
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid format
 */
export function isValidInviteCode(code) {
    return /^\d{6}$/.test(code);
}
