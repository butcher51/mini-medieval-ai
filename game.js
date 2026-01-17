import { findPath, isPathInRange } from "./astar.js";
import { Player } from "./Player.js";
import { Enemy } from "./Enemy.js";
import { AnimationController } from "./AnimationController.js";
import { ZOOM_LEVEL, BASE_TILE_SIZE, TILE_SIZE, PLAYER_MOVE_POINTS, ENEMY_POSITIONS, MOVEMENT_STEP_DELAY, INITAL_MAP } from "./constants.js";
import { createGameState } from "./gameState.js";
import { saveManager } from "./SaveManager.js";
import { initZoomPrevention } from "./zoomPrevention.js";

// Get the canvas context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Make canvas fill the screen
function resizeCanvas() {
    // Round to even numbers by flooring to nearest even number
    canvas.width = Math.floor(window.innerWidth / 2) * 2;
    canvas.height = Math.floor(window.innerHeight / 2) * 2;

    // Set default rendering settings
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
}

// Initial resize
resizeCanvas();

// Handle window resizing
window.addEventListener("resize", resizeCanvas);

// Map dimensions (will be set when map loads)
let MAP_WIDTH = 0;
let MAP_HEIGHT = 0;
let gameWidth = 0;
let gameHeight = 0;

// Game state
let gameMap = null;
let gameMapAnimations = null;
let gameMapAnimationIndexes = null;
let tilesetImage = null;
let iconsImage = null;
let iconsData = null;
let tilesetData = null;
let collisionLayer = null;
let objectsLayer = null;
let pause = false;

async function loadUI() {
    iconsImage = await loadImage("assets/icons.png");
    iconsData = await fetch("assets/icons.json").then((res) => res.json());
}

// Load map data
async function loadMap(mapName) {
    try {
        const response = await fetch(`assets/maps/${mapName}.json`);
        gameMap = await response.json();

        const animationsResponse = await fetch(`assets/maps/map-animations.json`);
        gameMapAnimations = await animationsResponse.json();

        // Set map dimensions
        MAP_WIDTH = gameMap.width;
        MAP_HEIGHT = gameMap.height;

        gameMapAnimationIndexes = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(null));

        // Calculate the game area size
        gameWidth = MAP_WIDTH * TILE_SIZE;
        gameHeight = MAP_HEIGHT * TILE_SIZE;

        // Find collision layer
        collisionLayer = gameMap.layers.find((layer) => layer.class === "collision");
        if (!collisionLayer) {
            throw new Error("No collision layer found in map data");
        }

        // Find object layer
        objectsLayer = gameMap.layers.find((layer) => layer.class === "objects");
        if (!objectsLayer) {
            throw new Error("No objects layer found in map data");
        }

        // Load tileset
        const tilesetSource = gameMap.tilesets[0].source;
        const tilesetName = tilesetSource.split("/").pop().replace(".tsx", "").toLowerCase();

        // Load tileset data
        const tilesetResponse = await fetch(`assets/${tilesetName}.json`);
        tilesetData = await tilesetResponse.json();

        // Load tileset image with promise
        tilesetImage = await loadImage(`assets/${tilesetName}.png`);
    } catch (error) {
        console.error("Error loading map:", error);
    }
}

/**
 * @param {string} targetObject
 */
function movePlayerToTarget(targetObject) {
    if (!targetObject) {
        return;
    }

    // Find start position from objects layer
    const startObject = objectsLayer.objects.find((obj) => obj.name === targetObject);

    if (startObject) {
        // Initialize player at start position, converting pixel coordinates to tile coordinates
        player.x = Math.floor(startObject.x / BASE_TILE_SIZE) * BASE_TILE_SIZE;
        player.y = Math.floor(startObject.y / BASE_TILE_SIZE) * BASE_TILE_SIZE;
    }
}

// Calculate tile position in tileset
function getTilePosition(tileIndex) {
    if (tileIndex === 0) return null; // Empty tile

    tileIndex--; // Convert to 0-based index
    const tilesPerRow = Math.floor(tilesetData.imagewidth / BASE_TILE_SIZE);
    const row = Math.floor(tileIndex / tilesPerRow);
    const col = tileIndex % tilesPerRow;

    return {
        x: col * BASE_TILE_SIZE,
        y: row * BASE_TILE_SIZE,
    };
}

