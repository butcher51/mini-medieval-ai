import { findPath, isPathInRange } from './astar.js';

// Get the canvas context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Zoom level (adjust this to change the game's zoom)
const ZOOM_LEVEL = 4;

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
window.addEventListener('resize', resizeCanvas);

// Map configuration
const BASE_TILE_SIZE = 8; // Tiled uses 8x8 tiles
const TILE_SIZE = BASE_TILE_SIZE; // Keep everything in base coordinates

// Map dimensions (will be set when map loads)
let MAP_WIDTH = 0;
let MAP_HEIGHT = 0;
let gameWidth = 0;
let gameHeight = 0;

// Game state
let gameMap = null;
let tilesetImage = null;
let tilesetData = null;
let collisionLayer = null;

// Load map data
async function loadMap() {
    try {
        const response = await fetch('assets/maps/test-map.json');
        gameMap = await response.json();
        
        // Set map dimensions
        MAP_WIDTH = gameMap.width;
        MAP_HEIGHT = gameMap.height;
        
        // Calculate the game area size
        gameWidth = MAP_WIDTH * TILE_SIZE;
        gameHeight = MAP_HEIGHT * TILE_SIZE;
        
        // Find collision layer
        collisionLayer = gameMap.layers.find(layer => layer.class === 'collision');
        
        // Load tileset
        const tilesetSource = gameMap.tilesets[0].source;
        const tilesetName = tilesetSource.split('/').pop().replace('.tsx', '');
        
        // Load tileset data
        const tilesetResponse = await fetch(`assets/${tilesetName}.json`);
        tilesetData = await tilesetResponse.json();
        
        // Load tileset image with promise
        tilesetImage = new Image();
        await new Promise((resolve, reject) => {
            tilesetImage.onload = resolve;
            tilesetImage.onerror = reject;
            tilesetImage.src = `assets/${tilesetName}.png`;
        });
        
        // Initialize player position and move points
        player.x = TILE_SIZE * 2;
        player.y = TILE_SIZE * 2;
        player.width = TILE_SIZE;
        player.height = TILE_SIZE;
        player.movePoints = 5;
        
    } catch (error) {
        console.error('Error loading map:', error);
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
        y: row * BASE_TILE_SIZE
    };
}

// Player object
const PLAYER_SPEED = 2;
const player = {
    x: 0,
    y: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    speed: PLAYER_SPEED,
    coins: 0,
    image: 'assets/player.png',
    health: 10,
    maxHealth: 10,
    damage: 3,
    movePoints: 5
};

// Game objects (enemies)
const enemies = [
    { 
        x: TILE_SIZE * 10, 
        y: TILE_SIZE * 7, 
        width: TILE_SIZE, 
        height: TILE_SIZE,
        movePoints: 1,
        health: 5,
        maxHealth: 5,
        damage: 2,
        image: 'assets/orc.png',
        isActive: true // Used to track if enemy is alive
    },
    { 
        x: TILE_SIZE * 15, 
        y: TILE_SIZE * 3, 
        width: TILE_SIZE, 
        height: TILE_SIZE,
        movePoints: 1,
        health: 5,
        maxHealth: 5,
        damage: 2,
        image: 'assets/orc.png',
        isActive: true
    }
];

// Game state
const gameState = {
    cameraX: 0,
    cameraY: 0,
    mouseX: 0,
    mouseY: 0,
    hoveredTile: { x: 0, y: 0 },
    currentPath: null,
    currentTurn: 'player' // 'player' or 'enemies'
};

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}
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

// Check for coin collection (coins are tiles with index 6 in the items layer)
function checkCoinCollection(playerX, playerY) {
    if (!gameMap) return;
    
    const itemsLayer = gameMap.layers.find(layer => layer.name === 'Items');
    if (!itemsLayer) return;
    
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);
    
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;
    
    const tileIndex = tileY * MAP_WIDTH + tileX;
    const tileId = itemsLayer.data[tileIndex];
    
    // Check if the tile is a coin (you'll need to determine the correct tile ID for coins in your tileset)
    if (tileId === 6) { // Update this ID based on your tileset
        itemsLayer.data[tileIndex] = 0; // Remove coin
        player.coins++;
    }
}

