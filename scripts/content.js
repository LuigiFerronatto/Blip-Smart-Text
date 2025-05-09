/**
 * scripts/content.js
 * Content script entry point for the SmartText extension
 */

import { smartTextCore } from '../modules/core.js';
import { TooltipManager } from '../modules/tooltip.js';
import { FloatingButtonManager } from '../modules/floatingButton.js';
import { showToast, showLoader, hideLoader } from '../modules/ui.js';

/**
 * Initialize the extension in the content page
 */
async function initializeSmartText() {
  // Check if already initialized to prevent double initialization
  if (window.hasRunSmartText) {
    console.warn("🚫 SmartText already running on this page.");
    return;
  }
  
  window.hasRunSmartText = true;
  
  console.log("🚀 SmartText: Initializing content script");
  showLoader("Loading SmartText...");
  
  try {
    // Initialize the core module which will handle everything else
    await smartTextCore.initialize();
    
    // Register custom event handlers
    registerCustomEvents();
    
    // Notify background script that content script is ready
    notifyBackgroundScriptReady();
    
    console.log("✅ SmartText: Content script initialized successfully");
  } catch (error) {
    console.error("❌ SmartText: Error initializing content script:", error);
    showToast("SmartText encountered an error initializing. Please refresh the page.", "error");
  } finally {
    hideLoader();
  }
}

/**
 * Register handlers for custom events from other modules
 */
function registerCustomEvents() {
  // Handle AI panel request
  document.addEventListener('smarttext:showAIPanel', (event) => {
    // Call method from core
    chrome.runtime.sendMessage({ action: "showAIPanel" })
      .catch(err => console.error("Error sending showAIPanel message:", err));
  });
  
  // Handle AI rewrite request
  document.addEventListener('smarttext:rewrite', (event) => {
    // Call method from core
    smartTextCore.rewriteSelectedText();
  });
  
  // Handle emoji menu request
  document.addEventListener('smarttext:emoji', (event) => {
    // Call method from core or send message to background
    chrome.runtime.sendMessage({ action: "showEmojiMenu" })
      .catch(err => console.error("Error sending showEmojiMenu message:", err));
  });
}

/**
 * Notify background script that content script is ready
 */
function notifyBackgroundScriptReady() {
  chrome.runtime.sendMessage({ 
    action: "contentScriptReady", 
    url: window.location.href 
  }).catch(err => {
    console.warn("Error notifying background script:", err);
  });
}

// Initialize SmartText when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSmartText);
} else {
  initializeSmartText();
}

// Export core functionality for debugging and testing
window.SmartText = {
  core: smartTextCore,
  showToast,
  showLoader,
  hideLoader
};