/**
 * scripts/popup.js
 * Script to control the popup UI of the SmartText extension
 */

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
    setupProfiles();
    setupSettings();
    setupKeyboardShortcuts();
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
    const profilesResult = await chrome.storage.local.get('smarttext_profiles');
    state.profiles = profilesResult.smarttext_profiles || {};
    
    // Get selected profile
    const selectedProfileResult = await chrome.storage.local.get('smarttext_selected_profile');
    state.selectedProfile = selectedProfileResult.smarttext_selected_profile || {};
    
    // Get settings
    const settingsResult = await chrome.storage.local.get('smarttext_settings');
    state.settings = settingsResult.smarttext_settings || {};
    
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
        
        // Direct call to background script for rewriting
        const result = await chrome.runtime.sendMessage({
          action: "rewriteText",
          text: text,
          profile: tempProfile
        });
        
        if (result && result.success) {
          // Show result
          aiOutput.value = result.rewrittenText;
          adjustTextareaHeight(aiOutput);
          
          showToast("Text rewritten successfully!", "success");
        } else {
          throw new Error(result.error || "Failed to rewrite text");
        }
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
 * Set up profiles screen
 */
function setupProfiles() {
  const profileList = document.getElementById('profile-list');
  const profileName = document.getElementById('profile-name');
  const profileStyle = document.getElementById('profile-style');
  const profileUx = document.getElementById('profile-ux');
  const profileBias = document.getElementById('profile-bias');
  const profileEmoji = document.getElementById('profile-emoji');
  const profileAuto = document.getElementById('profile-auto');
  const saveProfileBtn = document.getElementById('save-profile-btn');
  const newProfileBtn = document.getElementById('new-profile-btn');
  const deleteProfileBtn = document.getElementById('delete-profile-btn');
  
  // Skip if elements not found (not on profiles screen)
  if (!profileList || !saveProfileBtn) return;

  // Load profiles into dropdown
  populateProfilesDropdown(profileList);
  
  // Handle profile selection change
  profileList.addEventListener('change', () => {
    loadProfileDetails(profileList.value);
  });
  
  // Handle save profile button
  saveProfileBtn.addEventListener('click', () => {
    saveCurrentProfile();
  });
  
  // Handle new profile button
  if (newProfileBtn) {
    newProfileBtn.addEventListener('click', () => {
      createNewProfile();
    });
  }
  
  // Handle delete profile button
  if (deleteProfileBtn) {
    deleteProfileBtn.addEventListener('click', () => {
      deleteCurrentProfile();
    });
  }
  
  // Load initial profile details
  if (profileList.value) {
    loadProfileDetails(profileList.value);
  }
}

/**
 * Set up keyboard shortcuts tab
 */
function setupKeyboardShortcuts() {
  // Get all editable shortcut keys
  const shortcutKeys = document.querySelectorAll('.shortcut-keys:not(.static)');
  
  // Skip if not on keyboard shortcuts screen
  if (!shortcutKeys.length) return;
  
  // Load saved shortcuts
  chrome.storage.local.get(null, (data) => {
    for (const key in data) {
      if (key.startsWith('smarttext_shortcut_')) {
        const command = key.replace('smarttext_shortcut_', '');
        const element = document.querySelector(`.shortcut-keys[data-command="${command}"]`);
        if (element) {
          element.textContent = data[key];
        }
      }
    }
  });
  
  // Add click event to each shortcut
  shortcutKeys.forEach(shortcutKey => {
    shortcutKey.addEventListener('click', () => {
      // Get command and current shortcut
      const command = shortcutKey.dataset.command;
      const currentShortcut = shortcutKey.textContent;
      
      // Create and show shortcut editing modal
      createShortcutModal(command, currentShortcut, shortcutKey);
    });
  });
}

/**
 * Create and show shortcut editing modal
 */
