export class Character {
    #state = "idle";

    constructor({ id, x, y, width, height, health, maxHealth, damage, movePoints, animationController }) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.health = health;
        this.maxHealth = maxHealth;
        this.damage = damage;
        this.movePoints = movePoints;
        this.isActive = true;
        this.animationController = animationController;
    }

    setState(newState) {
        this.#state = newState;
        this.animationController.reset();
    }

    draw(ctx) {
        if (this.animationController) {
            this.animationController.draw(ctx, this.#state, this.x, this.y);
        }
    }

    attack(defender) {
        defender.health = Math.max(0, defender.health - this.damage);
        if (defender.health <= 0 && defender !== this) {
            defender.isActive = false;
            this.setState("dead");
        }
    }

    isAdjacent(entity, baseTileSize) {
        const tile1X = Math.floor(this.x / baseTileSize);
        const tile1Y = Math.floor(this.y / baseTileSize);
        const tile2X = Math.floor(entity.x / baseTileSize);
        const tile2Y = Math.floor(entity.y / baseTileSize);
        return Math.abs(tile1X - tile2X) + Math.abs(tile1Y - tile2Y) === 1;
    }

    reset() {}
}
