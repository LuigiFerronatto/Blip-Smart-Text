/**
 * modules/ui.js
 * UI utilities for SmartText extension
 */

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 * @param {number} duration - Duration in milliseconds
 * @returns {HTMLElement} - Toast element
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  document.querySelectorAll('.smarttext-toast').forEach(toast => toast.remove());
  
  // Icons for each type
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `smarttext-toast ${type}`;
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-message">${message}</div>
  `;
  
  // Add to document body
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
}

/**
 * Show a loading indicator
 * @param {string} message - Message to display
 * @returns {HTMLElement} - Loader element
 */
export function showLoader(message = 'Loading...') {
  // Check if loader already exists
  let loader = document.getElementById('smarttext-loader');
  
  if (loader) {
    // Update message
    const msgElement = loader.querySelector('.loader-text');
    if (msgElement) msgElement.textContent = message;
    
    loader.style.display = 'flex';
    return loader;
  }
  
  // Create new loader
  loader = document.createElement('div');
  loader.id = 'smarttext-loader';
  loader.className = 'smarttext-loader';
  
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <div class="loader-text">${message}</div>
  `;
  
  document.body.appendChild(loader);
  return loader;
}

/**
 * Hide the loading indicator
 */
export function hideLoader() {
  const loader = document.getElementById('smarttext-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 300);
  }
}

/**
 * Adjust textarea height to fit content
 * @param {HTMLTextAreaElement} textarea - Textarea element
 * @param {number} maxHeight - Maximum height in pixels
 */
export function adjustTextareaHeight(textarea, maxHeight = 200) {
  // Ensure this is a valid textarea
  if (!textarea || textarea.tagName !== 'TEXTAREA') return;

  // Reset height to calculate scrollHeight correctly
  textarea.style.height = 'auto';
  
  // Set new height
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${newHeight}px`;
}

/**
 * Check if an element is editable
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - Whether element is editable
 */
export function isEditable(element) {
  return element && (
    element.tagName === 'INPUT' || 
    element.tagName === 'TEXTAREA' || 
    element.isContentEditable ||
    element.classList.contains('editable') ||
    element.getAttribute('role') === 'textbox'
  );
}

/**
 * Get the selected text
 * @returns {string} - Selected text
 */
export function getSelectedText() {
  return window.getSelection().toString().trim();
}

/**
 * Position an element relative to another element
 * @param {HTMLElement} element - Element to position
 * @param {HTMLElement} target - Target element to position relative to
 * @param {string} position - Position (top, bottom, left, right)
 * @param {number} offset - Offset in pixels
 */
export function positionElement(element, target, position = 'bottom', offset = 10) {
  // Ensure both elements exist
  if (!element || !target) return;

  const targetRect = target.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  let top, left;
  
  // Calculate position
  switch (position) {
    case 'top':
      top = targetRect.top - elementRect.height - offset;
      left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
      break;
    case 'bottom':
      top = targetRect.bottom + offset;
      left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
      break;
    case 'left':
      top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2);
      left = targetRect.left - elementRect.width - offset;
      break;
    case 'right':
      top = targetRect.top + (targetRect.height / 2) - (elementRect.height / 2);
      left = targetRect.right + offset;
      break;
    default:
      top = targetRect.bottom + offset;
      left = targetRect.left + (targetRect.width / 2) - (elementRect.width / 2);
  }
  
  // Adjust to keep on screen
  if (left < 10) left = 10;
  if (left + elementRect.width > viewportWidth - 10) {
    left = viewportWidth - elementRect.width - 10;
  }
  
  // If element would be below viewport, position above target
  if (top + elementRect.height > viewportHeight - 10) {
    if (position === 'bottom') {
      top = targetRect.top - elementRect.height - offset;
    } else {
      top = viewportHeight - elementRect.height - 10;
    }
  }
  
  // If element would be above viewport, position below target
  if (top < 10) {
    if (position === 'top') {
      top = targetRect.bottom + offset;
    } else {
      top = 10;
    }
  }
  
  // Apply position
  element.style.position = 'fixed';
  element.style.zIndex = '2147483646'; // High z-index but below tooltip
  element.style.top = `${top}px`;
  element.style.left = `${left}px`;
  
  // Animate entry
  setTimeout(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, 10);
}

/**
 * Create a modal dialog
 * @param {string} title - Modal title
 * @param {string} content - HTML content
 * @param {Array<Object>} buttons - Array of button objects
 * @returns {HTMLElement} - Modal element
 */
export function createModal(title, content, buttons = []) {
  // Remove existing modal
  const existingModal = document.getElementById('smarttext-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'smarttext-modal';
  modalContainer.className = 'smarttext-modal';
  
  // Close modal when clicking on overlay
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      modalContainer.remove();
    }
  });
  
  // Default buttons if none provided
  if (!buttons || buttons.length === 0) {
    buttons = [
      {
        text: 'Close',
        type: 'secondary',
        onClick: () => modalContainer.remove()
      }
    ];
  }
  
  // Create modal content
  modalContainer.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${buttons.map(btn => `
          <button class="btn btn-${btn.type || 'secondary'}" data-action="${btn.action || ''}">${btn.text}</button>
        `).join('')}
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(modalContainer);
  
  // Add close button event
  const closeBtn = modalContainer.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modalContainer.remove());
  }
  
  // Add button events
  buttons.forEach((btn, index) => {
    const buttonElement = modalContainer.querySelectorAll('.modal-footer .btn')[index];
    if (buttonElement && btn.onClick) {
      buttonElement.addEventListener('click', () => btn.onClick(modalContainer));
    }
  });
  
  // Animate entry
  setTimeout(() => modalContainer.classList.add('show'), 10);
  
  return modalContainer;
}