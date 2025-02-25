/**
 * scripts/storage.js
 * Gerenciamento de perfis e armazenamento
 */

import { STORAGE_KEYS, DEFAULT_PROFILE } from './config.js';

/**
 * Salva um perfil no armazenamento local
 * @param {string} profileName - Nome do perfil
 * @param {Object} profileData - Dados do perfil
 * @returns {Promise<void>}
 */
export async function saveProfile(profileName, profileData) {
    try {
        if (!profileName || typeof profileName !== 'string' || profileName.trim() === '') {
            throw new Error("Nome do perfil inválido");
        }
        
        const profiles = await getProfiles();
        profiles[profileName] = profileData;
        
        localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
        return true;
    } catch (error) {
        console.error("Error saving profile:", error);
        return false;
    }
}

/**
 * Obtém todos os perfis do armazenamento local
 * @returns {Promise<Object>} - Objeto com todos os perfis
 */
export async function getProfiles() {
    try {
        const profilesData = localStorage.getItem(STORAGE_KEYS.profiles);
        return profilesData ? JSON.parse(profilesData) : {};
    } catch (error) {
        console.error("Error getting profiles:", error);
        return {};
    }
}

/**
 * Exclui um perfil do armazenamento local
 * @param {string} profileName - Nome do perfil a ser excluído
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function deleteProfile(profileName) {
    try {
        const profiles = await getProfiles();
        
        if (!profiles[profileName]) {
            console.warn(`Profile ${profileName} not found`);
            return false;
        }
        
        delete profiles[profileName];
        localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
        
        // Se o perfil excluído for o atual, resetar para o padrão
        const currentProfile = localStorage.getItem(STORAGE_KEYS.selectedProfile);
        if (currentProfile && JSON.parse(currentProfile).name === profileName) {
            setSelectedProfile(DEFAULT_PROFILE);
        }
        
        return true;
    } catch (error) {
        console.error("Error deleting profile:", error);
        return false;
    }
}

/**
 * Obtém um perfil específico pelo nome
 * @param {string} profileName - Nome do perfil
 * @returns {Promise<Object|null>} - Dados do perfil ou null
 */
export async function getProfile(profileName) {
    try {
        const profiles = await getProfiles();
        return profiles[profileName] || null;
    } catch (error) {
        console.error("Error getting profile:", error);
        return null;
    }
}

/**
 * Define o perfil selecionado atualmente
 * @param {Object} profileData - Dados do perfil
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function setSelectedProfile(profileData) {
    try {
        localStorage.setItem(STORAGE_KEYS.selectedProfile, JSON.stringify(profileData));
        return true;
    } catch (error) {
        console.error("Error setting selected profile:", error);
        return false;
    }
}

/**
 * Obtém o perfil selecionado atualmente
 * @returns {Promise<Object>} - Dados do perfil ou perfil padrão
 */
export async function getSelectedProfile() {
    try {
        const profileData = localStorage.getItem(STORAGE_KEYS.selectedProfile);
        return profileData ? JSON.parse(profileData) : { ...DEFAULT_PROFILE };
    } catch (error) {
        console.error("Error getting selected profile:", error);
        return { ...DEFAULT_PROFILE };
    }
}