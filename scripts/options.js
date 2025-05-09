/**
 * scripts/options.js
 * 
 * Handles the options/settings page functionality for the SmartText extension
 */

import { 
    getProfiles, 
    getSelectedProfile, 
    saveProfile, 
    deleteProfile,
    saveSettings,
    getSettings,
    STORAGE_KEYS
  } from '../modules/storage.js';
  
  import { 
    WRITING_STYLES, 
    COGNITIVE_BIASES, 
    DEFAULT_PROFILE, 
    DEFAULT_SETTINGS,
    KEYBOARD_SHORTCUTS
  } from '../modules/config.js';
  
  // Global state
  const state = {
    profiles: {},
    settings: { ...DEFAULT_SETTINGS },
    activeTab: 'general',
    initialized: false,
    currentEditingProfile: null,
    originalShortcuts: { ...KEYBOARD_SHORTCUTS }
  };
  
  // Initialize the options page
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
  
  /**
   * Initialize the options page
   */
  async function init() {
    try {
      // Load data
      await loadData();
      
      // Setup UI and event listeners
      setupTabNavigation();
      setupGeneralSettings();
      setupProfilesTab();
      setupAPISettings();
      setupKeyboardShortcuts();
      setupModals();
      
      state.initialized = true;
      
      console.log("✅ Options page initialized");
    } catch (error) {
      console.error("❌ Error initializing options page:", error);
      showStatusMessage("Error loading settings", "error");
    }
  }
  
  /**
   * Load all necessary data from storage
   */
  async function loadData() {
    // Get profiles
    state.profiles = await getProfiles();
    
    // Get settings
    state.settings = await getSettings();
    
    // Get keyboard shortcuts
    const commands = await chrome.commands.getAll();
    commands.forEach(command => {
      if (state.originalShortcuts[command.name]) {
        state.originalShortcuts[command.name] = command.shortcut || '';
      }
    });
  }
  
  /**
   * Set up tab navigation
   */
  function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Save current tab data if initialized
        if (state.initialized) {
          saveCurrentTabData();
        }
        
        // Remove active class from all tabs and panels
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding panel
        button.classList.add('active');
        const tabId = button.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // Update active tab in state
        state.activeTab = tabId;
      });
    });
  }
  
  /**
   * Save current tab data before switching tabs
   */
  function saveCurrentTabData() {
    switch (state.activeTab) {
      case 'general':
        // Save general settings (but don't show notification)
        saveGeneralSettings(false);
        break;
      case 'profiles':
        // Save current profile if editing (but don't show notification)
        saveCurrentProfile(false);
        break;
      case 'api':
        // Save API settings (but don't show notification)
        saveAPISettings(false);
        break;
      case 'keyboard':
        // Save keyboard shortcuts (but don't show notification)
        saveKeyboardShortcuts(false);
        break;
    }
  }
  
  /**
   * Set up general settings tab
   */
  function setupGeneralSettings() {
    // Populate form with current settings
    document.getElementById('floating-menu-toggle').checked = !!state.settings.floatingMenu;
    document.getElementById('fixed-button-toggle').checked = !!state.settings.fixedButton;
    document.getElementById('keyboard-shortcuts-toggle').checked = !!state.settings.keyboardShortcuts;
    
    if (state.settings.maxTokens) {
      document.getElementById('max-tokens').value = state.settings.maxTokens;
    }
    
    if (state.settings.temperature !== undefined) {
      const temperatureInput = document.getElementById('temperature');
      const temperatureValue = document.getElementById('temperature-value');
      temperatureInput.value = state.settings.temperature;
      temperatureValue.textContent = state.settings.temperature;
      
      // Update temperature value display on slider change
      temperatureInput.addEventListener('input', () => {
        temperatureValue.textContent = temperatureInput.value;
      });
    }
    
    // Populate profiles dropdown
    const defaultProfileSelect = document.getElementById('default-profile');
    populateProfilesDropdown(defaultProfileSelect);
    
    if (state.settings.defaultProfile) {
      defaultProfileSelect.value = state.settings.defaultProfile;
    }
    
    // Set up save button
    document.getElementById('save-general').addEventListener('click', () => {
      saveGeneralSettings(true);
    });
    
    // Set up reset button
    document.getElementById('reset-general').addEventListener('click', () => {
      if (confirm('Reset general settings to default values?')) {
        resetGeneralSettings();
      }
    });
  }
  
  /**
   * Save general settings
   * @param {boolean} showNotification - Whether to show a notification
   */
  async function saveGeneralSettings(showNotification = true) {
    try {
      // Get values from form
      const newSettings = {
        ...state.settings,
        floatingMenu: document.getElementById('floating-menu-toggle').checked,
        fixedButton: document.getElementById('fixed-button-toggle').checked,
        keyboardShortcuts: document.getElementById('keyboard-shortcuts-toggle').checked,
        defaultProfile: document.getElementById('default-profile').value,
        maxTokens: parseInt(document.getElementById('max-tokens').value, 10),
        temperature: parseFloat(document.getElementById('temperature').value)
      };
      
      // Validate maxTokens
      if (isNaN(newSettings.maxTokens) || newSettings.maxTokens < 100 || newSettings.maxTokens > 2000) {
        if (showNotification) {
          showStatusMessage("Maximum tokens must be between 100 and 2000", "error");
        }
        return false;
      }
      
      // Validate temperature
      if (isNaN(newSettings.temperature) || newSettings.temperature < 0 || newSettings.temperature > 1) {
        if (showNotification) {
          showStatusMessage("Temperature must be between 0 and 1", "error");
        }
        return false;
      }
      
      // Save to storage
      await saveSettings(newSettings);
      
      // Update state
      state.settings = newSettings;
      
      if (showNotification) {
        showStatusMessage("General settings saved successfully", "success");
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error saving general settings:", error);
      if (showNotification) {
        showStatusMessage("Error saving settings", "error");
      }
      return false;
    }
  }
  
  /**
   * Reset general settings to defaults
   */
  async function resetGeneralSettings() {
    try {
      // Reset form values
      document.getElementById('floating-menu-toggle').checked = DEFAULT_SETTINGS.floatingMenu;
      document.getElementById('fixed-button-toggle').checked = DEFAULT_SETTINGS.fixedButton;
      document.getElementById('keyboard-shortcuts-toggle').checked = DEFAULT_SETTINGS.keyboardShortcuts;
      document.getElementById('default-profile').value = DEFAULT_SETTINGS.defaultProfile;
      document.getElementById('max-tokens').value = DEFAULT_SETTINGS.maxTokens;
      
      const temperatureInput = document.getElementById('temperature');
      const temperatureValue = document.getElementById('temperature-value');
      temperatureInput.value = DEFAULT_SETTINGS.temperature;
      temperatureValue.textContent = DEFAULT_SETTINGS.temperature;
      
      // Save defaults
      await saveSettings({ ...DEFAULT_SETTINGS });
      
      // Update state
      state.settings = { ...DEFAULT_SETTINGS };
      
      showStatusMessage("General settings reset to defaults", "success");
      return true;
    } catch (error) {
      console.error("❌ Error resetting general settings:", error);
      showStatusMessage("Error resetting settings", "error");
      return false;
    }
  }
  
  /**
   * Set up profiles tab
   */
  function setupProfilesTab() {
    // Populate profiles dropdown
    const profileSelect = document.getElementById('profile-select');
    populateProfilesDropdown(profileSelect);
    
    // Set up profile selection change
    profileSelect.addEventListener('change', () => {
      loadProfileDetails(profileSelect.value);
    });
    
    // Set up new profile button
    document.getElementById('new-profile-btn').addEventListener('click', () => {
      openModal('new-profile-modal');
      
      // Populate base profile dropdown in modal
      const baseProfileSelect = document.getElementById('new-profile-base');
      populateProfilesDropdown(baseProfileSelect);
    });
    
    // Set up delete profile button
    document.getElementById('delete-profile-btn').addEventListener('click', () => {
      const profileId = document.getElementById('profile-select').value;
      
      // Don't allow deleting default profile
      if (profileId === 'default') {
        showStatusMessage("Cannot delete the default profile", "error");
        return;
      }
      
      // Show confirmation modal
      const profileName = state.profiles[profileId]?.name || 'Selected Profile';
      document.getElementById('delete-profile-name').textContent = profileName;
      openModal('delete-profile-modal');
    });
    
    // Set up save profile button
    document.getElementById('save-profile').addEventListener('click', () => {
      saveCurrentProfile(true);
    });
    
    // Set up reset profile button
    document.getElementById('reset-profile').addEventListener('click', () => {
      if (confirm('Reset current profile to its original state?')) {
        resetCurrentProfile();
      }
    });
    
    // Set up cognitive bias toggling
    document.getElementById('profile-bias').addEventListener('change', (e) => {
      const biasesList = document.querySelectorAll('.biases-list input[type="checkbox"]');
      const isEnabled = e.target.checked;
      
      biasesList.forEach(checkbox => {
        checkbox.disabled = !isEnabled;
        if (!isEnabled) {
          checkbox.checked = false;
        }
      });
    });
    
    // Load initial profile
    if (profileSelect.value) {
      loadProfileDetails(profileSelect.value);
    }
  }
  
  /**
   * Populate a dropdown with available profiles
   * @param {HTMLElement} selectElement - The select element to populate
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
   * Load profile details into the form
   * @param {string} profileId - The ID of the profile to load
   */
  function loadProfileDetails(profileId) {
    const profile = state.profiles[profileId];
    if (!profile) return;
    
    // Store current editing profile ID
    state.currentEditingProfile = profileId;
    
    // Set form values
    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-name').disabled = profileId === 'default';
    
    document.getElementById('profile-style').value = profile.style || 'Professional';
    document.getElementById('profile-ux').checked = !!profile.uxWriting;
    document.getElementById('profile-bias').checked = !!profile.cognitiveBias;
    document.getElementById('profile-emoji').checked = !!profile.addEmojis;
    document.getElementById('profile-auto').checked = !!profile.autoRewrite;
    
    // Set cognitive biases
    const biasesList = document.querySelectorAll('.biases-list input[type="checkbox"]');
    biasesList.forEach(checkbox => {
      const biasValue = checkbox.value;
      checkbox.checked = profile.biases && profile.biases.includes(biasValue);
      checkbox.disabled = !profile.cognitiveBias;
    });
    
    // Set custom prompt
    document.getElementById('custom-prompt').value = profile.customPrompt || '';
  }
  
  /**
   * Save current profile
   * @param {boolean} showNotification - Whether to show a notification
   */
  async function saveCurrentProfile(showNotification = true) {
    try {
      if (!state.currentEditingProfile) {
        return false;
      }
      
      const profileId = state.currentEditingProfile;
      const isDefaultProfile = profileId === 'default';
      
      // Get values from form
      const name = document.getElementById('profile-name').value.trim();
      if (!name) {
        if (showNotification) {
          showStatusMessage("Profile name cannot be empty", "error");
        }
        return false;
      }
      
      // Gather selected biases
      const selectedBiases = [];
      document.querySelectorAll('.biases-list input[type="checkbox"]:checked').forEach(checkbox => {
        selectedBiases.push(checkbox.value);
      });
      
      // Create profile data
      const profileData = {
        name: isDefaultProfile ? 'Default Profile' : name,
        style: document.getElementById('profile-style').value,
        uxWriting: document.getElementById('profile-ux').checked,
        cognitiveBias: document.getElementById('profile-bias').checked,
        addEmojis: document.getElementById('profile-emoji').checked,
        autoRewrite: document.getElementById('profile-auto').checked,
        biases: selectedBiases,
        customPrompt: document.getElementById('custom-prompt').value.trim()
      };
      
      // Save to storage
      await saveProfile(profileId, profileData);
      
      // Update state
      state.profiles[profileId] = profileData;
      
      // Refresh dropdowns
      populateProfilesDropdown(document.getElementById('profile-select'));
      populateProfilesDropdown(document.getElementById('default-profile'));
      
      // Ensure selection is maintained
      document.getElementById('profile-select').value = profileId;
      
      if (showNotification) {
        showStatusMessage(`Profile "${profileData.name}" saved successfully`, "success");
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      if (showNotification) {
        showStatusMessage("Error saving profile", "error");
      }
      return false;
    }
  }
  
  /**
   * Reset current profile to its original state
   */
  async function resetCurrentProfile() {
    try {
      if (!state.currentEditingProfile) {
        return false;
      }
      
      const profileId = state.currentEditingProfile;
      
      // If it's a predefined profile, reset to original settings
      if (['default', 'professional', 'marketing', 'technical', 'social'].includes(profileId)) {
        const originalProfiles = {
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
        
        if (originalProfiles[profileId]) {
          // Save the original profile data
          await saveProfile(profileId, originalProfiles[profileId]);
          
          // Update state
          state.profiles[profileId] = originalProfiles[profileId];
          
          // Reload form
          loadProfileDetails(profileId);
          
          showStatusMessage(`Profile "${originalProfiles[profileId].name}" reset to original settings`, "success");
          return true;
        }
      } else {
        // For custom profiles, just reload the current data
        loadProfileDetails(profileId);
        showStatusMessage("Profile data reloaded", "success");
        return true;
      }
    } catch (error) {
      console.error("❌ Error resetting profile:", error);
      showStatusMessage("Error resetting profile", "error");
      return false;
    }
  }
  
  /**
   * Set up API settings tab
   */
  function setupAPISettings() {
    // Populate form with current settings
    if (state.settings.apiKey) {
      document.getElementById('api-key').value = state.settings.apiKey;
    }
    
    if (state.settings.apiUrl) {
      document.getElementById('api-url').value = state.settings.apiUrl;
    }
    
    if (state.settings.model) {
      const modelSelect = document.getElementById('model-select');
      if ([...modelSelect.options].some(opt => opt.value === state.settings.model)) {
        modelSelect.value = state.settings.model;
      } else {
        modelSelect.value = 'custom';
        document.getElementById('custom-model').value = state.settings.model;
        document.querySelector('.custom-model').classList.remove('hidden');
      }
    }
    
    // Toggle custom model input visibility
    document.getElementById('model-select').addEventListener('change', (e) => {
      const customModelContainer = document.querySelector('.custom-model');
      if (e.target.value === 'custom') {
        customModelContainer.classList.remove('hidden');
      } else {
        customModelContainer.classList.add('hidden');
      }
    });
    
    // Toggle API key visibility
    document.getElementById('toggle-api-key').addEventListener('click', () => {
      const apiKeyInput = document.getElementById('api-key');
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        document.getElementById('toggle-api-key').textContent = '🔒';
      } else {
        apiKeyInput.type = 'password';
        document.getElementById('toggle-api-key').textContent = '👁️';
      }
    });
    
    // Set up test API button
    document.getElementById('test-api').addEventListener('click', testAPIConnection);
    
    // Set up save button
    document.getElementById('save-api').addEventListener('click', () => {
      saveAPISettings(true);
    });
    
    // Set up reset button
    document.getElementById('reset-api').addEventListener('click', () => {
      if (confirm('Reset API settings to default values? This will clear your API key.')) {
        resetAPISettings();
      }
    });
  }
  
  /**
   * Save API settings
   * @param {boolean} showNotification - Whether to show a notification
   */
  async function saveAPISettings(showNotification = true) {
    try {
      // Get values from form
      const apiKey = document.getElementById('api-key').value.trim();
      const apiUrl = document.getElementById('api-url').value.trim();
      const modelSelect = document.getElementById('model-select').value;
      let model = modelSelect;
      
      if (modelSelect === 'custom') {
        model = document.getElementById('custom-model').value.trim();
        if (!model) {
          if (showNotification) {
            showStatusMessage("Please enter a custom model name", "error");
          }
          return false;
        }
      }
      
      // Check for API key
      if (!apiKey) {
        if (showNotification) {
          showStatusMessage("API Key is required", "error");
        }
        return false;
      }
      
      // Check for API URL
      if (!apiUrl) {
        if (showNotification) {
          showStatusMessage("API URL is required", "error");
        }
        return false;
      }
      
      // Create new settings object
      const newSettings = {
        ...state.settings,
        apiKey,
        apiUrl,
        model
      };
      
      // Save to storage
      await saveSettings(newSettings);
      
      // Update state
      state.settings = newSettings;
      
      if (showNotification) {
        showStatusMessage("API settings saved successfully", "success");
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error saving API settings:", error);
      if (showNotification) {
        showStatusMessage("Error saving API settings", "error");
      }
      return false;
    }
  }
  
  /**
   * Reset API settings to defaults
   */
  async function resetAPISettings() {
    try {
      // Reset form values
      document.getElementById('api-key').value = '';
      document.getElementById('api-url').value = 'https://api.openai.com/v1/chat/completions';
      document.getElementById('model-select').value = 'gpt-3.5-turbo';
      document.querySelector('.custom-model').classList.add('hidden');
      
      // Create new settings object (keeping other settings intact)
      const newSettings = {
        ...state.settings,
        apiKey: '',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo'
      };
      
      // Save to storage
      await saveSettings(newSettings);
      
      // Update state
      state.settings = newSettings;
      
      showStatusMessage("API settings reset to defaults", "success");
      return true;
    } catch (error) {
      console.error("❌ Error resetting API settings:", error);
      showStatusMessage("Error resetting API settings", "error");
      return false;
    }
  }
  
  /**
   * Test the API connection
   */
  async function testAPIConnection() {
    try {
      const apiKey = document.getElementById('api-key').value.trim();
      const apiUrl = document.getElementById('api-url').value.trim();
      const modelSelect = document.getElementById('model-select').value;
      let model = modelSelect;
      
      if (modelSelect === 'custom') {
        model = document.getElementById('custom-model').value.trim();
      }
      
      // Validate inputs
      if (!apiKey) {
        showStatusMessage("API Key is required", "error");
        return;
      }
      
      if (!apiUrl) {
        showStatusMessage("API URL is required", "error");
        return;
      }
      
      // Update status display
      const statusEl = document.getElementById('api-status');
      statusEl.innerHTML = '<div class="loading">Testing connection...</div>';
      
      // Make a simple API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hello! This is a connection test.' }
          ],
          max_tokens: 10
        })
      });
      
      if (response.ok) {
        statusEl.innerHTML = '<div class="success">✅ Connection successful! API is working.</div>';
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        statusEl.innerHTML = `<div class="error">❌ Connection failed: ${errorData.error?.message || response.statusText}</div>`;
      }
    } catch (error) {
      console.error("❌ Error testing API connection:", error);
      const statusEl = document.getElementById('api-status');
      statusEl.innerHTML = `<div class="error">❌ Connection error: ${error.message}</div>`;
    }
  }
  
  /**
   * Set up keyboard shortcuts tab
   */
  function setupKeyboardShortcuts() {
    // Display current shortcuts
    refreshShortcutDisplay();
    
    // Set up click handlers for shortcut items
    document.querySelectorAll('.shortcut-keys:not(.static)').forEach(shortcutElement => {
      shortcutElement.addEventListener('click', () => {
        openShortcutEditor(shortcutElement);
      });
    });
    
    // Set up save button
    document.getElementById('save-shortcuts').addEventListener('click', () => {
      saveKeyboardShortcuts(true);
    });
    
    // Set up reset button
    document.getElementById('reset-shortcuts').addEventListener('click', () => {
      if (confirm('Reset all keyboard shortcuts to default values?')) {
        resetKeyboardShortcuts();
      }
    });
  }
  
  /**
   * Refresh the shortcut display with current values
   */
  async function refreshShortcutDisplay() {
    try {
      // Get current commands from Chrome
      const commands = await chrome.commands.getAll();
      
      // Update display for each command
      commands.forEach(command => {
        const shortcutElement = document.querySelector(`.shortcut-keys[data-command="${command.name}"]`);
        if (shortcutElement) {
          shortcutElement.textContent = command.shortcut || 'Not set';
        }
      });
    } catch (error) {
      console.error("❌ Error refreshing shortcuts:", error);
    }
  }
  
  /**
   * Open the shortcut editor modal
   * @param {HTMLElement} shortcutElement - The shortcut element that was clicked
   */
  function openShortcutEditor(shortcutElement) {
    // Get current shortcut info
    const command = shortcutElement.dataset.command;
    const currentShortcut = shortcutElement.textContent;
    const shortcutName = shortcutElement.closest('.shortcut-item').querySelector('.shortcut-name').textContent;
    
    // Set up modal
    document.getElementById('shortcut-name').textContent = shortcutName;
    const recorderElement = document.getElementById('shortcut-recorder');
    recorderElement.textContent = currentShortcut;
    recorderElement.dataset.command = command;
    
    // Show modal
    openModal('shortcut-modal');
    
    // Set up key recording
    recorderElement.focus();
    document.addEventListener('keydown', recordShortcut);
    
    // Set up save button
    document.getElementById('save-shortcut-btn').addEventListener('click', () => {
      const newShortcut = recorderElement.textContent;
      const command = recorderElement.dataset.command;
      
      // Update display
      const shortcutElement = document.querySelector(`.shortcut-keys[data-command="${command}"]`);
      if (shortcutElement) {
        shortcutElement.textContent = newShortcut;
      }
      
      // Clean up and close modal
      document.removeEventListener('keydown', recordShortcut);
      closeModal('shortcut-modal');
    });
    
    // Clean up when modal is closed
    document.querySelector('#shortcut-modal .modal-close').addEventListener('click', () => {
      document.removeEventListener('keydown', recordShortcut);
    });
  }
  
  /**
   * Record a keyboard shortcut
   * @param {KeyboardEvent} event - The keyboard event
   */
  function recordShortcut(event) {
    event.preventDefault();
    
    const recorderElement = document.getElementById('shortcut-recorder');
    
    // Handle special keys
    if (event.key === 'Escape') {
      // Cancel recording
      document.removeEventListener('keydown', recordShortcut);
      closeModal('shortcut-modal');
      return;
    }
    
    if (event.key === 'Backspace' || event.key === 'Delete') {
      // Clear shortcut
      recorderElement.textContent = 'Not set';
      return;
    }
    
    // Build shortcut string
    const shortcutParts = [];
    if (event.ctrlKey) shortcutParts.push('Ctrl');
    if (event.altKey) shortcutParts.push('Alt');
    if (event.shiftKey) shortcutParts.push('Shift');
    if (event.metaKey) shortcutParts.push('Command');
    
    // Add the key if it's valid
    if (!/^(Control|Alt|Shift|Meta|OS)$/.test(event.key)) {
      // Convert key to proper format
      let key = event.key;
      if (key === ' ') key = 'Space';
      if (key === '+') key = 'Plus';
      if (key.length === 1) key = key.toUpperCase();
      
      shortcutParts.push(key);
    }
    
    // We need at least one modifier and one regular key
    if (shortcutParts.length < 2) {
      return;
    }
    
    // Update recorder display
    recorderElement.textContent = shortcutParts.join('+');
  }
  
  /**
   * Save keyboard shortcuts
   * @param {boolean} showNotification - Whether to show a notification
   */
  async function saveKeyboardShortcuts(showNotification = true) {
    try {
      // This is just a visual update - Chrome doesn't allow programmatically changing shortcuts
      // We can only guide the user to chrome://extensions/shortcuts
      
      if (showNotification) {
        showStatusMessage("To save keyboard shortcuts, go to chrome://extensions/shortcuts", "info", 5000);
      }
      
      return true;
    } catch (error) {
      console.error("❌ Error saving keyboard shortcuts:", error);
      if (showNotification) {
        showStatusMessage("Error saving keyboard shortcuts", "error");
      }
      return false;
    }
  }
  
  /**
   * Reset keyboard shortcuts to defaults
   */
  async function resetKeyboardShortcuts() {
    try {
      // Refresh the display with the original shortcuts
      document.querySelectorAll('.shortcut-keys[data-command]').forEach(shortcutElement => {
        const command = shortcutElement.dataset.command;
        if (state.originalShortcuts[command]) {
          shortcutElement.textContent = state.originalShortcuts[command] || 'Not set';
        }
      });
      
      showStatusMessage("To reset keyboard shortcuts, go to chrome://extensions/shortcuts", "info", 5000);
      return true;
    } catch (error) {
      console.error("❌ Error resetting keyboard shortcuts:", error);
      showStatusMessage("Error resetting keyboard shortcuts", "error");
      return false;
    }
  }
  
  /**
   * Set up modals
   */
  function setupModals() {
    // Close button for all modals
    document.querySelectorAll('.modal-close').forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) {
          closeModal(modal.id);
        }
      });
    });
    
    // Close modal when clicking outside content
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });
    
    // New profile modal
    document.getElementById('create-profile-btn').addEventListener('click', createNewProfile);
    
    // Delete profile modal
    document.getElementById('confirm-delete-btn').addEventListener('click', deleteCurrentProfile);
  }
  
  /**
   * Open a modal
   * @param {string} modalId - The ID of the modal to open
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  /**
   * Close a modal
   * @param {string} modalId - The ID of the modal to close
   */
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }
  
  /**
   * Create a new profile
   */
  async function createNewProfile() {
    try {
      const nameInput = document.getElementById('new-profile-name');
      const baseSelect = document.getElementById('new-profile-base');
      
      const name = nameInput.value.trim();
      const baseProfileId = baseSelect.value;
      
      if (!name) {
        showStatusMessage("Profile name is required", "error");
        return;
      }
      
      // Check if profile with this name already exists
      const exists = Object.values(state.profiles).some(profile => 
        profile.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exists) {
        showStatusMessage("A profile with this name already exists", "error");
        return;
      }
      
      // Get base profile
      const baseProfile = state.profiles[baseProfileId] || state.profiles['default'];
      
      // Create new profile ID
      const profileId = 'profile_' + Date.now();
      
      // Create new profile
      const newProfile = {
        ...baseProfile,
        name: name
      };
      
      // Save to storage
      await saveProfile(profileId, newProfile);
      
      // Update state
      state.profiles[profileId] = newProfile;
      
      // Refresh profile dropdowns
      populateProfilesDropdown(document.getElementById('profile-select'));
      populateProfilesDropdown(document.getElementById('default-profile'));
      populateProfilesDropdown(document.getElementById('new-profile-base'));
      
      // Select the new profile
      document.getElementById('profile-select').value = profileId;
      loadProfileDetails(profileId);
      
      // Reset and close modal
      nameInput.value = '';
      closeModal('new-profile-modal');
      
      showStatusMessage(`Profile "${name}" created successfully`, "success");
    } catch (error) {
      console.error("❌ Error creating profile:", error);
      showStatusMessage("Error creating profile", "error");
    }
  }
  
  /**
   * Delete the current profile
   */
  async function deleteCurrentProfile() {
    try {
      const profileId = document.getElementById('profile-select').value;
      
      // Don't allow deleting default profile
      if (profileId === 'default') {
        showStatusMessage("Cannot delete the default profile", "error");
        closeModal('delete-profile-modal');
        return;
      }
      
      const profileName = state.profiles[profileId]?.name || 'Selected Profile';
      
      // Delete from storage
      await deleteProfile(profileId);
      
      // Update state
      delete state.profiles[profileId];
      
      // Refresh profile dropdowns
      populateProfilesDropdown(document.getElementById('profile-select'));
      populateProfilesDropdown(document.getElementById('default-profile'));
      populateProfilesDropdown(document.getElementById('new-profile-base'));
      
      // Select the default profile
      document.getElementById('profile-select').value = 'default';
      loadProfileDetails('default');
      
      // Close modal
      closeModal('delete-profile-modal');
      
      showStatusMessage(`Profile "${profileName}" deleted successfully`, "success");
    } catch (error) {
      console.error("❌ Error deleting profile:", error);
      showStatusMessage("Error deleting profile", "error");
    }
  }
  
  /**
   * Show a status message
   * @param {string} message - The message to show
   * @param {string} type - The type of message (success, error, info)
   * @param {number} duration - How long to show the message in milliseconds
   */
  function showStatusMessage(message, type = 'info', duration = 3000) {
    // Create status element if it doesn't exist
    let statusElement = document.getElementById('status-message');
    
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'status-message';
      document.body.appendChild(statusElement);
    }
    
    // Set message and type
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    
    // Show message
    statusElement.classList.add('show');
    
    // Hide after duration
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, duration);
  }