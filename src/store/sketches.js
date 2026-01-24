import { writable } from 'svelte/store';

// Sketches store for managing sketches data
class SketchesStore {
  constructor() {
    this.sketches = writable([]);
    this.loadFromStorage();
    
    // Subscribe to changes and save to localStorage
    this.sketches.subscribe(value => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('metro_sketches', JSON.stringify(value));
      }
    });
  }
  
  loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('metro_sketches');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.sketches.set(parsed);
        }
      } catch (error) {
        console.error('Error loading sketches from storage:', error);
        this.sketches.set([]);
      }
    }
  }
  
  createSketch(imageData = '') {
    const newSketch = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageData: imageData || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.sketches.update(currentSketches => {
      return [newSketch, ...currentSketches];
    });
    
    return newSketch;
  }
  
  updateSketch(id, updates) {
    this.sketches.update(currentSketches => {
      return currentSketches.map(sketch => {
        if (sketch.id === id) {
          return {
            ...sketch,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return sketch;
      });
    });
  }
  
  deleteSketch(id) {
    this.sketches.update(currentSketches => {
      return currentSketches.filter(sketch => sketch.id !== id);
    });
  }
  
  getSketch(id) {
    let foundSketch = null;
    this.sketches.subscribe(sketches => {
      foundSketch = sketches.find(sketch => sketch.id === id);
    })();
    return foundSketch;
  }
  
  getCurrentState() {
    let state = {
      sketches: []
    };
    
    this.sketches.subscribe(value => state.sketches = value)();
    
    return state;
  }
}

export const sketchesStore = new SketchesStore();
export const sketches = sketchesStore.sketches;

