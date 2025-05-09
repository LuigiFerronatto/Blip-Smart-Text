/**
 * modules/floatingButton.js
 * Manages the fixed floating button for SmartText
 */

import { showToast } from './ui.js';

/**
 * Manager for the floating action button
 */
export class FloatingButtonManager {
  constructor(settings) {
    this.settings = settings;
    this.buttonElement = null;
    this.isVisible = false;
    this.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      buttonX: 0,
      buttonY: 0
    };
  }
  
  /**
   * Initialize the floating button
   */
  async initialize() {
    console.log("🚀 SmartText: Initializing floating button manager");
    
    // Create button if enabled in settings
    if (this.settings.fixedButton) {
      this.create();
    }
    
    // Listen for custom events
    document.addEventListener('smarttext:toggleButton', (event) => {
      if (event.detail && event.detail.visible !== undefined) {
        if (event.detail.visible) {
          this.show();
        } else {
          this.hide();
        }
      } else {
        this.toggle();
      }
    });
    
    console.log("✅ SmartText: Floating button manager initialized");
    return true;
  }
  
  /**
   * Create the floating button
   */
  create() {
    // Remove existing button if any
    this.remove();
    
    // Create button element
    this.buttonElement = document.createElement('div');
    this.buttonElement.id = 'smarttext-fixed-button';
    this.buttonElement.className = 'smarttext-fixed-button';
    
    // Add button content
    this.buttonElement.innerHTML = `
      <div class="fixed-button-icon">✨</div>
      <div class="fixed-button-tooltip">SmartText: Rewrite with AI</div>
    `;
    
    // Add to page
    document.body.appendChild(this.buttonElement);
    
    // Add click event
    this.buttonElement.addEventListener('click', this.handleClick.bind(this));
    
    // Make button draggable
    this.makeButtonDraggable();
    
    // Show button with animation
    setTimeout(() => {
      this.buttonElement.style.opacity = '1';
      this.buttonElement.style.transform = 'scale(1)';
    }, 100);
    
    this.isVisible = true;
    
    return this.buttonElement;
  }
  
  /**
   * Remove the floating button
   */
  remove() {
    if (this.buttonElement) {
      this.buttonElement.style.opacity = '0';
      this.buttonElement.style.transform = 'scale(0.8)';
      
      setTimeout(() => {
        if (this.buttonElement && this.buttonElement.parentNode) {
          this.buttonElement.remove();
          this.buttonElement = null;
        }
      }, 200);
      
      this.isVisible = false;
    }
  }
  
  /**
   * Show the floating button
   */
  show() {
    if (!this.buttonElement && this.settings.fixedButton) {
      this.create();
    }
  }
  
  /**
   * Hide the floating button
   */
  hide() {
    if (this.buttonElement) {
      this.remove();
    }
  }
  
  /**
   * Toggle the floating button visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Handle button click
   */
  handleClick(event) {
    // Prevent handling if we're ending a drag operation
    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      return;
    }
    
    // Dispatch event to show AI panel
    document.dispatchEvent(new CustomEvent('smarttext:showAIPanel', {
      bubbles: true,
      detail: { source: 'floatingButton' }
    }));
    
    // Also try direct messaging to background
    chrome.runtime.sendMessage({ action: "showAIPanel" })
      .catch(err => console.error("Error sending showAIPanel message:", err));
  }
  
  /**
   * Make the button draggable
   */
  makeButtonDraggable() {
    if (!this.buttonElement) return;
    
    // Mouse down event - start drag
    this.buttonElement.addEventListener('mousedown', (e) => {
      // Don't start drag on tooltip click
      if (e.target.classList.contains('fixed-button-tooltip')) return;
      
      e.preventDefault();
      
      // Initialize drag state
      this.dragState.isDragging = true;
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
      
      const rect = this.buttonElement.getBoundingClientRect();
      this.dragState.buttonX = rect.left;
      this.dragState.buttonY = rect.top;
      
      // Add drag placeholder to body
      const placeholder = document.createElement('div');
      placeholder.id = 'smarttext-drag-placeholder';
      placeholder.style.position = 'fixed';
      placeholder.style.left = `${rect.left}px`;
      placeholder.style.top = `${rect.top}px`;
      placeholder.style.width = `${rect.width}px`;
      placeholder.style.height = `${rect.height}px`;
      placeholder.style.zIndex = '2147483646';
      placeholder.style.pointerEvents = 'none';
      document.body.appendChild(placeholder);
      
      // Add move and up event listeners
      document.addEventListener('mousemove', this.handleDragMove);
      document.addEventListener('mouseup', this.handleDragEnd);
    });
    
    // Handle drag move
    this.handleDragMove = (e) => {
      if (!this.dragState.isDragging) return;
      
      const deltaX = e.clientX - this.dragState.startX;
      const deltaY = e.clientY - this.dragState.startY;
      
      const newX = this.dragState.buttonX + deltaX;
      const newY = this.dragState.buttonY + deltaY;
      
      // Update button position
      this.buttonElement.style.left = `${newX}px`;
      this.buttonElement.style.top = `${newY}px`;
      this.buttonElement.style.right = 'auto';
      this.buttonElement.style.bottom = 'auto';
      
      // Update placeholder position if it exists
      const placeholder = document.getElementById('smarttext-drag-placeholder');
      if (placeholder) {
        placeholder.style.left = `${newX}px`;
        placeholder.style.top = `${newY}px`;
      }
    };
    
    // Handle drag end
    this.handleDragEnd = (e) => {
      if (!this.dragState.isDragging) return;
      
      // Remove event listeners
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.handleDragEnd);
      
      // Remove placeholder
      const placeholder = document.getElementById('smarttext-drag-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      // Keep button position updated
      const rect = this.buttonElement.getBoundingClientRect();
      
      // Save position to storage (optional)
      chrome.storage.local.set({
        'smarttext_button_position': {
          left: rect.left,
          top: rect.top
        }
      }).catch(err => console.error("Error saving button position:", err));
      
      // Reset drag state after a short delay to prevent click event from firing
      setTimeout(() => {
        this.dragState.isDragging = false;
      }, 50);
    };
  }
  
  /**
   * Restore button position from storage
   */
  async restorePosition() {
    if (!this.buttonElement) return;
    
    try {
      const data = await chrome.storage.local.get('smarttext_button_position');
      if (data.smarttext_button_position) {
        const { left, top } = data.smarttext_button_position;
        
        // Apply stored position
        this.buttonElement.style.left = `${left}px`;
        this.buttonElement.style.top = `${top}px`;
        this.buttonElement.style.right = 'auto';
        this.buttonElement.style.bottom = 'auto';
      }
    } catch (error) {
      console.error("Error restoring button position:", error);
    }
  }
  
  /**
   * Update settings
   */
  updateSettings(newSettings) {
    const previousFixedButton = this.settings.fixedButton;
    this.settings = { ...this.settings, ...newSettings };
    
    // Handle fixed button setting change
    if (previousFixedButton !== this.settings.fixedButton) {
      if (this.settings.fixedButton) {
        this.show();
      } else {
        this.hide();
      }
    }
  }
}

// Helper functions for external use
export function createFloatingButton(settings) {
  const manager = new FloatingButtonManager(settings);
  return manager.create();
}

export function hideFloatingButton(buttonElement) {
  if (buttonElement && buttonElement.id === "smarttext-fixed-button") {
    buttonElement.style.opacity = "0";
    buttonElement.style.transform = "scale(0.8)";
    setTimeout(() => {
      if (buttonElement.parentNode) {
        buttonElement.remove();
      }
    }, 200);
  }
}