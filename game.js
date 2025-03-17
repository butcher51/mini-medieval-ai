import { findPath, isPathInRange } from "./astar.js";
import { Player } from "./Player.js";
import { Enemy } from "./Enemy.js";
import { AnimationController } from "./AnimationController.js";
import { ZOOM_LEVEL, BASE_TILE_SIZE, TILE_SIZE, PLAYER_MOVE_POINTS, ENEMY_POSITIONS, MOVEMENT_STEP_DELAY } from "./constants.js";

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = Math.floor(window.innerWidth / 2) * 2;
    canvas.height = Math.floor(window.innerHeight / 2) * 2;
    ctx.imageSmoothingEnabled = false;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Game dimensions and state
let MAP_WIDTH = 0, MAP_HEIGHT = 0, gameWidth = 0, gameHeight = 0;
let gameMap = null, gameMapAnimations = null, gameMapAnimationIndexes = null;
let tilesetImage = null, uiImage = null, tilesetData = null, collisionLayer = null;
let tileTypes = {}; // Map of tile IDs to types (e.g., "coin")

const player = new Player("It's me", TILE_SIZE * 2, TILE_SIZE * 2, TILE_SIZE, TILE_SIZE);
const enemies = ENEMY_POSITIONS.map(pos => new Enemy(pos.id, pos.x, pos.y, TILE_SIZE, TILE_SIZE, pos.patrolPoints));
const gameState = {
    cameraX: 0, cameraY: 0, mouseX: 0, mouseY: 0,
    hoveredTile: { x: 0, y: 0, attack: false },
    currentPath: null, currentTurn: "player",
    isMoving: false, activeMovementPath: null,
    skipButton: null
};

// Load assets
async function loadUI() {
    uiImage = new Image();
    await new Promise((resolve, reject) => {
        uiImage.onload = resolve;
        uiImage.onerror = reject;
        uiImage.src = "assets/interface.png";
    });
}

async function loadMap() {
    try {
        gameMap = await (await fetch("assets/maps/test-map.json")).json();
        gameMapAnimations = await (await fetch("assets/maps/test-map-animations.json")).json();
        MAP_WIDTH = gameMap.width;
        MAP_HEIGHT = gameMap.height;
        gameWidth = MAP_WIDTH * TILE_SIZE;
        gameHeight = MAP_HEIGHT * TILE_SIZE;
        collisionLayer = gameMap.layers.find(layer => layer.class === "collision");

        const tilesetName = gameMap.tilesets[0].source.split("/").pop().replace(".tsx", "").toLowerCase();
        tilesetData = await (await fetch(`assets/${tilesetName}.json`)).json();
        if (tilesetData.tiles) {
            tilesetData.tiles.forEach(tile => {
                const typeProp = tile.properties?.find(prop => prop.name === "type");
                if (typeProp) tileTypes[tile.id + 1] = typeProp.value; // 1-based IDs
            });
        }

        tilesetImage = new Image();
        await new Promise((resolve, reject) => {
            tilesetImage.onload = resolve;
            tilesetImage.onerror = reject;
            tilesetImage.src = `assets/${tilesetName}.png`;
        });

        player.initialize(TILE_SIZE);
    } catch (error) {
        console.error("Error loading map:", error);
    }
}

// Helper functions
function getTilePosition(tileIndex) {
    if (tileIndex === 0) return null;
    tileIndex--;
    const tilesPerRow = Math.floor(tilesetData.imagewidth / BASE_TILE_SIZE);
    return { x: (tileIndex % tilesPerRow) * BASE_TILE_SIZE, y: Math.floor(tileIndex / tilesPerRow) * BASE_TILE_SIZE };
}

function isTileCollidable(x, y) {
    if (!collisionLayer) return false;
    const tileX = Math.floor(x / BASE_TILE_SIZE), tileY = Math.floor(y / BASE_TILE_SIZE);
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return true;
    return collisionLayer.data[tileY * MAP_WIDTH + tileX] !== 0;
}

function getTileDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Game logic
function checkCoinCollection(playerX, playerY) {
    const itemsLayer = gameMap?.layers.find(layer => layer.name === "Items");
    if (!itemsLayer) return;
    const tileX = Math.floor(playerX / TILE_SIZE), tileY = Math.floor(playerY / TILE_SIZE);
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;
    const tileIndex = tileY * MAP_WIDTH + tileX, tileId = itemsLayer.data[tileIndex];
    if (tileTypes[tileId] === "coin") {
        itemsLayer.data[tileIndex] = 0;
        player.coins++;
    }
}

