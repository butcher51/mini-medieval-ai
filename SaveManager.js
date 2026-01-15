import { SAVE_VERSION } from './constants.js';

const STORAGE_KEY = 'mini_medieval_save';

class SaveManager {
    constructor() {
        this.data = this.#load();
    }

    #load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);

            // Version check
            if (parsed.version !== SAVE_VERSION) {
                console.warn('Save version mismatch, ignoring saved data');
                this.clear();
                return null;
            }

            return parsed;
        } catch (e) {
            console.error('Failed to load save:', e);
            return null;
        }
    }

    #save() {
        try {
            const toSave = {
                version: SAVE_VERSION,
                ...this.data
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save:', e);
        }
    }

    getCurrentMap() {
        return this.data?.currentMap || null;
    }

    setCurrentMap(target) {
        if (!this.data) {
            this.data = { version: SAVE_VERSION };
        }
        this.data.currentMap = target;
        this.#save();
    }

    clear() {
        this.data = null;
        localStorage.removeItem(STORAGE_KEY);
    }

    // Extensible: add more getters/setters for future data
    // e.g., getPlayerHealth(), setPlayerHealth(), getInventory(), etc.
}

export const saveManager = new SaveManager();
