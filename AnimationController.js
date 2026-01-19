import { TILE_SIZE } from "./constants.js";
import { AssetLoader } from "./AssetLoader.js";

export class AnimationController {
    #animId;
    #currentFrame = 0;
    #lastFrameTime = 0;
    #frameDelay = 150; // 200ms delay between frames

    constructor(animId) {
        this.#animId = animId;
    }

    reset() {
        this.#currentFrame = 0;
        this.#lastFrameTime = 0;
    }

    draw(ctx, state, posX, posY) {
        const assetLoader = AssetLoader.getInstance();

        const animationData = assetLoader.getCharacterAnimations();
        const spriteSheet = assetLoader.getCharacterSprite();

        if (!animationData || !spriteSheet) {
            console.error("Animation data or sprite sheet not loaded");
            return;
        }

        const animation = animationData[this.#animId];
        if (!animation) {
            console.error(`No animation found for animId: ${this.#animId}`);
            return;
        }

        let frames = animation[state];
        if (!frames) {
            console.error(`No frames found for state: ${state}`);
            return;
        }
        frames = frames.frames;

        const now = Date.now();
        const { x, y, stop } = frames[this.#currentFrame];
        if (stop !== true) {
            if (now - this.#lastFrameTime > this.#frameDelay) {
                this.#currentFrame = (this.#currentFrame + 1) % frames.length;
                this.#lastFrameTime = now;
            }
        }

        ctx.drawImage(
            spriteSheet,
            x,
            y,
            TILE_SIZE,
            TILE_SIZE, // source x, y, width, height
            posX,
            posY,
            TILE_SIZE,
            TILE_SIZE, // destination x, y, width, height
        );
    }
}
