import { writable } from 'svelte/store';
import { browser } from '../lib/browser.js';

const STORAGE_KEY = 'metro_spotify_fullscreen_mode';
const BACK_BUTTON_STORAGE_KEY = 'metro_back_button_in_bottom_bar';

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

// Create writable store for back button position (true = bottom bar, false = top)
function createBackButtonStore() {
  const { subscribe, set, update } = writable(true);

  return {
    subscribe,
    set: (value) => {
      if (browser) {
        localStorage.setItem(BACK_BUTTON_STORAGE_KEY, JSON.stringify(value));
      }
      set(value);
    },
    update,
    loadFromStorage: () => {
      if (!browser) return;
      const stored = localStorage.getItem(BACK_BUTTON_STORAGE_KEY);
      if (stored !== null) {
        try {
          const value = JSON.parse(stored);
          set(value);
        } catch (e) {
          console.error('Error loading back button setting:', e);
          set(true); // Default to bottom bar
        }
      }
    }
  };
}

export const fullscreenModeStore = createFullscreenStore();
export const backButtonInBottomBarStore = createBackButtonStore();

// Load from storage on initialization
if (browser) {
  fullscreenModeStore.loadFromStorage();
  backButtonInBottomBarStore.loadFromStorage();
}