async function moveCharacterAlongPath(character, path, baseTileSize) {
    gameState.isMoving = true;
    gameState.activeMovementPath = path;
    for (let i = 1; i < path.length; i++) {
        character.x = path[i].x * baseTileSize;
        character.y = path[i].y * baseTileSize;
        await new Promise(resolve => setTimeout(resolve, MOVEMENT_STEP_DELAY));
    }
    gameState.isMoving = false;
    gameState.activeMovementPath = null;
    gameState.currentPath = null;
    gameState.hoveredTile = { x: -1, y: -1 };
}

async function attack({ attacker, defender }) {
    attacker.setState("attack");
    defender.setState("hit");
    await new Promise(resolve => setTimeout(resolve, 1000));
    attacker.attack(defender);
    attacker.setState("idle");
    defender.setState("idle");
    if (defender.health <= 0) {
        defender.setState("dead");
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (defender === player) {
            alert("Game Over");
            // Future: Add game reset logic
        } else {
            defender.isActive = false;
        }
    }
}

async function processEnemyTurn() {
    for (const enemy of enemies) {
        if (!enemy.isActive) continue;
        const enemyTileX = Math.floor(enemy.x / BASE_TILE_SIZE), enemyTileY = Math.floor(enemy.y / BASE_TILE_SIZE);
        const playerTileX = Math.floor(player.x / BASE_TILE_SIZE), playerTileY = Math.floor(player.y / BASE_TILE_SIZE);
        const distance = getTileDistance(enemyTileX, enemyTileY, playerTileX, playerTileY);

        if (distance <= enemy.stats.visionRange) {
            if (enemy.isAdjacent(player, BASE_TILE_SIZE)) {
                await attack({ attacker: enemy, defender: player });
                continue;
            }
            const pathToPlayer = findPath(enemyTileX, enemyTileY, playerTileX, playerTileY, isWalkable);
            if (pathToPlayer && pathToPlayer.length > 1) {
                const moveDistance = Math.min(enemy.movePoints, pathToPlayer.length - 1);
                const path = pathToPlayer.slice(0, moveDistance + 1);
                if (isPlayerTile(path[path.length - 1].x, path[path.length - 1].y)) path.pop();
                enemy.setState("run");
                await moveCharacterAlongPath(enemy, path, BASE_TILE_SIZE);
                enemy.setState("idle");
                await new Promise(resolve => setTimeout(resolve, 500));
                if (enemy.isAdjacent(player, BASE_TILE_SIZE)) await attack({ attacker: enemy, defender: player });
            }
        } else if (enemy.patrolPoints?.length > 0) {
            const nextPatrolPoint = enemy.patrolPoints[enemy.currentPatrolIndex];
            const pathToPatrol = findPath(enemyTileX, enemyTileY, nextPatrolPoint.x, nextPatrolPoint.y, isWalkable);
            if (pathToPatrol && pathToPatrol.length > 1) {
                const moveDistance = Math.min(enemy.movePoints, pathToPatrol.length - 1);
                const path = pathToPatrol.slice(0, moveDistance + 1);
                enemy.setState("run");
                await moveCharacterAlongPath(enemy, path, BASE_TILE_SIZE);
                enemy.setState("idle");
                const newX = Math.floor(enemy.x / BASE_TILE_SIZE), newY = Math.floor(enemy.y / BASE_TILE_SIZE);
                if (newX === nextPatrolPoint.x && newY === nextPatrolPoint.y) {
                    enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    gameState.currentTurn = "player";
    player.movePoints = PLAYER_MOVE_POINTS;
}

function endPlayerTurn() {
    gameState.currentTurn = "enemies";
    setTimeout(processEnemyTurn, 500);
}

// Rendering
function drawMapLayers() {
    if (!gameMap || !tilesetImage || !tilesetData || !tilesetImage.complete) return;
    ctx.imageSmoothingEnabled = false;
    if (gameMap.backgroundcolor) ctx.fillRect(0, 0, gameWidth, gameHeight, gameMap.backgroundcolor);
    if (!gameMapAnimationIndexes) gameMapAnimationIndexes = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(null));
    const now = Math.floor(Date.now() / 600);

    gameMap.layers.forEach(layer => {
        if (layer.class === "collision" || !layer.visible) return;
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                let tileIndex = layer.data[y * layer.width + x];
                if (tileIndex === 0) continue;
                const animation = gameMapAnimations["" + tileIndex];
                if (animation) {
                    let animIdx = gameMapAnimationIndexes[y][x];
                    if (!animIdx) {
                        animIdx = gameMapAnimationIndexes[y][x] = { length: animation.length, frames: animation, currentFrame: 0 };
                    }
                    tileIndex = animIdx.frames[animIdx.currentFrame + (now % animIdx.length)];
                }
                const pos = getTilePosition(tileIndex);
                if (pos) ctx.drawImage(tilesetImage, pos.x, pos.y, BASE_TILE_SIZE, BASE_TILE_SIZE, x * BASE_TILE_SIZE, y * BASE_TILE_SIZE, BASE_TILE_SIZE, BASE_TILE_SIZE);
            }
        }
    });
}

function drawPath(path, baseTileSize) {
    if (!path || path.length < 2) return;
    ctx.save();
    if (!gameState.isMoving) {
        ctx.strokeStyle = isPathInRange(path, player.movePoints) ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        path.forEach((point, i) => (i === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, point.x * baseTileSize + baseTileSize / 2, point.y * baseTileSize + baseTileSize / 2));
        ctx.stroke();
    } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        const currentTileX = Math.floor(player.x / baseTileSize), currentTileY = Math.floor(player.y / baseTileSize);
        const currentIdx = path.findIndex(p => p.x === currentTileX && p.y === currentTileY);
        if (currentIdx !== -1) {
            for (let i = currentIdx + 1; i < path.length; i++) {
                const { x, y } = path[i];
                ctx.fillRect(x * baseTileSize + baseTileSize / 4, y * baseTileSize + baseTileSize / 2, baseTileSize / 4, baseTileSize / 4);
            }
        }
    }
    ctx.restore();
}

