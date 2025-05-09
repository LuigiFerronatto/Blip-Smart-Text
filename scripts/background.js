/**
 * scripts/background.js
 * Background script for the SmartText extension
 */

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
 * Initialize storage with default values
 */
async function initializeStorage() {
  try {
    // Check if already initialized
    const isInitialized = await chrome.storage.local.get(['initialized']);
    
    if (!isInitialized.initialized) {
      // Default profile
      const DEFAULT_PROFILE = {
        name: "Default Profile",
        style: "Professional",
        uxWriting: false,
        cognitiveBias: false,
        addEmojis: false,
        autoRewrite: false,
        biases: [],
        customPrompt: ""
      };
      
      // Predefined profiles
      const PREDEFINED_PROFILES = {
        'default': {
          name: 'Default Profile',
          style: 'Professional',
          uxWriting: false,
          cognitiveBias: false,
          addEmojis: false,
          autoRewrite: false,
          biases: [],
          customPrompt: ""
        },
        'professional': {
          name: 'Professional',
          style: 'Professional',
          uxWriting: true,
          cognitiveBias: false,
          addEmojis: false,
          autoRewrite: false,
          biases: [],
          customPrompt: "Keep communication clear, concise, and professional."
        },
        'marketing': {
          name: 'Marketing',
          style: 'Persuasive',
          uxWriting: false,
          cognitiveBias: true,
          addEmojis: true,
          autoRewrite: false,
          biases: ["social-proof", "scarcity"],
          customPrompt: "Create emotional impact and highlight clear benefits."
        },
        'technical': {
          name: 'Technical',
          style: 'Technical',
          uxWriting: true,
          cognitiveBias: false,
          addEmojis: false,
          autoRewrite: false,
          biases: ["authority"],
          customPrompt: "Prioritize technical accuracy and clarity."
        },
        'social': {
          name: 'Social Media',
          style: 'Casual',
          uxWriting: false,
          cognitiveBias: true,
          addEmojis: true,
          autoRewrite: false,
          biases: ["social-proof"],
          customPrompt: "Create engaging and shareable content."
        }
      };

      // Default settings
      const DEFAULT_SETTINGS = {
        floatingMenu: true,
        fixedButton: true,
        keyboardShortcuts: true,
        defaultProfile: "default",
        maxTokens: 800,
        temperature: 0.7,
        apiKey: "9c834290886249ee86da40290caf6379",
        apiUrl: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview",
        model: "gpt-4o-mini"
      };
      
      // Storage keys
      const STORAGE_KEYS = {
        PROFILES: "smarttext_profiles",
        SELECTED_PROFILE: "smarttext_selected_profile",
        SETTINGS: "smarttext_settings",
        RECENT_EMOJIS: "smarttext_recent_emojis"
      };
      
      // Initialize with predefined profiles
      await chrome.storage.local.set({
        initialized: true,
        [STORAGE_KEYS.PROFILES]: PREDEFINED_PROFILES,
        [STORAGE_KEYS.SELECTED_PROFILE]: PREDEFINED_PROFILES['default'],
        [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
        [STORAGE_KEYS.RECENT_EMOJIS]: ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"]
      });
      
      console.log("✅ Storage initialized with default values");
      return true;
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error initializing storage:", error);
    return false;
  }
}

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

// Create a simple AI rewrite function for text rewrites
async function rewriteText(text, profile) {
  try {
    // Get settings for API key and URL
    const settings = await chrome.storage.local.get('smarttext_settings');
    
    // API configuration - use settings or defaults
    const API_CONFIG = {
      apiKey: settings.smarttext_settings?.apiKey || "9c834290886249ee86da40290caf6379",
      url: settings.smarttext_settings?.apiUrl || "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview"
    };
    
    // Style mappings
    const styleMappings = {
      'Professional': 'Use a formal and objective tone with precise language for corporate environments.',
      'Casual': 'Use a friendly and conversational tone, as if talking to a friend.',
      'Creative': 'Use imaginative and engaging language with metaphors and vivid descriptions.',
      'Technical': 'Use clear and precise technical language with specific terminology.',
      'Persuasive': 'Create persuasive and motivating text that positively influences the reader.'
    };
    
    // Build system prompt
    let systemPrompt = `You are a text rewriting expert who helps improve writing quality while maintaining the original meaning.`;
    
    // Add specific instructions based on profile settings
    if (profile.uxWriting) {
      systemPrompt += ` You apply UX writing principles: clarity, conciseness, and utility. You make text more scannable and user-friendly, using direct and actionable language.`;
    }
    
    if (profile.cognitiveBias) {
      systemPrompt += ` You understand psychological principles and cognitive biases, subtly incorporating techniques like social proof, scarcity, reciprocity, or authority to make the text more persuasive and engaging.`;
    }
    
    if (profile.addEmojis) {
      systemPrompt += ` You incorporate relevant emojis in a balanced way to improve emotional connection with the reader, without overusing them.`;
    }
    
    // Use custom prompt if it exists
    if (profile.customPrompt && profile.customPrompt.trim().length > 0) {
      systemPrompt += ` ${profile.customPrompt.trim()}`;
    }
    
    // Build user prompt
    let userPrompt = `Rewrite the following text keeping the original meaning and intent, but improving its quality:

Original Text:
"${text}"

Style Guidelines:
- Writing Style: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Optimize for clarity and user experience: make text scannable, concise, and action-oriented' : ''}
${profile.cognitiveBias ? '- Apply subtle persuasive techniques to make it more engaging and convincing' : ''}
${profile.addEmojis ? '- Add relevant emojis where appropriate to enhance the message' : ''}

Preserve any key information, technical terms, or specific examples from the original. Your rewrite should be approximately the same length as the original unless brevity improves clarity.`;
    
    // Make API request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(API_CONFIG.url, {
      method: "POST",
      headers: {
        "api-key": API_CONFIG.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorBody = await response.text();
        errorMessage += ` - ${errorBody}`;
      } catch (e) {
        // If we can't parse the error body, just use the status
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Validate response
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid API response");
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI error:", error);
    // Return mock response if API fails
    return `I tried to improve your text but encountered an API error. Please try again later. Error: ${error.message}`;
  }
}

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

    "rewriteText": async () => {
      try {
        // This is called directly from popup.js
        const rewrittenText = await rewriteText(request.text, request.profile);
        sendResponse({ success: true, rewrittenText: rewrittenText });
      } catch (error) {
        console.error("AI rewrite error:", error);
        sendResponse({ success: false, error: error.message });
      }
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
function keepAlive() {
  setInterval(() => {
    console.log("♥️ Background script heartbeat");
  }, 20000);
}

keepAlive();