// Get the canvas context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Zoom level (adjust this to change the game's zoom)
const ZOOM_LEVEL = 4;

// Make canvas fill the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
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
        
        // Initialize player position
        player.x = TILE_SIZE * 2;
        player.y = TILE_SIZE * 2;
        player.width = TILE_SIZE;
        player.height = TILE_SIZE;
        
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
const BASE_SPEED = 4;
const player = {
    x: 0,
    y: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    speed: BASE_SPEED,
    coins: 0,
    image: 'assets/player.png'
};

// Game objects (enemies)
const BASE_ENEMY_SPEED = 1; // Base enemy speed
const enemies = [
    { 
        x: TILE_SIZE * 10, 
        y: TILE_SIZE * 7, 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        speedX: BASE_ENEMY_SPEED, 
        speedY: 0,
        image: 'assets/orc.png'
    },
    { 
        x: TILE_SIZE * 15, 
        y: TILE_SIZE * 3, 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        speedX: 0, 
        speedY: BASE_ENEMY_SPEED,
        image: 'assets/orc.png'
    }
];

// Game state
const gameState = {
    cameraX: 0,
    cameraY: 0,
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        s: false,
        a: false,
        d: false
    }
};

// Keyboard event listeners
window.addEventListener('keydown', (e) => {
    if (gameState.keys.hasOwnProperty(e.key.toLowerCase())) {
        gameState.keys[e.key.toLowerCase()] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (gameState.keys.hasOwnProperty(e.key.toLowerCase())) {
        gameState.keys[e.key.toLowerCase()] = false;
    }
});

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

    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;
    
    ctx.save();
    
    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // Center the viewport and apply zoom
    const offsetX = (viewportWidth - gameWidth * ZOOM_LEVEL) / 2;
    const offsetY = (viewportHeight - gameHeight * ZOOM_LEVEL) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    
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
                
                const xPos = x * BASE_TILE_SIZE - gameState.cameraX;
                const yPos = y * BASE_TILE_SIZE - gameState.cameraY;
                
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
    
    ctx.restore();
}

// Draw function
function draw() {
    // Clear the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMapLayers();
    
    // Draw entities (player and enemies)
    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;
    const offsetX = (viewportWidth - gameWidth * ZOOM_LEVEL) / 2;
    const offsetY = (viewportHeight - gameHeight * ZOOM_LEVEL) / 2;
    
    ctx.save();
    
    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    ctx.translate(offsetX, offsetY);
    ctx.scale(ZOOM_LEVEL, ZOOM_LEVEL);
    
    // Draw player
    if (entityImages.player && entityImages.player.complete) {
        ctx.drawImage(
            entityImages.player,
            player.x - gameState.cameraX,
            player.y - gameState.cameraY,
            BASE_TILE_SIZE,
            BASE_TILE_SIZE
        );
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        if (entityImages.enemy && entityImages.enemy.complete) {
            ctx.drawImage(
                entityImages.enemy,
                enemy.x - gameState.cameraX,
                enemy.y - gameState.cameraY,
                BASE_TILE_SIZE,
                BASE_TILE_SIZE
            );
        }
    });
    
    ctx.restore();
    
    // Draw UI (in screen space, no zoom)
    drawUI();
}

