/* eslint-disable no-undef */
import { beforeEach, describe, it, expect, vi } from "vitest";

// Mock fetch and Image before importing AssetLoader
global.fetch = vi.fn();
global.Image = class {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = "";
        this.complete = false;
    }

    set src(value) {
        this._src = value;
        // Simulate successful image load asynchronously
        setTimeout(() => {
            this.complete = true;
            if (this.onload) {
                this.onload();
            }
        }, 0);
    }

    get src() {
        return this._src;
    }
};

describe("AssetLoader", () => {
    let AssetLoader;

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();
        vi.resetModules();

        // Reset fetch mock
        global.fetch.mockReset();

        // Dynamically import AssetLoader to get fresh instance
        const module = await import("./AssetLoader.js");
        AssetLoader = module.AssetLoader;

        // Reset singleton
        AssetLoader.reset();
    });

    describe("Singleton Pattern", () => {
        it("should return the same instance on multiple getInstance() calls", () => {
            const instance1 = AssetLoader.getInstance();
            const instance2 = AssetLoader.getInstance();

            expect(instance1).toBe(instance2);
        });

        it("should throw error when trying to instantiate directly after getInstance()", () => {
            AssetLoader.getInstance();

            expect(() => new AssetLoader()).toThrow("AssetLoader is a singleton. Use AssetLoader.getInstance() instead.");
        });

        it("should allow reset() to clear singleton instance", () => {
            const instance1 = AssetLoader.getInstance();
            AssetLoader.reset();
            const instance2 = AssetLoader.getInstance();

            expect(instance1).not.toBe(instance2);
        });

        it("should create only one instance across multiple calls", () => {
            const instances = [];
            for (let i = 0; i < 10; i++) {
                instances.push(AssetLoader.getInstance());
            }

            // All instances should be the same
            const firstInstance = instances[0];
            instances.forEach((instance) => {
                expect(instance).toBe(firstInstance);
            });
        });
    });

    describe("Progress Callback", () => {
        it("should accept progress callback via setProgressCallback", async () => {
            const loader = AssetLoader.getInstance();
            const progressCallback = vi.fn();

            loader.setProgressCallback(progressCallback);

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            await loader.loadStaticAssets();

            // Progress callback should have been called
            expect(progressCallback).toHaveBeenCalled();
        });

        it("should call progress callback with values between 0 and 1", async () => {
            const loader = AssetLoader.getInstance();
            const progressValues = [];
            const progressCallback = vi.fn((progress) => {
                progressValues.push(progress);
            });

            loader.setProgressCallback(progressCallback);

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            await loader.loadStaticAssets();

            // All progress values should be between 0 and 1
            progressValues.forEach((value) => {
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThanOrEqual(1);
            });
        });

        it("should work without progress callback", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            // Should not throw error
            await expect(loader.loadStaticAssets()).resolves.not.toThrow();
        });
    });

    describe("Static Assets Loading", () => {
        it("should load all static assets successfully", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ test: "data" }),
                });
            });

            await loader.loadStaticAssets();

            // Verify all assets are loaded
            expect(loader.getCharacterSprite()).not.toBeNull();
            expect(loader.getCharacterAnimations()).not.toBeNull();
            expect(loader.getUIIcons()).not.toBeNull();
            expect(loader.getUIIconsData()).not.toBeNull();
            expect(loader.getMapAnimations()).not.toBeNull();
            expect(loader.isStaticAssetsLoaded()).toBe(true);
        });

        it("should not reload static assets if already loaded", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ test: "data" }),
                });
            });

            await loader.loadStaticAssets();
            const callCount = global.fetch.mock.calls.length;

            // Load again
            await loader.loadStaticAssets();

            // Fetch should not be called again
            expect(global.fetch.mock.calls.length).toBe(callCount);
        });

        it("should throw error if static asset loading fails", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch to fail
            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                });
            });

            await expect(loader.loadStaticAssets()).rejects.toThrow(/Failed to load static assets/);
        });

        it("should reset staticAssetsLoaded flag on error", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch to fail
            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                });
            });

            try {
                await loader.loadStaticAssets();
            } catch (error) {
                // Expected error
            }

            expect(loader.isStaticAssetsLoaded()).toBe(false);
        });
    });

    describe("Map Loading", () => {
        it("should load map and tileset successfully", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((url) => {
                if (url.includes(".json")) {
                    if (url.includes("maps/")) {
                        // Map JSON
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    tilesets: [{ source: "tilesets/test.tsx" }],
                                }),
                        });
                    } else {
                        // Tileset JSON
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ imagewidth: 128 }),
                        });
                    }
                }
            });

            await loader.loadMap("test-map");

            expect(loader.getCurrentMap()).not.toBeNull();
            expect(loader.getCurrentTileset().image).not.toBeNull();
            expect(loader.getCurrentTileset().data).not.toBeNull();
            expect(loader.getCurrentTileset().name).toBe("test");
        });

        it("should throw error if map loading fails", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch to fail
            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                });
            });

            await expect(loader.loadMap("nonexistent-map")).rejects.toThrow(/Failed to load map/);
        });

        it("should update progress during map loading", async () => {
            const loader = AssetLoader.getInstance();
            const progressValues = [];

            loader.setProgressCallback((progress) => {
                progressValues.push(progress);
            });

            // Mock fetch responses
            global.fetch.mockImplementation((url) => {
                if (url.includes(".json")) {
                    if (url.includes("maps/")) {
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    tilesets: [{ source: "tilesets/test.tsx" }],
                                }),
                        });
                    } else {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ imagewidth: 128 }),
                        });
                    }
                }
            });

            await loader.loadMap("test-map");

            // Should have multiple progress updates
            expect(progressValues.length).toBeGreaterThan(1);
            // Final progress should be 1.0
            expect(progressValues[progressValues.length - 1]).toBe(1.0);
        });

        it("should extract correct tileset name from source", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((url) => {
                if (url.includes(".json")) {
                    if (url.includes("maps/")) {
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    tilesets: [{ source: "tilesets/MyTileset.tsx" }],
                                }),
                        });
                    } else {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ imagewidth: 128 }),
                        });
                    }
                }
            });

            await loader.loadMap("test-map");

            // Should convert to lowercase
            expect(loader.getCurrentTileset().name).toBe("mytileset");
        });
    });

    describe("Asset Getters", () => {
        it("should return null for unloaded assets", () => {
            const loader = AssetLoader.getInstance();

            expect(loader.getCharacterSprite()).toBeNull();
            expect(loader.getCharacterAnimations()).toBeNull();
            expect(loader.getUIIcons()).toBeNull();
            expect(loader.getUIIconsData()).toBeNull();
            expect(loader.getMapAnimations()).toBeNull();
            expect(loader.getCurrentMap()).toBeNull();
        });

        it("should return loaded assets after loading", async () => {
            const loader = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ test: "data" }),
                });
            });

            await loader.loadStaticAssets();

            expect(loader.getCharacterSprite()).not.toBeNull();
            expect(loader.getCharacterAnimations()).toEqual({ test: "data" });
            expect(loader.getUIIconsData()).toEqual({ test: "data" });
            expect(loader.getMapAnimations()).toEqual({ test: "data" });
        });

        it("should return tileset with all properties", () => {
            const loader = AssetLoader.getInstance();
            const tileset = loader.getCurrentTileset();

            expect(tileset).toHaveProperty("image");
            expect(tileset).toHaveProperty("data");
            expect(tileset).toHaveProperty("name");
        });
    });

    describe("Loading State", () => {
        it("should report correct loading progress", async () => {
            const loader = AssetLoader.getInstance();

            expect(loader.getProgress()).toBe(0);

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            await loader.loadStaticAssets();

            expect(loader.getProgress()).toBeGreaterThan(0);
        });

        it("should provide detailed loading state", async () => {
            const loader = AssetLoader.getInstance();

            const initialState = loader.getLoadingState();
            expect(initialState.staticAssetsLoaded).toBe(false);
            expect(initialState.hasCharacterSprite).toBe(false);

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({}),
                });
            });

            await loader.loadStaticAssets();

            const loadedState = loader.getLoadingState();
            expect(loadedState.staticAssetsLoaded).toBe(true);
            expect(loadedState.hasCharacterSprite).toBe(true);
            expect(loadedState.hasCharacterAnimations).toBe(true);
            expect(loadedState.hasUIIcons).toBe(true);
            expect(loadedState.hasUIIconsData).toBe(true);
            expect(loadedState.hasMapAnimations).toBe(true);
        });

        it("should track map loading in loading state", async () => {
            const loader = AssetLoader.getInstance();

            const initialState = loader.getLoadingState();
            expect(initialState.hasCurrentMap).toBe(false);
            expect(initialState.hasCurrentTileset).toBe(false);

            // Mock fetch responses
            global.fetch.mockImplementation((url) => {
                if (url.includes(".json")) {
                    if (url.includes("maps/")) {
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    tilesets: [{ source: "tilesets/test.tsx" }],
                                }),
                        });
                    } else {
                        return Promise.resolve({
                            ok: true,
                            json: () => Promise.resolve({ imagewidth: 128 }),
                        });
                    }
                }
            });

            await loader.loadMap("test-map");

            const loadedState = loader.getLoadingState();
            expect(loadedState.hasCurrentMap).toBe(true);
            expect(loadedState.hasCurrentTileset).toBe(true);
        });
    });

    describe("Error Handling", () => {
        it("should handle network errors gracefully", async () => {
            const loader = AssetLoader.getInstance();

            global.fetch.mockImplementation(() => {
                return Promise.reject(new Error("Network error"));
            });

            await expect(loader.loadStaticAssets()).rejects.toThrow(/Failed to load static assets/);
        });

        it("should handle JSON parse errors", async () => {
            const loader = AssetLoader.getInstance();

            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.reject(new Error("Invalid JSON")),
                });
            });

            await expect(loader.loadStaticAssets()).rejects.toThrow();
        });

        it("should include error details in error messages", async () => {
            const loader = AssetLoader.getInstance();

            global.fetch.mockImplementation(() => {
                return Promise.resolve({
                    ok: false,
                    status: 404,
                });
            });

            try {
                await loader.loadMap("missing-map");
            } catch (error) {
                expect(error.message).toContain("missing-map");
                expect(error.message).toContain("Failed to load map");
            }
        });
    });

    describe("Singleton Persistence", () => {
        it("should maintain loaded assets across getInstance calls", async () => {
            const loader1 = AssetLoader.getInstance();

            // Mock fetch responses
            global.fetch.mockImplementation((_url) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ test: "data" }),
                });
            });

            await loader1.loadStaticAssets();

            const loader2 = AssetLoader.getInstance();

            // Should have the same assets
            expect(loader2.getCharacterAnimations()).toEqual({ test: "data" });
            expect(loader2.isStaticAssetsLoaded()).toBe(true);
        });
    });
});
