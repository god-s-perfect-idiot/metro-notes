import './app.css';
import App from './App.svelte';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { cacheManager } from './lib/cache.js';
import { musicStore } from './store/music.js';

// Helper function to setup status bar (always show, non-fullscreen)
async function setupStatusBar() {
  try {
    // Check if StatusBar plugin is available
    if (!StatusBar || typeof StatusBar.show !== 'function') {
      return;
    }
    // Show system status bar (non-fullscreen mode)
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.show();
  } catch (error) {
    // StatusBar API not available (running in browser or plugin not implemented)
    // Silently ignore - this is expected when running in browser
    if (error.message && error.message.includes('not implemented')) {
      // Expected error when running in browser, don't log
      return;
    }
    // Only log unexpected errors
    console.log('StatusBar not available (running in browser)', error);
  }
}

// Initialize Capacitor plugins
async function initCapacitor() {
  try {
    await setupStatusBar();
    
    // Handle app state changes
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
      // Re-set status bar when app becomes active
      if (isActive) {
        setupStatusBar().catch(() => {});
      }
    });
    
    // Handle back button
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });
  } catch (error) {
    console.log('Capacitor not available (running in browser)', error);
  }
}

// Handle media commands from Android media controls
if (typeof window !== 'undefined') {
  window.handleMediaCommand = async (command) => {
    console.log('📱 Received media command:', command);
    try {
      switch (command) {
        case 'play':
          await musicStore.togglePlayPause();
          break;
        case 'pause':
          await musicStore.togglePlayPause();
          break;
        case 'skipNext':
          await musicStore.playNext();
          break;
        case 'skipPrevious':
          await musicStore.playPrevious();
          break;
        default:
          console.warn('Unknown media command:', command);
      }
    } catch (error) {
      console.error('Error handling media command:', error);
    }
  };
}

initCapacitor();

const app = new App({
  target: document.getElementById('app'),
});

export default app;
