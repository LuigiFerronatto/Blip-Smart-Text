/**
 * modules/storage.js
 * Handles storage operations for the SmartText extension
 */

import { STORAGE_KEYS, DEFAULT_PROFILE, DEFAULT_SETTINGS, PREDEFINED_PROFILES } from './config.js';

/**
 * Função segura para acessar chrome.storage.local.get
 * Funciona tanto em ambiente de extensão quanto em testes
 */
async function safeStorageGet(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Storage get error:', chrome.runtime.lastError);
          resolve({});
        } else {
          resolve(result || {});
        }
      });
    } catch (error) {
      console.warn('Storage access error:', error);
      resolve({});
    }
  });
}

/**
 * Função segura para acessar chrome.storage.local.set
 * Funciona tanto em ambiente de extensão quanto em testes
 */
async function safeStorageSet(data) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          console.warn('Storage set error:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      console.warn('Storage access error:', error);
      resolve(false);
    }
  });
}

/**
 * Initialize storage with default values if needed
 * @returns {Promise<boolean>} - Success of operation
 */
export async function initializeStorage() {
  try {
    // Check if already initialized
    const isInitialized = await safeStorageGet(['initialized']);
    
    if (!isInitialized.initialized) {
      // Initialize with predefined profiles
      await safeStorageSet({
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
 * Save a profile to storage
 * @param {string} profileId - ID of the profile
 * @param {Object} profileData - Profile data
 * @returns {Promise<boolean>} - Success of operation
 */
export async function saveProfile(profileId, profileData) {
  try {
    // Get existing profiles
    const result = await safeStorageGet([STORAGE_KEYS.PROFILES]);
    const profiles = result[STORAGE_KEYS.PROFILES] || {};
    
    // Add or update profile
    profiles[profileId] = {
      ...profileData,
      // Ensure default profile name is not changed
      name: profileId === 'default' ? 'Default Profile' : profileData.name
    };
    
    // Save to storage
    await safeStorageSet({
      [STORAGE_KEYS.PROFILES]: profiles
    });
    
    // Check if this is the selected profile and update it if needed
    const selectedResult = await safeStorageGet([STORAGE_KEYS.SELECTED_PROFILE]);
    const selectedProfile = selectedResult[STORAGE_KEYS.SELECTED_PROFILE];
    
    if (selectedProfile && selectedProfile.name === profileData.name) {
      await setSelectedProfile(profiles[profileId]);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Error saving profile:", error);
    return false;
  }
}

/**
 * Get all saved profiles
 * @returns {Promise<Object>} - Object with all profiles
 */
export async function getProfiles() {
  try {
    const result = await safeStorageGet([STORAGE_KEYS.PROFILES]);
    return result[STORAGE_KEYS.PROFILES] || PREDEFINED_PROFILES;
  } catch (error) {
    console.error("❌ Error getting profiles:", error);
    return PREDEFINED_PROFILES;
  }
}

/**
 * Get a specific profile by ID
 * @param {string} profileId - ID of the profile
 * @returns {Promise<Object|null>} - Profile data or null if not found
 */
export async function getProfile(profileId) {
  try {
    const profiles = await getProfiles();
    return profiles[profileId] || null;
  } catch (error) {
    console.error(`❌ Error getting profile ${profileId}:`, error);
    return null;
  }
}

/**
 * Set the currently selected profile
 * @param {Object} profile - Profile data
 * @returns {Promise<boolean>} - Success of operation
 */
export async function setSelectedProfile(profile) {
  try {
    await safeStorageSet({
      [STORAGE_KEYS.SELECTED_PROFILE]: profile
    });
    return true;
  } catch (error) {
    console.error("❌ Error setting selected profile:", error);
    return false;
  }
}

/**
 * Get the currently selected profile
 * @returns {Promise<Object>} - Profile data or default profile
 */
export async function getSelectedProfile() {
  try {
    const result = await safeStorageGet([STORAGE_KEYS.SELECTED_PROFILE]);
    return result[STORAGE_KEYS.SELECTED_PROFILE] || DEFAULT_PROFILE;
  } catch (error) {
    console.error("❌ Error getting selected profile:", error);
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Delete a profile
 * @param {string} profileId - ID of the profile to delete
 * @returns {Promise<boolean>} - Success of operation
 */
export async function deleteProfile(profileId) {
  try {
    // Cannot delete default profile
    if (profileId === 'default') {
      console.warn("⚠️ Cannot delete default profile");
      return false;
    }
    
    // Get existing profiles
    const result = await safeStorageGet([STORAGE_KEYS.PROFILES]);
    const profiles = result[STORAGE_KEYS.PROFILES] || {};
    
    if (!profiles[profileId]) {
      console.warn(`⚠️ Profile ${profileId} not found`);
      return false;
    }
    
    // Store name for later check
    const profileName = profiles[profileId].name;
    
    // Remove profile
    delete profiles[profileId];
    
    // Save updated profiles
    await safeStorageSet({
      [STORAGE_KEYS.PROFILES]: profiles
    });
    
    // Check if this is the selected profile
    const selectedResult = await safeStorageGet([STORAGE_KEYS.SELECTED_PROFILE]);
    const selectedProfile = selectedResult[STORAGE_KEYS.SELECTED_PROFILE];
    
    if (selectedProfile && selectedProfile.name === profileName) {
      // Set default profile as selected
      await setSelectedProfile(profiles['default']);
    }
    
    // Check if this is the default profile in settings
    const settingsResult = await safeStorageGet([STORAGE_KEYS.SETTINGS]);
    const settings = settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
    
    if (settings.defaultProfile === profileId) {
      // Update settings to use default profile
      settings.defaultProfile = 'default';
      await safeStorageSet({
        [STORAGE_KEYS.SETTINGS]: settings
      });
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error deleting profile ${profileId}:`, error);
    return false;
  }
}

/**
 * Save settings
 * @param {Object} settings - Settings to save
 * @returns {Promise<boolean>} - Success of operation
 */
export async function saveSettings(settings) {
  try {
    await safeStorageSet({
      [STORAGE_KEYS.SETTINGS]: settings
    });
    return true;
  } catch (error) {
    console.error("❌ Error saving settings:", error);
    return false;
  }
}

/**
 * Get settings
 * @returns {Promise<Object>} - Settings or default settings
 */
export async function getSettings() {
  try {
    const result = await safeStorageGet([STORAGE_KEYS.SETTINGS]);
    return result[STORAGE_KEYS.SETTINGS] || { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error("❌ Error getting settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save recent emojis
 * @param {Array<string>} emojis - List of emojis
 * @returns {Promise<boolean>} - Success of operation
 */
export async function saveRecentEmojis(emojis) {
  try {
    await safeStorageSet({
      [STORAGE_KEYS.RECENT_EMOJIS]: emojis
    });
    return true;
  } catch (error) {
    console.error("❌ Error saving recent emojis:", error);
    return false;
  }
}

/**
 * Get recent emojis
 * @returns {Promise<Array<string>>} - List of emojis or default list
 */
export async function getRecentEmojis() {
  try {
    const result = await safeStorageGet([STORAGE_KEYS.RECENT_EMOJIS]);
    return result[STORAGE_KEYS.RECENT_EMOJIS] || ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"];
  } catch (error) {
    console.error("❌ Error getting recent emojis:", error);
    return ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"];
  }
}

/**
 * Add an emoji to recent emojis
 * @param {string} emoji - Emoji to add
 * @returns {Promise<boolean>} - Success of operation
 */
export async function addRecentEmoji(emoji) {
  try {
    const recentEmojis = await getRecentEmojis();
    
    // Remove if already exists
    const updatedEmojis = recentEmojis.filter(e => e !== emoji);
    
    // Add to beginning
    updatedEmojis.unshift(emoji);
    
    // Limit to 8 emojis
    if (updatedEmojis.length > 8) {
      updatedEmojis.length = 8;
    }
    
    await saveRecentEmojis(updatedEmojis);
    return true;
  } catch (error) {
    console.error("❌ Error adding recent emoji:", error);
    return false;
  }
}