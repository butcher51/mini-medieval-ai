import { findPath, isPathInRange } from "./astar.js";
import { Player } from "./Player.js";
import { Enemy } from "./Enemy.js";
import { AnimationController } from "./AnimationController.js";
import { ZOOM_LEVEL, BASE_TILE_SIZE, TILE_SIZE, PLAYER_MOVE_POINTS, ENEMY_POSITIONS, MOVEMENT_STEP_DELAY } from "./constants.js";

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
let tilesetImage = null;
let uiImage = null;
let tilesetData = null;
let collisionLayer = null;

async function loadUI() {
     // Load UI assets
     uiImage = new Image();
     await new Promise((resolve, reject) => {
          uiImage.onload = resolve;
          uiImage.onerror = reject;
          uiImage.src = "assets/interface.png";
     });
}

// Load map data
async function loadMap() {
     try {
          const response = await fetch("assets/maps/test-map.json");
          gameMap = await response.json();

          // Set map dimensions
          MAP_WIDTH = gameMap.width;
          MAP_HEIGHT = gameMap.height;

          // Calculate the game area size
          gameWidth = MAP_WIDTH * TILE_SIZE;
          gameHeight = MAP_HEIGHT * TILE_SIZE;

          // Find collision layer
          collisionLayer = gameMap.layers.find((layer) => layer.class === "collision");

          // Load tileset
          const tilesetSource = gameMap.tilesets[0].source;
          const tilesetName = tilesetSource.split("/").pop().replace(".tsx", "").toLowerCase();

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

          // Initialize player
          player.initialize(TILE_SIZE);
     } catch (error) {
          console.error("Error loading map:", error);
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
const enemies = ENEMY_POSITIONS.map((pos) => new Enemy(pos.id, pos.x, pos.y, TILE_SIZE, TILE_SIZE));

// Game state
const gameState = {
     cameraX: 0,
     cameraY: 0,
     mouseX: 0,
     mouseY: 0,
     hoveredTile: { x: 0, y: 0 },
     currentPath: null,
     currentTurn: "player", // 'player' or 'enemies'
     isMoving: false, // Track if any character is currently moving
     activeMovementPath: null, // Store the path being followed during movement
};

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

     const itemsLayer = gameMap.layers.find((layer) => layer.name === "Items");
     if (!itemsLayer) return;

     const tileX = Math.floor(playerX / TILE_SIZE);
     const tileY = Math.floor(playerY / TILE_SIZE);

     if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) return;

     const tileIndex = tileY * MAP_WIDTH + tileX;
     const tileId = itemsLayer.data[tileIndex];

     // Check if the tile is a coin (you'll need to determine the correct tile ID for coins in your tileset)
     if (tileId === 6) {
          // Update this ID based on your tileset
          itemsLayer.data[tileIndex] = 0; // Remove coin
          player.coins++;
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
     gameMap.layers.forEach((layer) => {
          if (layer.class === "collision") return; // Skip collision layer
          if (!layer.visible) return;

          for (let y = 0; y < layer.height; y++) {
               for (let x = 0; x < layer.width; x++) {
                    const tileIndex = layer.data[y * layer.width + x];
                    if (tileIndex === 0) continue; // Skip empty tiles

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
               if (
                    gameState.hoveredTile.x >= 0 &&
                    gameState.hoveredTile.x < MAP_WIDTH &&
                    gameState.hoveredTile.y >= 0 &&
                    gameState.hoveredTile.y < MAP_HEIGHT
               ) {
                    ctx.strokeStyle = isPathInRange(gameState.currentPath, player.movePoints) ? "rgba(0, 255, 0, 0.5)" : "rgba(255, 0, 0, 0.5)";
                    ctx.strokeRect(hoveredTileX, hoveredTileY, BASE_TILE_SIZE, BASE_TILE_SIZE);
                    // ctx.drawImage(
                    //      uiImage,
                    //      hoveredTileX,
                    //      hoveredTileY,
                    //      BASE_TILE_SIZE,
                    //      BASE_TILE_SIZE,
                    //      hoveredTileX,
                    //      hoveredTileY,
                    //      BASE_TILE_SIZE,
                    //      BASE_TILE_SIZE
                    // );
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

     // Camera bounds
     gameState.cameraX = Math.max(0, Math.min(gameState.cameraX, gameWidth - viewportWidth));
     gameState.cameraY = Math.max(0, Math.min(gameState.cameraY, gameHeight - viewportHeight));

     // Check for coin collection
     checkCoinCollection(player.x + player.width / 2, player.y + player.height / 2);
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
          await AnimationController.loadAnimations();
          await loadUI();
          await loadMap();
          gameLoop();
     } catch (error) {
          console.error("Error starting game:", error);
     }
}

// Initialize the game
startGame();

// Add event listeners for mouse
canvas.addEventListener("mousemove", (e) => {
     const rect = canvas.getBoundingClientRect();
     const offsetX = (canvas.width - gameWidth * ZOOM_LEVEL) / 2;
     const offsetY = (canvas.height - gameHeight * ZOOM_LEVEL) / 2;

     // Adjust mouse coordinates to account for viewport centering and zoom
     gameState.mouseX = (e.clientX - rect.left - offsetX) / ZOOM_LEVEL + gameState.cameraX;
     gameState.mouseY = (e.clientY - rect.top - offsetY) / ZOOM_LEVEL + gameState.cameraY;

     // Calculate hovered tile
     const tileX = Math.floor(gameState.mouseX / BASE_TILE_SIZE);
     const tileY = Math.floor(gameState.mouseY / BASE_TILE_SIZE);

     if (tileX !== gameState.hoveredTile.x || tileY !== gameState.hoveredTile.y) {
          gameState.hoveredTile = { x: tileX, y: tileY };
          // Calculate path to hovered tile
          if (gameState.currentTurn === "player") {
               const playerTileX = Math.floor(player.x / BASE_TILE_SIZE);
               const playerTileY = Math.floor(player.y / BASE_TILE_SIZE);

               gameState.currentPath = findPath(playerTileX, playerTileY, tileX, tileY, isWalkable);
          }
     }
});

// Draw entities
function drawEntities() {
     // Draw player
     player.draw(ctx);

     // Draw enemies
     enemies.forEach((enemy) => {
          if (!enemy.isActive) return; // Don't draw dead enemies
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
          if (character.isAdjacent(player, baseTileSize)) {
               // Stop movement if adjacent to player
               break;
          }
          await new Promise((resolve) => setTimeout(resolve, MOVEMENT_STEP_DELAY));
     }

     gameState.isMoving = false;
     gameState.activeMovementPath = null; // Clear the active movement path
     gameState.currentPath = null; // Ensure path is cleared
     gameState.hoveredTile = { x: -1, y: -1 }; // Reset hover state
}

// Modify the click handler to include combat
canvas.addEventListener("click", async (e) => {
     if (gameState.currentTurn !== "player" || gameState.isMoving) return;

     const rect = canvas.getBoundingClientRect();
     const clickX = e.clientX - rect.left;
     const clickY = e.clientY - rect.top;

     // Check if skip button was clicked (skip button is in screen space, not game space)
     if (
          gameState.skipButton &&
          clickX >= gameState.skipButton.x &&
          clickX <= gameState.skipButton.x + gameState.skipButton.width &&
          clickY >= gameState.skipButton.y &&
          clickY <= gameState.skipButton.y + gameState.skipButton.height
     ) {
          // Skip turn
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
          player.attack(targetEnemy);

          // Reset path and hover highlight after attack
          gameState.currentPath = null;
          gameState.hoveredTile = { x: -1, y: -1 };

          // End turn immediately after attack
          endPlayerTurn();
          return;
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

          player.setState("idle"); // Set player animation state back to idle

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
               attack({ attacker: enemy, defender: player });
               continue;
          }

          // Otherwise, move towards player
          if (pathToPlayer.length > 1) {
               // First point is current position
               const moveDistance = Math.min(enemy.movePoints, pathToPlayer.length - 1);
               const path = pathToPlayer.slice(0, moveDistance + 1);

               enemy.setState("run"); // Set enemy animation state to walking
               await moveCharacterAlongPath(enemy, path, BASE_TILE_SIZE);               
               enemy.setState("idle"); // Set enemy animation state back to idle

               await new Promise((resolve) => setTimeout(resolve, 500)); // Delay before attacking

               if (enemy.isAdjacent(player, BASE_TILE_SIZE)) {
                    attack({ attacker: enemy, defender: player });
                    continue;
               }
          }
     }

     // End enemy turn
     gameState.currentTurn = "player";
     player.movePoints = PLAYER_MOVE_POINTS; // Reset player move points
}

async function attack({ attacker, defender }) {
     attacker.setState("attack"); // Set enemy animation state to attacking
     defender.setState("hit"); // Set player animation state to hit
     await new Promise((resolve) => setTimeout(resolve, 500)); // Delay for attack animation
     attacker.attack(defender);
     attacker.setState("idle"); // Set enemy animation state back to idle
     defender.setState("idle"); // Set player animation state back to idle
     if (defender.health <= 0) {
          defender.setState("dead"); // Set player animation state to dead
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Delay for death animation
          // Game over logic here
          defender.reset();
     }
}

function endPlayerTurn() {
     gameState.currentTurn = "enemies";
     setTimeout(() => {
          processEnemyTurn();
     }, 500); // Add a small delay before enemy turn
}

function isWalkable(x, y) {
     // Check map collisions first
     if (isTileCollidable(x * BASE_TILE_SIZE, y * BASE_TILE_SIZE)) {
          return false;
     }

     // Check if any enemy occupies this tile
     const isEnemyTile = enemies.some((enemy) => enemy.isActive && Math.floor(enemy.x / BASE_TILE_SIZE) === x && Math.floor(enemy.y / BASE_TILE_SIZE) === y);

     return !isEnemyTile;
}
