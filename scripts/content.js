/**
 * scripts/content.js
 * Content script entry point for the SmartText extension
 */

// Global state to track initialization
const state = {
  initialized: false,
  uiModule: null,
  coreModule: null
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSmartText);
} else {
  initializeSmartText();
}

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
  
  try {
    // First try to load UI module for showing loader/toast
    await loadUIModule();
    
    // Show loading indicator
    if (state.uiModule && state.uiModule.showLoader) {
      state.uiModule.showLoader("Loading SmartText...");
    }
    
    // Load core module
    await loadCoreModule();
    
    // Initialize core if available
    if (state.coreModule) {
      await state.coreModule.initialize();
    } else {
      throw new Error("Core module not available");
    }
    
    // Register custom event handlers
    registerCustomEvents();
    
    // Notify background script that content script is ready
    notifyBackgroundScriptReady();
    
    console.log("✅ SmartText: Content script initialized successfully");
    
    // Set up global SmartText object for debugging
    window.SmartText = {
      showToast: state.uiModule ? state.uiModule.showToast : console.log,
      showLoader: state.uiModule ? state.uiModule.showLoader : console.log,
      hideLoader: state.uiModule ? state.uiModule.hideLoader : console.log,
      core: state.coreModule
    };
    
    state.initialized = true;
  } catch (error) {
    console.error("❌ SmartText: Error initializing content script:", error);
    if (state.uiModule && state.uiModule.showToast) {
      state.uiModule.showToast("SmartText encountered an error initializing. Please refresh the page.", "error");
    }
  } finally {
    // Hide loading indicator
    if (state.uiModule && state.uiModule.hideLoader) {
      state.uiModule.hideLoader();
    }
  }
}

/**
 * Load UI module
 */
async function loadUIModule() {
  try {
    // Get URL for UI module
    const uiModuleSrc = chrome.runtime.getURL('modules/ui.js');
    
    // Import UI module
    const uiModule = await import(uiModuleSrc);
    state.uiModule = uiModule;
    
    return uiModule;
  } catch (error) {
    console.error("❌ SmartText: Error loading UI module:", error);
    
    // Create fallback UI functions
    state.uiModule = {
      showToast: (message, type = 'info') => console.log(`[${type}] ${message}`),
      showLoader: (message) => console.log(`[Loading] ${message}`),
      hideLoader: () => console.log('[Loading] Done')
    };
    
    return state.uiModule;
  }
}

/**
 * Load core module
 */
async function loadCoreModule() {
  try {
    // Get URL for core module
    const coreModuleSrc = chrome.runtime.getURL('modules/core.js');
    
    // Import core module
    const coreModule = await import(coreModuleSrc);
    
    if (coreModule && coreModule.smartTextCore) {
      state.coreModule = coreModule.smartTextCore;
      return coreModule.smartTextCore;
    } else {
      throw new Error("Smart Text Core not found in module");
    }
  } catch (error) {
    console.error("❌ SmartText: Error loading core module:", error);
    
    // Create a minimal core module
    state.coreModule = {
      initialize: async () => false,
      rewriteSelectedText: async () => {
        if (state.uiModule) {
          state.uiModule.showToast("AI rewriting is not available", "error");
        }
        return false;
      }
    };
    
    return state.coreModule;
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
    // Call method from core if available
    if (state.coreModule && state.coreModule.rewriteSelectedText) {
      state.coreModule.rewriteSelectedText();
    } else {
      // Fallback direct message to background
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        chrome.runtime.sendMessage({ 
          action: "rewriteText", 
          text: selectedText,
          profile: { style: "Professional" }
        }).then(response => {
          if (response && response.success) {
            // Try to replace selected text
            replaceSelectedText(response.rewrittenText);
            
            // Show success message
            if (state.uiModule && state.uiModule.showToast) {
              state.uiModule.showToast("Text rewritten successfully!", "success");
            }
          } else {
            throw new Error(response.error || "Failed to rewrite text");
          }
        }).catch(error => {
          console.error("Error rewriting text:", error);
          if (state.uiModule && state.uiModule.showToast) {
            state.uiModule.showToast(error.message || "Error rewriting text", "error");
          }
        });
      } else {
        if (state.uiModule && state.uiModule.showToast) {
          state.uiModule.showToast("Please select text to rewrite", "error");
        }
      }
    }
  });
  
  // Handle emoji menu request
  document.addEventListener('smarttext:emoji', (event) => {
    // Call method from core or send message to background
    chrome.runtime.sendMessage({ action: "showEmojiMenu" })
      .catch(err => console.error("Error sending showEmojiMenu message:", err));
  });
}

