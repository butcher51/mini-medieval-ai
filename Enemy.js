import { Character } from "./Character.js";
import {
  ENEMY_HEALTH,
  ENEMY_MAX_HEALTH,
  ENEMY_DAMAGE,
  ENEMY_MOVE_POINTS,
} from "./constants.js";
import { AnimationController } from "./AnimationController.js";
import { Vector2D } from "./Vector2D.js";

interface EnemyStats {
  health: number;
  maxHealth: number;
  damage: number;
  movePoints: number;
  attackRange: number;
  visionRange: number;
}

interface EnemyConfig {
  id: string;
  position: Vector2D;
  dimensions: { width: number; height: number };
  stats?: Partial<EnemyStats>;
  image?: string;
  patrolPoints?: Vector2D[];
}

/**
 * Represents an enemy character with patrol behavior
 */
export class Enemy extends Character {
  private readonly imageKey: string;
  private stats: EnemyStats;
  private animationController: AnimationController;
  private isAggressive: boolean = false;
  private target?: Vector2D;
  private lastAttackTime: number = 0;
  private readonly attackCooldown: number = 1000;

  // Patrol-related properties
  private patrolPoints: Vector2D[];
  private currentPatrolIndex: number = 0;
  private readonly patrolTolerance: number = 5; // Distance to consider waypoint reached
  private isPatrolling: boolean = true;

  constructor(config: EnemyConfig) {
    const defaultStats: EnemyStats = {
      health: ENEMY_HEALTH,
      maxHealth: ENEMY_MAX_HEALTH,
      damage: ENEMY_DAMAGE,
      movePoints: ENEMY_MOVE_POINTS,
      attackRange: 1,
      visionRange: 5,
    };

    super({
      id: config.id,
      x: config.position.x,
      y: config.position.y,
      width: config.dimensions.width,
      height: config.dimensions.height,
      image: config.image ?? "assets/orc.png",
      health: defaultStats.health,
      maxHealth: defaultStats.maxHealth,
      damage: defaultStats.damage,
      movePoints: defaultStats.movePoints,
      animationController: new AnimationController("enemy"),
    });

    this.imageKey = "enemy";
    this.stats = { ...defaultStats, ...config.stats };
    this.animationController = this.getAnimationController();
    this.patrolPoints = config.patrolPoints ?? [];
    this.initializePatrol();
  }

  public update(deltaTime: number, playerPosition: Vector2D): void {
    this.updateAggression(playerPosition);
    if (this.isAggressive) {
      this.isPatrolling = false;
      this.updateMovement(deltaTime, playerPosition);
    } else {
      this.isPatrolling = true;
      this.updatePatrol(deltaTime);
    }
    this.updateAnimation();
  }

  public attack(target: Vector2D): number {
    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return 0;
    }

    const distance = this.calculateDistance(target);
    if (distance <= this.stats.attackRange) {
      this.lastAttackTime = currentTime;
      this.animationController.play("attack");
      return this.stats.damage;
    }
    return 0;
  }

  public setTarget(target: Vector2D): void {
    this.target = target;
  }

  /**
   * Sets new patrol points and resets patrol state
   */
  public setPatrolPoints(points: Vector2D[]): void {
    this.patrolPoints = [...points];
    this.initializePatrol();
  }

  private initializePatrol(): void {
    if (this.patrolPoints.length > 0) {
      this.currentPatrolIndex = 0;
      this.target = this.patrolPoints[0];
      this.isPatrolling = true;
    } else {
      this.isPatrolling = false;
    }
  }

  private updateAggression(playerPosition: Vector2D): void {
    const distance = this.calculateDistance(playerPosition);
    this.isAggressive = distance <= this.stats.visionRange;
  }

  private updateMovement(deltaTime: number, playerPosition: Vector2D): void {
    if (this.stats.movePoints <= 0) return;

    const targetPosition = this.target ?? playerPosition;
    this.moveTowardsTarget(targetPosition, deltaTime);
  }

  private updatePatrol(deltaTime: number): void {
    if (!this.isPatrolling || this.patrolPoints.length === 0 || this.stats.movePoints <= 0) {
      return;
    }

    const currentTarget = this.patrolPoints[this.currentPatrolIndex];
    const distanceToTarget = this.calculateDistance(currentTarget);

    if (distanceToTarget <= this.patrolTolerance) {
      // Reached patrol point, move to next
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      this.target = this.patrolPoints[this.currentPatrolIndex];
    }

    this.moveTowardsTarget(currentTarget, deltaTime);
  }

  private moveTowardsTarget(target: Vector2D, deltaTime: number): void {
    const direction = this.calculateDirection(target);
    const speed = this.stats.movePoints * (deltaTime / 1000);
    
    this.x += direction.x * speed;
    this.y += direction.y * speed;
  }

  private updateAnimation(): void {
    if (this.isAggressive) {
      this.animationController.play("walk");
    } else if (this.isPatrolling && this.patrolPoints.length > 0) {
      this.animationController.play("patrol");
    } else {
      this.animationController.play("idle");
    }
  }

  private calculateDistance(target: Vector2D): number {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateDirection(target: Vector2D): Vector2D {
    const distance = this.calculateDistance(target);
    if (distance === 0) return new Vector2D(0, 0);
    
    return new Vector2D(
      (target.x - this.x) / distance,
      (target.y - this.y) / distance
    );
  }

  // Getters
  public getStats(): Readonly<EnemyStats> {
    return { ...this.stats };
  }

  public getImageKey(): string {
    return this.imageKey;
  }

  public isInAggressiveState(): boolean {
    return this.isAggressive;
  }

  public isPatrollingState(): boolean {
    return this.isPatrolling;
  }

  public getCurrentPatrolPoint(): Vector2D | null {
    return this.patrolPoints.length > 0 
      ? this.patrolPoints[this.currentPatrolIndex] 
      : null;
  }
}

export class Vector2D {
  constructor(public x: number, public y: number) {}
}