// Load entity images (player and enemies)
const entityImages = {};
async function loadEntityImages() {
    // Load player image
    if (player.image) {
        const playerImg = new Image();
        await new Promise((resolve, reject) => {
            playerImg.onload = resolve;
            playerImg.onerror = reject;
            playerImg.src = player.image;
        });
        entityImages.player = playerImg;
    }

    // Load enemy image
    if (enemies[0].image) {
        const enemyImg = new Image();
        await new Promise((resolve, reject) => {
            enemyImg.onload = resolve;
            enemyImg.onerror = reject;
            enemyImg.src = enemies[0].image;
        });
        entityImages.enemy = enemyImg;
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
    
    // Draw each visible layer
    gameMap.layers.forEach(layer => {
        if (layer.class === 'collision') return; // Skip collision layer
        if (!layer.visible) return;
        
        for (let y = 0; y < layer.height; y++) {
            for (let x = 0; x < layer.width; x++) {
                const tileIndex = layer.data[y * layer.width + x];
                if (tileIndex === 0) continue; // Skip empty tiles
                
                const pos = getTilePosition(tileIndex);
                if (!pos) continue;
                
                const xPos = x * BASE_TILE_SIZE;
                const yPos = y * BASE_TILE_SIZE;
                
                ctx.drawImage(
                    tilesetImage,
                    pos.x, pos.y,
                    BASE_TILE_SIZE, BASE_TILE_SIZE,
                    xPos, yPos,
                    BASE_TILE_SIZE, BASE_TILE_SIZE
                );
            }
        }
    });
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

    // Calculate the offset to center the game area
    const offsetX = (canvas.width - gameWidth * ZOOM_LEVEL) / 2;
    const offsetY = (canvas.height - gameHeight * ZOOM_LEVEL) / 2;
    
    // Apply transforms in correct order
    ctx.translate(offsetX, offsetY);
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    ctx.translate(-gameState.cameraX, -gameState.cameraY);
    
    // Draw map layers
    drawMapLayers();
    
    // Draw path if available
    if (gameState.currentPath && gameState.currentTurn === 'player') {
        ctx.strokeStyle = isPathInRange(gameState.currentPath, player.movePoints) ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        gameState.currentPath.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2, point.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2);
            } else {
                ctx.lineTo(point.x * BASE_TILE_SIZE + BASE_TILE_SIZE / 2, point.y * BASE_TILE_SIZE + BASE_TILE_SIZE / 2);
            }
        });
        ctx.stroke();
    }
    
    // Draw hovered tile
    const hoveredTileX = gameState.hoveredTile.x * BASE_TILE_SIZE;
    const hoveredTileY = gameState.hoveredTile.y * BASE_TILE_SIZE;
    if (gameState.hoveredTile.x >= 0 && gameState.hoveredTile.x < MAP_WIDTH &&
        gameState.hoveredTile.y >= 0 && gameState.hoveredTile.y < MAP_HEIGHT) {
        ctx.strokeStyle = gameState.currentPath && isPathInRange(gameState.currentPath, player.movePoints) ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
        ctx.strokeRect(hoveredTileX, hoveredTileY, BASE_TILE_SIZE, BASE_TILE_SIZE);
    }
    
    // Draw entities
    drawEntities();
    
    // Reset transform for UI
    ctx.restore();
    
    // Draw UI in screen space
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`Move Points: ${player.movePoints}`, 10, 30);
    ctx.fillText(`Turn: ${gameState.currentTurn}`, 10, 60);

    // Draw skip turn button
    if (gameState.currentTurn === 'player') {
        ctx.font = '24px Arial';
        const skipText = 'Skip Turn';
        const textMetrics = ctx.measureText(skipText);
        const buttonX = canvas.width / 2 - textMetrics.width / 2;
        const buttonY = canvas.height - 50;
        
        // Store button position and dimensions in gameState for click detection
        gameState.skipButton = {
            x: buttonX - 10,
            y: buttonY - 30,
            width: textMetrics.width + 20,
            height: 40
        };
        
        // Draw button background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(gameState.skipButton.x, gameState.skipButton.y, gameState.skipButton.width, gameState.skipButton.height);
        
        // Draw button text
        ctx.fillStyle = 'white';
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
    
    // Camera bounds
    gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameWidth - viewportWidth));
    gameState.cameraY = Math.max(0, Math.min(gameState.cameraY, gameHeight - viewportHeight));
    
    // Check for coin collection
    checkCoinCollection(player.x + player.width/2, player.y + player.height/2);
    
    // Check collision with enemies
    enemies.forEach(enemy => {
        if (checkCollision(player, enemy)) {
            // Reset player position
            player.x = BASE_TILE_SIZE * 2;
            player.y = BASE_TILE_SIZE * 2;
            player.coins = 0;
        }
    });
}

