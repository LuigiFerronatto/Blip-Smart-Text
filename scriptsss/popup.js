/**
 * scripts/popup.js
 * Script para controlar o popup da extensão
 */

import { getProfiles, getSelectedProfile, setSelectedProfile, saveProfile, deleteProfile, saveSettings, getSettings } from './storage.js';
import { WRITING_STYLES, COGNITIVE_BIASES, DEFAULT_PROFILE, DEFAULT_SETTINGS } from './config.js';
import { showToast, showLoader, hideLoader, adjustTextareaHeight } from './ui.js';

// Estado global
const state = {
    profiles: {},
    selectedProfile: null,
    settings: { ...DEFAULT_SETTINGS },
    isInitialized: false
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    init();
});

/**
 * Inicializa a interface com feedback visual
 */
async function init() {
    // Mostrar loader
    showLoader();
    
    try {
        // Carregar configurações e perfis
        await loadData();
        
        // Configurar eventos da interface
        setupUI();
        
        // Verificar status da extensão
        checkExtensionStatus();
        
        // Marcar como inicializado
        state.isInitialized = true;
    } catch (error) {
        console.error('❌ Erro ao inicializar popup:', error);
        showToast('Erro ao carregar as configurações', 'error');
    } finally {
        // Esconder loader após inicialização
        hideLoader();
    }
}

/**
 * Carrega as configurações e perfis
 */
async function loadData() {
    // Carregar perfis
    state.profiles = await getProfiles();
    
    // Carregar perfil selecionado
    state.selectedProfile = await getSelectedProfile();
    
    // Carregar configurações
    state.settings = await getSettings();
    
    // Atualizar a interface
    updateProfilesList();
    updateCurrentProfileDisplay();
    updateSettingsUI();
}

/**
 * Configura todos os eventos da interface
 */
function setupUI() {
    setupNavigation();
    setupQuickActions();
    setupModals();
    setupAIWriting();
    setupProfiles();
    setupSettings();
    
    // Ajustar altura dos textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', () => {
            adjustTextareaHeight(textarea);
        });
    });
}

/**
 * Configura a navegação entre as telas
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Salvar qualquer edição em andamento
            if (state.isInitialized) {
                saveCurrentScreen();
            }
            
            // Remover classe ativa de todos os itens e telas
            navItems.forEach(i => i.classList.remove('active'));
            screens.forEach(s => s.classList.remove('active'));
            
            // Adicionar classe ativa ao item clicado
            item.classList.add('active');
            
            // Mostrar a tela correspondente
            const screenId = item.dataset.screen + '-screen';
            const screen = document.getElementById(screenId);
            
            if (screen) {
                screen.classList.add('active');
                
                // Resetar posição de scroll
                document.querySelector('.content-area').scrollTop = 0;
                
                // Carregamento específico para algumas telas
                if (screenId === 'profiles-screen') {
                    loadProfileDetails();
                }
            }
        });
    });
}

/**
 * Salva os dados da tela atual
 */
function saveCurrentScreen() {
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    
    if (activeScreen.id === 'profiles-screen') {
        // Se houver perfil selecionado e o formulário estiver preenchido
        const profileId = document.getElementById('profile-list').value;
        if (profileId && document.getElementById('profile-name').value) {
            const profileData = getProfileFormData();
            
            // Verificar se há alterações
            if (isProfileChanged(profileId, profileData)) {
                saveProfileChanges(profileId, profileData, false); // Salvar sem notificação
            }
        }
    } else if (activeScreen.id === 'settings-screen') {
        // Auto-salvar configurações ao sair
        const newSettings = getSettingsFormData();
        saveSettingsChanges(newSettings, false); // Salvar sem notificação
    }
}

/**
 * Configura os botões de ação rápida na tela inicial
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
 * Configura modais
 */
function setupModals() {
    // Botões que abrem modais
    const modalTriggers = {
        'new-profile-btn': 'new-profile-modal',
        'delete-profile-btn': 'delete-profile-modal'
    };
    
    // Configurar cada gatilho de modal
    Object.keys(modalTriggers).forEach(triggerId => {
        const trigger = document.getElementById(triggerId);
        const modalId = modalTriggers[triggerId];
        
        if (trigger) {
            trigger.addEventListener('click', () => {
                openModal(modalId);
            });
        }
    });
    
    // Configurar botões de fechar modal
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
    
    // Botões específicos de cada modal
    setupModalButtons();
}

