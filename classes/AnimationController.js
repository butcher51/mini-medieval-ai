export class AnimationController {
    static spriteSheet = null;
    static animationData = null;

    static async loadAnimations() {
        try {
            // Load animation data
            const response = await fetch('assets/character-animations-states.json');
            AnimationController.animationData = await response.json();

            // Load sprite sheet
            AnimationController.spriteSheet = new Image();
            await new Promise((resolve, reject) => {
                AnimationController.spriteSheet.onload = resolve;
                AnimationController.spriteSheet.onerror = reject;
                AnimationController.spriteSheet.src = 'assets/Units.png';
            });

            return true;
        } catch (error) {
            console.error('Failed to load animations:', error);
            return false;
        }
    }
} 