// Draw UI
function drawUI() {
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Coins: ${player.coins}`, 20, 30);
}

// Update game logic
function update(deltaTime) {
    // Player movement
    let dx = 0;
    let dy = 0;
    
    // Calculate movement direction
    if (gameState.keys.ArrowRight || gameState.keys.d) dx += 1;
    if (gameState.keys.ArrowLeft || gameState.keys.a) dx -= 1;
    if (gameState.keys.ArrowDown || gameState.keys.s) dy += 1;
    if (gameState.keys.ArrowUp || gameState.keys.w) dy -= 1;

    // Normalize diagonal movement and apply speed
    if (dx !== 0 || dy !== 0) {  // Changed condition to handle all movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = dx / length;
            dy = dy / length;
        }
        // Apply speed after normalization
        dx *= player.speed;
        dy *= player.speed;
    }

    // Apply movement and round to prevent sub-pixel positions
    let newX = Math.round((player.x + dx) * 100) / 100;
    let newY = Math.round((player.y + dy) * 100) / 100;

    // Handle horizontal and vertical movement separately for wall sliding
    let canMoveX = !isTileCollidable(newX, player.y) &&
        !isTileCollidable(newX + BASE_TILE_SIZE - 1, player.y) &&
        !isTileCollidable(newX, player.y + BASE_TILE_SIZE - 1) &&
        !isTileCollidable(newX + BASE_TILE_SIZE - 1, player.y + BASE_TILE_SIZE - 1);

    let canMoveY = !isTileCollidable(player.x, newY) &&
        !isTileCollidable(player.x + BASE_TILE_SIZE - 1, newY) &&
        !isTileCollidable(player.x, newY + BASE_TILE_SIZE - 1) &&
        !isTileCollidable(player.x + BASE_TILE_SIZE - 1, newY + BASE_TILE_SIZE - 1);

    // First try the full movement
    if (canMoveX) {
        player.x = newX;
    } else if (dx !== 0) {
        // If we can't move to the new position, find the closest safe position
        if (dx > 0) { // Moving right
            // Align to the left edge of the blocking tile
            player.x = Math.floor((newX + BASE_TILE_SIZE) / BASE_TILE_SIZE) * BASE_TILE_SIZE - BASE_TILE_SIZE;
        } else { // Moving left
            // Align to the right edge of the current tile
            player.x = Math.floor(player.x / BASE_TILE_SIZE) * BASE_TILE_SIZE;
        }
    }

    if (canMoveY) {
        player.y = newY;
    } else if (dy !== 0) {
        // If we can't move to the new position, find the closest safe position
        if (dy > 0) { // Moving down
            // Align to the top edge of the blocking tile
            player.y = Math.floor((newY + BASE_TILE_SIZE) / BASE_TILE_SIZE) * BASE_TILE_SIZE - BASE_TILE_SIZE;
        } else { // Moving up
            // Align to the bottom edge of the current tile
            player.y = Math.floor(player.y / BASE_TILE_SIZE) * BASE_TILE_SIZE;
        }
    }

    // Check for coin collection
    checkCoinCollection(player.x + player.width/2, player.y + player.height/2);

    // Update enemies with the same collision logic
    enemies.forEach(enemy => {
        let newX = Math.round((enemy.x + enemy.speedX) * 100) / 100;
        let newY = Math.round((enemy.y + enemy.speedY) * 100) / 100;

        // Check horizontal movement
        if (!isTileCollidable(newX, enemy.y) &&
            !isTileCollidable(newX + BASE_TILE_SIZE - 1, enemy.y) &&
            !isTileCollidable(newX, enemy.y + BASE_TILE_SIZE - 1) &&
            !isTileCollidable(newX + BASE_TILE_SIZE - 1, enemy.y + BASE_TILE_SIZE - 1) &&
            !isTileCollidable(newX, enemy.y + BASE_TILE_SIZE / 2) &&
            !isTileCollidable(newX + BASE_TILE_SIZE - 1, enemy.y + BASE_TILE_SIZE / 2)) {
            enemy.x = newX;
        } else {
            enemy.speedX *= -1;
            // Align to tile grid
            enemy.x = Math.round(enemy.x / BASE_TILE_SIZE) * BASE_TILE_SIZE;
        }

        // Check vertical movement
        if (!isTileCollidable(enemy.x, newY) &&
            !isTileCollidable(enemy.x + BASE_TILE_SIZE - 1, newY) &&
            !isTileCollidable(enemy.x, newY + BASE_TILE_SIZE - 1) &&
            !isTileCollidable(enemy.x + BASE_TILE_SIZE - 1, newY + BASE_TILE_SIZE - 1) &&
            !isTileCollidable(enemy.x + BASE_TILE_SIZE / 2, newY) &&
            !isTileCollidable(enemy.x + BASE_TILE_SIZE / 2, newY + BASE_TILE_SIZE - 1)) {
            enemy.y = newY;
        } else {
            enemy.speedY *= -1;
            // Align to tile grid
            enemy.y = Math.round(enemy.y / BASE_TILE_SIZE) * BASE_TILE_SIZE;
        }

        // Check collision with player
        if (checkCollision(player, enemy)) {
            // Reset player position
            player.x = BASE_TILE_SIZE * 2;
            player.y = BASE_TILE_SIZE * 2;
            player.coins = 0;
        }
    });

    // Update camera to follow player
    const viewportWidth = canvas.width / ZOOM_LEVEL;
    const viewportHeight = canvas.height / ZOOM_LEVEL;
    
    gameState.cameraX = player.x - viewportWidth / 2 + player.width / 2;
    gameState.cameraY = player.y - viewportHeight / 2 + player.height / 2;

    // Camera bounds
    gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameWidth - viewportWidth));
    gameState.cameraY = Math.max(0, Math.min(gameState.cameraY, gameHeight - viewportHeight));
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