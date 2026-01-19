/**
 * AssetLoader - Centralized asset loading and management
 * Handles all resource loading with progress tracking and error handling
 * Singleton pattern - use AssetLoader.getInstance() to access
 */
export class AssetLoader {
    // Singleton instance
    static #instance = null;

    // Static assets (loaded once at startup)
    #characterSprite = null;
    #characterAnimations = null;
    #uiIcons = null;
    #uiIconsData = null;
    #mapAnimations = null;

    // Dynamic assets (loaded per map)
    #currentMap = null;
    #currentTileset = {
        image: null,
        data: null,
        name: null,
    };

    // Loading state
    #staticAssetsLoaded = false;
    #loadingProgress = 0;
    #progressCallback = null;

    /**
     * Private constructor - use getInstance() instead
     * @param {Function} progressCallback - Optional callback(progress) called with 0-1 progress
     */
    constructor(progressCallback = null) {
        // Prevent multiple instances
        if (AssetLoader.#instance) {
            throw new Error("AssetLoader is a singleton. Use AssetLoader.getInstance() instead.");
        }
        this.#progressCallback = progressCallback;
    }

    /**
     * Get singleton instance
     * @returns {AssetLoader}
     */
    static getInstance() {
        if (!AssetLoader.#instance) {
            AssetLoader.#instance = new AssetLoader();
        }
        return AssetLoader.#instance;
    }

    /**
     * Set progress callback for loading updates
     * @param {Function} callback - Callback(progress) called with 0-1 progress
     */
    setProgressCallback(callback) {
        this.#progressCallback = callback;
    }

    /**
     * Reset singleton instance (for testing only)
     */
    static reset() {
        AssetLoader.#instance = null;
    }

    /**
     * Private helper: Load image with promise
     * @param {string} src - Image source path
     * @returns {Promise<Image>}
     */
    async #loadImage(src) {
        const image = new Image();
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            image.src = src;
        });
        return image;
    }

    /**
     * Private helper: Load JSON with fetch
     * @param {string} url - JSON file URL
     * @returns {Promise<Object>}
     */
    async #loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${url} (${response.status})`);
        }
        return await response.json();
    }

    /**
     * Update loading progress and notify callback
     * @param {number} progress - Progress value 0-1
     */
    #updateProgress(progress) {
        this.#loadingProgress = progress;
        if (this.#progressCallback) {
            this.#progressCallback(progress);
        }
    }

    /**
     * Load all static assets in parallel
     * Static assets: character sprites/animations, UI icons, map animations
     * @returns {Promise<void>}
     */
    async loadStaticAssets() {
        if (this.#staticAssetsLoaded) {
            return; // Already loaded
        }

        try {
            this.#updateProgress(0);

            // Load all static assets in parallel
            const results = await Promise.all([
                this.#loadImage("assets/units.png"),
                this.#loadJSON("assets/character-animations-states.json"),
                this.#loadImage("assets/icons.png"),
                this.#loadJSON("assets/icons.json"),
                this.#loadJSON("assets/maps/map-animations.json"),
            ]);

            // Assign loaded assets
            this.#characterSprite = results[0];
            this.#characterAnimations = results[1];
            this.#uiIcons = results[2];
            this.#uiIconsData = results[3];
            this.#mapAnimations = results[4];

            this.#staticAssetsLoaded = true;
            this.#updateProgress(0.5); // Static assets are 50% of initial load
        } catch (error) {
            this.#staticAssetsLoaded = false;
            throw new Error(`Failed to load static assets: ${error.message}`);
        }
    }

    /**
     * Load map and associated tileset
     * @param {string} mapName - Map name (without .json extension)
     * @returns {Promise<void>}
     */
    async loadMap(mapName) {
        try {
            this.#updateProgress(0.5);

            // Load map JSON
            this.#currentMap = await this.#loadJSON(`assets/maps/${mapName}.json`);

            this.#updateProgress(0.75);

            // Extract tileset name from map data
            const tilesetSource = this.#currentMap.tilesets[0].source;
            const tilesetName = tilesetSource.split("/").pop().replace(".tsx", "").toLowerCase();

            // Load tileset image and data in parallel
            const [tilesetImage, tilesetData] = await Promise.all([this.#loadImage(`assets/${tilesetName}.png`), this.#loadJSON(`assets/${tilesetName}.json`)]);

            // Store tileset
            this.#currentTileset = {
                image: tilesetImage,
                data: tilesetData,
                name: tilesetName,
            };

            this.#updateProgress(1.0);
        } catch (error) {
            throw new Error(`Failed to load map "${mapName}": ${error.message}`);
        }
    }

    // ============================================
    // Public Getters - Asset Access
    // ============================================

    /**
     * Get character sprite sheet
     * @returns {Image|null}
     */
    getCharacterSprite() {
        return this.#characterSprite;
    }

    /**
     * Get character animations data
     * @returns {Object|null}
     */
    getCharacterAnimations() {
        return this.#characterAnimations;
    }

    /**
     * Get UI icons image
     * @returns {Image|null}
     */
    getUIIcons() {
        return this.#uiIcons;
    }

    /**
     * Get UI icons coordinate data
     * @returns {Object|null}
     */
    getUIIconsData() {
        return this.#uiIconsData;
    }

    /**
     * Get map animations data
     * @returns {Object|null}
     */
    getMapAnimations() {
        return this.#mapAnimations;
    }

    /**
     * Get current map data
     * @returns {Object|null}
     */
    getCurrentMap() {
        return this.#currentMap;
    }

    /**
     * Get current tileset (image, data, name)
     * @returns {{image: Image|null, data: Object|null, name: string|null}}
     */
    getCurrentTileset() {
        return {
            image: this.#currentTileset.image,
            data: this.#currentTileset.data,
            name: this.#currentTileset.name,
        };
    }

    // ============================================
    // Public Status Methods
    // ============================================

    /**
     * Check if static assets are loaded
     * @returns {boolean}
     */
    isStaticAssetsLoaded() {
        return this.#staticAssetsLoaded;
    }

    /**
     * Get current loading progress
     * @returns {number} Progress 0-1
     */
    getProgress() {
        return this.#loadingProgress;
    }

    /**
     * Get detailed loading state
     * @returns {Object}
     */
    getLoadingState() {
        return {
            staticAssetsLoaded: this.#staticAssetsLoaded,
            progress: this.#loadingProgress,
            hasCharacterSprite: this.#characterSprite !== null,
            hasCharacterAnimations: this.#characterAnimations !== null,
            hasUIIcons: this.#uiIcons !== null,
            hasUIIconsData: this.#uiIconsData !== null,
            hasMapAnimations: this.#mapAnimations !== null,
            hasCurrentMap: this.#currentMap !== null,
            hasCurrentTileset: this.#currentTileset.image !== null,
        };
    }
}
