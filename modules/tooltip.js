/**
 * modules/tooltip.js
 * Manages the tooltip/floating menu for text selection
 */

import { showToast } from './ui.js';

/**
 * Create and manage the tooltip that appears when text is selected
 */
export class TooltipManager {
  constructor(settings) {
    this.settings = settings;
    this.tooltipElement = null;
    this.activeRange = null;
    this.isVisible = false;
    this.formatHandlers = {};
  }
  
  /**
   * Initialize the tooltip manager
   */
  async initialize() {
    console.log("🚀 SmartText: Initializing tooltip manager");
    
    // Register format handlers
    this.registerFormatHandlers();
    
    // Listen for clicks outside to hide tooltip
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    
    console.log("✅ SmartText: Tooltip manager initialized");
    return true;
  }
  
  /**
   * Register handlers for different formatting actions
   */
  registerFormatHandlers() {
    this.formatHandlers = {
      "bold": (text) => this.formatText("*", text),
      "italic": (text) => this.formatText("_", text),
      "strike": (text) => this.formatText("~", text),
      "code": (text) => this.formatText("`", text),
      "list-ordered": (text) => this.formatList("1. ", text),
      "list-unordered": (text) => this.formatList("- ", text),
      "quote": (text) => this.formatList("> ", text),
      "ai-rewrite": () => {
        // Dispatch event to core to handle AI rewrite
        document.dispatchEvent(new CustomEvent('smarttext:rewrite', {
          bubbles: true,
          detail: { source: 'tooltip' }
        }));
      },
      "emoji": () => {
        // Dispatch event to show emoji menu
        document.dispatchEvent(new CustomEvent('smarttext:emoji', {
          bubbles: true,
          detail: { source: 'tooltip' }
        }));
      },
      "clear-format": () => this.clearFormatting(),
      "settings": () => {
        chrome.runtime.sendMessage({ action: "openOptions" });
      }
    };
  }
  
  /**
   * Show the tooltip at the given range
   */
  show(range) {
    if (!this.settings.floatingMenu) return;
    
    this.activeRange = range;
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) {
      this.hide();
      return;
    }
    
    // Create tooltip if it doesn't exist
    if (!this.tooltipElement) {
      this.create();
    }
    
    // Update position
    this.updatePosition(range);
    