/**
 * Configura os botões específicos de cada modal
 */
function setupModalButtons() {
    // Modal de criar perfil
    const createProfileBtn = document.getElementById('create-profile-btn');
    if (createProfileBtn) {
        createProfileBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('new-profile-name');
            const baseSelect = document.getElementById('new-profile-base');
            
            if (!nameInput.value.trim()) {
                showToast('Digite um nome para o perfil', 'error');
                nameInput.focus();
                return;
            }
            
            // Criar novo perfil
            createNewProfile(nameInput.value.trim(), baseSelect.value);
            
            // Limpar e fechar modal
            nameInput.value = '';
            closeAllModals();
        });
    }
    
    // Modal de excluir perfil
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            const profileSelect = document.getElementById('profile-list');
            const selectedProfileId = profileSelect.value;
            
            if (selectedProfileId === 'default') {
                showToast('Não é possível excluir o perfil padrão', 'error');
                closeAllModals();
                return;
            }
            
            // Excluir perfil
            deleteProfileById(selectedProfileId);
            
            // Fechar modal
            closeAllModals();
        });
    }
}

/**
 * Abre um modal
 * @param {string} modalId - ID do modal a ser aberto
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Configurações específicas para cada modal
    if (modalId === 'delete-profile-modal') {
        const profileSelect = document.getElementById('profile-list');
        const profileOption = profileSelect.options[profileSelect.selectedIndex];
        
        // Atualizar nome do perfil no modal
        const nameElement = document.getElementById('delete-profile-name');
        if (nameElement && profileOption) {
            nameElement.textContent = profileOption.text;
        }
    }
    
    // Mostrar modal
    modal.classList.add('show');
    
    // Focar no primeiro input
    setTimeout(() => {
        const firstInput = modal.querySelector('input, select');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

/**
 * Fecha todos os modais abertos
 */
function closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });
}

/**
 * Configura os eventos da tela de escrita com IA
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
    
    // Preencher com valores do perfil atual
    if (state.selectedProfile) {
        if (writingStyle) writingStyle.value = state.selectedProfile.style || 'Professional';
        if (uxOptimization) uxOptimization.checked = !!state.selectedProfile.uxWriting;
        if (cognitiveBias) cognitiveBias.checked = !!state.selectedProfile.cognitiveBias;
        if (addEmojis) addEmojis.checked = !!state.selectedProfile.addEmojis;
    }
    
    // Evento de reescrita
    if (rewriteBtn && aiInput && aiOutput) {
        rewriteBtn.addEventListener('click', async () => {
            const text = aiInput.value.trim();
            if (!text) {
                showToast('Insira um texto para reescrever', 'error');
                aiInput.focus();
                return;
            }
            
            try {
                // Mostrar carregamento
                rewriteBtn.disabled = true;
                rewriteBtn.innerHTML = '<span class="loading-spinner-small"></span> Reescrevendo...';
                
                // Preparar perfil temporário
                const tempProfile = {
                    style: writingStyle.value,
                    uxWriting: uxOptimization.checked,
                    cognitiveBias: cognitiveBias.checked,
                    addEmojis: addEmojis.checked
                };
                
                // Obter o módulo AI
                const aiModuleResponse = await sendMessageToBackground('getAIModule');
                if (!aiModuleResponse || !aiModuleResponse.success || !aiModuleResponse.module) {
                    throw new Error('Não foi possível acessar o módulo de IA');
                }
                
                // Chamar a função de reescrita
                const rewrittenText = await aiModuleResponse.module.rewriteText(text, tempProfile);
                
                // Mostrar o resultado
                aiOutput.value = rewrittenText;
                adjustTextareaHeight(aiOutput);
                
                showToast('Texto reescrito com sucesso!', 'success');
            } catch (error) {
                console.error('❌ Erro ao reescrever texto:', error);
                showToast(error.message || 'Erro ao reescrever o texto', 'error');
            } finally {
                // Restaurar botão
                rewriteBtn.disabled = false;
                rewriteBtn.innerHTML = '🔄 Reescrever';
            }
        });
    }
    
    // Evento de copiar resultado
    if (copyOutputBtn && aiOutput) {
        copyOutputBtn.addEventListener('click', () => {
            const text = aiOutput.value.trim();
            if (!text) {
                showToast('Nenhum texto para copiar', 'error');
                return;
            }
            
            // Copiar para a área de transferência
            navigator.clipboard.writeText(text)
                .then(() => showToast('Texto copiado!', 'success'))
                .catch(() => showToast('Erro ao copiar texto', 'error'));
        });
    }
    
    // Evento de salvar resultado
    if (saveOutputBtn && aiOutput) {
        saveOutputBtn.addEventListener('click', () => {
            const text = aiOutput.value.trim();
            if (!text) {
                showToast('Nenhum texto para salvar', 'error');
                return;
            }
            
            // Criar arquivo para download
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = 'texto-reescrito.txt';
            document.body.appendChild(a);
            a.click();
            
            // Limpar
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
            
            showToast('Texto salvo!', 'success');
        });
    }
}

/**
 * Configura os eventos da tela de perfis
 */
