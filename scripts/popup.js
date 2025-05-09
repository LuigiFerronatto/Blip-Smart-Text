/**
 * scripts/popup.js
 * Script to control the popup UI of the SmartText extension
 */

import { getProfiles, getSelectedProfile, setSelectedProfile, getSettings } from '../modules/storage.js';
import { showToast, adjustTextareaHeight } from '../modules/ui.js';

// Global state
const state = {
  profiles: {},
  selectedProfile: null,
  settings: {},
  isInitialized: false
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize the popup with visual feedback
 */
async function init() {
  try {
    // Load data
    await loadData();
    
    // Set up UI elements and event handlers
    setupNavigation();
    setupQuickActions();
    setupAIWriting();
    checkExtensionStatus();
    
    // Adjust textarea heights
    document.querySelectorAll('textarea').forEach(textarea => {
      adjustTextareaHeight(textarea);
      textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
    });
    
    state.isInitialized = true;
    
    console.log("✅ Popup initialized");
  } catch (error) {
    console.error("❌ Error initializing popup:", error);
    showToast("Error loading settings", "error");
  }
}

/**
 * Load all necessary data from storage
 */
async function loadData() {
  try {
    // Get profiles
    state.profiles = await getProfiles();
    
    // Get selected profile
    state.selectedProfile = await getSelectedProfile();
    
    // Get settings
    state.settings = await getSettings();
    
    // Update profile display
    updateCurrentProfileDisplay();
    
    return true;
  } catch (error) {
    console.error("❌ Error loading data:", error);
    return false;
  }
}

/**
 * Set up navigation between screens
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const screens = document.querySelectorAll('.screen');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all items and screens
      navItems.forEach(navItem => navItem.classList.remove('active'));
      screens.forEach(screen => screen.classList.remove('active'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Show corresponding screen
      const screenId = `${item.dataset.screen}-screen`;
      const screen = document.getElementById(screenId);
      
      if (screen) {
        screen.classList.add('active');
        
        // Reset scroll position
        document.querySelector('.content-area').scrollTop = 0;
      }
    });
  });
}

/**
 * Set up quick action buttons
 */
function setupQuickActions() {
  const aiWritingBtn = document.getElementById('ai-writing-btn');
  const configBtn = document.getElementById('config-btn');
  
  if (aiWritingBtn) {
    aiWritingBtn.addEventListener('click', () => {
      document.querySelector('.nav-item[data-screen="ai-writing"]').click();
    });
  }
  
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      document.querySelector('.nav-item[data-screen="settings"]').click();
    });
  }
}

/**
 * Set up AI writing screen functionality
 */
function setupAIWriting() {
  const rewriteBtn = document.getElementById('rewrite-btn');
  const aiInput = document.getElementById('ai-input');
  const aiOutput = document.getElementById('ai-output');
  const writingStyle = document.getElementById('writing-style');
  const uxOptimization = document.getElementById('ux-optimization');
  const cognitiveBias = document.getElementById('cognitive-bias');
  const addEmojis = document.getElementById('add-emojis');
  const copyOutputBtn = document.getElementById('copy-output');
  const saveOutputBtn = document.getElementById('save-output');
  
  // Fill form with current profile settings
  if (state.selectedProfile) {
    if (writingStyle) writingStyle.value = state.selectedProfile.style || 'Professional';
    if (uxOptimization) uxOptimization.checked = !!state.selectedProfile.uxWriting;
    if (cognitiveBias) cognitiveBias.checked = !!state.selectedProfile.cognitiveBias;
    if (addEmojis) addEmojis.checked = !!state.selectedProfile.addEmojis;
  }
  
  // Rewrite button functionality
  if (rewriteBtn && aiInput && aiOutput) {
    rewriteBtn.addEventListener('click', async () => {
      const text = aiInput.value.trim();
      if (!text) {
        showToast("Please enter text to rewrite", "error");
        aiInput.focus();
        return;
      }
      
      try {
        // Show loading state
        rewriteBtn.disabled = true;
        rewriteBtn.innerHTML = '<span class="loading-spinner-small"></span> Rewriting...';
        
        // Create temporary profile
        const tempProfile = {
          style: writingStyle.value,
          uxWriting: uxOptimization.checked,
          cognitiveBias: cognitiveBias.checked,
          addEmojis: addEmojis.checked
        };
        
        // Get AI module from background script
        const aiModule = await getAIModule();
        
        // Rewrite text
        const rewrittenText = await aiModule.rewriteText(text, tempProfile);
        
        // Show result
        aiOutput.value = rewrittenText;
        adjustTextareaHeight(aiOutput);
        
        showToast("Text rewritten successfully!", "success");
      } catch (error) {
        console.error("❌ Error rewriting text:", error);
        showToast(error.message || "Error rewriting text", "error");
      } finally {
        // Reset button state
        rewriteBtn.disabled = false;
        rewriteBtn.innerHTML = '🔄 Rewrite with AI';
      }
    });
  }
  
  // Copy output button
  if (copyOutputBtn && aiOutput) {
    copyOutputBtn.addEventListener('click', () => {
      const text = aiOutput.value.trim();
      if (!text) {
        showToast("No text to copy", "error");
        return;
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(text)
        .then(() => showToast("Text copied to clipboard!", "success"))
        .catch(() => showToast("Error copying text", "error"));
    });
  }
  
  // Save output as file button
  if (saveOutputBtn && aiOutput) {
    saveOutputBtn.addEventListener('click', () => {
      const text = aiOutput.value.trim();
      if (!text) {
        showToast("No text to save", "error");
        return;
      }
      
      // Create file for download
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      a.download = 'rewritten-text.txt';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      showToast("Text saved!", "success");
    });
  }
}

/**
 * Check extension status in current tab
 */
function checkExtensionStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    
    chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
      const statusElem = document.getElementById('extension-status');
      if (!statusElem) return;
      
      if (chrome.runtime.lastError || !response) {
        // Script not active in current page
        statusElem.textContent = 'Inactive';
        statusElem.classList.remove('active');
      } else {
        // Script is active
        statusElem.textContent = 'Active';
        statusElem.classList.add('active');
      }
    });
  });
}

/**
 * Update display of current profile
 */
function updateCurrentProfileDisplay() {
  const currentProfileElem = document.getElementById('current-profile');
  if (currentProfileElem && state.selectedProfile) {
    currentProfileElem.textContent = state.selectedProfile.name;
  }
}

/**
 * Get AI module from background script
 * @returns {Promise<Object>} - AI module with rewriteText method
 */
async function getAIModule() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getAIModule" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ Error getting AI module:", chrome.runtime.lastError);
        reject(new Error("Failed to connect to AI service"));
        return;
      }
      
      if (response && response.success && response.module) {
        resolve(response.module);
      } else {
        reject(new Error("Failed to load AI module"));
      }
    });
  });
}

/**
 * Send message to background script
 * @param {string} action - Action to perform
 * @param {Object} data - Data to send
 * @returns {Promise<Object>} - Response from background script
 */
function sendMessageToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, data }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}