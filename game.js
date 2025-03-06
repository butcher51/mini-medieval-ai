// Get the canvas context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Zoom level (adjust this to change the game's zoom)
const ZOOM_LEVEL = 1; // Change this to adjust the game's zoom (1.0 is normal size, 2.0 is double size, 0.5 is half size)

// Make canvas fill the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initial resize
resizeCanvas();

// Handle window resizing
window.addEventListener('resize', resizeCanvas);

// Tile map configuration
const BASE_TILE_SIZE = 40; // Base tile size
const TILE_SIZE = BASE_TILE_SIZE * ZOOM_LEVEL;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

// Calculate the game area size
const gameWidth = MAP_WIDTH * TILE_SIZE;
const gameHeight = MAP_HEIGHT * TILE_SIZE;

// Define different tile types
const TILE_TYPES = {
    0: { color: '#7ec850', name: 'Grass', image: 'assets/grass.png', layer: 'base' }, // Grass
    1: { color: '#8b4513', name: 'Wall', image: 'assets/wall.png', layer: 'base' }, // Wall (Collidable)
    2: { color: '#4169e1', name: 'Water', image: 'assets/water.png', layer: 'base' }, // Water (Collidable)
    3: { color: '#c2b280', name: 'Sand', image: 'assets/sand.png', layer: 'base' }, // Sand
    4: { color: '#808080', name: 'Stone', image: 'assets/stone.png', layer: 'base' }, // Stone (Collidable)
    5: { color: '#228b22', name: 'Forest', image: 'assets/forest.png', layer: 'top' }, // Forest
    6: { color: '#ffd700', name: 'Coin', image: 'assets/coin.png', layer: 'top' }, // Coin (Collectible)
};

// Define whether tiles are collidable
const COLLIDABLE_TILES = [1, 2, 4];

// Create a designed level instead of random
const baseLayer = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,2,2,2,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,1],
    [1,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,4,4,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,4,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,4,4,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const topLayer = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,6,0,0,0,0],
    [0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,6,0,0],
    [0,0,0,0,0,0,0,0,5,5,5,0,0,0,0,0,0,0,0,0],
    [0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Player object
const BASE_SPEED = 5; // Base speed
const player = {
    x: TILE_SIZE * 2,
    y: TILE_SIZE * 2,
    width: TILE_SIZE,
    height: TILE_SIZE,
    speed: BASE_SPEED * ZOOM_LEVEL,
    coins: 0,
    image: 'assets/player.png'
};

// Game objects (enemies)
const BASE_ENEMY_SPEED = 2; // Base enemy speed
const enemies = [
    { 
        x: TILE_SIZE * 10, 
        y: TILE_SIZE * 7, 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        speedX: BASE_ENEMY_SPEED * ZOOM_LEVEL, 
        speedY: 0,
        image: 'assets/orc.png'
    },
    { 
        x: TILE_SIZE * 15, 
        y: TILE_SIZE * 3, 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        speedX: 0, 
        speedY: BASE_ENEMY_SPEED * ZOOM_LEVEL,
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
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
        return true;
    }
    
    return COLLIDABLE_TILES.includes(baseLayer[tileY][tileX]);
}

function checkCoinCollection(playerX, playerY) {
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);
    
    if (topLayer[tileY][tileX] === 6) { // Coin
        topLayer[tileY][tileX] = 0; // Remove coin
        player.coins++;
    }
}

// Load tile images
const tileImages = {};
function loadTileImages() {
    Object.entries(TILE_TYPES).forEach(([tileId, tileData]) => {
        if (tileData.image) {
            const img = new Image();
            img.src = tileData.image;
            tileImages[tileId] = img;
        }
    });
}

// Load entity images (player and enemies)
const entityImages = {};
function loadEntityImages() {
    // Load player image
    if (player.image) {
        const playerImg = new Image();
        playerImg.src = player.image;
        entityImages.player = playerImg;
    }

    // Load enemy image
    if (enemies[0].image) {
        const enemyImg = new Image();
        enemyImg.src = enemies[0].image;
        entityImages.enemy = enemyImg;
    }
}

// Call both image loading functions when the game starts
loadTileImages();
loadEntityImages();