// Player object
const player = new Player("It's me", TILE_SIZE * 2, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE);

// Game objects (enemies)
let enemies = ENEMY_POSITIONS.map((pos) => new Enemy(pos.id, pos.x, pos.y, TILE_SIZE, TILE_SIZE));

// Game state
let gameState = createGameState();

function isTileCollidable(x, y) {
    if (!collisionLayer) return false;

    const tileX = Math.floor(x / BASE_TILE_SIZE);
    const tileY = Math.floor(y / BASE_TILE_SIZE);

    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
        return true;
    }

    const tileIndex = tileY * MAP_WIDTH + tileX;
    return collisionLayer.data[tileIndex] !== 0;
}

function drawObject(object, x, y) {
    if (object.properties && iconsData && iconsImage) {
        const iconProp = object.properties.find((prop) => prop.name === "icon");
        if (iconProp && iconProp.value) {
            const iconData = iconsData[iconProp.value];
            if (iconData) {
                ctx.drawImage(iconsImage, iconData.x, iconData.y, BASE_TILE_SIZE, BASE_TILE_SIZE, x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
            }
        } else {
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(x, y, BASE_TILE_SIZE, BASE_TILE_SIZE);
        }
    }
}

// Draw map layers
function drawMapLayers() {
    if (!gameMap || !tilesetImage || !tilesetData) return;
    if (!tilesetImage.complete) return; // Make sure image is fully loaded

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Set background color
    if (gameMap.backgroundcolor) {
        ctx.fillStyle = gameMap.backgroundcolor;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
    }

    let animationIndex, tileIndex, animation;
    const now = Math.floor(Date.now() / 600);

    // Draw each visible layer
    gameMap.layers.forEach((layer) => {
        if (layer.class === "collision") return; // Skip collision layer
        if (!layer.visible) return;

        if (layer.class === "objects") {
            layer.objects.forEach((object) => {
                drawObject(object, object.x, object.y);
            });
            return;
        }

        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                tileIndex = layer.data[y * layer.width + x];
                if (tileIndex === 0) continue; // Skip empty tiles

                animation = gameMapAnimations["" + tileIndex];
                if (animation) {
                    animationIndex = gameMapAnimationIndexes[y][x];
                    if (animationIndex !== null) {
                        tileIndex = animationIndex.frames[animationIndex.currentFrame + (now % animationIndex.length)];
                    } else {
                        gameMapAnimationIndexes[y][x] = {
                            length: animation.length,
                            frames: animation,
                            currentFrame: 0,
                        };
                    }
                }

                const pos = getTilePosition(tileIndex);
                if (!pos) continue;

                const xPos = x * BASE_TILE_SIZE;
                const yPos = y * BASE_TILE_SIZE;

                ctx.drawImage(tilesetImage, pos.x, pos.y, BASE_TILE_SIZE, BASE_TILE_SIZE, xPos, yPos, BASE_TILE_SIZE, BASE_TILE_SIZE);
            }
        }
    });
}

// Draw path visualization
function drawPath(path, baseTileSize) {
    if (!path || path.length < 2) return;

    ctx.save();

    if (!gameState.isMoving) {
        // Draw solid line only when selecting target
        ctx.strokeStyle = isPathInRange(path, player.movePoints) ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        path.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x * baseTileSize + baseTileSize / 2, point.y * baseTileSize + baseTileSize / 2);
            } else {
                ctx.lineTo(point.x * baseTileSize + baseTileSize / 2, point.y * baseTileSize + baseTileSize / 2);
            }
        });
        ctx.stroke();
    } else {
        // Draw only the movement indicators during movement
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

        // Find the current position in the path
        const currentTileX = Math.floor(player.x / baseTileSize);
        const currentTileY = Math.floor(player.y / baseTileSize);
        const currentPathIndex = path.findIndex((point) => point.x === currentTileX && point.y === currentTileY);

        // Only draw indicators for remaining path points
        if (currentPathIndex !== -1) {
            for (let i = currentPathIndex + 1; i < path.length; i++) {
                const point = path[i];
                const x = point.x * baseTileSize + baseTileSize / 4;
                const y = point.y * baseTileSize + baseTileSize / 4;
                ctx.fillRect(x, y + baseTileSize / 4, baseTileSize / 4, baseTileSize / 4);
            }
        }
    }

    ctx.restore();
}