/**
 * Helper function to replace selected text
 */
function replaceSelectedText(newText) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  
  const range = selection.getRangeAt(0);
  const activeElement = document.activeElement;
  
  if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const text = activeElement.value;
    
    // Apply new text
    activeElement.value = text.slice(0, start) + newText + text.slice(end);
    
    // Position cursor after new text
    activeElement.selectionStart = activeElement.selectionEnd = start + newText.length;
    
    // Trigger input event
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } else if (activeElement.isContentEditable || 
             activeElement.getAttribute('role') === 'textbox' ||
             activeElement.classList.contains('editable')) {
    // For contentEditable elements
    try {
      // Try execCommand first
      const success = document.execCommand("insertText", false, newText);
      
      if (success) return true;
      
      // Fallback to DOM manipulation
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      
      // Reset selection
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStart(range.endContainer, range.endOffset);
      newRange.collapse(true);
      selection.addRange(newRange);
      
      return true;
    } catch (e) {
      console.error("Error replacing text:", e);
      return false;
    }
  } else {
    // Not in an editable element
    if (state.uiModule && state.uiModule.showToast) {
      state.uiModule.showToast("Text has been rewritten but couldn't be inserted. It has been copied to clipboard.", "info");
    }
    
    // Copy to clipboard as fallback
    navigator.clipboard.writeText(newText)
      .catch(err => console.error("Error copying to clipboard:", err));
    
    return false;
  }
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

// Listener for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Message received in content script:", request.action);
  
  // Handle different message actions
  const actions = {
    "ping": () => {
      // Simple ping to check if content script is active
      sendResponse({ status: "active" });
    },
    
    "aiRewrite": () => {
      // Rewrite selected text with AI
      if (state.coreModule && state.coreModule.rewriteSelectedText) {
        state.coreModule.rewriteSelectedText();
      } else {
        document.dispatchEvent(new CustomEvent('smarttext:rewrite'));
      }
      sendResponse({ success: true });
    },
    
    "showFormatMenu": () => {
      // Show format menu for selected text
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (state.coreModule && state.coreModule.tooltipManager) {
          state.coreModule.tooltipManager.show(range);
        } else {
          // Fallback tooltip showing
          import('./tooltip.js').then(module => {
            if (module && module.createTooltip) {
              module.createTooltip(range, { floatingMenu: true });
            }
          }).catch(err => console.error("Error loading tooltip module:", err));
        }
      }
      sendResponse({ success: true });
    },
    
    "showEmojiMenu": () => {
      // Show emoji menu
      if (state.uiModule && state.uiModule.showToast) {
        state.uiModule.showToast("Emoji picker coming soon!", "info");
      }
      sendResponse({ success: true });
    },
    
    "showAIPanel": () => {
      // Show AI panel
      if (state.uiModule && state.uiModule.showToast) {
        state.uiModule.showToast("AI panel coming soon!", "info");
      }
      sendResponse({ success: true });
    },
    
    "updateSettings": () => {
      // Update settings
      if (state.coreModule && state.coreModule.updateSettings) {
        state.coreModule.updateSettings(request.data);
      }
      sendResponse({ success: true });
    }
  };
  
  // Execute the appropriate action
  if (actions[request.action]) {
    actions[request.action]();
    return true; // Keep message channel open for async response
  }
  
  // Unhandled action
  sendResponse({ success: false, error: "Unknown action" });
  return false;
});