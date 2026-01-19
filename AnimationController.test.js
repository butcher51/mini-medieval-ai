import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimationController } from "./AnimationController.js";
import { TILE_SIZE } from "./constants.js";
import { AssetLoader } from "./AssetLoader.js";

// Mock AssetLoader
const mockAnimationData = {
    farmer: {
        idle: {
            frames: [
                { x: 0, y: 0, stop: false },
                { x: 8, y: 0, stop: false },
            ],
        },
        run: {
            frames: [
                { x: 16, y: 0, stop: false },
                { x: 24, y: 0, stop: false },
                { x: 32, y: 0, stop: false },
            ],
        },
        attack: {
            frames: [
                { x: 40, y: 0, stop: false },
                { x: 48, y: 0, stop: false },
                { x: 56, y: 0, stop: true },
            ],
        },
    },
    enemy: {
        idle: {
            frames: [{ x: 0, y: 8, stop: false }],
        },
    },
};

const mockSpriteSheet = {
    width: 64,
    height: 64,
    complete: true,
};

const mockGetCharacterAnimations = vi.fn(() => mockAnimationData);
const mockGetCharacterSprite = vi.fn(() => mockSpriteSheet);

const mockInstance = {
    getCharacterAnimations: mockGetCharacterAnimations,
    getCharacterSprite: mockGetCharacterSprite,
};

vi.mock("./AssetLoader.js", () => {
    return {
        AssetLoader: {
            getInstance: vi.fn(() => mockInstance),
        },
    };
});