function setupProfiles() {
    const profileList = document.getElementById('profile-list');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    // Evento de mudança de perfil selecionado
    if (profileList) {
        profileList.addEventListener('change', () => {
            loadProfileDetails(profileList.value);
        });
    }
    
    // Evento de salvar perfil
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const profileName = document.getElementById('profile-name').value.trim();
            
            if (!profileName) {
                showToast('Digite um nome para o perfil', 'error');
                document.getElementById('profile-name').focus();
                return;
            }
            
            const profileData = getProfileFormData();
            const profileId = profileList.value;
            
            // Salvar o perfil
            saveProfileChanges(profileId, profileData);
        });
    }
}

/**
 * Configura os eventos da tela de configurações
 */
function setupSettings() {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const apiKey = document.getElementById('api-key');
    
    // Mostrar/ocultar chave da API
    if (toggleApiKeyBtn && apiKey) {
        toggleApiKeyBtn.addEventListener('click', () => {
            if (apiKey.type === 'password') {
                apiKey.type = 'text';
                toggleApiKeyBtn.textContent = '🔒';
            } else {
                apiKey.type = 'password';
                toggleApiKeyBtn.textContent = '👁️';
            }
        });
    }
    
    // Salvar configurações
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const newSettings = getSettingsFormData();
            saveSettingsChanges(newSettings);
        });
    }
    
    // Resetar configurações
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            if (confirm('Restaurar configurações para os valores padrão?')) {
                resetSettings();
            }
        });
    }
}

/**
 * Verifica o status da extensão
 */
function checkExtensionStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        
        chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
            const statusElem = document.getElementById('extension-status');
            if (!statusElem) return;
            
            if (chrome.runtime.lastError || !response) {
                // Script não está ativo na página atual
                statusElem.textContent = 'Inativo';
                statusElem.classList.remove('active');
            } else {
                // Script está ativo
                statusElem.textContent = 'Ativo';
                statusElem.classList.add('active');
            }
        });
    });
}

/* ==========================
   FUNÇÕES DE PERFIL
========================== */

/**
 * Atualiza a lista de perfis disponíveis
 */
function updateProfilesList() {
    const profileList = document.getElementById('profile-list');
    const defaultProfile = document.getElementById('default-profile');
    
    if (!profileList || !defaultProfile) return;
    
    // Limpar listas
    profileList.innerHTML = '';
    defaultProfile.innerHTML = '';
    
    // Adicionar cada perfil às listas
    Object.keys(state.profiles).forEach(profileId => {
        const profile = state.profiles[profileId];
        
        // Adicionar à lista de perfis
        const optionProfile = document.createElement('option');
        optionProfile.value = profileId;
        optionProfile.textContent = profile.name;
        profileList.appendChild(optionProfile);
        
        // Adicionar à lista de perfil padrão
        const optionDefault = document.createElement('option');
        optionDefault.value = profileId;
        optionDefault.textContent = profile.name;
        defaultProfile.appendChild(optionDefault);
    });
    
    // Selecionar o perfil padrão nas configurações
    if (state.settings.defaultProfile) {
        defaultProfile.value = state.settings.defaultProfile;
    }
}

/**
 * Carrega os detalhes de um perfil no formulário
 * @param {string} profileId - ID do perfil
 */
function loadProfileDetails(profileId) {
    const profile = state.profiles[profileId];
    if (!profile) return;
    
    // Preencher o formulário
    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-style').value = profile.style || 'Professional';
    document.getElementById('profile-ux').checked = !!profile.uxWriting;
    document.getElementById('profile-bias').checked = !!profile.cognitiveBias;
    document.getElementById('profile-emoji').checked = !!profile.addEmojis;
    document.getElementById('profile-auto').checked = !!profile.autoRewrite;
    
    // Desabilitar edição do nome para o perfil padrão
    const isDefaultProfile = profileId === 'default';
    document.getElementById('profile-name').disabled = isDefaultProfile;
}

