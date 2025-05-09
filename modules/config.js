/**
 * modules/config.js
 * Configuration constants for the SmartText extension
 */

// API configuration
export const API_CONFIG = {
    apiKey: "9c834290886249ee86da40290caf6379",
    url: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview"
  };
  
  // Storage keys
  export const STORAGE_KEYS = {
    PROFILES: "smarttext_profiles",
    SELECTED_PROFILE: "smarttext_selected_profile",
    SETTINGS: "smarttext_settings",
    RECENT_EMOJIS: "smarttext_recent_emojis"
  };
  
  // Available writing styles
  export const WRITING_STYLES = [
    { id: "Professional", label: "Professional", description: "Formal and objective tone for corporate communication" },
    { id: "Casual", label: "Casual", description: "Relaxed and friendly tone for informal communication" },
    { id: "Creative", label: "Creative", description: "Original and engaging style for marketing content" },
    { id: "Technical", label: "Technical", description: "Precise and detailed language for technical documentation" },
    { id: "Persuasive", label: "Persuasive", description: "Convincing and argumentative style for sales" }
  ];
  
  // Available cognitive biases
  export const COGNITIVE_BIASES = [
    { id: "social-proof", label: "Social Proof", description: "Presents text highlighting that others have already adopted the proposal" },
    { id: "scarcity", label: "Scarcity", description: "Emphasizes limited time or availability" },
    { id: "authority", label: "Authority", description: "Adds expert citations to increase credibility" },
    { id: "pygmalion", label: "Pygmalion Effect", description: "Text that encourages the reader by highlighting their potential abilities" }
  ];
  
  // Default settings
  export const DEFAULT_SETTINGS = {
    floatingMenu: true,
    fixedButton: true,
    keyboardShortcuts: true,
    defaultProfile: "default",
    maxTokens: 800,
    temperature: 0.7,
    apiKey: "",
    apiUrl: "https://aoi-east-us.openai.azure.com/openai/deployments/mega-mind-gpt4o-mini/chat/completions?api-version=2024-02-15-preview",
    model: "gpt-3.5-turbo"
  };
  
  // Default profile
  export const DEFAULT_PROFILE = {
    name: "Default Profile",
    style: "Professional",
    uxWriting: false,
    cognitiveBias: false,
    addEmojis: false,
    autoRewrite: false,
    biases: [],
    customPrompt: ""
  };
  
  // Predefined profiles
  export const PREDEFINED_PROFILES = {
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
  
  // Keyboard shortcuts
  export const KEYBOARD_SHORTCUTS = {
    AI_REWRITE: "Ctrl+Shift+H",
    BOLD: "Ctrl+B",
    ITALIC: "Ctrl+I",
    STRIKETHROUGH: "Ctrl+E",
    CODE: "Ctrl+K"
  };
  
  // Extension version
  export const VERSION = "1.1.0";