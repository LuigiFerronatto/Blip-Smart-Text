/**
 * modules/core.js
 * Core functionality and initialization for the SmartText extension
 */

// Import required modules
import { 
    createTooltip, 
    hideTooltip, 
    TooltipManager 
  } from './tooltip.js';
  import { 
    createFloatingButton, 
    hideFloatingButton, 
    FloatingButtonManager 
  } from './floatingButton.js';
  import { getSettings } from './storage.js';
  import { showToast } from './ui.js';
  
  /**
   * Core class for SmartText functionality
   * This provides a centralized way to manage the extension features
   */
  export class SmartTextCore {
    constructor() {
      // Initialize state
      this.activeInput = null;
      this.isInitialized = false;
      this.settings = {
        floatingMenu: true,
        fixedButton: true,
        keyboardShortcuts: true
      };
      
      // Module managers
      this.tooltipManager = null;
      this.floatingButtonManager = null;
      
      // AI module reference - will be loaded from background
      this.aiModule = null;
    }
    
    /**
     * Initialize the SmartText extension
     */
    async initialize() {
      console.log("🚀 SmartText: Initializing core module");
      
      // Load settings first
      await this.loadSettings();
      
      // Initialize module managers with settings
      this.tooltipManager = new TooltipManager(this.settings);
      this.floatingButtonManager = new FloatingButtonManager(this.settings);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize modules
      await this.tooltipManager.initialize();
      await this.floatingButtonManager.initialize();
      
      // Load AI module
      await this.ensureAIModuleLoaded();
      
      // Verify everything is ready
      this.isInitialized = true;
      console.log("✅ SmartText: Core module initialized");
      
      // Emit initialization event
      this.dispatchEvent('smarttext:initialized');
      
      return true;
    }
    
    /**
     * Load user settings from storage
     */
    async loadSettings() {
      try {
        const settings = await getSettings();
        this.settings = { ...this.settings, ...settings };
        return this.settings;
      } catch (error) {
        console.error("❌ Error loading settings:", error);
        return this.settings; // Return defaults
      }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
      // Handle focus events to track active input
      document.addEventListener("focusin", (event) => {
        if (this.isEditableElement(event.target)) {
          this.activeInput = event.target;
        }
      });
      
      // Handle text selection
      document.addEventListener("mouseup", this.handleTextSelection.bind(this));
      document.addEventListener("selectionchange", this.handleSelectionChange.bind(this));
      
      // Handle keyboard shortcuts if enabled
      if (this.settings.keyboardShortcuts) {
        document.addEventListener("keydown", this.handleKeyboardShortcuts.bind(this));
      }
      
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener(this.handleMessages.bind(this));
      
      // Observer for DOM changes (to track dynamically added elements)
      this.setupMutationObserver();
    }
    
    /**
     * Setup mutation observer to monitor DOM changes
     */
    setupMutationObserver() {
      const observer = new MutationObserver((mutations) => {
        // Check if we still have valid selection for tooltip
        const selection = window.getSelection();
        if (!selection.rangeCount) {
          this.tooltipManager.hide();
          return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (selectedText.length > 0 && this.settings.floatingMenu) {
          this.tooltipManager.show(range);
        } else {
          this.tooltipManager.hide();
        }
      });
      
      // Observe body and its subtree for changes
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }
    
    /**
     * Handle text selection events
     */
    handleTextSelection(event) {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        if (!this.settings.floatingMenu) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (selectedText.length > 0) {
          this.tooltipManager.show(range);
        } else {
          this.tooltipManager.hide();
        }
      }, 10);
    }
    
    /**
     * Handle selection change events
     */
    handleSelectionChange(event) {
      if (!this.settings.floatingMenu) return;
      
      const selection = window.getSelection();
      if (!selection.rangeCount) {
        this.tooltipManager.hide();
        return;
      }
      
      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      
      if (selectedText.length > 0) {
        this.tooltipManager.show(range);
      } else {
        this.tooltipManager.hide();
      }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
      if (!this.settings.keyboardShortcuts) return;
      
      // Ctrl+Shift+H - Rewrite with AI
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'h') {
        event.preventDefault();
        this.rewriteSelectedText();
        return;
      }
      
      // Add other shortcuts as needed...
    }
    
    /**
     * Handle messages from background script
     */
    handleMessages(request, sender, sendResponse) {
      console.log("📨 SmartText: Message received:", request.action);
      
      const actions = {
        "ping": () => {
          sendResponse({ status: "active" });
        },
        "aiRewrite": () => {
          this.rewriteSelectedText();
          sendResponse({ success: true });
        },
        "showFormatMenu": () => {
          const selection = window.getSelection();
          if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            this.tooltipManager.show(range);
          }
          sendResponse({ success: true });
        },
        "showEmojiMenu": () => {
          // Call emoji menu functionality here
          sendResponse({ success: true });
        },
        "showAIPanel": () => {
          // Call AI panel functionality here
          sendResponse({ success: true });
        },
        "updateSettings": (data) => {
          this.settings = { ...this.settings, ...request.data };
          this.tooltipManager.updateSettings(this.settings);
          this.floatingButtonManager.updateSettings(this.settings);
          sendResponse({ success: true });
        }
      };
      
      if (actions[request.action]) {
        actions[request.action](request.data);
        return true; // Keep the messaging channel open for async response
      }
      
      sendResponse({ success: false, error: "Unknown action" });
      return false;
    }
    
    /**
     * Rewrite selected text using AI
     */
    async rewriteSelectedText() {
      const selectedText = this.getSelectedText();
      if (!selectedText || selectedText.length < 2) {
        showToast("Please select text to rewrite.", "error");
        return;
      }
      
      try {
        // Ensure AI module is loaded
        await this.ensureAIModuleLoaded();
        
        if (!this.aiModule || !this.aiModule.rewriteText) {
          throw new Error("AI module not available");
        }
        
        // Call AI rewrite
        const rewrittenText = await this.aiModule.rewriteText(selectedText);
        
        // Apply the rewritten text
        this.applyRewrittenText(rewrittenText);
        
        showToast("Text rewritten successfully!", "success");
      } catch (error) {
        console.error("❌ Error rewriting text with AI:", error);
        showToast(error.message || "Failed to rewrite text.", "error");
      } finally {
        this.tooltipManager.hide();
      }
    }
    
    /**
     * Apply rewritten text to active input
     */
    applyRewrittenText(rewrittenText) {
      if (!this.activeInput || !this.isEditableElement(this.activeInput)) return;
      
      if (this.activeInput.tagName === "INPUT" || this.activeInput.tagName === "TEXTAREA") {
        const start = this.activeInput.selectionStart;
        const end = this.activeInput.selectionEnd;
        const text = this.activeInput.value;
        
        // Apply rewritten text
        this.activeInput.value = text.slice(0, start) + rewrittenText + text.slice(end);
        
        // Update cursor position
        this.activeInput.selectionStart = this.activeInput.selectionEnd = start + rewrittenText.length;
        
        // Trigger input event
        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For contentEditable elements
        try {
          document.execCommand("insertText", false, rewrittenText);
        } catch (e) {
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          
          const newText = document.createTextNode(rewrittenText);
          range.deleteContents();
          range.insertNode(newText);
          
          // Reset selection
          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(newText);
          newRange.collapse(false);
          selection.addRange(newRange);
        }
      }
    }
    
    /**
     * Check if an element is editable
     */
    isEditableElement(element) {
      return element && (
        element.tagName === 'INPUT' || 
        element.tagName === 'TEXTAREA' || 
        element.isContentEditable ||
        element.classList.contains('editable') ||
        element.getAttribute('role') === 'textbox'
      );
    }
    
    /**
     * Get selected text
     */
    getSelectedText() {
      return window.getSelection().toString().trim();
    }
    
    /**
     * Ensure AI module is loaded from background script
     */
    async ensureAIModuleLoaded() {
      if (this.aiModule) return this.aiModule;
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getAIModule" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Error loading AI module:", chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          
          if (response && response.success && response.module) {
            this.aiModule = response.module;
            resolve(this.aiModule);
          } else {
            const error = new Error("Failed to load AI module");
            console.error("❌", error);
            reject(error);
          }
        });
      });
    }
    
    /**
     * Dispatch custom events for extension components
     */
    dispatchEvent(eventName, detail = {}) {
      const event = new CustomEvent(eventName, { 
        detail: { ...detail, source: 'smarttext-core' },
        bubbles: true 
      });
      document.dispatchEvent(event);
    }
  }
  
  // Create and export singleton instance
  export const smartTextCore = new SmartTextCore();
  
  // Auto-initialize unless global flag is set
  if (!window.hasRunSmartText) {
    window.hasRunSmartText = true;
    smartTextCore.initialize().catch(err => {
      console.error("❌ Failed to initialize SmartText:", err);
    });
  }