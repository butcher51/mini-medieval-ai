import { Character } from "./Character.js";
import {
  ENEMY_HEALTH,
  ENEMY_MAX_HEALTH,
  ENEMY_DAMAGE,
  ENEMY_MOVE_POINTS,
} from "./constants.js";
import { AnimationController } from "./AnimationController.js";

export class Enemy extends Character {
  constructor(id, x, y, width, height) {
    super({
      id,
      x,
      y,
      width,
      height,
      image: "assets/orc.png",
      health: ENEMY_HEALTH,
      maxHealth: ENEMY_MAX_HEALTH,
      damage: ENEMY_DAMAGE,
      movePoints: ENEMY_MOVE_POINTS,
      animationController: new AnimationController("enemy"),
    });
    this.imageKey = "enemy";
  }
}
