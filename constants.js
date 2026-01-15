// Canvas and display settings
export const ZOOM_LEVEL = 4;

// Map configuration
export const BASE_TILE_SIZE = 8; // Tiled uses 8x8 tiles
export const TILE_SIZE = BASE_TILE_SIZE; // Keep everything in base coordinates

// Movement settings
export const MOVEMENT_STEP_DELAY = 200; // ms between each step

// Player settings
export const PLAYER_SPEED = 2;
export const PLAYER_START_X = TILE_SIZE * 2;
export const PLAYER_START_Y = TILE_SIZE * 2;
export const PLAYER_HEALTH = 10;
export const PLAYER_MAX_HEALTH = 10;
export const PLAYER_DAMAGE = 3;
export const PLAYER_MOVE_POINTS = 25;

// Enemy settings
export const ENEMY_HEALTH = 5;
export const ENEMY_MAX_HEALTH = 5;
export const ENEMY_DAMAGE = 2;
export const ENEMY_MOVE_POINTS = 3;

// Enemy positions
export const ENEMY_POSITIONS = [
    // { id: 'géza', x: TILE_SIZE * 10, y: TILE_SIZE * 7 },
    // { id: 'feri', x: TILE_SIZE * 15, y: TILE_SIZE * 3 }
]; 

export const INITAL_MAP = 'forrest-0';

// Save system version - increment when save format changes
export const SAVE_VERSION = 11;