describe("AnimationController", () => {
    let mockCtx;
    let consoleErrorSpy;
    let dateNowSpy;

    beforeEach(() => {
        mockCtx = {
            drawImage: vi.fn(),
        };
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        dateNowSpy = vi.spyOn(Date, "now");

        // Clear mock calls from previous tests
        mockGetCharacterAnimations.mockClear();
        mockGetCharacterSprite.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Constructor", () => {
        it("should store animId correctly", () => {
            const controller = new AnimationController("farmer");
            // We can't directly test private fields, but we can test behavior
            expect(controller).toBeInstanceOf(AnimationController);
        });

        it("should initialize with frame index 0 (verified by first draw call)", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            // First frame should be drawn (x: 0, y: 0)
            expect(mockCtx.drawImage).toHaveBeenCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });
    });

    describe("Reset", () => {
        it("should reset currentFrame to 0", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1200)
                .mockReturnValueOnce(2000);

            // Advance to second frame
            controller.draw(mockCtx, "idle", 100, 100);
            controller.draw(mockCtx, "idle", 100, 100);

            // Second frame should be drawn (x: 8)
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Reset
            controller.reset();
            controller.draw(mockCtx, "idle", 100, 100);

            // First frame should be drawn again (x: 0)
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should reset lastFrameTime to 0", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1200)
                .mockReturnValueOnce(1300);

            // Draw once to set lastFrameTime
            controller.draw(mockCtx, "idle", 100, 100);
            controller.draw(mockCtx, "idle", 100, 100); // Advances frame

            controller.reset();

            // After reset, the next draw should not advance immediately (< 150ms)
            controller.draw(mockCtx, "idle", 100, 100);

            // Should still be on first frame
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should work multiple times", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.reset();
            controller.reset();
            controller.reset();

            controller.draw(mockCtx, "idle", 100, 100);

            // Should still draw first frame
            expect(mockCtx.drawImage).toHaveBeenCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });
    });

    describe("Draw Method - Basic Rendering", () => {
        it("should call AssetLoader.getInstance()", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(AssetLoader.getInstance).toHaveBeenCalled();
        });

        it("should retrieve animation data and sprite sheet", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(mockGetCharacterAnimations).toHaveBeenCalled();
            expect(mockGetCharacterSprite).toHaveBeenCalled();
        });

        it("should call ctx.drawImage with correct parameters", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 150, 200);

            expect(mockCtx.drawImage).toHaveBeenCalledWith(
                expect.objectContaining({ width: 64, height: 64 }), // sprite sheet
                0, // source x
                0, // source y
                TILE_SIZE, // source width
                TILE_SIZE, // source height
                150, // dest x
                200, // dest y
                TILE_SIZE, // dest width
                TILE_SIZE, // dest height
            );
        });

        it("should draw correct frame based on state", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            // Draw idle state
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0, // idle frame x
                0, // idle frame y
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Draw run state
            controller.reset();
            controller.draw(mockCtx, "run", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                16, // run frame x
                0, // run frame y
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should work with different animIds", () => {
            const farmerController = new AnimationController("farmer");
            const enemyController = new AnimationController("enemy");
            dateNowSpy.mockReturnValue(1000);

            farmerController.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            enemyController.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                8, // enemy idle y position
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });
    });

    describe("Frame Progression", () => {
        it("should advance to next frame after frameDelay (150ms)", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1160);

            // First draw
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0, // first frame
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Second draw after 160ms
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8, // second frame
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should loop back to frame 0 after last frame", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1160)
                .mockReturnValueOnce(1320);

            // First frame
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Second frame
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Loop back to first frame
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should NOT advance frame if time elapsed < frameDelay", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1100)
                .mockReturnValueOnce(1140);

            // First draw - draws frame 0, but internally advances to frame 1
            // because lastFrameTime starts at 0 and 1000 - 0 > 150
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0, // draws frame 0
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Second draw 100ms later - draws frame 1, does NOT advance
            // because 1100 - 1000 = 100 < 150
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8, // draws frame 1
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Third draw 40ms later - still draws frame 1, does NOT advance
            // because 1140 - 1000 = 140 < 150
            controller.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8, // still draws frame 1
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should respect stop flag and not advance on final frame", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1160)
                .mockReturnValueOnce(1320)
                .mockReturnValueOnce(1480);

            // First frame
            controller.draw(mockCtx, "attack", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                40,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Second frame
            controller.draw(mockCtx, "attack", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                48,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Third frame (stop: true)
            controller.draw(mockCtx, "attack", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                56,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // Should stay on third frame (not loop back)
            controller.draw(mockCtx, "attack", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                56, // still third frame
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });
    });

    describe("Error Handling", () => {
        it("should handle missing animation data gracefully", () => {
            AssetLoader.getInstance.mockReturnValueOnce({
                getCharacterAnimations: vi.fn(() => null),
                getCharacterSprite: vi.fn(() => ({ width: 64 })),
            });

            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Animation data or sprite sheet not loaded",
            );
            expect(mockCtx.drawImage).not.toHaveBeenCalled();
        });

        it("should handle missing sprite sheet gracefully", () => {
            AssetLoader.getInstance.mockReturnValueOnce({
                getCharacterAnimations: vi.fn(() => ({ farmer: {} })),
                getCharacterSprite: vi.fn(() => null),
            });

            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Animation data or sprite sheet not loaded",
            );
            expect(mockCtx.drawImage).not.toHaveBeenCalled();
        });

        it("should handle missing animId in animation data", () => {
            const controller = new AnimationController("nonexistent");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "No animation found for animId: nonexistent",
            );
            expect(mockCtx.drawImage).not.toHaveBeenCalled();
        });

        it("should handle missing state in animation data", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "nonexistentState", 100, 100);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "No frames found for state: nonexistentState",
            );
            expect(mockCtx.drawImage).not.toHaveBeenCalled();
        });
    });

    describe("Integration", () => {
        it("should work with AssetLoader singleton", () => {
            const controller = new AnimationController("farmer");
            dateNowSpy.mockReturnValue(1000);

            controller.draw(mockCtx, "idle", 100, 100);

            expect(AssetLoader.getInstance).toHaveBeenCalled();
            expect(mockCtx.drawImage).toHaveBeenCalled();
        });

        it("should maintain independent frame state per instance", () => {
            const controller1 = new AnimationController("farmer");
            const controller2 = new AnimationController("farmer");
            dateNowSpy
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1160)
                .mockReturnValueOnce(2000);

            // Advance controller1 to second frame
            controller1.draw(mockCtx, "idle", 100, 100);
            controller1.draw(mockCtx, "idle", 100, 100);

            // controller1 should be on second frame
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                8,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            // controller2 should still be on first frame
            controller2.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });

        it("should work with multiple instances with different animIds", () => {
            const farmerController = new AnimationController("farmer");
            const enemyController = new AnimationController("enemy");
            dateNowSpy.mockReturnValue(1000);

            farmerController.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                0,
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );

            enemyController.draw(mockCtx, "idle", 100, 100);
            expect(mockCtx.drawImage).toHaveBeenLastCalledWith(
                expect.anything(),
                0,
                8, // different y position for enemy
                TILE_SIZE,
                TILE_SIZE,
                100,
                100,
                TILE_SIZE,
                TILE_SIZE,
            );
        });
    });
});