function createShortcutModal(command, currentShortcut, shortcutElement) {
  // Remove existing modal if any
  const existingModal = document.getElementById('shortcut-edit-modal');
  if (existingModal) existingModal.remove();
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'shortcut-edit-modal';
  modal.className = 'shortcut-edit-modal';
  
  modal.innerHTML = `
    <div class="shortcut-edit-content">
      <div class="shortcut-edit-header">
        <h3>Edit Keyboard Shortcut</h3>
      </div>
      <p>Press the keys you want to use for this shortcut:</p>
      <div id="shortcut-recorder" class="shortcut-recorder" tabindex="0">${currentShortcut}</div>
      <p class="shortcut-hint">Press Escape to cancel, Backspace to clear</p>
      <div class="shortcut-edit-footer">
        <button id="cancel-shortcut" class="btn btn-secondary">Cancel</button>
        <button id="save-shortcut" class="btn btn-primary">Save</button>
      </div>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(modal);
  
  // Show modal with animation
  setTimeout(() => modal.classList.add('show'), 10);
  
  // Set up recorder
  const recorder = document.getElementById('shortcut-recorder');
  recorder.focus();
  
  // Key recording function
  const recordKey = (e) => {
    e.preventDefault();
    
    // Handle special keys
    if (e.key === 'Escape') {
      // Cancel
      recorder.removeEventListener('keydown', recordKey);
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
      return;
    }
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Clear
      recorder.textContent = 'Not set';
      return;
    }
    
    // Build shortcut string
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Command');
    
    // Add key if it's not a modifier
    if (!/^(Control|Alt|Shift|Meta)$/.test(e.key)) {
      let key = e.key;
      
      // Format key
      if (key === ' ') key = 'Space';
      if (key === '+') key = 'Plus';
      if (key.length === 1) key = key.toUpperCase();
      
      parts.push(key);
    }
    
    // Only update if we have at least a modifier and a key
    if (parts.length >= 2) {
      recorder.textContent = parts.join('+');
    }
  };
  
  // Add listeners
  recorder.addEventListener('keydown', recordKey);
  
  // Cancel button
  document.getElementById('cancel-shortcut').addEventListener('click', () => {
    recorder.removeEventListener('keydown', recordKey);
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  });
  
  // Save button
  document.getElementById('save-shortcut').addEventListener('click', () => {
    // Update shortcut element
    shortcutElement.textContent = recorder.textContent;
    
    // Remove event listener
    recorder.removeEventListener('keydown', recordKey);
    
    // Close modal
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
    
    // Show toast
    showToast("Shortcut updated! Restart browser to apply.", "success");
    
    // Save to extension commands (note: this will only show the suggested shortcut)
    // Actual changing requires the user to go to chrome://extensions/shortcuts
    chrome.storage.local.set({
      ['smarttext_shortcut_' + command]: recorder.textContent
    });
  });
  
  // Close when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      recorder.removeEventListener('keydown', recordKey);
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  });
}

/**
 * Populate profile dropdown
 */
function populateProfilesDropdown(selectElement) {
  // Clear current options
  selectElement.innerHTML = '';
  
  // Add options for each profile
  Object.entries(state.profiles).forEach(([id, profile]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = profile.name;
    selectElement.appendChild(option);
  });
}

/**
 * Load profile details into form
 */
function loadProfileDetails(profileId) {
  const profile = state.profiles[profileId];
  if (!profile) return;
  
  // Set form values
  document.getElementById('profile-name').value = profile.name || '';
  document.getElementById('profile-name').disabled = profileId === 'default';
  
  document.getElementById('profile-style').value = profile.style || 'Professional';
  document.getElementById('profile-ux').checked = !!profile.uxWriting;
  document.getElementById('profile-bias').checked = !!profile.cognitiveBias;
  document.getElementById('profile-emoji').checked = !!profile.addEmojis;
  document.getElementById('profile-auto').checked = !!profile.autoRewrite;
}

/**
 * Save current profile
 */
async function saveCurrentProfile() {
  try {
    const profileList = document.getElementById('profile-list');
    const profileId = profileList.value;
    
    if (!profileId) {
      showToast("No profile selected", "error");
      return;
    }
    
    // Get profile data from form
    const profileData = {
      name: document.getElementById('profile-name').value.trim(),
      style: document.getElementById('profile-style').value,
      uxWriting: document.getElementById('profile-ux').checked,
      cognitiveBias: document.getElementById('profile-bias').checked,
      addEmojis: document.getElementById('profile-emoji').checked,
      autoRewrite: document.getElementById('profile-auto').checked
    };
    
    // Validate name
    if (!profileData.name) {
      showToast("Profile name cannot be empty", "error");
      return;
    }
    
    // Get existing profiles
    const profilesResult = await chrome.storage.local.get('smarttext_profiles');
    const profiles = profilesResult.smarttext_profiles || {};
    
    // Update profile
    profiles[profileId] = profileData;
    
    // Save to storage
    await chrome.storage.local.set({ 'smarttext_profiles': profiles });
    
    // Update state
    state.profiles = profiles;
    
    // Show success message
    showToast("Profile saved successfully", "success");
  } catch (error) {
    console.error("Error saving profile:", error);
    showToast("Error saving profile", "error");
  }
}

/**
 * Create a new profile
 */
async function createNewProfile() {
  try {
    // Prompt for name
    const name = prompt("Enter a name for the new profile:");
    if (!name || name.trim().length === 0) return;
    
    // Create profile ID
    const profileId = 'profile_' + Date.now();
    
    // Create profile data
    const profileData = {
      name: name.trim(),
      style: 'Professional',
      uxWriting: false,
      cognitiveBias: false,
      addEmojis: false,
      autoRewrite: false
    };
    
    // Get existing profiles
    const profilesResult = await chrome.storage.local.get('smarttext_profiles');
    const profiles = profilesResult.smarttext_profiles || {};
    
    // Add new profile
    profiles[profileId] = profileData;
    
    // Save to storage
    await chrome.storage.local.set({ 'smarttext_profiles': profiles });
    
    // Update state
    state.profiles = profiles;
    
    // Refresh profiles dropdown
    const profileList = document.getElementById('profile-list');
    populateProfilesDropdown(profileList);
    
    // Select new profile
    profileList.value = profileId;
    loadProfileDetails(profileId);
    
    // Show success message
    showToast("New profile created", "success");
  } catch (error) {
    console.error("Error creating profile:", error);
    showToast("Error creating profile", "error");
  }
}

/**
 * Delete the current profile
 */
async function deleteCurrentProfile() {
  try {
    const profileList = document.getElementById('profile-list');
    const profileId = profileList.value;
    
    if (!profileId) {
      showToast("No profile selected", "error");
      return;
    }
    
    // Can't delete default profile
    if (profileId === 'default') {
      showToast("Cannot delete default profile", "error");
      return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the profile "${state.profiles[profileId].name}"?`)) {
      return;
    }
    
    // Get existing profiles
    const profilesResult = await chrome.storage.local.get('smarttext_profiles');
    const profiles = profilesResult.smarttext_profiles || {};
    
    // Delete profile
    delete profiles[profileId];
    
    // Save to storage
    await chrome.storage.local.set({ 'smarttext_profiles': profiles });
    
    // Update state
    state.profiles = profiles;
    
    // Refresh profiles dropdown
    populateProfilesDropdown(profileList);
    
    // Select default profile
    profileList.value = 'default';
    loadProfileDetails('default');
    
    // Show success message
    showToast("Profile deleted", "success");
  } catch (error) {
    console.error("Error deleting profile:", error);
    showToast("Error deleting profile", "error");
  }
}

