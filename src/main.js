import kaplay from 'kaplay';
import { setupGameScene } from './scenes/game.js';
import { setupMenuScene } from './scenes/menu.js';
import { setupGameOverScene } from './scenes/gameOver.js';
import { setupShopScene } from './scenes/shop.js';
import { setupSettingsScene } from './scenes/settings.js';
import { setupStatisticsScene } from './scenes/statistics.js';
import { setupCharacterSelectScene } from './scenes/characterSelect.js';
import { initJoinPartyScene } from './scenes/joinParty.js';
import { GAME_CONFIG } from './config/constants.js';

// Initialize KAPLAY
const k = kaplay({
    width: GAME_CONFIG.CANVAS_WIDTH,
    height: GAME_CONFIG.CANVAS_HEIGHT,
    background: GAME_CONFIG.BACKGROUND_COLOR,
    scale: GAME_CONFIG.CANVAS_SCALE,
    debug: GAME_CONFIG.DEBUG_MODE,
    root: document.querySelector('#game-container'),
    stretch: true,  // Stretch canvas to fill container
    letterbox: true, // Maintain aspect ratio with letterboxing
    crisp: true, // Disable anti-aliasing for crisp pixel art
});

// Setup scenes
setupMenuScene(k);
setupGameScene(k);
setupGameOverScene(k);
setupShopScene(k);
setupSettingsScene(k);
setupStatisticsScene(k);
setupCharacterSelectScene(k);
initJoinPartyScene(k);

// Start with menu
k.go('menu');

