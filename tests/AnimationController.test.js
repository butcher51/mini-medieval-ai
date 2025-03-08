import { AnimationController } from '../classes/AnimationController.js';
import { describe, beforeEach, test, expect } from '@jest/globals';
import { jest } from '@jest/globals';


describe('AnimationController', () => {
    beforeEach(() => {
        // Reset the static properties before each test
        AnimationController.spriteSheet = null;
        AnimationController.animationData = null;
        
        // Mock the fetch API
        global.fetch = jest.fn(() => 
            Promise.resolve({
                json: () => Promise.resolve({
                    farmer: {
                        idle: {
                            frames: [
                                { x: 0, y: 0 },
                                { x: 8, y: 0 },
                                { x: 16, y: 0 },
                                { x: 24, y: 0 }
                            ]
                        }
                    }
                })
            })
        );
    });

    test('loadAnimations loads animation data', async () => {
        const success = await AnimationController.loadAnimations();
        
        expect(success).toBe(true);
        expect(AnimationController.animationData).toBeDefined();
        expect(AnimationController.animationData.farmer.idle.frames).toHaveLength(4);
        expect(global.fetch).toHaveBeenCalledWith('assets/character-animation-states.json');
    });

    test('loadAnimations handles fetch errors', async () => {
        global.fetch = jest.fn(() => Promise.reject('Network error'));
        
        const success = await AnimationController.loadAnimations();
        
        expect(success).toBe(false);
        expect(AnimationController.animationData).toBeNull();
    });
}); 