/**
 * Obtém os dados do formulário de perfil
 * @returns {Object} - Dados do perfil
 */
function getProfileFormData() {
    return {
        name: document.getElementById('profile-name').value.trim(),
        style: document.getElementById('profile-style').value,
        uxWriting: document.getElementById('profile-ux').checked,
        cognitiveBias: document.getElementById('profile-bias').checked,
        addEmojis: document.getElementById('profile-emoji').checked,
        autoRewrite: document.getElementById('profile-auto').checked
    };
}

/**
 * Verifica se o perfil foi alterado
 * @param {string} profileId - ID do perfil
 * @param {Object} newData - Novos dados
 * @returns {boolean} - Se houve alterações
 */
function isProfileChanged(profileId, newData) {
    const currentProfile = state.profiles[profileId];
    if (!currentProfile) return true;
    
    return (
        currentProfile.name !== newData.name ||
        currentProfile.style !== newData.style ||
        currentProfile.uxWriting !== newData.uxWriting ||
        currentProfile.cognitiveBias !== newData.cognitiveBias ||
        currentProfile.addEmojis !== newData.addEmojis ||
        currentProfile.autoRewrite !== newData.autoRewrite
    );
}

/**
 * Cria um novo perfil
 * @param {string} name - Nome do perfil
 * @param {string} baseProfileId - ID do perfil base
 */
async function createNewProfile(name, baseProfileId) {
    // Verificar se já existe perfil com este nome
    const existingProfileId = Object.keys(state.profiles).find(id => 
        state.profiles[id].name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingProfileId) {
        showToast('Já existe um perfil com este nome', 'error');
        return;
    }
    
    // Gerar novo ID
    const newProfileId = 'profile_' + Date.now();
    
    // Copiar perfil base
    const baseProfile = state.profiles[baseProfileId] || state.profiles['default'];
    const newProfile = { ...baseProfile, name };
    
    // Adicionar ao estado
    state.profiles[newProfileId] = newProfile;
    
    // Salvar no storage
    await saveProfile(newProfileId, newProfile);
    
    // Atualizar a interface
    updateProfilesList();
    
    // Selecionar o novo perfil
    const profileList = document.getElementById('profile-list');
    if (profileList) {
        profileList.value = newProfileId;
        loadProfileDetails(newProfileId);
    }
    
    showToast(`Perfil "${name}" criado!`, 'success');
}

/**
 * Salva as alterações em um perfil
 * @param {string} profileId - ID do perfil
 * @param {Object} profileData - Dados do perfil
 * @param {boolean} notify - Se deve mostrar notificação
 */
async function saveProfileChanges(profileId, profileData, notify = true) {
    // Garantir que o perfil padrão não seja renomeado
    if (profileId === 'default') {
        profileData.name = 'Perfil Padrão';
    }
    
    // Atualizar no estado
    state.profiles[profileId] = profileData;
    
    // Se for o perfil selecionado, atualizá-lo também
    if (state.selectedProfile && state.selectedProfile.name === profileData.name) {
        state.selectedProfile = profileData;
        await setSelectedProfile(profileData);
    }
    
    // Salvar no storage
    await saveProfile(profileId, profileData);
    
    // Atualizar a interface
    updateProfilesList();
    updateCurrentProfileDisplay();
    
    if (notify) {
        showToast(`Perfil "${profileData.name}" salvo!`, 'success');
    }
}

/**
 * Exclui um perfil
 * @param {string} profileId - ID do perfil
 */
async function deleteProfileById(profileId) {
    // Verificar se é o perfil padrão
    if (profileId === 'default') {
        showToast('Não é possível excluir o perfil padrão', 'error');
        return;
    }
    
    const profileName = state.profiles[profileId].name;
    
    // Remover do storage
    await deleteProfile(profileId);
    
    // Remover do estado
    delete state.profiles[profileId];
    
    // Se for o perfil selecionado, voltar para o padrão
    if (state.selectedProfile && state.selectedProfile.name === profileName) {
        state.selectedProfile = state.profiles['default'];
        await setSelectedProfile(state.profiles['default']);
    }
    
    // Se for o perfil padrão nas configurações, voltar para o default
    if (state.settings.defaultProfile === profileId) {
        state.settings.defaultProfile = 'default';
        await saveSettings(state.settings);
    }
    
    // Atualizar a interface
    updateProfilesList();
    updateCurrentProfileDisplay();
    
    // Selecionar o primeiro perfil disponível
    const profileList = document.getElementById('profile-list');
    if (profileList && profileList.options.length > 0) {
        profileList.selectedIndex = 0;
        loadProfileDetails(profileList.value);
    }
    
    showToast(`Perfil "${profileName}" excluído!`, 'success');
}

