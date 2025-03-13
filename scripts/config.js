/**
 * scripts/config.js
 * Configurações da aplicação e constantes
 */

// Configuração da API - separada para fácil manutenção
export const API_CONFIG = {
    apiKey: "9c834290886249ee86da40290caf6379", // Idealmente carregado de variáveis de ambiente
    url: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview"
};


// Constantes de armazenamento
export const STORAGE_KEYS = {
    profiles: "blip_profiles",
    selectedProfile: "profile_Selected"
};

// Estilos de escrita disponíveis
export const WRITING_STYLES = [
    { id: "Professional", label: "Profissional" },
    { id: "Casual", label: "Casual" },
    { id: "Creative", label: "Criativo" },
    { id: "Technical", label: "Técnico" },
    { id: "Persuasive", label: "Persuasivo" }
];

// Perfil padrão
export const DEFAULT_PROFILE = {
    name: "Default",
    style: "Professional",
    uxWriting: false,
    cognitiveBias: false,
    addEmojis: false,
    autoRewrite: false,
    customPrompt: ""
};

/**
 * Inicializa o formulário de configuração com dados salvos
 * @param {HTMLFormElement} form - O formulário a ser preenchido
 * @param {Object} profileData - Dados do perfil
 */
export function initializeConfigForm(form, profileData) {
    // Preencher os campos do formulário com base nos dados do perfil
    const profile = { ...DEFAULT_PROFILE, ...profileData };
    
    // Definir o estilo de escrita
    const styleRadio = form.querySelector(`input[name="style"][value="${profile.style}"]`);
    if (styleRadio) styleRadio.checked = true;
    
    // Definir os checkboxes
    form.querySelector('#uxWriting').checked = !!profile.uxWriting;
    form.querySelector('#cognitiveBias').checked = !!profile.cognitiveBias;
    form.querySelector('#addEmojis').checked = !!profile.addEmojis;
    form.querySelector('#autoRewrite').checked = !!profile.autoRewrite;
    
    // Texto do prompt personalizado
    const customPromptField = form.querySelector('#customPrompt');
    if (customPromptField) {
        customPromptField.value = profile.customPrompt || '';
        // Mostrar o campo se tiver conteúdo
        if (profile.customPrompt) {
            customPromptField.classList.remove('hidden');
        }
    }
}

/**
 * Lê os valores do formulário de configuração
 * @param {HTMLFormElement} form - O formulário a ser lido
 * @returns {Object} - Os dados do perfil
 */
export function readConfigForm(form) {
    // Obter o estilo selecionado
    const selectedStyle = form.querySelector('input[name="style"]:checked');
    
    return {
        style: selectedStyle ? selectedStyle.value : DEFAULT_PROFILE.style,
        uxWriting: form.querySelector('#uxWriting').checked,
        cognitiveBias: form.querySelector('#cognitiveBias').checked,
        addEmojis: form.querySelector('#addEmojis').checked,
        autoRewrite: form.querySelector('#autoRewrite').checked,
        customPrompt: form.querySelector('#customPrompt').value.trim()
    };
}