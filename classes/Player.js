import { Character } from './Character.js';
import { 
    PLAYER_START_X, 
    PLAYER_START_Y, 
    PLAYER_HEALTH, 
    PLAYER_MAX_HEALTH, 
    PLAYER_DAMAGE, 
    PLAYER_MOVE_POINTS 
} from '../constants.js';

export class Player extends Character {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'assets/player.png', PLAYER_HEALTH, PLAYER_MAX_HEALTH, PLAYER_DAMAGE, PLAYER_MOVE_POINTS);
        this.coins = 0;
        this.imageKey = 'player';
    }

    initialize(tileSize) {
        this.x = PLAYER_START_X;
        this.y = PLAYER_START_Y;
        this.width = tileSize;
        this.height = tileSize;
        this.movePoints = PLAYER_MOVE_POINTS;
    }

    reset() {
        this.x = PLAYER_START_X;
        this.y = PLAYER_START_Y;
        this.coins = 0;
        this.health = this.maxHealth;
    }
} 