/**
 * Atualiza a exibição do perfil atual
 */
function updateCurrentProfileDisplay() {
    const currentProfileElem = document.getElementById('current-profile');
    if (currentProfileElem && state.selectedProfile) {
        currentProfileElem.textContent = state.selectedProfile.name;
    }
}

/* ==========================
   FUNÇÕES DE CONFIGURAÇÃO
========================== */

/**
 * Atualiza a interface com as configurações atuais
 */
function updateSettingsUI() {
    // Configurações de exibição
    if (document.getElementById('floating-menu-toggle')) {
        document.getElementById('floating-menu-toggle').checked = !!state.settings.floatingMenu;
    }
    
    if (document.getElementById('fixed-button-toggle')) {
        document.getElementById('fixed-button-toggle').checked = !!state.settings.fixedButton;
    }
    
    if (document.getElementById('keyboard-shortcuts-toggle')) {
        document.getElementById('keyboard-shortcuts-toggle').checked = !!state.settings.keyboardShortcuts;
    }
    
    // Configurações de API
    if (document.getElementById('api-key')) {
        document.getElementById('api-key').value = state.settings.apiKey || '';
    }
    
    if (document.getElementById('api-url')) {
        document.getElementById('api-url').value = state.settings.apiUrl || '';
    }
    
    if (document.getElementById('model-select')) {
        document.getElementById('model-select').value = state.settings.model || 'gpt-4-0613';
    }
    
    // Perfil padrão
    if (document.getElementById('default-profile') && state.settings.defaultProfile) {
        document.getElementById('default-profile').value = state.settings.defaultProfile;
    }
}

/**
 * Obtém os dados do formulário de configurações
 * @returns {Object} - Configurações
 */
function getSettingsFormData() {
    return {
        floatingMenu: document.getElementById('floating-menu-toggle').checked,
        fixedButton: document.getElementById('fixed-button-toggle').checked,
        keyboardShortcuts: document.getElementById('keyboard-shortcuts-toggle').checked,
        defaultProfile: document.getElementById('default-profile').value,
        apiKey: document.getElementById('api-key').value.trim(),
        apiUrl: document.getElementById('api-url').value.trim(),
        model: document.getElementById('model-select').value
    };
}

/**
 * Salva as configurações
 * @param {Object} newSettings - Novas configurações
 * @param {boolean} notify - Se deve mostrar notificação
 */
async function saveSettingsChanges(newSettings, notify = true) {
    // Atualizar o estado
    state.settings = { ...state.settings, ...newSettings };
    
    // Salvar no storage
    await saveSettings(state.settings);
    
    // Enviar novas configurações ao content script
    sendMessageToActiveTabs({ action: "updateSettings", data: newSettings });
    
    if (notify) {
        showToast('Configurações salvas!', 'success');
    }
}

/**
 * Restaura as configurações para valores padrão
 */
async function resetSettings() {
    // Restaurar para valores padrão
    state.settings = { ...DEFAULT_SETTINGS };
    
    // Atualizar a interface
    updateSettingsUI();
    
    // Salvar no storage
    await saveSettings(state.settings);
    
    // Enviar novas configurações ao content script
    sendMessageToActiveTabs({ action: "updateSettings", data: state.settings });
    
    showToast('Configurações restauradas!', 'success');
}

/* ==========================
   FUNÇÕES UTILITÁRIAS
========================== */

/**
 * Envia uma mensagem para o script em segundo plano
 * @param {string} action - Ação a ser executada
 * @param {Object} data - Dados a serem enviados
 * @returns {Promise} - Promessa que resolve com a resposta
 */
function sendMessageToBackground(action, data = {}) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action, data }, (response) => {
            resolve(response);
        });
    });
}

/**
 * Envia uma mensagem para todas as abas ativas
 * @param {Object} message - Mensagem a ser enviada
 */
function sendMessageToActiveTabs(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            try {
                chrome.tabs.sendMessage(tab.id, message);
            } catch (error) {
                // Ignorar erros (a aba pode não ter o script injetado)
            }
        });
    });
}