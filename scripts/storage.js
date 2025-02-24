const STORAGE_KEY = "blip_profiles";

export async function saveProfile(profileName, profileData) {
    try {
        let profiles = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        profiles[profileName] = profileData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
        console.error("Error saving profile:", error);
    }
}

export async function getProfiles() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        console.error("Error getting profiles:", error);
        return {};
    }
}

export async function deleteProfile(profileName) {
    try {
        let profiles = getProfiles();
        delete profiles[profileName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (error) {
        console.error("Error deleting profile:", error);
    }
}

export async function getProfile(profileName) {
    try {
        return getProfiles()[profileName] || null;
    } catch (error) {
        console.error("Error getting profile:", error);
        return null;
    }
}