    // Show tooltip
    this.tooltipElement.style.opacity = "1";
    this.tooltipElement.style.transform = "translateY(0)";
    this.isVisible = true;
  }
  
  /**
   * Hide the tooltip
   */
  hide() {
    if (!this.tooltipElement || !this.isVisible) return;
    
    this.tooltipElement.style.opacity = "0";
    this.tooltipElement.style.transform = "translateY(10px)";
    
    // Remove after animation
    setTimeout(() => {
      if (this.tooltipElement && this.tooltipElement.parentNode) {
        this.tooltipElement.remove();
        this.tooltipElement = null;
      }
      this.isVisible = false;
    }, 200);
  }
  
  /**
   * Create the tooltip element
   */
  create() {
    // Remove existing tooltip if any
    this.hide();
    
    // Create new tooltip
    this.tooltipElement = document.createElement("div");
    this.tooltipElement.id = "smarttext-format-menu";
    this.tooltipElement.className = "smarttext-floating-menu";
    
    // HTML for the tooltip
    this.tooltipElement.innerHTML = `
      <div class="menu-row primary-format">
        <button class="menu-btn" data-action="bold" title="Bold (Ctrl+B)">
          <b>B</b>
        </button>
        <button class="menu-btn" data-action="italic" title="Italic (Ctrl+I)">
          <i>I</i>
        </button>
        <button class="menu-btn" data-action="strike" title="Strikethrough (Ctrl+E)">
          <s>S</s>
        </button>
        <button class="menu-btn" data-action="code" title="Code (Ctrl+K)">
          <code>{ }</code>
        </button>
        <div class="menu-separator"></div>
        <button class="menu-btn" data-action="list-ordered" title="Numbered List">
          <span class="icon">1.</span>
        </button>
        <button class="menu-btn" data-action="list-unordered" title="Bullet List">
          <span class="icon">•</span>
        </button>
        <button class="menu-btn" data-action="quote" title="Quote">
          <span class="icon">&gt;</span>
        </button>
      </div>
      <div class="menu-row secondary-actions">
        <button class="menu-btn ai-btn" data-action="ai-rewrite" title="Rewrite with AI">
          <span class="icon">✨</span> <span class="btn-text">Rewrite with AI</span>
        </button>
        <div class="dropdown-group">
          <button class="menu-btn dropdown-btn" data-action="show-more" title="More options">
            <span class="icon">⋮</span>
          </button>
          <div class="dropdown-content">
            <button class="dropdown-item" data-action="emoji" title="Insert Emoji">
              😀 Emojis
            </button>
            <button class="dropdown-item" data-action="clear-format" title="Clear Formatting">
              Aa Clear Formatting
            </button>
            <button class="dropdown-item" data-action="settings" title="Settings">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add to page
    document.body.appendChild(this.tooltipElement);
    
    // Add event listeners
    this.attachEvents();
  }
  
  /**
   * Update tooltip position based on selection range
   */
  updatePosition(range) {
    if (!this.tooltipElement) return;
    
    const rect = range.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default position below the selection
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - (this.tooltipElement.offsetWidth / 2);
    
    // Ensure tooltip doesn't go off screen
    if (left < 10) left = 10;
    if (left + this.tooltipElement.offsetWidth > viewportWidth - 10) {
      left = viewportWidth - this.tooltipElement.offsetWidth - 10;
    }
    
    // If tooltip would be below viewport, position it above selection
    if (top + this.tooltipElement.offsetHeight > viewportHeight + window.scrollY - 10) {
      top = rect.top + window.scrollY - this.tooltipElement.offsetHeight - 10;
    }
    
    // Apply position
    this.tooltipElement.style.position = "absolute";
    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.zIndex = "2147483647";
  }
  
  /**
   * Attach event listeners to tooltip elements
   */
  attachEvents() {
    if (!this.tooltipElement) return;
    
    // Regular buttons
    this.tooltipElement.querySelectorAll(".menu-btn:not(.dropdown-btn)").forEach(button => {
      if (button.dataset.action !== "show-more") {
        button.addEventListener("click", this.handleAction.bind(this));
      }
    });
    
    // Dropdown button
    const dropdownBtn = this.tooltipElement.querySelector(".dropdown-btn");
    if (dropdownBtn) {
      dropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdownContent = this.tooltipElement.querySelector(".dropdown-content");
        dropdownContent.classList.toggle("show");
      });
    }
    
    // Dropdown items
    this.tooltipElement.querySelectorAll(".dropdown-item").forEach(item => {
      item.addEventListener("click", this.handleAction.bind(this));
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.tooltipElement) return;
      
      const dropdownContent = this.tooltipElement.querySelector(".dropdown-content");
      if (dropdownContent && dropdownContent.classList.contains("show")) {
        if (!e.target.matches(".dropdown-btn") && !e.target.closest(".dropdown-content")) {
          dropdownContent.classList.remove("show");
        }
      }
    });
  }
  
  /**
   * Handle outside clicks (to close tooltip)
   */
  handleOutsideClick(event) {
    // Don't close if clicking inside tooltip or on an editable element
    if (this.tooltipElement && 
       !this.tooltipElement.contains(event.target) && 
       !this.isEditableElement(event.target)) {
      this.hide();
    }
  }
  
  /**
   * Handle tooltip action button clicks
   */
  handleAction(event) {
    const button = event.target.closest("button");
    if (!button) return;
    
    const action = button.dataset.action;
    if (!action) return;
    
    // Visual feedback
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 200);
    
    // Execute action
    if (this.formatHandlers[action]) {
      const selectedText = window.getSelection().toString().trim();
      this.formatHandlers[action](selectedText);
    }
    
    // Close dropdown if open
    const dropdownContent = this.tooltipElement.querySelector(".dropdown-content");
    if (dropdownContent) {
      dropdownContent.classList.remove("show");
    }
    
    // Hide tooltip for certain actions
    if (action !== "show-more" && action !== "emoji") {
      this.hide();
    }
  }
  
  /**
   * Format selected text with markers
   */
  formatText(marker, selectedText) {
    if (!selectedText) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const activeElement = document.activeElement;
    
    if (this.isEditableElement(activeElement)) {
      if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const text = activeElement.value;
        
        // Apply formatting
        activeElement.value = text.slice(0, start) + marker + selectedText + marker + text.slice(end);
        
        // Position cursor after formatted text
        activeElement.selectionStart = activeElement.selectionEnd = start + marker.length + selectedText.length + marker.length;
        
        // Trigger input event
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For contentEditable elements
        try {
          document.execCommand("insertText", false, marker + selectedText + marker);
        } catch (e) {
          // Fallback for DOM manipulation
          const newText = document.createTextNode(marker + selectedText + marker);
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
  }
  
  /**
   * Format text as list or quote
   */
  formatList(prefix, selectedText) {
    if (!selectedText) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const activeElement = document.activeElement;
    
    // Format each line
    const lines = selectedText.split('\n');
    const formattedText = lines.map(line => `${prefix}${line}`).join('\n');
    
    if (this.isEditableElement(activeElement)) {
      if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const text = activeElement.value;
        
        // Apply formatting
        activeElement.value = text.slice(0, start) + formattedText + text.slice(end);
        
        // Position cursor after formatted text
        activeElement.selectionStart = activeElement.selectionEnd = start + formattedText.length;
        
        // Trigger input event
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For contentEditable elements
        try {
          document.execCommand("insertText", false, formattedText);
        } catch (e) {
          // Fallback for DOM manipulation
          const newText = document.createTextNode(formattedText);
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
  }
  
  /**
   * Clear formatting from selected text
   */
  clearFormatting() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) return;
    
    // Remove formatting markers
    const cleanText = selectedText
      .replace(/\*\*?(.*?)\*\*?/g, '$1')  // Remove asterisks (bold)
      .replace(/__(.*?)__/g, '$1')        // Remove double underscores
      .replace(/_(.*?)_/g, '$1')          // Remove underscores (italic)
      .replace(/~~(.*?)~~/g, '$1')        // Remove tildes (strikethrough)
      .replace(/`(.*?)`/g, '$1');         // Remove backticks (code)
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const activeElement = document.activeElement;
    
    if (this.isEditableElement(activeElement)) {
      if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA") {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const text = activeElement.value;
        
        // Apply clean text
        activeElement.value = text.slice(0, start) + cleanText + text.slice(end);
        activeElement.selectionStart = activeElement.selectionEnd = start + cleanText.length;
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // For contentEditable elements
        try {
          document.execCommand("insertText", false, cleanText);
        } catch (e) {
          // Fallback for DOM manipulation
          const newText = document.createTextNode(cleanText);
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
  }
  
  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Hide tooltip if floating menu is disabled
    if (!this.settings.floatingMenu) {
      this.hide();
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
}

// Helper functions for external use
export function createTooltip(range, settings) {
  const manager = new TooltipManager(settings);
  manager.show(range);
  return manager;
}

export function hideTooltip(tooltipElement) {
  if (tooltipElement && tooltipElement.id === "smarttext-format-menu") {
    tooltipElement.style.opacity = "0";
    setTimeout(() => {
      if (tooltipElement.parentNode) {
        tooltipElement.remove();
      }
    }, 200);
  }
}