// Main game loop
let lastTime = 0;
function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game logic
    update(deltaTime);

    // Draw the game layers
    draw();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game
async function startGame() {
    try {
        await loadMap();
        await loadEntityImages();
        gameLoop();
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

// Initialize the game
startGame();

// Add event listeners for mouse
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const offsetX = (canvas.width - gameWidth * ZOOM_LEVEL) / 2;
    const offsetY = (canvas.height - gameHeight * ZOOM_LEVEL) / 2;
    
    // Adjust mouse coordinates to account for viewport centering and zoom
    gameState.mouseX = ((e.clientX - rect.left - offsetX) / ZOOM_LEVEL) + gameState.cameraX;
    gameState.mouseY = ((e.clientY - rect.top - offsetY) / ZOOM_LEVEL) + gameState.cameraY;
    
    // Calculate hovered tile
    const tileX = Math.floor(gameState.mouseX / BASE_TILE_SIZE);
    const tileY = Math.floor(gameState.mouseY / BASE_TILE_SIZE);
    
    if (tileX !== gameState.hoveredTile.x || tileY !== gameState.hoveredTile.y) {
        gameState.hoveredTile = { x: tileX, y: tileY };
        // Calculate path to hovered tile
        if (gameState.currentTurn === 'player') {
            const playerTileX = Math.floor(player.x / BASE_TILE_SIZE);
            const playerTileY = Math.floor(player.y / BASE_TILE_SIZE);
            gameState.currentPath = findPath(
                playerTileX, playerTileY,
                tileX, tileY,
                (x, y) => !isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE)
            );
        }
    }
});

// Add combat functions
function attack(attacker, defender) {
    defender.health = Math.max(0, defender.health - attacker.damage);
    if (defender.health <= 0 && defender !== player) {
        defender.isActive = false;
    }
}

function isAdjacent(entity1, entity2) {
    const tile1X = Math.floor(entity1.x / BASE_TILE_SIZE);
    const tile1Y = Math.floor(entity1.y / BASE_TILE_SIZE);
    const tile2X = Math.floor(entity2.x / BASE_TILE_SIZE);
    const tile2Y = Math.floor(entity2.y / BASE_TILE_SIZE);
    
    return Math.abs(tile1X - tile2X) + Math.abs(tile1Y - tile2Y) === 1;
}

