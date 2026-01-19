import { beforeEach, describe, it, expect, vi } from "vitest";
import { SAVE_VERSION } from "./constants.js";

// Mock localStorage before importing SaveManager
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value.toString();
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    },
};

vi.stubGlobal("localStorage", localStorageMock);

describe("SaveManager", () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorageMock.clear();
        // Clear module cache to get a fresh SaveManager instance
        vi.resetModules();
    });

    it("should return null when no save data exists", async () => {
        const { saveManager } = await import("./SaveManager.js");
        expect(saveManager.getCurrentMap()).toBeNull();
    });

    it("should load valid save data", async () => {
        // Set up valid save data
        const saveData = {
            version: SAVE_VERSION,
            currentMap: "test-map",
        };
        localStorageMock.setItem("mini_medieval_save", JSON.stringify(saveData));

        const { saveManager } = await import("./SaveManager.js");
        expect(saveManager.getCurrentMap()).toBe("test-map");
    });

    it("should clear save data on version mismatch", async () => {
        // Set up save data with wrong version
        const saveData = {
            version: SAVE_VERSION - 1,
            currentMap: "old-map",
        };
        localStorageMock.setItem("mini_medieval_save", JSON.stringify(saveData));

        const { saveManager } = await import("./SaveManager.js");

        // Should ignore old version and return null
        expect(saveManager.getCurrentMap()).toBeNull();
        // Should have cleared localStorage
        expect(localStorageMock.getItem("mini_medieval_save")).toBeNull();
    });

    it("should handle malformed JSON gracefully", async () => {
        // Set up invalid JSON
        localStorageMock.setItem("mini_medieval_save", "{ invalid json");

        const { saveManager } = await import("./SaveManager.js");
        expect(saveManager.getCurrentMap()).toBeNull();
    });

    it("should save and retrieve current map", async () => {
        const { saveManager } = await import("./SaveManager.js");

        saveManager.setCurrentMap("dungeon-1");
        expect(saveManager.getCurrentMap()).toBe("dungeon-1");

        // Verify it was actually saved to localStorage
        const saved = JSON.parse(localStorageMock.getItem("mini_medieval_save"));
        expect(saved.currentMap).toBe("dungeon-1");
        expect(saved.version).toBe(SAVE_VERSION);
    });

    it("should initialize data when setting map on empty save", async () => {
        const { saveManager } = await import("./SaveManager.js");

        // Initially no data
        expect(saveManager.getCurrentMap()).toBeNull();

        // Setting map should create data structure
        saveManager.setCurrentMap("new-map");
        expect(saveManager.getCurrentMap()).toBe("new-map");
    });

    it("should clear all save data", async () => {
        const { saveManager } = await import("./SaveManager.js");

        // Set some data
        saveManager.setCurrentMap("test-map");
        expect(saveManager.getCurrentMap()).toBe("test-map");

        // Clear it
        saveManager.clear();
        expect(saveManager.getCurrentMap()).toBeNull();
        expect(localStorageMock.getItem("mini_medieval_save")).toBeNull();
    });

    it("should persist data across SaveManager instances", async () => {
        // First instance saves data
        const { saveManager: instance1 } = await import("./SaveManager.js");
        instance1.setCurrentMap("persistent-map");

        // Reset modules to simulate app restart
        vi.resetModules();

        // Second instance should load the saved data
        const { saveManager: instance2 } = await import("./SaveManager.js");
        expect(instance2.getCurrentMap()).toBe("persistent-map");
    });
});
