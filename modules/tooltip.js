/**
 * modules/tooltip.js
 * Manages the tooltip/floating menu for text selection
 */

// Simplified showToast function if UI module cannot be imported
const showToast = function(message, type = 'info', duration = 3000) {
  console.log(`[${type}] ${message}`);
  
  // Try to create a visual toast
  try {
    // Remove existing toasts
    document.querySelectorAll('.smarttext-toast').forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `smarttext-toast ${type}`;
    
    // Icons for each type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-message">${message}</div>
    `;
    
    // Set position and style
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'white';
    toast.style.color = '#333';
    toast.style.padding = '10px 15px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toast.style.zIndex = '2147483647';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.fontSize = '14px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Add to document body
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  } catch (error) {
    // Just log if we can't create a visual toast
    console.error("Error creating toast:", error);
  }
};

/**
 * Create and manage the tooltip that appears when text is selected
 */
export class TooltipManager {
  constructor(settings) {
    this.settings = settings || { floatingMenu: true };
    this.tooltipElement = null;
    this.activeRange = null;
    this.isVisible = false;
    this.formatHandlers = {};
    this.editorElement = null; // Reference to the active editor element
    
    // Bind custom methods
    this.handleSelection = this.handleSelection.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
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
    
    // Listen for selection changes
    document.addEventListener('selectionchange', this.handleSelection);
    
    // Listen for focus changes
    document.addEventListener('focusin', this.handleFocus);
    
    // Add mutation observer to detect dynamic editor elements
    this.setupMutationObserver();
    
    console.log("✅ SmartText: Tooltip manager initialized");
    return true;
  }
  
  /**
   * Setup mutation observer to detect new editor elements
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          // Check for new editable elements
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const editableElements = this.findEditableElements(node);
              editableElements.forEach(el => {
                // Set data attribute to mark as processed
                if (!el.dataset.smarttextProcessed) {
                  el.dataset.smarttextProcessed = 'true';
                  console.log("Detected new editable element:", el);
                }
              });
            }
          });
        }
      });
    });
    
    // Start observing the whole document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Find all editable elements within a container
   */
  findEditableElements(container) {
    const results = [];
    
    // Direct editable elements
    const selectors = [
      'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([readonly])',
      'textarea:not([readonly])',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '.editable',
      '.ql-editor', // Quill
      '.ProseMirror', // ProseMirror
      '.mce-content-body', // TinyMCE
      '.fr-element', // Froala
      '.cke_editable', // CKEditor
      '.blip-select__option', // Blip specific
      '.blip-select input', // Blip specific
      '.textarea-container', // Blip specific
      '.textarea-container textarea', // Blip specific
      '.text-input' // Blip specific
    ];
    
    // Query for all editable elements
    selectors.forEach(selector => {
      try {
        const elements = container.querySelectorAll(selector);
        elements.forEach(el => results.push(el));
      } catch (e) {
        // Skip invalid selectors
      }
    });
    
    // Also check the container itself
    if (this.isEditableElement(container)) {
      results.push(container);
    }
    
    return results;
  }
  
  /**
   * Handle focus events to track active editor
   */
  handleFocus(event) {
    const target = event.target;
    
    if (this.isEditableElement(target)) {
      console.log("Focus on editable element:", target);
      this.editorElement = target;
    }
  }
  
  /**
   * Handle selection changes
   */
  handleSelection() {
    const selection = window.getSelection();
    
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    // Only show tooltip for non-empty selections and if enabled
    if (selectedText && this.settings.floatingMenu) {
      // Find containing editable element
      const container = range.commonAncestorContainer;
      let editableElement = null;
      
      if (container.nodeType === Node.ELEMENT_NODE) {
        editableElement = this.isEditableElement(container) ? container : null;
      } else if (container.nodeType === Node.TEXT_NODE && container.parentElement) {
        editableElement = this.isEditableElement(container.parentElement) ? container.parentElement : null;
      }
      
      // Search up the DOM tree
      if (!editableElement) {
        let element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
        while (element && element !== document.body) {
          if (this.isEditableElement(element)) {
            editableElement = element;
            break;
          }
          element = element.parentElement;
        }
      }
      
      // Update the current editor element
      if (editableElement) {
        this.editorElement = editableElement;
        console.log("Selection in editable element:", editableElement);
      }
      
      // Show the tooltip
      this.show(range);
    }
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
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.remove();
    }
    
    // Create new tooltip
    this.tooltipElement = document.createElement("div");
    this.tooltipElement.id = "smarttext-format-menu";
    this.tooltipElement.className = "smarttext-floating-menu";
    
    // Apply styles directly to ensure it's not affected by page CSS
    const tooltipStyles = {
      position: 'absolute',
      backgroundColor: '#FFFFFF',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '2147483647',
      overflow: 'hidden',
      padding: '8px',
      transition: 'all 0.2s ease',
      opacity: '0',
      transform: 'translateY(10px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      border: '1px solid #E0E0E0',
      minWidth: '400px',
      maxWidth: '400px'
    };
    
    Object.assign(this.tooltipElement.style, tooltipStyles);
    
    // HTML for the tooltip
    this.tooltipElement.innerHTML = `
      <div class="menu-row primary-format" style="display: flex; align-items: center; gap: 4px; padding: 2px;">
        <button class="menu-btn" data-action="bold" title="Bold (Ctrl+B)" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <b>B</b>
        </button>
        <button class="menu-btn" data-action="italic" title="Italic (Ctrl+I)" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <i>I</i>
        </button>
        <button class="menu-btn" data-action="strike" title="Strikethrough (Ctrl+E)" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <s>S</s>
        </button>
        <button class="menu-btn" data-action="code" title="Code (Ctrl+K)" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <code>{ }</code>
        </button>
        <div style="width: 1px; height: 20px; background-color: #E0E0E0; margin: 0 4px;"></div>
        <button class="menu-btn" data-action="list-ordered" title="Numbered List" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <span class="icon">1.</span>
        </button>
        <button class="menu-btn" data-action="list-unordered" title="Bullet List" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <span class="icon">•</span>
        </button>
        <button class="menu-btn" data-action="quote" title="Quote" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
          <span class="icon">&gt;</span>
        </button>
      </div>
      <div class="menu-row secondary-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid #E0E0E0; padding-top: 8px;">
        <button class="menu-btn ai-btn" data-action="ai-rewrite" title="Rewrite with AI" style="background: linear-gradient(135deg, #1968F0, #0C4EC0); color: white; padding: 6px 12px; border-radius: 16px; font-weight: 500; border: none; cursor: pointer;">
          <span class="icon">✨</span> <span class="btn-text">Rewrite with AI</span>
        </button>
        <div class="dropdown-group" style="position: relative;">
          <button class="menu-btn dropdown-btn" data-action="show-more" title="More options" style="background: transparent; border: 1px solid transparent; cursor: pointer; border-radius: 4px; padding: 6px 8px; font-size: 14px; color: #292929; display: flex; align-items: center; justify-content: center; min-width: 32px; height: 32px;">
            <span class="icon">⋮</span>
          </button>
          <div class="dropdown-content" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #E0E0E0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08); min-width: 180px; z-index: 2147483647; padding: 4px; margin-top: 4px;">
            <button class="dropdown-item" data-action="emoji" title="Insert Emoji" style="display: flex; align-items: center; padding: 8px 12px; width: 100%; text-align: left; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: #292929; font-size: 14px; gap: 8px;">
              😀 Emojis
            </button>
            <button class="dropdown-item" data-action="clear-format" title="Clear Formatting" style="display: flex; align-items: center; padding: 8px 12px; width: 100%; text-align: left; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: #292929; font-size: 14px; gap: 8px;">
              Aa Clear Formatting
            </button>
            <button class="dropdown-item" data-action="settings" title="Settings" style="display: flex; align-items: center; padding: 8px 12px; width: 100%; text-align: left; background: transparent; border: none; border-radius: 4px; cursor: pointer; color: #292929; font-size: 14px; gap: 8px;">
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add styles for hover states
    const style = document.createElement('style');
    style.textContent = `
      #smarttext-format-menu .menu-btn:hover {
        background-color: rgba(25, 104, 240, 0.1) !important;
        border-color: #C5D9FB !important;
      }
      
      #smarttext-format-menu .menu-btn.active {
        background-color: #C5D9FB !important;
        transform: scale(0.95) !important;
      }
      
      #smarttext-format-menu .ai-btn:hover {
        background: linear-gradient(135deg, #0C4EC0, #072F73) !important;
        box-shadow: 0 2px 4px rgba(9, 77, 192, 0.3) !important;
      }
      
      #smarttext-format-menu .dropdown-content.show {
        display: block !important;
        animation: fadeIn 0.2s ease !important;
      }
      
      #smarttext-format-menu .dropdown-item:hover {
        background-color: rgba(25, 104, 240, 0.1) !important;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    
    // Add to page
    document.head.appendChild(style);
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
    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;
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
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
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
      if (dropdownContent && dropdownContent.style.display === 'block') {
        if (!e.target.matches(".dropdown-btn") && !e.target.closest(".dropdown-content")) {
          dropdownContent.style.display = 'none';
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
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      
      const selectedText = selection.toString().trim();
      console.log(`Applying action "${action}" to text: "${selectedText}"`);
      
      try {
        // Always check if we have a valid editor element
        if (!this.editorElement && action !== 'settings') {
          // Try to find editor element from selection
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          let element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
          
          while (element && element !== document.body) {
            if (this.isEditableElement(element)) {
              this.editorElement = element;
              break;
            }
            element = element.parentElement;
          }
          
          if (!this.editorElement) {
            console.warn("No editable element found for formatting");
            showToast("Please select text within an editable area", "error");
            return;
          }
        }
        
        // Execute the action
        this.formatHandlers[action](selectedText);
      } catch (error) {
        console.error(`Error executing action ${action}:`, error);
        showToast(`Error executing ${action}`, "error");
      }
    }
    
    // Close dropdown if open
    const dropdownContent = this.tooltipElement.querySelector(".dropdown-content");
    if (dropdownContent) {
      dropdownContent.style.display = 'none';
    }
    
    // Hide tooltip for certain actions
    if (action !== "show-more" && action !== "emoji") {
      this.hide();
    }
  }
  
  /**
   * Format selected text with markers
   * @param {string} marker - The marker to add (e.g., "*", "_")
   * @param {string} selectedText - The text to format
   * @returns {boolean} - Whether the formatting was successful
   */
  formatText(marker, selectedText) {
    if (!selectedText) {
      console.warn("No text selected for formatting");
      return false;
    }
    
    console.log(`Formatting text with marker: "${marker}"`);
    console.log(`Selected text: "${selectedText}"`);
    console.log("Editor element:", this.editorElement);
    
    // Special handling for Blip textarea
    if (this.editorElement) {
      // For Blip text areas
      if (this.editorElement.classList.contains('textarea-container') || 
          this.editorElement.closest('.textarea-container')) {
        const textarea = this.editorElement.tagName === 'TEXTAREA' ? 
                         this.editorElement : 
                         this.editorElement.querySelector('textarea');
        
        if (textarea) {
          try {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const fullText = textarea.value;
            
            console.log(`Selection range in textarea: ${start} to ${end}`);
            
            // Insert the marker at the beginning and end of selection
            const newText = fullText.substring(0, start) + marker + selectedText + marker + fullText.substring(end);
            
            // Update the element's value
            textarea.value = newText;
            
            // Update cursor position to end of formatted text
            const newCursorPos = start + marker.length + selectedText.length + marker.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event to notify any listeners
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log("Text formatting completed via direct value change in Blip textarea");
            return true;
          } catch (error) {
            console.error("Error formatting text in Blip textarea:", error);
          }
        }
      }
      
      // For regular input and textarea elements
      if (this.editorElement.tagName === "INPUT" || this.editorElement.tagName === "TEXTAREA") {
        try {
          const start = this.editorElement.selectionStart;
          const end = this.editorElement.selectionEnd;
          const fullText = this.editorElement.value;
          
          console.log(`Selection range: ${start} to ${end}`);
          
          // Insert the marker at the beginning and end of selection
          const newText = fullText.substring(0, start) + marker + selectedText + marker + fullText.substring(end);
          
          // Update the element's value
          this.editorElement.value = newText;
          
          // Update cursor position to end of formatted text
          const newCursorPos = start + marker.length + selectedText.length + marker.length;
          this.editorElement.setSelectionRange(newCursorPos, newCursorPos);
          
          // Trigger input event to notify any listeners
          this.editorElement.dispatchEvent(new Event('input', { bubbles: true }));
          
          console.log("Text formatting completed via direct value change");
          return true;
        } catch (error) {
          console.error("Error formatting text in input/textarea:", error);
        }
      }
      
      // For contentEditable elements
      if (this.editorElement.isContentEditable || 
          this.editorElement.getAttribute('contenteditable') === 'true') {
        try {
          // Try the execCommand approach first
          document.execCommand('insertText', false, marker + selectedText + marker);
          console.log("Text formatting completed via execCommand");
          return true;
        } catch (execErr) {
          console.warn("execCommand failed:", execErr);
          
          try {
            // Fallback to range manipulation
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            // Create a new text node with the formatted text
            const formattedNode = document.createTextNode(marker + selectedText + marker);
            
            // Delete the current selection content and insert the new node
            range.deleteContents();
            range.insertNode(formattedNode);
            
            // Set selection after the newly inserted text
            range.setStartAfter(formattedNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            console.log("Text formatting completed via range manipulation");
            return true;
          } catch (rangeErr) {
            console.error("Range manipulation failed:", rangeErr);
          }
        }
      }
    }
    
    // If we get here, all attempts failed - try clipboard as last resort
    try {
      const formattedText = marker + selectedText + marker;
      navigator.clipboard.writeText(formattedText);
      showToast("Formatted text copied to clipboard", "info");
      console.log("Text formatting failed in editor, copied to clipboard instead");
      return false;
    } catch (clipboardErr) {
      console.error("Clipboard operation failed:", clipboardErr);
      showToast("Failed to format text", "error");
      return false;
    }
  }
  
  /**
   * Format text as list or quote
   */
  formatList(prefix, selectedText) {
  if (!selectedText) return false;
  
  console.log(`Formatting as list with prefix: "${prefix}"`);
  console.log(`Selected text: "${selectedText}"`);
  
  // Format each line with the prefix
  const lines = selectedText.split('\n');
  const formattedText = lines.map(line => `${prefix}${line}`).join('\n');
  
  // Special handling for Blip textarea
  if (this.editorElement) {
    // For Blip text areas
    if (this.editorElement.classList.contains('textarea-container') || 
        this.editorElement.closest('.textarea-container')) {
      const textarea = this.editorElement.tagName === 'TEXTAREA' ? 
                       this.editorElement : 
                       this.editorElement.querySelector('textarea');
      
      if (textarea) {
        try {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const fullText = textarea.value;
          
          // Insert the formatted text
          const newText = fullText.substring(0, start) + formattedText + fullText.substring(end);
          textarea.value = newText;
          
          // Update cursor position
          const newCursorPos = start + formattedText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          
          // Trigger input event
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        } catch (error) {
          console.error("Error formatting list in Blip textarea:", error);
        }
      }
    }
    
    // Direct approach for INPUT and TEXTAREA
    if (this.editorElement.tagName === "INPUT" || this.editorElement.tagName === "TEXTAREA") {
      try {
        const start = this.editorElement.selectionStart;
        const end = this.editorElement.selectionEnd;
        const fullText = this.editorElement.value;
        
        // Insert the formatted text
        const newText = fullText.substring(0, start) + formattedText + fullText.substring(end);
        this.editorElement.value = newText;
        
        // Update cursor position
        const newCursorPos = start + formattedText.length;
        this.editorElement.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger input event
        this.editorElement.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (error) {
        console.error("Error formatting list in input/textarea:", error);
      }
    }
    
    // For contentEditable elements
    if (this.editorElement.isContentEditable || 
        this.editorElement.getAttribute('contenteditable') === 'true') {
      try {
        // Try execCommand first
        document.execCommand('insertText', false, formattedText);
        return true;
      } catch (execErr) {
        console.warn("execCommand failed for list:", execErr);
        
        try {
          // Fallback to range manipulation
          const selection = window.getSelection();
          const range = selection.getRangeAt(0);
          const formattedNode = document.createTextNode(formattedText);
          
          range.deleteContents();
          range.insertNode(formattedNode);
          
          // Set selection after inserted text
          range.setStartAfter(formattedNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        } catch (rangeErr) {
          console.error("Range manipulation failed for list:", rangeErr);
        }
      }
    }
  }
  
  // Clipboard fallback
  try {
    navigator.clipboard.writeText(formattedText);
    showToast("Formatted list copied to clipboard", "info");
    return false;
  } catch (clipboardErr) {
    console.error("Clipboard operation failed for list:", clipboardErr);
    showToast("Failed to format list", "error");
    return false;
  }
}

/**
 * Clear formatting from selected text
 */
clearFormatting() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  
  const selectedText = selection.toString().trim();
  if (!selectedText) return false;
  
  // Remove various formatting markers
  const cleanText = selectedText
    .replace(/\*\*?(.*?)\*\*?/g, '$1')  // Remove asterisks (bold)
    .replace(/__(.*?)__/g, '$1')        // Remove double underscores
    .replace(/_(.*?)_/g, '$1')          // Remove underscores (italic)
    .replace(/~~(.*?)~~/g, '$1')        // Remove tildes (strikethrough)
    .replace(/`(.*?)`/g, '$1')          // Remove backticks (code)
    .replace(/^[>#\-\d.]+\s*/gm, '');   // Remove list/quote markers
  
  // Special handling for Blip textarea
  if (this.editorElement) {
    // For Blip text areas
    if (this.editorElement.classList.contains('textarea-container') || 
        this.editorElement.closest('.textarea-container')) {
      const textarea = this.editorElement.tagName === 'TEXTAREA' ? 
                       this.editorElement : 
                       this.editorElement.querySelector('textarea');
      
      if (textarea) {
        try {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const fullText = textarea.value;
          
          // Insert clean text
          const newText = fullText.substring(0, start) + cleanText + fullText.substring(end);
          textarea.value = newText;
          
          // Update cursor position
          const newCursorPos = start + cleanText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          
          // Trigger input event
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        } catch (error) {
          console.error("Error clearing formatting in Blip textarea:", error);
        }
      }
    }
    
    // Direct approach for INPUT and TEXTAREA
    if (this.editorElement.tagName === "INPUT" || this.editorElement.tagName === "TEXTAREA") {
      try {
        const start = this.editorElement.selectionStart;
        const end = this.editorElement.selectionEnd;
        const fullText = this.editorElement.value;
        
        // Insert clean text
        const newText = fullText.substring(0, start) + cleanText + fullText.substring(end);
        this.editorElement.value = newText;
        
        // Update cursor position
        const newCursorPos = start + cleanText.length;
        this.editorElement.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger input event
        this.editorElement.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      } catch (error) {
        console.error("Error clearing formatting in input/textarea:", error);
      }
    }
    
    // For contentEditable elements
    if (this.editorElement.isContentEditable || 
        this.editorElement.getAttribute('contenteditable') === 'true') {
      try {
        // Try execCommand first
        document.execCommand('insertText', false, cleanText);
        return true;
      } catch (execErr) {
        console.warn("execCommand failed for clearing format:", execErr);
        
        try {
          // Fallback to range manipulation
          const range = selection.getRangeAt(0);
          const cleanNode = document.createTextNode(cleanText);
          
          range.deleteContents();
          range.insertNode(cleanNode);
          
          // Set selection after inserted text
          range.setStartAfter(cleanNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return true;
        } catch (rangeErr) {
          console.error("Range manipulation failed for clearing format:", rangeErr);
        }
      }
    }
  }
  
  // Clipboard fallback
  try {
    navigator.clipboard.writeText(cleanText);
    showToast("Clean text copied to clipboard", "info");
    return false;
  } catch (clipboardErr) {
    console.error("Clipboard operation failed for clearing format:", clipboardErr);
    showToast("Failed to clear formatting", "error");
    return false;
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
  if (!element) return false;
  
  // Standard input elements
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return !element.disabled && !element.readOnly;
  }
  
  // Content editable elements
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true;
  
  // Common classes and attributes
  if (element.getAttribute('role') === 'textbox') return true;
  if (element.classList.contains('editable')) return true;
  
  // Check for common rich text editors
  if (element.classList.contains('ql-editor')) return true; // Quill
  if (element.classList.contains('ProseMirror')) return true; // ProseMirror
  if (element.classList.contains('mce-content-body')) return true; // TinyMCE
  if (element.classList.contains('fr-element')) return true; // Froala
  if (element.classList.contains('cke_editable')) return true; // CKEditor
  
  // Blip-specific elements
  if (element.classList.contains('text-input') || 
      element.classList.contains('textarea-container') ||
      element.classList.contains('blip-select__option') ||
      element.querySelector('.textarea-container') ||
      element.querySelector('textarea')) return true;
  
  // Check for editable parent (for nested editors)
  if (element.closest('[contenteditable="true"]') || 
      element.closest('.textarea-container') ||
      element.closest('.text-input')) return true;
  
  return false;
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