// Modify the click handler to include combat
canvas.addEventListener('click', (e) => {
    if (gameState.currentTurn !== 'player' || !gameState.currentPath) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if skip button was clicked
    if (gameState.skipButton &&
        clickX >= gameState.skipButton.x &&
        clickX <= gameState.skipButton.x + gameState.skipButton.width &&
        clickY >= gameState.skipButton.y &&
        clickY <= gameState.skipButton.y + gameState.skipButton.height) {
        // Skip turn
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        endPlayerTurn();
        return;
    }
    
    // Check if we're trying to attack an enemy
    const clickedTileX = gameState.hoveredTile.x;
    const clickedTileY = gameState.hoveredTile.y;
    
    const targetEnemy = enemies.find(enemy => 
        enemy.isActive &&
        Math.floor(enemy.x / BASE_TILE_SIZE) === clickedTileX &&
        Math.floor(enemy.y / BASE_TILE_SIZE) === clickedTileY
    );
    
    if (targetEnemy && isAdjacent(player, targetEnemy)) {
        // Attack the enemy
        attack(player, targetEnemy);
        
        // Reset path and hover highlight after attack
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        
        // End turn immediately after attack
        endPlayerTurn();
        return;
    }
    
    // Otherwise, try to move
    if (isPathInRange(gameState.currentPath, player.movePoints)) {
        // Move player along path
        const finalPos = gameState.currentPath[gameState.currentPath.length - 1];
        player.x = finalPos.x * BASE_TILE_SIZE;
        player.y = finalPos.y * BASE_TILE_SIZE;
        
        // Reset path and hover highlight after movement
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        
        // End turn immediately after movement
        endPlayerTurn();
    }
});

function processEnemyTurn() {
    // Process each enemy's turn
    enemies.forEach(enemy => {
        if (!enemy.isActive) return; // Skip dead enemies
        
        // Calculate path to player
        const enemyTileX = Math.floor(enemy.x / BASE_TILE_SIZE);
        const enemyTileY = Math.floor(enemy.y / BASE_TILE_SIZE);
        const playerTileX = Math.floor(player.x / BASE_TILE_SIZE);
        const playerTileY = Math.floor(player.y / BASE_TILE_SIZE);
        
        const pathToPlayer = findPath(
            enemyTileX, enemyTileY,
            playerTileX, playerTileY,
            (x, y) => !isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE)
        );
        
        if (!pathToPlayer) return; // No path to player
        
        // If adjacent to player, attack
        if (isAdjacent(enemy, player)) {
            attack(enemy, player);
            if (player.health <= 0) {
                // Game over logic here
                player.x = BASE_TILE_SIZE * 2;
                player.y = BASE_TILE_SIZE * 2;
                player.health = player.maxHealth;
                player.coins = 0;
            }
            return;
        }
        
        // Otherwise, move towards player
        if (pathToPlayer.length > 1) { // First point is current position
            const moveDistance = Math.min(enemy.movePoints, pathToPlayer.length - 1);
            const newPos = pathToPlayer[moveDistance];
            enemy.x = newPos.x * BASE_TILE_SIZE;
            enemy.y = newPos.y * BASE_TILE_SIZE;
        }
    });
    
    // End enemy turn
    gameState.currentTurn = 'player';
    player.movePoints = 5; // Reset player move points
}

function endPlayerTurn() {
    gameState.currentTurn = 'enemies';
    setTimeout(() => {
        processEnemyTurn();
    }, 500); // Add a small delay before enemy turn
}

// Draw entities
function drawEntities() {
    // Draw player
    if (entityImages.player && entityImages.player.complete) {
        ctx.drawImage(
            entityImages.player,
            player.x,
            player.y,
            player.width,
            player.height
        );
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        if (!enemy.isActive) return; // Don't draw dead enemies
        if (entityImages.enemy && entityImages.enemy.complete) {
            ctx.drawImage(
                entityImages.enemy,
                enemy.x,
                enemy.y,
                enemy.width,
                enemy.height
            );
        }
    });
}

// Add click handler for skip button
canvas.addEventListener('click', (e) => {
    if (gameState.currentTurn !== 'player') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if skip button was clicked
    if (gameState.skipButton &&
        clickX >= gameState.skipButton.x &&
        clickX <= gameState.skipButton.x + gameState.skipButton.width &&
        clickY >= gameState.skipButton.y &&
        clickY <= gameState.skipButton.y + gameState.skipButton.height) {
        // Skip turn
        gameState.currentPath = null;
        gameState.hoveredTile = { x: -1, y: -1 };
        endPlayerTurn();
        return;
    }

    // Rest of the click handler for movement and combat
    const clickedTileX = gameState.hoveredTile.x;
    const clickedTileY = gameState.hoveredTile.y;
    // ... existing code ...
}); 