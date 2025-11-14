import kaplay from 'kaplay';
import { setupGameScene } from './scenes/game.js';
import { setupMenuScene } from './scenes/menu.js';
import { setupGameOverScene } from './scenes/gameOver.js';
import { setupShopScene } from './scenes/shop.js';
import { setupSettingsScene } from './scenes/settings.js';
import { setupStatisticsScene } from './scenes/statistics.js';
import { setupCharacterSelectScene } from './scenes/characterSelect.js';

// Initialize KAPLAY
const k = kaplay({
    width: 800,
    height: 600,
    background: [0, 0, 0],
    scale: 1,
    debug: false, // Disable debug for cleaner gameplay
    root: document.querySelector('#game-container'),
});

// Setup scenes
setupMenuScene(k);
setupGameScene(k);
setupGameOverScene(k);
setupShopScene(k);
setupSettingsScene(k);
setupStatisticsScene(k);
setupCharacterSelectScene(k);

// Start with menu
k.go('menu');

