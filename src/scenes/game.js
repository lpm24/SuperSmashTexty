// Main game scene
import { createPlayer } from '../entities/player.js';
import { createEnemy } from '../entities/enemy.js';
import { createXPPickup } from '../entities/pickup.js';
import { createDoor } from '../entities/door.js';
import { setupCombatSystem } from '../systems/combat.js';
import { setupProgressionSystem } from '../systems/progression.js';
import { getRandomEnemyType } from '../systems/enemySpawn.js';

// Game state (persists across scene reloads)
let gameState = {
    currentFloor: 1,
    currentRoom: 1,
    playerStats: null // Store player stats between rooms
};

export function setupGameScene(k) {
    k.scene('game', (args) => {
        // Reset game state on new game (when coming from menu)
        if (args?.resetState) {
            gameState.currentFloor = 1;
            gameState.currentRoom = 1;
            gameState.playerStats = null;
        }
        
        // Use persistent game state
        let currentFloor = gameState.currentFloor;
        let currentRoom = gameState.currentRoom;
        
        // Create player
        let player;
        if (gameState.playerStats) {
            // Restore player with previous stats
            player = createPlayer(k, k.width() / 2, k.height() / 2);
            // Restore stats
            Object.assign(player, gameState.playerStats);
            // Restore health to current HP (not max)
            player.setHP(gameState.playerStats.currentHP || player.maxHealth);
        } else {
            // New game - create fresh player
            player = createPlayer(k, k.width() / 2, k.height() / 2);
        }
        
        // Setup systems
        setupCombatSystem(k, player);
        setupProgressionSystem(k, player);
        
        // Room boundaries (visual)
        const margin = 20;
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, margin),
            k.anchor('center'),
            k.color(100, 100, 100),
            k.fixed()
        ]);
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, k.height() - margin),
            k.anchor('center'),
            k.color(100, 100, 100),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(margin, k.height() / 2),
            k.anchor('center'),
            k.color(100, 100, 100),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(k.width() - margin, k.height() / 2),
            k.anchor('center'),
            k.color(100, 100, 100),
            k.fixed()
        ]);
        
        // HUD
        const healthBar = k.add([
            k.text('HP: 100/100', { size: 16 }),
            k.pos(20, 20),
            k.color(255, 255, 255),
            k.fixed()
        ]);
        
        const levelText = k.add([
            k.text('Level: 1', { size: 16 }),
            k.pos(20, 40),
            k.color(255, 255, 255),
            k.fixed()
        ]);
        
        const floorText = k.add([
            k.text('Floor: 1 Room: 1', { size: 16 }),
            k.pos(20, 100),
            k.color(200, 200, 255),
            k.fixed()
        ]);
        
        const xpText = k.add([
            k.text('XP: 0/10', { size: 16 }),
            k.pos(20, 60),
            k.color(255, 255, 255),
            k.fixed()
        ]);
        
        const debugText = k.add([
            k.text('', { size: 12 }),
            k.pos(20, 80),
            k.color(150, 150, 150),
            k.fixed()
        ]);
        
        // Update HUD
        k.onUpdate(() => {
            const currentHP = player.exists() ? player.hp() : 0;
            healthBar.text = `HP: ${Math.max(0, Math.floor(currentHP))}/${player.maxHealth}`;
            levelText.text = `Level: ${player.level}`;
            xpText.text = `XP: ${player.xp}/${player.xpToNext}`;
            floorText.text = `Floor: ${currentFloor} Room: ${currentRoom}`;
            debugText.text = `Radius: ${player.pickupRadius}px`;
        });
        
        // Room state
        let roomCompleted = false;
        let enemiesToSpawn = 8 + (currentFloor - 1) * 2; // More enemies per floor
        let enemiesSpawned = 0;
        let initialSpawnDelay = 2; // Wait before first spawn
        
        // Spawn enemies periodically
        let enemySpawnTimer = 0;
        const enemySpawnInterval = 3; // seconds between spawns
        
        k.onUpdate(() => {
            if (k.paused || roomCompleted) return;
            
            // Check if all enemies are defeated
            const currentEnemies = k.get('enemy').length;
            if (enemiesSpawned >= enemiesToSpawn && currentEnemies === 0 && !roomCompleted) {
                roomCompleted = true;
                handleRoomCompletion();
            }
            
            // Spawn enemies if we haven't reached the limit
            if (enemiesSpawned < enemiesToSpawn) {
                enemySpawnTimer += k.dt();
                
                // Initial delay before first spawn
                if (enemiesSpawned === 0 && enemySpawnTimer < initialSpawnDelay) {
                    return;
                }
                
                if (enemySpawnTimer >= enemySpawnInterval) {
                    enemySpawnTimer = 0;
                    enemiesSpawned++;
                    
                    // Spawn enemy from random edge
                    const side = k.rand(0, 4);
                    let x, y;
                    
                    switch (Math.floor(side)) {
                        case 0: // Top
                            x = k.rand(margin, k.width() - margin);
                            y = margin;
                            break;
                        case 1: // Right
                            x = k.width() - margin;
                            y = k.rand(margin, k.height() - margin);
                            break;
                        case 2: // Bottom
                            x = k.rand(margin, k.width() - margin);
                            y = k.height() - margin;
                            break;
                        case 3: // Left
                            x = margin;
                            y = k.rand(margin, k.height() - margin);
                            break;
                    }
                    
                    // Spawn random enemy type based on floor
                    const enemyType = getRandomEnemyType(currentFloor);
                    createEnemy(k, x, y, enemyType, currentFloor);
                }
            }
        });
        
        // Update enemy death handling
        k.onUpdate(() => {
            if (k.paused) return;
            
            k.get('enemy').forEach(enemy => {
                if (enemy.hp() <= 0 && !enemy.isDead) {
                    enemy.isDead = true;
                    const xpValue = enemy.xpValue;
                    const posX = enemy.pos.x;
                    const posY = enemy.pos.y;
                    k.destroy(enemy);
                    
                    // Spawn XP pickup at enemy position
                    createXPPickup(k, posX, posY, xpValue);
                }
            });
        });
        
        // Handle XP pickup collection
        k.onUpdate(() => {
            if (!player.exists() || k.paused) return;
            
            k.get('xpPickup').forEach(pickup => {
                if (pickup.collected) return;
                
                // Calculate distance to player
                const distance = k.vec2(
                    player.pos.x - pickup.pos.x,
                    player.pos.y - pickup.pos.y
                ).len();
                
                // Auto-collect if within pickup radius
                if (distance <= player.pickupRadius) {
                    pickup.collected = true;
                    player.addXP(pickup.value);
                    k.destroy(pickup);
                }
            });
        });
        
        // Handle door interaction (proximity-based)
        let doorEntered = false;
        k.onUpdate(() => {
            if (!player.exists() || k.paused || doorEntered) return;
            
            k.get('door').forEach(door => {
                if (!door.open || doorEntered) return;
                
                // Check if player is near door
                const distance = k.vec2(
                    player.pos.x - door.pos.x,
                    player.pos.y - door.pos.y
                ).len();
                
                // Auto-enter if very close (within 40 pixels)
                if (distance <= 40) {
                    doorEntered = true;
                    handleDoorEntry(door.direction);
                }
            });
        });
        
        // Handle room completion
        function handleRoomCompletion() {
            // Spawn doors on all four sides
            const doorMargin = 30;
            createDoor(k, k.width() / 2, doorMargin, 'north');
            createDoor(k, k.width() / 2, k.height() - doorMargin, 'south');
            createDoor(k, doorMargin, k.height() / 2, 'west');
            createDoor(k, k.width() - doorMargin, k.height() / 2, 'east');
            
            // Mark all doors as open
            k.get('door').forEach(door => {
                door.open = true;
                door.color = k.rgb(100, 255, 100); // Green when open
            });
            
            // Show completion message
            const completionMsg = k.add([
                k.text('Room Cleared! Enter a door to continue', { size: 20 }),
                k.pos(k.width() / 2, k.height() - 40),
                k.anchor('center'),
                k.color(100, 255, 100),
                k.fixed(),
                k.z(500)
            ]);
            
            // Remove message after 5 seconds
            k.wait(5, () => {
                if (completionMsg.exists()) {
                    k.destroy(completionMsg);
                }
            });
        }
        
        // Handle door entry
        function handleDoorEntry(direction) {
            // Save player stats before transitioning
            gameState.playerStats = {
                level: player.level,
                xp: player.xp,
                xpToNext: player.xpToNext,
                maxHealth: player.maxHealth,
                currentHP: player.hp(),
                speed: player.speed,
                fireRate: player.fireRate,
                projectileSpeed: player.projectileSpeed,
                projectileDamage: player.projectileDamage,
                pickupRadius: player.pickupRadius,
                xpMultiplier: player.xpMultiplier || 1,
                // Advanced weapon stats
                projectileCount: player.projectileCount || 1,
                piercing: player.piercing || 0,
                critChance: player.critChance || 0,
                critDamage: player.critDamage || 2.0,
                spreadAngle: player.spreadAngle || 0,
                defense: player.defense || 0
            };
            
            // Increment room number
            currentRoom++;
            
            // Every 3 rooms, advance to next floor
            if (currentRoom > 3) {
                currentFloor++;
                currentRoom = 1;
            }
            
            // Update persistent state
            gameState.currentFloor = currentFloor;
            gameState.currentRoom = currentRoom;
            
            // Restart game scene with new room/floor
            k.go('game');
        }
        
        // Game over on player death
        player.onDeath(() => {
            k.go('gameOver');
        });
        
        // Pause
        k.onKeyPress('escape', () => {
            k.paused = !k.paused;
        });
    });
}

