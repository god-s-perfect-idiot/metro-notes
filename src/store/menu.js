import { writable } from 'svelte/store';

// Store for managing note menu state
export const menuState = writable({
  showMenu: false,
  selectedNote: null,
  menuPosition: { y: 0 },
  menuClosing: false,
  deleteHandler: null // Function to call when delete is triggered
});

export function openMenu(note, position, deleteHandler = null) {
  menuState.set({
    showMenu: true,
    selectedNote: note,
    menuPosition: position,
    menuClosing: false,
    deleteHandler
  });
}

export function closeMenu() {
  menuState.update(state => ({
    ...state,
    showMenu: false,
    selectedNote: null,
    menuClosing: false,
    deleteHandler: null
  }));
}

export function setMenuClosing(closing) {
  menuState.update(state => ({
    ...state,
    menuClosing: closing
  }));
}

export function triggerDelete() {
  menuState.update(state => {
    if (state.deleteHandler) {
      state.deleteHandler();
    }
    return state;
  });
}
