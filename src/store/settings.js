import { writable } from 'svelte/store';
import { browser } from '../lib/browser.js';

const STORAGE_KEY = 'metro_spotify_fullscreen_mode';

// Create writable store with default value (true = fullscreen on)
function createFullscreenStore() {
  const { subscribe, set, update } = writable(true);

  return {
    subscribe,
    set: (value) => {
      if (browser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      }
      set(value);
    },
    update,
    loadFromStorage: () => {
      if (!browser) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        try {
          const value = JSON.parse(stored);
          set(value);
        } catch (e) {
          console.error('Error loading fullscreen setting:', e);
          set(true); // Default to fullscreen on
        }
      }
    }
  };
}

export const fullscreenModeStore = createFullscreenStore();

// Load from storage on initialization
if (browser) {
  fullscreenModeStore.loadFromStorage();
}



