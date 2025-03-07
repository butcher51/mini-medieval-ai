import { Character } from './Character.js';
import { 
    ENEMY_HEALTH, 
    ENEMY_MAX_HEALTH, 
    ENEMY_DAMAGE, 
    ENEMY_MOVE_POINTS 
} from '../constants.js';

export class Enemy extends Character {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'assets/orc.png', ENEMY_HEALTH, ENEMY_MAX_HEALTH, ENEMY_DAMAGE, ENEMY_MOVE_POINTS);
        this.imageKey = 'enemy';
    }
} 