// Draw the base layer (terrain)
function drawBaseLayer() {
    const offsetX = (canvas.width - gameWidth) / 2;
    const offsetY = (canvas.height - gameHeight) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    
    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = baseLayer[y][x];
            const tileData = TILE_TYPES[tileType];
            const xPos = x * TILE_SIZE - gameState.cameraX;
            const yPos = y * TILE_SIZE - gameState.cameraY;
            
            if (tileImages[tileType] && tileImages[tileType].complete) {
                ctx.drawImage(tileImages[tileType], xPos, yPos, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.fillStyle = tileData.color;
                ctx.fillRect(xPos, yPos, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    ctx.restore();
}

// Draw the top layer (entities and decorations)
function drawTopLayer() {
    const offsetX = (canvas.width - gameWidth) / 2;
    const offsetY = (canvas.height - gameHeight) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    
    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Draw top layer tiles (decorations)
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = topLayer[y][x];
            if (tileType !== 0) { // Skip empty tiles
                const tileData = TILE_TYPES[tileType];
                const xPos = x * TILE_SIZE - gameState.cameraX;
                const yPos = y * TILE_SIZE - gameState.cameraY;
                
                if (tileImages[tileType] && tileImages[tileType].complete) {
                    ctx.drawImage(tileImages[tileType], xPos, yPos, TILE_SIZE, TILE_SIZE);
                } else {
                    ctx.fillStyle = tileData.color;
                    ctx.fillRect(xPos, yPos, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    // Draw player
    if (entityImages.player && entityImages.player.complete) {
        ctx.drawImage(
            entityImages.player,
            player.x - gameState.cameraX,
            player.y - gameState.cameraY,
            player.width,
            player.height
        );
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            player.x - gameState.cameraX,
            player.y - gameState.cameraY,
            player.width,
            player.height
        );
    }

    // Draw enemies
    enemies.forEach(enemy => {
        if (entityImages.enemy && entityImages.enemy.complete) {
            ctx.drawImage(
                entityImages.enemy,
                enemy.x - gameState.cameraX,
                enemy.y - gameState.cameraY,
                enemy.width,
                enemy.height
            );
        } else {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(
                enemy.x - gameState.cameraX,
                enemy.y - gameState.cameraY,
                enemy.width,
                enemy.height
            );
        }
    });

    ctx.restore();
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

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        // Calculate the normalized vector
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = dx / length;
        dy = dy / length;
    }

    // Apply speed to movement
    let newX = player.x + dx * player.speed;
    let newY = player.y + dy * player.speed;

    // Handle horizontal and vertical movement separately for wall sliding
    const collisionOffset = 2 * ZOOM_LEVEL;
    
    // Check horizontal movement
    if (!isTileCollidable(newX + collisionOffset, player.y + collisionOffset) &&
        !isTileCollidable(newX + player.width - collisionOffset, player.y + collisionOffset) &&
        !isTileCollidable(newX + collisionOffset, player.y + player.height - collisionOffset) &&
        !isTileCollidable(newX + player.width - collisionOffset, player.y + player.height - collisionOffset)) {
        player.x = newX;
    }

    // Check vertical movement
    if (!isTileCollidable(player.x + collisionOffset, newY + collisionOffset) &&
        !isTileCollidable(player.x + player.width - collisionOffset, newY + collisionOffset) &&
        !isTileCollidable(player.x + collisionOffset, newY + player.height - collisionOffset) &&
        !isTileCollidable(player.x + player.width - collisionOffset, newY + player.height - collisionOffset)) {
        player.y = newY;
    }

    // Check for coin collection
    checkCoinCollection(player.x + player.width/2, player.y + player.height/2);

    // Update enemies
    enemies.forEach(enemy => {
        let newX = enemy.x + enemy.speedX;
        let newY = enemy.y + enemy.speedY;
        const collisionOffset = 2 * ZOOM_LEVEL;

        // Check horizontal movement
        if (!isTileCollidable(newX + collisionOffset, enemy.y + collisionOffset) &&
            !isTileCollidable(newX + enemy.width - collisionOffset, enemy.y + collisionOffset) &&
            !isTileCollidable(newX + collisionOffset, enemy.y + enemy.height - collisionOffset) &&
            !isTileCollidable(newX + enemy.width - collisionOffset, enemy.y + enemy.height - collisionOffset)) {
            enemy.x = newX;
        } else {
            enemy.speedX *= -1;
        }

        // Check vertical movement
        if (!isTileCollidable(enemy.x + collisionOffset, newY + collisionOffset) &&
            !isTileCollidable(enemy.x + enemy.width - collisionOffset, newY + collisionOffset) &&
            !isTileCollidable(enemy.x + collisionOffset, newY + enemy.height - collisionOffset) &&
            !isTileCollidable(enemy.x + enemy.width - collisionOffset, newY + enemy.height - collisionOffset)) {
            enemy.y = newY;
        } else {
            enemy.speedY *= -1;
        }

        // Check collision with player
        if (checkCollision(player, enemy)) {
            // Reset player position
            player.x = TILE_SIZE * 2;
            player.y = TILE_SIZE * 2;
            player.coins = 0;
        }
    });

    // Update camera to follow player
    gameState.cameraX = player.x - (gameWidth / ZOOM_LEVEL) / 2 + player.width / 2;
    gameState.cameraY = player.y - (gameHeight / ZOOM_LEVEL) / 2 + player.height / 2;

    // Camera bounds
    gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, MAP_WIDTH * TILE_SIZE - gameWidth / ZOOM_LEVEL));
    gameState.cameraY = Math.max(0, Math.min(gameState.cameraY, MAP_HEIGHT * TILE_SIZE - gameHeight / ZOOM_LEVEL));
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
    drawBaseLayer();
    drawTopLayer();
    drawUI(); // UI is always on top

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop(0); 