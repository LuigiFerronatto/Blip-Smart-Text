/**
 * scripts/config.js
 * Configurações da aplicação e constantes
 */

// Configuração da API
export const API_CONFIG = {
    apiKey: "9c834290886249ee86da40290caf6379",
    url: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview"
};

// Chaves para armazenamento local
export const STORAGE_KEYS = {
    PROFILES: "smarttext_profiles",
    SELECTED_PROFILE: "smarttext_selected_profile",
    SETTINGS: "smarttext_settings",
    RECENT_EMOJIS: "smarttext_recent_emojis"
};

// Estilos de escrita disponíveis
export const WRITING_STYLES = [
    { id: "Professional", label: "Profissional", description: "Tom formal e objetivo para comunicação corporativa" },
    { id: "Casual", label: "Casual", description: "Tom descontraído e amigável para comunicação informal" },
    { id: "Creative", label: "Criativo", description: "Estilo original e cativante para conteúdo de marketing" },
    { id: "Technical", label: "Técnico", description: "Linguagem precisa e detalhada para documentação técnica" },
    { id: "Persuasive", label: "Persuasivo", description: "Estilo convincente e argumentativo para vendas" }
];

// Vieses cognitivos disponíveis
export const COGNITIVE_BIASES = [
    { id: "social-proof", label: "Prova Social", description: "Apresenta o texto destacando que outras pessoas já adotaram a proposta" },
    { id: "scarcity", label: "Escassez", description: "Enfatiza a limitação de tempo ou disponibilidade" },
    { id: "authority", label: "Autoridade", description: "Adiciona citações de especialistas para aumentar a credibilidade" },
    { id: "pygmalion", label: "Efeito Pigmaleão", description: "Texto que incentiva o leitor ao destacar suas potenciais habilidades" }
];

// Configurações padrão
export const DEFAULT_SETTINGS = {
    floatingMenu: true,
    fixedButton: true,
    keyboardShortcuts: true,
    defaultProfile: "default",
    maxTokens: 800,
    temperature: 0.7
};

// Perfil padrão
export const DEFAULT_PROFILE = {
    name: "Perfil Padrão",
    style: "Professional",
    uxWriting: false,
    cognitiveBias: false,
    addEmojis: false,
    autoRewrite: false,
    biases: [],
    customPrompt: ""
};

// Perfis pré-definidos
export const PREDEFINED_PROFILES = {
    'default': {
        name: 'Perfil Padrão',
        style: 'Professional',
        uxWriting: false,
        cognitiveBias: false,
        addEmojis: false,
        autoRewrite: false,
        biases: [],
        customPrompt: ""
    },
    'professional': {
        name: 'Profissional',
        style: 'Professional',
        uxWriting: true,
        cognitiveBias: false,
        addEmojis: false,
        autoRewrite: false,
        biases: [],
        customPrompt: "Mantenha a comunicação clara, concisa e profissional."
    },
    'marketing': {
        name: 'Marketing',
        style: 'Persuasive',
        uxWriting: false,
        cognitiveBias: true,
        addEmojis: true,
        autoRewrite: false,
        biases: ["social-proof", "scarcity"],
        customPrompt: "Crie impacto emocional e destaque benefícios claros."
    },
    'technical': {
        name: 'Técnico',
        style: 'Technical',
        uxWriting: true,
        cognitiveBias: false,
        addEmojis: false,
        autoRewrite: false,
        biases: ["authority"],
        customPrompt: "Priorize precisão e clareza técnica."
    },
    'social': {
        name: 'Redes Sociais',
        style: 'Casual',
        uxWriting: false,
        cognitiveBias: true,
        addEmojis: true,
        autoRewrite: false,
        biases: ["social-proof"],
        customPrompt: "Crie conteúdo envolvente e compartilhável."
    }
};

// Atalhos de teclado
export const KEYBOARD_SHORTCUTS = {
    AI_REWRITE: "Ctrl+Shift+H",
    BOLD: "Ctrl+B",
    ITALIC: "Ctrl+I",
    STRIKETHROUGH: "Ctrl+E",
    CODE: "Ctrl+K"
};

// Versão da extensão
export const VERSION = "1.1.0";