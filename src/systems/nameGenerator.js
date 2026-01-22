/**
 * Player Name Generator
 * Generates random contestant names in the format [Adjective][Noun]
 * Theme: Game show contestants competing in combat arenas
 */

const ADJECTIVES = [
    // Original - Power & Speed (all 8 chars or less)
    'Swift', 'Mighty', 'Bold', 'Silent', 'Fierce',
    'Brave', 'Quick', 'Sharp', 'Dark', 'Bright',
    'Wild', 'Cool', 'Hot', 'Frozen', 'Burning',
    'Iron', 'Steel', 'Golden', 'Silver', 'Crimson',
    'Azure', 'Jade', 'Ruby', 'Onyx', 'Electric',
    'Toxic', 'Mystic', 'Ancient', 'Cyber', 'Neon',
    'Phantom', 'Shadow', 'Storm', 'Thunder', 'Frost',
    'Blaze', 'Venom', 'Razor', 'Nitro', 'Turbo',
    'Alpha', 'Omega', 'Prime', 'Elite', 'Epic',
    'Royal', 'Noble', 'Rogue', 'Savage',

    // Game Show / Competition (8 chars or less)
    'Reigning', 'Rising', 'Rookie', 'Veteran', 'Seasoned',
    'Underdog', 'Favored', 'Viral', 'Trending', 'Famous',
    'Infamous', 'Ultimate', 'Supreme', 'Grand', 'Major',
    'Premier', 'Star', 'Main', 'Top', 'Peak', 'Apex',

    // Fighting / Combat (8 chars or less)
    'Brutal', 'Ruthless', 'Vicious', 'Crushing', 'Raging',
    'Furious', 'Frenzied', 'Berserk', 'Mad', 'Crazy',
    'Lethal', 'Deadly', 'Fatal', 'Killer', 'Murder',
    'Immortal', 'Eternal', 'Heavy', 'Hard', 'Tough',
    'Gritty', 'Scrappy', 'Mean', 'Nasty', 'Dirty',
    'Raw', 'Primal',

    // Dramatic / Showmanship (8 chars or less)
    'Amazing', 'Awesome', 'Dazzling', 'Stunning', 'Shocking',
    'Dynamic', 'Radical', 'Extreme', 'Intense', 'Hyper',
    'Ultra', 'Mega', 'Super', 'Power', 'Atomic',
    'Nuclear', 'Chaos', 'Havoc', 'Mayhem', 'Rampage',
    'Carnage',

    // Attitude / Personality (8 chars or less)
    'Cocky', 'Sneaky', 'Tricky', 'Sly', 'Cunning',
    'Wicked', 'Evil', 'Sinister', 'Twisted', 'Crooked',
    'Lucky', 'Unlucky', 'Cursed', 'Blessed', 'Chosen',
    'Lone', 'Solo', 'Outlaw', 'Rebel', 'Bandit'
];

const NOUNS = [
    // Original - Animals & Warriors (8 chars or less)
    'Wolf', 'Eagle', 'Tiger', 'Dragon', 'Phoenix',
    'Hawk', 'Lion', 'Bear', 'Falcon', 'Raven',
    'Viper', 'Cobra', 'Panther', 'Shark', 'Raptor',
    'Hunter', 'Warrior', 'Knight', 'Ninja', 'Samurai',
    'Ronin', 'Striker', 'Sniper', 'Ranger', 'Scout',
    'Titan', 'Champion', 'Hero', 'Legend', 'Master',
    'Blade', 'Arrow', 'Bullet', 'Rocket', 'Comet',
    'Star', 'Moon', 'Sun', 'Bolt', 'Flash',
    'Storm', 'Flame', 'Wave', 'Wind', 'Quake',
    'Slayer', 'Reaper', 'Wraith', 'Ghost', 'Specter',

    // Game Show / Competition (8 chars or less)
    'Finalist', 'Victor', 'Winner', 'Champ', 'Hopeful',
    'Prospect', 'Wildcard', 'Underdog', 'Favorite', 'Prodigy',
    'Rookie', 'Veteran', 'Pro', 'Amateur', 'Phenom',
    'Showman', 'Icon',

    // Fighting / Brawling (8 chars or less)
    'Brawler', 'Bruiser', 'Slugger', 'Puncher', 'Boxer',
    'Fighter', 'Scrapper', 'Battler', 'Duelist', 'Crusher',
    'Smasher', 'Basher', 'Masher', 'Thrasher', 'Pummeler',
    'Pounder', 'Hammer', 'Mauler', 'Mangler', 'Knockout',
    'Haymaker', 'Uppercut', 'Jab', 'Hook', 'Spartan',
    'Viking',

    // Destruction / Chaos (8 chars or less)
    'Wrecking', 'Rampage', 'Havoc', 'Mayhem', 'Chaos',
    'Carnage', 'Fury', 'Menace', 'Terror', 'Horror',
    'Dread',

    // Weaponry / Tools (8 chars or less)
    'Fist', 'Knuckle', 'Claw', 'Talon', 'Spike',
    'Axe', 'Hammer', 'Mace', 'Flail', 'Club',
    'Cannon', 'Mortar', 'Missile', 'Bomb', 'Grenade',
    'Shiv', 'Machete', 'Cleaver', 'Hatchet',

    // Animals - More Aggressive (8 chars or less)
    'Gorilla', 'Rhino', 'Bull', 'Boar', 'Pitbull',
    'Doberman', 'Mastiff', 'Bulldog', 'Scorpion', 'Mantis',
    'Hornet', 'Wasp', 'Spider', 'Croc', 'Gator',
    'Piranha', 'Orca', 'Hyena', 'Jackal', 'Badger',
    'Warthog', 'Mongoose',

    // Personas / Archetypes (8 chars or less)
    'Outlaw', 'Bandit', 'Thug', 'Goon', 'Hooligan',
    'Punk', 'Rebel', 'Maverick', 'Renegade', 'Assassin',
    'Bounty', 'Hitman', 'Enforcer', 'Boss', 'Kingpin',
    'Warlord', 'Overlord', 'Tyrant'
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
