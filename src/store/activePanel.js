import { writable } from 'svelte/store';

// Store to track the currently active panel in MultiPanel
export const activePanel = writable(0); // 0 = all notes, 1 = sketches, 2 = settings

