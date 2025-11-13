// Main game scene
import { createPlayer } from '../entities/player.js';
import { createEnemy } from '../entities/enemy.js';
import { createBoss } from '../entities/boss.js';
import { createXPPickup } from '../entities/pickup.js';
import { createDoor } from '../entities/door.js';
import { createObstacle } from '../entities/obstacle.js';
import { setupCombatSystem } from '../systems/combat.js';
import { setupProgressionSystem } from '../systems/progression.js';
import { getRandomEnemyType } from '../systems/enemySpawn.js';
import { getWeightedRoomTemplate, getFloorColors } from '../systems/roomGeneration.js';
import { checkAndApplySynergies } from '../systems/synergies.js';

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
            // Restore synergy tracking
            if (gameState.playerStats.selectedUpgrades) {
                player.selectedUpgrades = new Set(gameState.playerStats.selectedUpgrades);
            }
            if (gameState.playerStats.activeSynergies) {
                player.activeSynergies = new Set(gameState.playerStats.activeSynergies);
            }
        } else {
            // New game - create fresh player
            player = createPlayer(k, k.width() / 2, k.height() / 2);
        }
        
        // Setup systems
        setupCombatSystem(k, player);
        setupProgressionSystem(k, player);
        
        // Re-apply synergies if loading from saved state
        if (gameState.playerStats && gameState.playerStats.selectedUpgrades) {
            // Wait a frame to ensure player is fully initialized
            k.wait(0.1, () => {
                checkAndApplySynergies(k, player);
            });
        }
        
        // Get room template and floor colors
        const roomTemplate = getWeightedRoomTemplate(currentFloor);
        const floorColors = getFloorColors(k, currentFloor);
        const margin = 20;
        
        // Room boundaries (visual) - use floor-based colors
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, margin),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(k.width() - margin * 2, 2),
            k.pos(k.width() / 2, k.height() - margin),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(margin, k.height() / 2),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        k.add([
            k.rect(2, k.height() - margin * 2),
            k.pos(k.width() - margin, k.height() / 2),
            k.anchor('center'),
            k.color(floorColors.wallColor),
            k.fixed()
        ]);
        
        // Create obstacles from room template
        // Player spawn location (safe zone)
        const playerSpawnX = k.width() / 2;
        const playerSpawnY = k.height() / 2;
        const safeZoneRadius = 80; // Minimum distance from spawn
        
        const obstacles = [];
        roomTemplate.obstacles.forEach(obs => {
            // Check if obstacle would overlap with player spawn safe zone
            const distanceToSpawn = Math.sqrt(
                Math.pow(obs.x - playerSpawnX, 2) + 
                Math.pow(obs.y - playerSpawnY, 2)
            );
            const obstacleRadius = Math.max(obs.width, obs.height) / 2;
            
            // Skip obstacle if it's too close to spawn
            if (distanceToSpawn < safeZoneRadius + obstacleRadius) {
                return; // Skip this obstacle
            }
            
            const obstacleColor = obs.type === 'wall' 
                ? floorColors.obstacleColor 
                : floorColors.coverColor;
            const obstacle = createObstacle(
                k, 
                obs.x, 
                obs.y, 
                obs.width, 
                obs.height, 
                obs.type, 
                obs.char || '#',
                obstacleColor
            );
            obstacles.push(obstacle);
        });
        
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
        
        // Spawn doors - create at room start for enemy spawning
        const spawnDoors = [];
        const doorMargin = 30;
        const spawnDoorPositions = [
            { x: k.width() / 2, y: doorMargin, direction: 'north' },
            { x: k.width() / 2, y: k.height() - doorMargin, direction: 'south' },
            { x: doorMargin, y: k.height() / 2, direction: 'west' },
            { x: k.width() - doorMargin, y: k.height() / 2, direction: 'east' }
        ];
        
        // Create spawn doors (closed, red color to indicate enemy spawn points)
        spawnDoorPositions.forEach(pos => {
            const spawnDoor = createDoor(k, pos.x, pos.y, pos.direction);
            spawnDoor.open = false;
            spawnDoor.isSpawnDoor = true; // Mark as spawn door
            spawnDoor.color = k.rgb(200, 50, 50); // Red color for spawn doors
            spawnDoors.push(spawnDoor);
        });
        
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
                    
                    // Spawn enemy from random spawn door
                    if (spawnDoors.length > 0) {
                        const randomDoor = spawnDoors[Math.floor(Math.random() * spawnDoors.length)];
                        const spawnX = randomDoor.pos.x;
                        const spawnY = randomDoor.pos.y;
                        
                        // Add slight random offset to avoid stacking
                        const offset = 15;
                        const offsetX = spawnX + (Math.random() - 0.5) * offset;
                        const offsetY = spawnY + (Math.random() - 0.5) * offset;
                        
                        // Spawn random enemy type based on floor
                        const enemyType = getRandomEnemyType(currentFloor);
                        createEnemy(k, offsetX, offsetY, enemyType, currentFloor);
                    } else {
                        // Fallback to edge spawning if no doors (shouldn't happen)
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
                        
                        const enemyType = getRandomEnemyType(currentFloor);
                        createEnemy(k, x, y, enemyType, currentFloor);
                    }
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
                // Only interact with exit doors (not spawn doors)
                if (!door.open || doorEntered || door.isSpawnDoor) return;
                
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
            // Convert spawn doors to exit doors (or create new exit doors)
            // Option 1: Convert existing spawn doors to exit doors
            spawnDoors.forEach(door => {
                if (door.exists()) {
                    door.open = true;
                    door.isSpawnDoor = false; // No longer a spawn door
                    door.color = k.rgb(100, 255, 100); // Green when open (exit door)
                    door.text = '='; // Keep door symbol
                }
            });
            
            // Alternative: Create separate exit doors (commented out - using conversion instead)
            // const exitDoors = [];
            // spawnDoorPositions.forEach(pos => {
            //     const exitDoor = createDoor(k, pos.x, pos.y, pos.direction);
            //     exitDoor.open = true;
            //     exitDoor.isSpawnDoor = false;
            //     exitDoor.color = k.rgb(100, 255, 100);
            //     exitDoors.push(exitDoor);
            // });
            
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
                defense: player.defense || 0,
                // Synergy tracking
                selectedUpgrades: player.selectedUpgrades ? Array.from(player.selectedUpgrades) : [],
                activeSynergies: player.activeSynergies ? Array.from(player.activeSynergies) : [],
                piercingDamageBonus: player.piercingDamageBonus || 1.0
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

