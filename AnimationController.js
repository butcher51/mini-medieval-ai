import { TILE_SIZE } from "./constants.js";

export class AnimationController {
     #animId;
     #currentFrame = 0;
     #lastFrameTime = 0;
     #frameDelay = 150; // 200ms delay between frames

     constructor(animId) {
          this.#animId = animId;
     }

     static spriteSheet = null;
     static animationData = null;

     static async loadAnimations() {
          try {
               // Load animation data
               const response = await fetch("assets/character-animations-states.json");
               AnimationController.animationData = await response.json();

               // Load sprite sheet
               AnimationController.spriteSheet = new Image();// Static? It's smelly.
               await new Promise((resolve, reject) => {
                    AnimationController.spriteSheet.onload = resolve;
                    AnimationController.spriteSheet.onerror = reject;
                    AnimationController.spriteSheet.src = "assets/units.png";
               });

               return true;
          } catch (error) {
               console.error("Failed to load animations:", error);
               return false;
          }
     }

     reset() {
          this.#currentFrame = 0;
          this.#lastFrameTime = 0;
     }

     draw(ctx, state, posX, posY) {
          if (!AnimationController.animationData || !AnimationController.spriteSheet) {
               console.error("Animation data or sprite sheet not loaded");
               return;
          }

          const animation = AnimationController.animationData[this.#animId];
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
               AnimationController.spriteSheet,
               x,
               y,
               TILE_SIZE,
               TILE_SIZE, // source x, y, width, height
               posX,
               posY,
               TILE_SIZE,
               TILE_SIZE // destination x, y, width, height
          );
     }
}
