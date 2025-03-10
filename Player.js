import { AnimationController } from "./AnimationController.js";
import { Character } from "./Character.js";
import {
  PLAYER_START_X,
  PLAYER_START_Y,
  PLAYER_HEALTH,
  PLAYER_MAX_HEALTH,
  PLAYER_DAMAGE,
  PLAYER_MOVE_POINTS,
} from "./constants.js";

export class Player extends Character {
  constructor(id, x, y, width, height) {
    super({
      id,
      x,
      y,
      width,
      height,
      image: "assets/player.png",
      health: PLAYER_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      damage: PLAYER_DAMAGE,
      movePoints: PLAYER_MOVE_POINTS,
      animationController: new AnimationController("farmer"),
    });
    this.coins = 0;
    this.imageKey = "player";
  }

  initialize(tileSize) {
    this.x = PLAYER_START_X;
    this.y = PLAYER_START_Y;
    this.width = tileSize;
    this.height = tileSize;
    this.movePoints = PLAYER_MOVE_POINTS;
  }

  reset() {
    this.setState("idle");
    this.x = PLAYER_START_X;
    this.y = PLAYER_START_Y;
    this.coins = 0;
    this.health = this.maxHealth;
  }
}
