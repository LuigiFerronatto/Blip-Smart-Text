/**
 * scripts/storage.js
 * Gerenciamento de perfis e armazenamento
 */

import { STORAGE_KEYS, DEFAULT_PROFILE, DEFAULT_SETTINGS, PREDEFINED_PROFILES } from './config.js';

/**
 * Inicializa o armazenamento com valores padrão se necessário
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function initializeStorage() {
    try {
        // Verificar se já está inicializado
        const isInitialized = await chrome.storage.local.get(['initialized']);
        
        if (!isInitialized.initialized) {
            // Inicializar com perfis predefinidos
            await chrome.storage.local.set({
                initialized: true,
                [STORAGE_KEYS.PROFILES]: PREDEFINED_PROFILES,
                [STORAGE_KEYS.SELECTED_PROFILE]: PREDEFINED_PROFILES['default'],
                [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
                [STORAGE_KEYS.RECENT_EMOJIS]: ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"]
            });
            
            console.log("✅ Armazenamento inicializado com valores padrão");
            return true;
        }
        
        return true;
    } catch (error) {
        console.error("❌ Erro ao inicializar armazenamento:", error);
        return false;
    }
}

/**
 * Salva um perfil no armazenamento
 * @param {string} profileId - ID do perfil
 * @param {Object} profileData - Dados do perfil
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function saveProfile(profileId, profileData) {
    try {
        // Obter perfis existentes
        const result = await chrome.storage.local.get([STORAGE_KEYS.PROFILES]);
        const profiles = result[STORAGE_KEYS.PROFILES] || {};
        
        // Adicionar ou atualizar perfil
        profiles[profileId] = {
            ...profileData,
            // Garantir que o nome do perfil 'default' não seja alterado
            name: profileId === 'default' ? 'Perfil Padrão' : profileData.name
        };
        
        // Salvar no storage
        await chrome.storage.local.set({
            [STORAGE_KEYS.PROFILES]: profiles
        });
        
        // Verificar se é o perfil selecionado atualmente e atualizá-lo
        const selectedResult = await chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROFILE]);
        const selectedProfile = selectedResult[STORAGE_KEYS.SELECTED_PROFILE];
        
        if (selectedProfile && selectedProfile.name === profileData.name) {
            await setSelectedProfile(profiles[profileId]);
        }
        
        return true;
    } catch (error) {
        console.error("❌ Erro ao salvar perfil:", error);
        return false;
    }
}

/**
 * Obtém todos os perfis salvos
 * @returns {Promise<Object>} - Objeto com todos os perfis
 */
export async function getProfiles() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.PROFILES]);
        return result[STORAGE_KEYS.PROFILES] || {};
    } catch (error) {
        console.error("❌ Erro ao obter perfis:", error);
        return {};
    }
}

/**
 * Obtém um perfil específico pelo ID
 * @param {string} profileId - ID do perfil
 * @returns {Promise<Object|null>} - Dados do perfil ou null se não encontrado
 */
export async function getProfile(profileId) {
    try {
        const profiles = await getProfiles();
        return profiles[profileId] || null;
    } catch (error) {
        console.error(`❌ Erro ao obter perfil ${profileId}:`, error);
        return null;
    }
}

/**
 * Define o perfil selecionado atualmente
 * @param {Object} profile - Dados do perfil
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function setSelectedProfile(profile) {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SELECTED_PROFILE]: profile
        });
        return true;
    } catch (error) {
        console.error("❌ Erro ao definir perfil selecionado:", error);
        return false;
    }
}

/**
 * Obtém o perfil selecionado atualmente
 * @returns {Promise<Object>} - Dados do perfil ou perfil padrão
 */
export async function getSelectedProfile() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROFILE]);
        return result[STORAGE_KEYS.SELECTED_PROFILE] || { ...DEFAULT_PROFILE };
    } catch (error) {
        console.error("❌ Erro ao obter perfil selecionado:", error);
        return { ...DEFAULT_PROFILE };
    }
}