/**
 * Set up settings screen
 */
function setupSettings() {
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const resetSettingsBtn = document.getElementById('reset-settings-btn');
  const floatingMenuToggle = document.getElementById('floating-menu-toggle');
  const fixedButtonToggle = document.getElementById('fixed-button-toggle');
  const keyboardShortcutsToggle = document.getElementById('keyboard-shortcuts-toggle');
  const apiKey = document.getElementById('api-key');
  const apiUrl = document.getElementById('api-url');
  const modelSelect = document.getElementById('model-select');
  const defaultProfile = document.getElementById('default-profile');
  const toggleApiKey = document.getElementById('toggle-api-key');
  
  // Skip if elements not found (not on settings screen)
  if (!saveSettingsBtn || !resetSettingsBtn) return;
  
  // Load current settings
  if (state.settings) {
    if (floatingMenuToggle) floatingMenuToggle.checked = state.settings.floatingMenu !== false;
    if (fixedButtonToggle) fixedButtonToggle.checked = state.settings.fixedButton !== false;
    if (keyboardShortcutsToggle) keyboardShortcutsToggle.checked = state.settings.keyboardShortcuts !== false;
    if (apiKey) apiKey.value = state.settings.apiKey || '';
    if (apiUrl) apiUrl.value = state.settings.apiUrl || '';
    if (modelSelect) modelSelect.value = state.settings.model || 'gpt-4o-mini';
  }
  
  // Populate default profile dropdown
  if (defaultProfile) {
    populateProfilesDropdown(defaultProfile);
    defaultProfile.value = state.settings.defaultProfile || 'default';
  }
  
  // Toggle API key visibility
  if (toggleApiKey && apiKey) {
    toggleApiKey.addEventListener('click', () => {
      if (apiKey.type === 'password') {
        apiKey.type = 'text';
        toggleApiKey.textContent = '🔒';
      } else {
        apiKey.type = 'password';
        toggleApiKey.textContent = '👁️';
      }
    });
  }
  
  // Save settings
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      saveSettings();
    });
  }
  
  // Reset settings
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
      resetSettings();
    });
  }
}

