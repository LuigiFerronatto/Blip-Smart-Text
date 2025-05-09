/**
 * scripts/background.js
 * Background script for the SmartText extension
 */

import { initializeStorage } from '../modules/storage.js';
import { rewriteText } from '../modules/ai.js';

// Map to keep track of which tabs have content scripts
const activeTabs = new Map();

// Extension initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("📌 SmartText installed!");
  
  // Initialize storage
  await initializeStorage();
  
  // Create context menus
  createContextMenus();
  
  // Show welcome page on first install
  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

/**
 * Create context menus for the extension
 */
function createContextMenus() {
  // Clear existing menus to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    const menuItems = [
      { id: "aiRewrite", title: "Rewrite with AI 🤖", contexts: ["selection"] },
      { id: "formatText", title: "Format Text ✍️", contexts: ["selection"] },
      { id: "insertEmoji", title: "Insert Emoji 😀", contexts: ["editable"] },
      { id: "separator1", type: "separator", contexts: ["selection", "editable"] },
      { id: "openAIPanel", title: "AI Panel ✨", contexts: ["all"] },
      { id: "openOptions", title: "Settings ⚙️", contexts: ["all"] }
    ];
    
    menuItems.forEach(menu => chrome.contextMenus.create(menu));
    console.log("✅ Context menus created!");
  });
}

/**
 * Check if a URL is valid for content script injection
 */
function isValidURL(url) {
  return url && 
         !url.startsWith("chrome://") && 
         !url.startsWith("chrome-extension://") &&
         !url.startsWith("about:") && 
         !url.startsWith("file://") && 
         !url.includes("chrome.google.com/webstore");
}

/**
 * Inject content scripts into a tab that doesn't have them yet
 */
async function injectContentScript(tabId) {
  try {
    // First inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["styles/content.css"]
    });
    
    // Then inject JavaScript
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["scripts/content.js"]
    });
    
    // Mark tab as injected
    activeTabs.set(tabId, true);
    
    console.log("✅ Content script injected into tab", tabId);
    return true;
  } catch (error) {
    console.error("🚫 Error injecting content script:", error);
    activeTabs.set(tabId, false);
    return false;
  }
}

// Listen for tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isValidURL(tab.url)) {
    // Check if content script is already injected
    chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
      // If no response, the script isn't injected yet
      if (chrome.runtime.lastError || !response) {
        injectContentScript(tabId);
      }
    });
  }
});

// Handle tab removal to clean up our activeTabs map
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Create a service for AI text rewriting
const aiService = {
  rewriteText: async (text, profile) => {
    try {
      return await rewriteText(text, profile);
    } catch (error) {
      console.error("❌ Error in AI service:", error);
      throw error;
    }
  }
};

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Message received in background:", request.action);
  
  // Handle different message actions
  const actions = {
    "ping": () => {
      // Simple ping to check if content script is active
      sendResponse({ status: "active" });
    },
    
    "contentScriptReady": () => {
      // Content script is now ready in this tab
      if (sender.tab) {
        activeTabs.set(sender.tab.id, true);
      }
      sendResponse({ success: true });
    },
    
    "getAIModule": () => {
      // Provide the AI module to the requester
      sendResponse({ 
        success: true, 
        module: {
          rewriteText: async (text, profile) => {
            try {
              return await aiService.rewriteText(text, profile);
            } catch (error) {
              console.error("AI module error:", error);
              throw error;
            }
          }
        }
      });
    },
    
    "openOptions": () => {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    }
  };
  
  // Execute the appropriate action
  if (actions[request.action]) {
    actions[request.action]();
    return true; // Indicate async response
  }
  
  // Forward messages to content script if needed
  if (sender.tab) {
    // This message came from a content script or popup, might need to be handled by content script
    forwardMessageToContentScript(request, sender, sendResponse);
    return true;
  }
  
  // Unhandled action
  sendResponse({ success: false, error: "Unknown action" });
  return false;
});

/**
 * Forward a message to a tab's content script
 */
function forwardMessageToContentScript(request, sender, sendResponse) {
  // Determine target tab
  const targetTabId = sender.tab ? sender.tab.id : null;
  
  if (!targetTabId) {
    sendResponse({ success: false, error: "No target tab" });
    return;
  }
  
  // Forward message to content script
  chrome.tabs.sendMessage(targetTabId, request)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error("❌ Error forwarding message to content script:", error);
      sendResponse({ success: false, error: error.message });
    });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!isValidURL(tab.url)) {
    console.warn("🚫 Context menu cannot execute on this page:", tab.url);
    return;
  }
  
  // Map context menu IDs to actions
  const actionMap = {
    aiRewrite: { action: "aiRewrite", data: info.selectionText },
    formatText: { action: "showFormatMenu", data: info.selectionText },
    insertEmoji: { action: "showEmojiMenu" },
    openAIPanel: { action: "showAIPanel" },
    openOptions: { action: "openOptions" }
  };
  
  const actionInfo = actionMap[info.menuItemId];
  if (!actionInfo) return;
  
  // Handle openOptions directly
  if (actionInfo.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    return;
  }
  
  // Send message to content script
  chrome.tabs.sendMessage(tab.id, actionInfo)
    .catch(error => {
      console.error(`❌ Error executing action ${info.menuItemId}:`, error);
      
      // If error, try injecting content script and retrying
      injectContentScript(tab.id).then(success => {
        if (success) {
          // Wait a bit for the script to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, actionInfo)
              .catch(err => console.error(`❌ Retry failed for ${info.menuItemId}:`, err));
          }, 500);
        }
      });
    });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  const commandActions = {
    "open_ai_rewrite": { action: "aiRewrite" },
    "open_ai_panel": { action: "showAIPanel" },
    "format_text": { action: "showFormatMenu" },
    "insert_emoji": { action: "showEmojiMenu" }
  };
  
  const actionInfo = commandActions[command];
  if (actionInfo) {
    chrome.tabs.sendMessage(tab.id, actionInfo)
      .catch(error => {
        console.error(`❌ Error executing keyboard command:`, error);
        
        // Try injecting content script and retrying
        injectContentScript(tab.id).then(success => {
          if (success) {
            // Wait a bit for the script to initialize
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, actionInfo)
                .catch(err => console.error(`❌ Retry failed for command ${command}:`, err));
            }, 500);
          }
        });
      });
  }
});

// Service worker keep-alive for better reliability
const keepAlive = () => setInterval(() => {
  console.log("♥️ Background script heartbeat");
}, 20000);

keepAlive();