function drawHealthBar(entity) {
    const barWidth = entity.width, barHeight = 5, barX = entity.x, barY = entity.y - 10;
    const healthRatio = entity.health / entity.maxHealth;
    ctx.fillStyle = "red";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = "green";
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
}

function drawEntities() {
    player.draw(ctx);
    drawHealthBar(player);
    enemies.forEach(enemy => {
        if (enemy.isActive) {
            enemy.draw(ctx);
            drawHealthBar(enemy);
        }
    });
}

function draw() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const offsetX = (canvas.width - gameWidth * ZOOM_LEVEL) / 2, offsetY = (canvas.height - gameHeight * ZOOM_LEVEL) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-gameState.cameraX, -gameState.cameraY);

    drawMapLayers();
    if (gameState.currentTurn === "player") {
        if (gameState.isMoving && gameState.activeMovementPath) drawPath(gameState.activeMovementPath, BASE_TILE_SIZE);
        else if (!gameState.isMoving && gameState.currentPath) {
            drawPath(gameState.currentPath, BASE_TILE_SIZE);
            const { x, y, attack } = gameState.hoveredTile;
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                ctx.strokeStyle = isPathInRange(gameState.currentPath, player.movePoints) ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
                ctx.strokeRect(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE, BASE_TILE_SIZE, BASE_TILE_SIZE);
                if (attack) {
                    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
                    ctx.fillRect(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE, BASE_TILE_SIZE, BASE_TILE_SIZE);
                }
            }
        }
    }
    drawEntities();
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Move Points: ${player.movePoints}`, 10, 30);
    ctx.fillText(`Turn: ${gameState.currentTurn}`, 10, 60);
    ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, 10, 90);
    ctx.fillText(`Coins: ${player.coins}`, 10, 120);

    if (gameState.currentTurn === "player" && !gameState.isMoving) {
        ctx.font = "24px Arial";
        const skipText = "Skip Turn", textMetrics = ctx.measureText(skipText);
        const buttonX = canvas.width / 2 - textMetrics.width / 2, buttonY = canvas.height - 50;
        gameState.skipButton = { x: buttonX - 10, y: buttonY - 30, width: textMetrics.width + 20, height: 40 };
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(gameState.skipButton.x, gameState.skipButton.y, gameState.skipButton.width, gameState.skipButton.height);
        ctx.fillStyle = "white";
        ctx.fillText(skipText, buttonX, buttonY);
    }
}

function update(deltaTime) {
    const viewportWidth = canvas.width / ZOOM_LEVEL, viewportHeight = canvas.height / ZOOM_LEVEL;
    gameState.cameraX = Math.max(0, Math.min(player.x - viewportWidth / 2 + BASE_TILE_SIZE / 2, gameWidth - viewportWidth));
    gameState.cameraY = Math.max(0, Math.min(player.y - viewportHeight / 2 + BASE_TILE_SIZE / 2, gameHeight - viewportHeight));
    checkCoinCollection(player.x + player.width / 2, player.y + player.height / 2);
}

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// Event handlers
canvas.addEventListener("mousemove", e => {
    if (gameState.currentTurn !== "player" || !player.isActive) return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = (canvas.width - gameWidth * ZOOM_LEVEL) / 2, offsetY = (canvas.height - gameHeight * ZOOM_LEVEL) / 2;
    gameState.mouseX = (e.clientX - rect.left - offsetX) / ZOOM_LEVEL + gameState.cameraX;
    gameState.mouseY = (e.clientY - rect.top - offsetY) / ZOOM_LEVEL + gameState.cameraY;
    const tileX = Math.floor(gameState.mouseX / BASE_TILE_SIZE), tileY = Math.floor(gameState.mouseY / BASE_TILE_SIZE);
    if (tileX !== gameState.hoveredTile.x || tileY !== gameState.hoveredTile.y) {
        const attack = isEnemyTile(tileX, tileY);
        gameState.hoveredTile = { x: tileX, y: tileY, attack };
        const playerTileX = Math.floor(player.x / BASE_TILE_SIZE), playerTileY = Math.floor(player.y / BASE_TILE_SIZE);
        gameState.currentPath = findPath(playerTileX, playerTileY, tileX, tileY, attack ? isAttackWalkable : isWalkable);
    }
});

canvas.addEventListener("click", async e => {
    if (gameState.currentTurn !== "player" || gameState.isMoving) return;
    const rect = canvas.getBoundingClientRect(), clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
    if (gameState.skipButton && clickX >= gameState.skipButton.x && clickX <= gameState.skipButton.x + gameState.skipButton.width &&
        clickY >= gameState.skipButton.y && clickY <= gameState.skipButton.y + gameState.skipButton.height) {
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        endPlayerTurn();
        return;
    }
    if (!gameState.currentPath) return;
    const { x: clickedTileX, y: clickedTileY } = gameState.hoveredTile;
    const targetEnemy = enemies.find(enemy => enemy.isActive && Math.floor(enemy.x / BASE_TILE_SIZE) === clickedTileX && Math.floor(enemy.y / BASE_TILE_SIZE) === clickedTileY);
    if (targetEnemy && player.isAdjacent(targetEnemy, BASE_TILE_SIZE)) {
        await attack({ attacker: player, defender: targetEnemy });
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        endPlayerTurn();
        return;
    }
    if (targetEnemy) gameState.currentPath.pop();
    if (isPathInRange(gameState.currentPath, player.movePoints)) {
        player.setState("run");
        const movementPath = [...gameState.currentPath];
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        await moveCharacterAlongPath(player, movementPath, BASE_TILE_SIZE);
        if (targetEnemy) await attack({ attacker: player, defender: targetEnemy });
        player.setState("idle");
        endPlayerTurn();
    }
});

// Utility functions
function isWalkable(x, y) {
    return !isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE) && !isEnemyTile(x, y);
}

function isAttackWalkable(x, y) {
    return !isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE);
}

function isEnemyTile(x, y) {
    return enemies.some(enemy => enemy.isActive && Math.floor(enemy.x / BASE_TILE_SIZE) === x && Math.floor(enemy.y / BASE_TILE_SIZE) === y);
}

function isPlayerTile(x, y) {
    return Math.floor(player.x / BASE_TILE_SIZE) === x && Math.floor(player.y / BASE_TILE_SIZE) === y;
}

// Start game
async function startGame() {
    try {
        await AnimationController.loadAnimations();
        await loadUI();
        await loadMap();
        gameLoop();
    } catch (error) {
        console.error("Error starting game:", error);
    }
}
startGame();
