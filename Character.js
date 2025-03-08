export class Character {
    constructor({x, y, width, height, image, health, maxHealth, damage, movePoints, animationController}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.health = health;
        this.maxHealth = maxHealth;
        this.damage = damage;
        this.movePoints = movePoints;
        this.isActive = true;
        this.animationController = animationController;
    }

    draw(ctx, entityImages) {
        if (this.animationController) {
            this.animationController.draw(ctx, this.health <= 0 ? 'dead' : 'run', this.x, this.y);
        } else
        if (entityImages[this.imageKey] && entityImages[this.imageKey].complete) {
            ctx.drawImage(
                entityImages[this.imageKey],
                this.x,
                this.y,
                this.width,
                this.height
            );
        }
    }

    attack(defender) {
        defender.health = Math.max(0, defender.health - this.damage);
        if (defender.health <= 0 && defender !== this) {
            defender.isActive = false;
        }
    }

    isAdjacent(entity, baseTileSize) {
        const tile1X = Math.floor(this.x / baseTileSize);
        const tile1Y = Math.floor(this.y / baseTileSize);
        const tile2X = Math.floor(entity.x / baseTileSize);
        const tile2Y = Math.floor(entity.y / baseTileSize);
        
        return Math.abs(tile1X - tile2X) + Math.abs(tile1Y - tile2Y) === 1;
    }
} 