/**
 * Save settings
 */
async function saveSettings() {
  try {
    // Get settings from form
    const settings = {
      floatingMenu: document.getElementById('floating-menu-toggle').checked,
      fixedButton: document.getElementById('fixed-button-toggle').checked,
      keyboardShortcuts: document.getElementById('keyboard-shortcuts-toggle').checked,
      apiKey: document.getElementById('api-key').value.trim(),
      apiUrl: document.getElementById('api-url').value.trim(),
      model: document.getElementById('model-select').value,
      defaultProfile: document.getElementById('default-profile').value
    };
    
    // Save to storage
    await chrome.storage.local.set({ 'smarttext_settings': settings });
    
    // Update state
    state.settings = settings;
    
    // Show success message
    showToast("Settings saved successfully", "success");
  } catch (error) {
    console.error("Error saving settings:", error);
    showToast("Error saving settings", "error");
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings() {
  try {
    // Confirm reset
    if (!confirm("Are you sure you want to reset all settings to default values?")) {
      return;
    }
    
    // Default settings
    const defaultSettings = {
      floatingMenu: true,
      fixedButton: true,
      keyboardShortcuts: true,
      apiKey: "9c834290886249ee86da40290caf6379",
      apiUrl: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview",
      model: "gpt-4o-mini",
      defaultProfile: "default"
    };
    
    // Save to storage
    await chrome.storage.local.set({ 'smarttext_settings': defaultSettings });
    
    // Update state
    state.settings = defaultSettings;
    
    // Update form
    document.getElementById('floating-menu-toggle').checked = defaultSettings.floatingMenu;
    document.getElementById('fixed-button-toggle').checked = defaultSettings.fixedButton;
    document.getElementById('keyboard-shortcuts-toggle').checked = defaultSettings.keyboardShortcuts;
    document.getElementById('api-key').value = defaultSettings.apiKey;
    document.getElementById('api-url').value = defaultSettings.apiUrl;
    document.getElementById('model-select').value = defaultSettings.model;
    document.getElementById('default-profile').value = defaultSettings.defaultProfile;
    
    // Show success message
    showToast("Settings reset to defaults", "success");
  } catch (error) {
    console.error("Error resetting settings:", error);
    showToast("Error resetting settings", "error");
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
    currentProfileElem.textContent = state.selectedProfile.name || 'Default';
  }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());
  
  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
    <div class="toast-message">${message}</div>
  `;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Hide toast after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Adjust textarea height
 */
function adjustTextareaHeight(textarea, maxHeight = 200) {
  if (!textarea) return;
  
  // Reset height to calculate scrollHeight correctly
  textarea.style.height = 'auto';
  
  // Set new height
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${newHeight}px`;
}