// Draw function
function draw() {
    ctx.save();

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill canvas background (visible outside map bounds)
    ctx.fillStyle = "#120e23";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate the offset to center the game area (0 when map is larger than viewport)
    const offsetX = Math.max(0, (canvas.width - gameWidth * ZOOM_LEVEL) / 2);
    const offsetY = Math.max(0, (canvas.height - gameHeight * ZOOM_LEVEL) / 2);

    // Apply transforms in correct order
    ctx.translate(offsetX, offsetY);
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-gameState.cameraX, -gameState.cameraY);

    // Draw map layers
    drawMapLayers();

    // Draw path if available
    if (gameState.currentTurn === "player") {
        if (gameState.isMoving && gameState.activeMovementPath) {
            // Draw the active movement path
            drawPath(gameState.activeMovementPath, BASE_TILE_SIZE);
        } else if (!gameState.isMoving && gameState.currentPath) {
            // Draw the target selection path
            drawPath(gameState.currentPath, BASE_TILE_SIZE);

            // Draw hovered tile only when not moving and selecting target
            const hoveredTileX = gameState.hoveredTile.x * BASE_TILE_SIZE;
            const hoveredTileY = gameState.hoveredTile.y * BASE_TILE_SIZE;
            if (gameState.hoveredTile.x >= 0 && gameState.hoveredTile.x < MAP_WIDTH && gameState.hoveredTile.y >= 0 && gameState.hoveredTile.y < MAP_HEIGHT) {
                ctx.strokeStyle = isPathInRange(gameState.currentPath, player.movePoints) ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
                ctx.strokeRect(hoveredTileX, hoveredTileY, BASE_TILE_SIZE, BASE_TILE_SIZE);
                if (gameState.hoveredTile.attack) {
                    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
                    ctx.fillRect(hoveredTileX, hoveredTileY, BASE_TILE_SIZE, BASE_TILE_SIZE);
                }
            }
        }
    }

    // Draw entities
    drawEntities();

    // Reset transform for UI
    ctx.restore();

    // Draw UI in screen space
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Move Points: ${player.movePoints}`, 10, 30);
    ctx.fillText(`Turn: ${gameState.currentTurn}`, 10, 60);

    // Draw skip turn button
    if (gameState.currentTurn === "player" && !gameState.isMoving) {
        ctx.font = "24px Arial";
        const skipText = "Skip Turn";
        const textMetrics = ctx.measureText(skipText);
        const buttonX = canvas.width / 2 - textMetrics.width / 2;
        const buttonY = canvas.height - 50;

        // Store button position and dimensions in gameState for click detection
        gameState.skipButton = {
            x: buttonX - 10,
            y: buttonY - 30,
            width: textMetrics.width + 20,
            height: 40,
        };

        // Draw button background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameState.skipButton.x, gameState.skipButton.y, gameState.skipButton.width, gameState.skipButton.height);

        // Draw button text
        ctx.fillStyle = "white";
        ctx.fillText(skipText, buttonX, buttonY);
    }
}

// Update game logic
function update(deltaTime) {
    // Update camera to follow player
    const viewportWidth = canvas.width / ZOOM_LEVEL;
    const viewportHeight = canvas.height / ZOOM_LEVEL;

    gameState.cameraX = player.x - viewportWidth / 2 + BASE_TILE_SIZE / 2;
    gameState.cameraY = player.y - viewportHeight / 2 + BASE_TILE_SIZE / 2;

    // Camera bounds - handle both larger and smaller maps
    if (gameWidth <= viewportWidth) {
        // Map fits in viewport horizontally: no scrolling needed
        gameState.cameraX = 0;
    } else {
        // Map larger than viewport: clamp camera to map bounds
        gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameWidth - viewportWidth));
    }

    if (gameHeight <= viewportHeight) {
        // Map fits in viewport vertically: no scrolling needed
        gameState.cameraY = 0;
    } else {
        // Map larger than viewport: clamp camera to map bounds
        gameState.cameraY = Math.max(0, Math.min(gameState.cameraY, gameHeight - viewportHeight));
    }
}

// Main game loop
let lastTime = 0;
function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!pause) {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update game logic
        update(deltaTime);

        // Draw the game layers
        draw();
    }

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game
async function startGame() {
    try {
        await AnimationController.loadAnimations();
        await loadUI();

        const save = saveManager.getCurrentMap();
        const mapToLoad = save?.targetMap || INITAL_MAP;

        await loadMap(mapToLoad);

        // Save the initial map if no save exists
        if (!save) {
            saveManager.setCurrentMap(mapToLoad);
        }

        await initialize(save?.targetObject);

        gameLoop();
    } catch (error) {
        console.error("Error starting game:", error);
    }
}

async function initialize(targetObject) {
    gameState = createGameState();

    player.initialize();
    movePlayerToTarget(targetObject || "start");
}

// Add event listeners for mouse
canvas.addEventListener("mousemove", (e) => {
    if (gameState.currentTurn === "player" && player.isActive) {
        const rect = canvas.getBoundingClientRect();
        const offsetX = Math.max(0, (canvas.width - gameWidth * ZOOM_LEVEL) / 2);
        const offsetY = Math.max(0, (canvas.height - gameHeight * ZOOM_LEVEL) / 2);

        // Adjust mouse coordinates to account for viewport centering and zoom
        gameState.mouseX = (e.clientX - rect.left - offsetX) / ZOOM_LEVEL + gameState.cameraX;
        gameState.mouseY = (e.clientY - rect.top - offsetY) / ZOOM_LEVEL + gameState.cameraY;

        // Calculate hovered tile
        const tileX = Math.floor(gameState.mouseX / BASE_TILE_SIZE);
        const tileY = Math.floor(gameState.mouseY / BASE_TILE_SIZE);

        if (tileX !== gameState.hoveredTile.x || tileY !== gameState.hoveredTile.y) {
            const attack = isEnemyTile(tileX, tileY);
            gameState.hoveredTile = { x: tileX, y: tileY, attack };
            // Calculate path to hovered tile
            const playerTileX = Math.floor(player.x / BASE_TILE_SIZE);
            const playerTileY = Math.floor(player.y / BASE_TILE_SIZE);
            gameState.currentPath = findPath(playerTileX, playerTileY, tileX, tileY, attack ? isAttackWalkable : isWalkable);
        }
    }
});

// Draw entities
function drawEntities() {
    // Draw player
    player.draw(ctx);

    // Draw enemies
    enemies.forEach((enemy) => {
        //if (!enemy.isActive) return; // Don't draw dead enemies
        enemy.draw(ctx);
    });
}

// Add movement animation function
async function moveCharacterAlongPath(character, path, baseTileSize) {
    gameState.isMoving = true;
    gameState.activeMovementPath = path; // Store the active movement path

    for (let i = 1; i < path.length; i++) {
        const nextPos = path[i];
        character.x = nextPos.x * baseTileSize;
        character.y = nextPos.y * baseTileSize;
        await delay(MOVEMENT_STEP_DELAY);
    }

    gameState.isMoving = false;
    gameState.activeMovementPath = null; // Clear the active movement path
    gameState.currentPath = null; // Ensure path is cleared
    gameState.hoveredTile = { x: -1, y: -1 }; // Reset hover state
}

// Modify the click handler to include history for player actions
canvas.addEventListener("click", async (e) => {
    if (gameState.currentTurn !== "player" || gameState.isMoving) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if skip button was clicked
    if (
        gameState.skipButton &&
        clickX >= gameState.skipButton.x &&
        clickX <= gameState.skipButton.x + gameState.skipButton.width &&
        clickY >= gameState.skipButton.y &&
        clickY <= gameState.skipButton.y + gameState.skipButton.height
    ) {
        // Add skip turn to history
        gameState.turnHistory.push({
            character: "player",
            action: "skip_turn",
            timestamp: Date.now(),
        });

        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        endPlayerTurn();
        return;
    }

    // Don't process game world clicks if there's no path
    if (!gameState.currentPath) return;

    // Check if we're trying to attack an enemy
    const clickedTileX = gameState.hoveredTile.x;
    const clickedTileY = gameState.hoveredTile.y;

    const targetEnemy = enemies.find(
        (enemy) => enemy.isActive && Math.floor(enemy.x / BASE_TILE_SIZE) === clickedTileX && Math.floor(enemy.y / BASE_TILE_SIZE) === clickedTileY
    );

    if (targetEnemy && player.isAdjacent(targetEnemy, BASE_TILE_SIZE)) {
        // Attack the enemy
        await attack({ attacker: player, defender: targetEnemy });

        // Add attack to history
        gameState.turnHistory.push({
            character: "player",
            action: "attack",
            target: targetEnemy.id,
            position: { x: clickedTileX, y: clickedTileY },
            timestamp: Date.now(),
        });

        // Reset path and hover highlight after attack
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };

        // End turn immediately after attack
        endPlayerTurn();
        return;
    }

    // Check if we're trying to move to an enemy tile
    if (targetEnemy) {
        gameState.currentPath.pop();
    }

    // Otherwise, try to move
    if (isPathInRange(gameState.currentPath, player.movePoints)) {
        player.setState("run"); // Set player animation state to walking

        // Store the path before starting movement
        const movementPath = [...gameState.currentPath];

        // Reset path and hover highlight before movement
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };

        // Animate movement along path
        await moveCharacterAlongPath(player, movementPath, BASE_TILE_SIZE);

        if (targetEnemy) {
            // Attack the enemy after movement
            await attack({ attacker: player, defender: targetEnemy });
        }

        player.setState("idle"); // Set player animation state back to idle

        // Add movement to history
        gameState.turnHistory.push({
            character: "player",
            action: "move",
            path: movementPath.map((p) => ({ x: p.x, y: p.y })),
            timestamp: Date.now(),
        });

        // Check if player is on a door tile
        if (isDoorTile(player.x, player.y)) {
            const target = getDoorTarget(player.x, player.y);
            if (target) {
                changeMap(target);

                gameState.turnHistory.push({
                    character: "player",
                    action: "exit",
                    position: { x: Math.floor(player.x / BASE_TILE_SIZE), y: Math.floor(player.y / BASE_TILE_SIZE) },
                    timestamp: Date.now(),
                    target,
                });
            }
        }

        // End turn immediately after movement
        endPlayerTurn();
    }
});

async function processEnemyTurn() {
    // Process each enemy's turn
    for (const enemy of enemies) {
        if (!enemy.isActive) continue; // Skip dead enemies

        // Calculate path to player
        const enemyTileX = Math.floor(enemy.x / BASE_TILE_SIZE);
        const enemyTileY = Math.floor(enemy.y / BASE_TILE_SIZE);
        const playerTileX = Math.floor(player.x / BASE_TILE_SIZE);
        const playerTileY = Math.floor(player.y / BASE_TILE_SIZE);

        const pathToPlayer = findPath(enemyTileX, enemyTileY, playerTileX, playerTileY, isWalkable);

        if (!pathToPlayer) continue; // No path to player

        // If adjacent to player, attack
        if (enemy.isAdjacent(player, BASE_TILE_SIZE)) {
            await attack({ attacker: enemy, defender: player });
            // Add enemy attack to history
            gameState.turnHistory.push({
                character: enemy.id,
                action: "attack",
                target: "player",
                position: { x: enemyTileX, y: enemyTileY },
                timestamp: Date.now(),
            });
            continue;
        }

        // Otherwise, move towards player
        if (pathToPlayer.length > 1) {
            // First point is current position
            const moveDistance = Math.min(enemy.movePoints, pathToPlayer.length - 1);
            const path = pathToPlayer.slice(0, moveDistance + 1);
            const targetPos = path[path.length - 1];

            isPlayerTile(targetPos.x, targetPos.y) ? path.pop() : null;

            enemy.setState("run"); // Set enemy animation state to walking
            await moveCharacterAlongPath(enemy, path, BASE_TILE_SIZE);
            enemy.setState("idle"); // Set enemy animation state back to idle

            // Add enemy movement to history
            gameState.turnHistory.push({
                character: enemy.id,
                action: "move",
                path: path.map((p) => ({ x: p.x, y: p.y })),
                timestamp: Date.now(),
            });

            await delay(500); // Delay before attacking

            if (enemy.isAdjacent(player, BASE_TILE_SIZE)) {
                await attack({ attacker: enemy, defender: player });
                // Add enemy attack to history
                gameState.turnHistory.push({
                    character: enemy.id,
                    action: "attack",
                    target: "player",
                    position: { x: Math.floor(enemy.x / BASE_TILE_SIZE), y: Math.floor(enemy.y / BASE_TILE_SIZE) },
                    timestamp: Date.now(),
                });
                continue;
            }
        }
        await delay(1); // Delay before next enemy turn
    }

    // End enemy turn
    gameState.currentTurn = "player";
    player.movePoints = PLAYER_MOVE_POINTS; // Reset player move points
}

async function attack({ attacker, defender }) {
    gameState.isMoving = true;
    attacker.setState("attack"); // Set enemy animation state to attacking
    defender.setState("hit"); // Set player animation state to hit
    await delay(1000); // Delay for attack animation
    attacker.attack(defender);
    attacker.setState("idle"); // Set enemy animation state back to idle
    defender.setState("idle"); // Set player animation state back to idle
    if (defender.health <= 0) {
        defender.setState("dead"); // Set player animation state to dead
        await delay(2000); // Delay for death animation
        // Game over logic here
        defender.reset();
    }
    gameState.isMoving = false;
}

async function endPlayerTurn() {
    // Add player's turn to history
    gameState.turnHistory.push({
        character: "player",
        action: "end_turn",
        position: { x: Math.floor(player.x / BASE_TILE_SIZE), y: Math.floor(player.y / BASE_TILE_SIZE) },
        timestamp: Date.now(),
    });

    gameState.currentTurn = "enemies";
    await delay(500); // Add a small delay before enemy turn
    processEnemyTurn();
}

function isWalkable(x, y) {
    // Check map collisions first
    if (isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE)) {
        return false;
    }

    // Check if any enemy occupies this tile
    return !isEnemyTile(x, y);
}

function isAttackWalkable(x, y) {
    return !isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE);
}

function isEnemyTile(x, y) {
    return enemies.some((enemy) => enemy.isActive && Math.floor(enemy.x / BASE_TILE_SIZE) === x && Math.floor(enemy.y / BASE_TILE_SIZE) === y);
}

function isPlayerTile(x, y) {
    return Math.floor(player.x / BASE_TILE_SIZE) === x && Math.floor(player.y / BASE_TILE_SIZE) === y;
}

async function loadImage(imageSrc) {
    // Load UI assets
    const image = new Image();
    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageSrc;
    });
    return image;
}

async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDoorTile(x, y) {
    if (!objectsLayer || !objectsLayer.objects) return false;

    const tileX = Math.floor(x / BASE_TILE_SIZE);
    const tileY = Math.floor(y / BASE_TILE_SIZE);

    return objectsLayer.objects.some((door) => {
        const doorTileX = Math.floor(door.x / BASE_TILE_SIZE);
        const doorTileY = Math.floor(door.y / BASE_TILE_SIZE);

        return doorTileX === tileX && doorTileY === tileY && door.type === "door" && !door.properties.find((prop) => prop.name === "Closed")?.value;
    });
}

function getDoorTarget(x, y) {
    if (!objectsLayer || !objectsLayer.objects) return null;

    const tileX = Math.floor(x / BASE_TILE_SIZE);
    const tileY = Math.floor(y / BASE_TILE_SIZE);

    const door = objectsLayer.objects.find((door) => {
        const doorTileX = Math.floor(door.x / BASE_TILE_SIZE);
        const doorTileY = Math.floor(door.y / BASE_TILE_SIZE);

        return doorTileX === tileX && doorTileY === tileY && door.type === "door" && !door.properties.find((prop) => prop.name === "Closed")?.value;
    });

    return {
        targetMap: door?.properties.find((prop) => prop.name === "target-map")?.value || null,
        targetObject: door?.properties.find((prop) => prop.name === "target-object")?.value || null,
    };
}

async function changeMap(target) {
    pause = true;

    // Save the new map name
    saveManager.setCurrentMap(target);

    // Reset game state
    gameState = createGameState();

    // Load new map
    await loadMap(target.targetMap);

    initialize(target.targetObject);

    pause = false;
}

startGame();

// Initialize zoom prevention and start the game
initZoomPrevention();