/**
 * Exclui um perfil
 * @param {string} profileId - ID do perfil a ser excluído
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function deleteProfile(profileId) {
    try {
        // Não permitir excluir o perfil padrão
        if (profileId === 'default') {
            console.warn("⚠️ Não é possível excluir o perfil padrão");
            return false;
        }
        
        // Obter perfis existentes
        const result = await chrome.storage.local.get([STORAGE_KEYS.PROFILES]);
        const profiles = result[STORAGE_KEYS.PROFILES] || {};
        
        if (!profiles[profileId]) {
            console.warn(`⚠️ Perfil ${profileId} não encontrado`);
            return false;
        }
        
        // Armazenar nome para verificação posterior
        const profileName = profiles[profileId].name;
        
        // Remover perfil
        delete profiles[profileId];
        
        // Salvar perfis atualizados
        await chrome.storage.local.set({
            [STORAGE_KEYS.PROFILES]: profiles
        });
        
        // Verificar se é o perfil selecionado atualmente
        const selectedResult = await chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROFILE]);
        const selectedProfile = selectedResult[STORAGE_KEYS.SELECTED_PROFILE];
        
        if (selectedProfile && selectedProfile.name === profileName) {
            // Definir o perfil padrão como selecionado
            await setSelectedProfile(profiles['default']);
        }
        
        // Verificar se é o perfil padrão nas configurações
        const settingsResult = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        const settings = settingsResult[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
        
        if (settings.defaultProfile === profileId) {
            // Atualizar configurações para usar o perfil padrão
            settings.defaultProfile = 'default';
            await chrome.storage.local.set({
                [STORAGE_KEYS.SETTINGS]: settings
            });
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Erro ao excluir perfil ${profileId}:`, error);
        return false;
    }
}

/**
 * Salva as configurações
 * @param {Object} settings - Novas configurações
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function saveSettings(settings) {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SETTINGS]: settings
        });
        return true;
    } catch (error) {
        console.error("❌ Erro ao salvar configurações:", error);
        return false;
    }
}

/**
 * Obtém as configurações
 * @returns {Promise<Object>} - Configurações ou valores padrão
 */
export async function getSettings() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        return result[STORAGE_KEYS.SETTINGS] || { ...DEFAULT_SETTINGS };
    } catch (error) {
        console.error("❌ Erro ao obter configurações:", error);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Salva emojis recentes
 * @param {Array<string>} emojis - Lista de emojis
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function saveRecentEmojis(emojis) {
    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.RECENT_EMOJIS]: emojis
        });
        return true;
    } catch (error) {
        console.error("❌ Erro ao salvar emojis recentes:", error);
        return false;
    }
}

/**
 * Obtém emojis recentes
 * @returns {Promise<Array<string>>} - Lista de emojis ou lista padrão
 */
export async function getRecentEmojis() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEYS.RECENT_EMOJIS]);
        return result[STORAGE_KEYS.RECENT_EMOJIS] || ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"];
    } catch (error) {
        console.error("❌ Erro ao obter emojis recentes:", error);
        return ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"];
    }
}

/**
 * Adiciona um emoji à lista de recentes
 * @param {string} emoji - Emoji a ser adicionado
 * @returns {Promise<boolean>} - Sucesso da operação
 */
export async function addRecentEmoji(emoji) {
    try {
        const recentEmojis = await getRecentEmojis();
        
        // Remover se já existir
        const updatedEmojis = recentEmojis.filter(e => e !== emoji);
        
        // Adicionar ao início
        updatedEmojis.unshift(emoji);
        
        // Limitar a 8 emojis
        if (updatedEmojis.length > 8) {
            updatedEmojis.length = 8;
        }
        
        await saveRecentEmojis(updatedEmojis);
        return true;
    } catch (error) {
        console.error("❌ Erro ao adicionar emoji recente:", error);
        return false;
    }
}