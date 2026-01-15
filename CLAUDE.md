# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mini Medieval AI is a web-based turn-based tactical game with a top-down view using 8x8 pixel tiles. It's built with pure JavaScript (ES6 modules) and HTML5 Canvas, requiring no build step. The game loads maps dynamically from Tiled map editor JSON exports.

## Running the Game

Start the development server:
```bash
npm start
```

The game runs on `http://localhost:80`. Open this URL in a browser to play.

## Project Architecture

### Core Game Loop (game.js)

The main game logic follows this initialization and loop pattern:

1. **Initialization** (`startGame`):
   - Load animation data and sprite sheets
   - Load UI assets (icons)
   - Load map data from `assets/maps/*.json`
   - Initialize game state and characters
   - Start the game loop with `requestAnimationFrame`

2. **Game Loop** (`gameLoop`):
   - Updates game logic (camera position, collision detection)
   - Renders all layers (map, characters, UI, paths)
   - Continuously requests next frame

3. **Turn-Based System**:
   - Game state tracks whose turn it is (`gameState.currentTurn`: "player" or "enemies")
   - Player clicks tiles to move (A* pathfinding calculates route)
   - Movement is tile-by-tile with step delays
   - Player has limited move points per turn
   - After player turn ends, enemies take their turns

### Module Structure

**Character System** (follows inheritance pattern):
- `Character.js` - Base class with health, damage, movement, attack methods
- `Player.js` - Extends Character, manages player-specific state (coins, controls)
- `Enemy.js` - Extends Character, handles enemy behavior
- `AnimationController.js` - Manages sprite animations from sprite sheet, uses static loading for shared assets

**Utilities** (pure, immutable functions):
- `astar.js` - A* pathfinding algorithm with diagonal movement support
  - `findPath(startX, startY, endX, endY, isWalkable)` - Returns path as array of {x, y} coordinates
  - `isPathInRange(path, movePoints)` - Validates if path length fits within move budget
- `constants.js` - Game configuration (tile sizes, player/enemy stats, move points)
- `gameState.js` - Factory function for creating game state object

### Map System

Maps are created in Tiled map editor and exported as JSON to `assets/maps/`:
- Maps use 8x8 base tile size (`BASE_TILE_SIZE`)
- Multiple layers: collision, objects, items, tiles
- **Collision layer**: Class "collision", contains walkable/non-walkable tile data
- **Objects layer**: Class "objects", contains object definitions (e.g., spawn points with name="start")
- Tileset references are resolved dynamically from map JSON
- Animated tiles are defined in `assets/maps/map-animations.json`

Map coordinates use base tile units (8x8). Display uses `ZOOM_LEVEL` constant for scaling.

### Rendering Pipeline

1. Map layers are drawn tile-by-tile from tileset images
2. Animated tiles update based on frame timing (600ms intervals)
3. Characters are drawn using AnimationController (sprite sheet + animation states)
4. Path visualization shows movement preview (green=valid, red=invalid)
5. UI overlay shows move points, turn state, skip button

Canvas rendering disables image smoothing for crisp pixel art.

### Coordinate Systems

- **Base coordinates**: 8x8 tile units (used internally for logic)
- **Display coordinates**: Scaled by `ZOOM_LEVEL` (default: 4x)
- Camera tracks player position and centers viewport
- Mouse coordinates are converted: screen → viewport → world → tile coordinates

## Code Guidelines

**Key principles from .cursors/rules/index.md**:

1. **Minimal modifications** - Only change code directly related to the task
2. **Immutable utility functions** - Utilities in separate files (like `astar.js`) must never modify input parameters
3. **Use async/await** for asynchronous operations
4. **Browser context** - Code runs in browser, validate all imports
5. **Early returns** - Prefer early returns over nested conditions
6. **Functional style** - Prefer functional, immutable patterns unless verbose
7. **No syntax errors** - Modified code must not break existing behavior

## Common Tasks

### Adding a New Map

1. Create map in Tiled editor (8x8 tile size)
2. Ensure map has required layers with correct classes:
   - Collision layer (class="collision")
   - Objects layer (class="objects") with start position object (name="start")
3. Export as JSON to `assets/maps/your-map-name.json`
4. Update `constants.js` `INITAL_MAP` if needed, or load dynamically via `loadMap("your-map-name")`

### Modifying Character Behavior

Character logic lives in `Character.js`, `Player.js`, and `Enemy.js`. The base `Character` class handles:
- Movement (`movePoints`)
- Combat (`attack(defender)` method)
- Animation state management (`setState(newState)`)
- Adjacency checking (`isAdjacent(entity, baseTileSize)`)

### Adjusting Game Balance

Edit `constants.js` for:
- Player/enemy health, damage, move points
- Movement timing (`MOVEMENT_STEP_DELAY`)
- Initial enemy positions (`ENEMY_POSITIONS`)
- Map selection (`INITAL_MAP`)

### Working with Pathfinding

The A* implementation in `astar.js` supports diagonal movement with higher cost (√2 vs 1). To modify pathfinding:
- `isWalkable` callback determines valid tiles (checks collision layer + bounds)
- `isAttackWalkable` variant allows walking through enemy tiles for attack targeting
- Path cost calculation considers diagonal movement in `isPathInRange`

## Tileset Source

Tileset assets are from: https://itch.io/s/116731/mini-medieval-bundle
