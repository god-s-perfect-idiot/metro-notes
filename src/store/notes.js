import { writable } from 'svelte/store';

// Notes store for managing notes data
class NotesStore {
  constructor() {
    this.notes = writable([]);
    this.loadFromStorage();
    
    // Subscribe to changes and save to localStorage
    this.notes.subscribe(value => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('metro_notes', JSON.stringify(value));
      }
    });
  }
  
  loadFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('metro_notes');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.notes.set(parsed);
        }
      } catch (error) {
        console.error('Error loading notes from storage:', error);
        this.notes.set([]);
      }
    }
  }
  
  createNote(title = '', content = '') {
    const newNote = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title || 'Untitled Note',
      content: content || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.notes.update(currentNotes => {
      return [newNote, ...currentNotes];
    });
    
    return newNote;
  }
  
  updateNote(id, updates) {
    this.notes.update(currentNotes => {
      return currentNotes.map(note => {
        if (note.id === id) {
          return {
            ...note,
            ...updates,
            updatedAt: new Date().toISOString()
          };
        }
        return note;
      });
    });
  }
  
  deleteNote(id) {
    this.notes.update(currentNotes => {
      return currentNotes.filter(note => note.id !== id);
    });
  }
  
  getNote(id) {
    let foundNote = null;
    this.notes.subscribe(notes => {
      foundNote = notes.find(note => note.id === id);
    })();
    return foundNote;
  }
  
  getCurrentState() {
    let state = {
      notes: []
    };
    
    this.notes.subscribe(value => state.notes = value)();
    
    return state;
  }
}

export const notesStore = new NotesStore();
export const notes = notesStore.notes;


