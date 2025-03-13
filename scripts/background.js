/**
 * scripts/background.js
 * Script em segundo plano da extensão com tratamento de módulo AI aprimorado
 */

// Função de reescrita com melhor tratamento de erro e suporte a mais perfis
async function rewriteText(text, profile = null) {
    try {
        // Obter API config
        const apiConfig = await getAPIConfig();
        
        // Obter o perfil selecionado, com fallback para perfil padrão
        const currentProfile = profile || await getSelectedProfile();
        
        // Construir o prompt baseado no perfil
        const prompt = buildPrompt(text, currentProfile);
        
        // Fazer requisição para a API
        const response = await makeAPIRequest(prompt, apiConfig);
        
        return response;
    } catch (error) {
        console.error("Erro ao reescrever texto:", error);
        
        // Mensagens de erro mais detalhadas
        if (error.message.includes('fetch')) {
            return "Erro de conexão. Verifique sua internet.";
        }
        if (error.message.includes('API')) {
            return "Problema com o serviço de IA. Tente novamente mais tarde.";
        }
        
        return "Ocorreu um erro ao reescrever o texto. Por favor, tente novamente.";
    }
}

// Função para obter configurações da API
async function getAPIConfig() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiKey', 'apiUrl', 'model'], (result) => {
            const config = {
                apiKey: result.apiKey || "22c921ec30c04a28aa32c86edd034156",
                url: result.apiUrl || "https://dev-openai-take.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-03-15-preview",
                model: result.model || "gpt-4-0613"
            };
            resolve(config);
        });
    });
}

// Função para obter perfil salvo
async function getSelectedProfile() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['selectedProfile'], (result) => {
            const profile = result.selectedProfile || {
                style: 'Professional',
                uxWriting: false,
                cognitiveBias: false,
                addEmojis: false
            };
            resolve(profile);
        });
    });
}

// Construir prompt com melhor estrutura para diferentes perfis
function buildPrompt(text, profile) {
    const styleMappings = {
        'Professional': 'Use a formal, objective tone with precise language. Focus on clarity and professionalism.',
        'Casual': 'Write in a friendly, conversational style. Use relaxed language while maintaining coherence.',
        'Creative': 'Use imaginative and engaging language. Feel free to use metaphors and vivid descriptions.',
        'Technical': 'Employ clear, precise technical language. Focus on accuracy and specificity.',
        'Persuasive': 'Craft a compelling, motivational text that influences the reader positively.'
    };

    // Construa um sistema de prompt melhorado
    let systemPrompt = `You are an expert writer that helps people improve their writing.`;
    
    // Adiciona instruções específicas para UX writing se solicitado
    if (profile.uxWriting) {
        systemPrompt += ` You specialize in UX writing principles: clarity, conciseness, and helpfulness. You make text more scannable and user-friendly.`;
    }
    
    // Adiciona técnicas persuasivas sutis
    if (profile.cognitiveBias) {
        systemPrompt += ` You understand psychological principles and cognitive biases, and can subtly incorporate them to make text more persuasive and engaging.`;
    }
    
    // Personaliza para uso de emojis
    if (profile.addEmojis) {
        systemPrompt += ` You tastefully incorporate relevant emojis to enhance emotional connection, but never overuse them.`;
    }

    // Construção do prompt do usuário
    let userPrompt = `Rewrite the following text while maintaining the original meaning and intent, but improving its quality:

Original Text:
"${text}"

Style Guidelines:
- Writing Style: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Optimize for clarity and user experience: make it scannable, concise, and action-oriented' : ''}
${profile.cognitiveBias ? '- Apply subtle persuasive techniques to make it more engaging and convincing' : ''}
${profile.addEmojis ? '- Add relevant emojis where appropriate to enhance the message' : ''}

Please preserve any key information, technical terms, or specific examples from the original. Your rewrite should be roughly the same length as the original unless brevity would improve clarity.`;

    return {
        systemPrompt,
        userPrompt
    };
}

// Função para fazer requisição à API com melhor tratamento de erro
async function makeAPIRequest(prompt, apiConfig) {
    try {
        const response = await fetch(apiConfig.url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiConfig.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [
                    { role: "system", content: prompt.systemPrompt },
                    { role: "user", content: prompt.userPrompt }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Erro na chamada da API:", error);
        throw error;  // Repassa o erro para tratamento superior
    }
}

// Inicialização da extensão
chrome.runtime.onInstalled.addListener(async () => {
    console.log("📌 Blip SmartText instalado!");

    // Criação de menus de contexto
    createContextMenus();
    
    // Inicializar configurações padrão
    await initializeDefaultSettings();
    
    // Mostrar página de boas-vindas na primeira instalação
    const details = await chrome.management.getSelf();
    if (details.installType === "normal") {
        chrome.tabs.create({ url: "welcome.html" });
    }
});

/**
 * Cria os menus de contexto da extensão
 */
function createContextMenus() {
    // Remover menus existentes para evitar duplicatas
    chrome.contextMenus.removeAll(() => {
        const contextMenus = [
            { id: "aiRewrite", title: "Reescrever com IA 🤖", contexts: ["selection"] },
            { id: "formatText", title: "Formatar Texto ✍️", contexts: ["selection"] },
            { id: "insertEmoji", title: "Inserir Emoji 😀", contexts: ["editable"] },
            { id: "separator1", type: "separator", contexts: ["selection", "editable"] },
            { id: "openAIPanel", title: "Painel de IA ✨", contexts: ["all"] },
            { id: "openOptions", title: "Configurações ⚙️", contexts: ["all"] }
        ];

        contextMenus.forEach(menu => chrome.contextMenus.create(menu));
        console.log("✅ Menus de contexto criados!");
    });
}

/**
 * Inicializa configurações padrão
 */
async function initializeDefaultSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['initialized'], (result) => {
            if (!result.initialized) {
                // Definir perfis padrão
                const defaultProfiles = {
                    'Default': {
                        name: 'Default',
                        style: 'Professional',
                        uxWriting: false,
                        cognitiveBias: false,
                        addEmojis: false
                    },
                    'UX Writer': {
                        name: 'UX Writer',
                        style: 'Professional',
                        uxWriting: true,
                        cognitiveBias: false,
                        addEmojis: false
                    },
                    'Marketing': {
                        name: 'Marketing',
                        style: 'Persuasive',
                        uxWriting: false,
                        cognitiveBias: true,
                        addEmojis: true
                    },
                    'Technical': {
                        name: 'Technical',
                        style: 'Technical',
                        uxWriting: false,
                        cognitiveBias: false,
                        addEmojis: false
                    },
                    'Social Media': {
                        name: 'Social Media',
                        style: 'Casual',
                        uxWriting: false,
                        cognitiveBias: true,
                        addEmojis: true
                    }
                };
                
                chrome.storage.local.set({
                    initialized: true,
                    apiKey: "22c921ec30c04a28aa32c86edd034156",
                    apiUrl: "https://dev-openai-take.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-03-15-preview",
                    model: "gpt-4-0613",
                    autoRewrite: false,
                    defaultStyle: 'Professional',
                    selectedProfile: defaultProfiles['Default'],
                    profiles: defaultProfiles,
                    recentEmojis: ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"]
                }, resolve);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Verifica se a URL é válida para execução do script
 * @param {string} url - URL a ser verificada
 * @returns {boolean} - Se a URL é válida
 */
function isValidURL(url) {
    return url && 
           !url.startsWith("chrome://") && 
           !url.startsWith("chrome-extension://") &&
           !url.startsWith("about:") && 
           !url.startsWith("file://") && 
           !url.includes("chrome.google.com/webstore");
}

// Injeta content script dinamicamente quando necessário
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && isValidURL(tab.url)) {
        // Verificar se o content script já foi injetado
        chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
            // Se não receber resposta, o script ainda não foi injetado
            if (chrome.runtime.lastError) {
                console.log("Injetando content script em", tab.url);
                injectContentScript(tabId);
            }
        });
    }
});

/**
 * Injeta os scripts e estilos necessários na página
 * @param {number} tabId - ID da aba
 */
function injectContentScript(tabId) {
    // Injetar CSS primeiro
    chrome.scripting.insertCSS({
        target: { tabId },
        files: ["styles/content.css"]
    }).then(() => {
        // Depois injetar JavaScript
        return chrome.scripting.executeScript({
            target: { tabId },
            files: ["scripts/content.js"]
        });
    }).then(() => {
        console.log("✅ Content script injetado com sucesso.");
    }).catch(err => {
        console.warn("🚫 Erro ao injetar content script:", err);
    });
}

// Tratamento de mensagens com módulo AI e outras ações
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Mensagem recebida no background:", request.action);

    const actions = {
        "getAIModule": async () => {
            // Cria um módulo de AI com a função rewriteText
            const aiModule = {
                rewriteText: async (text, profile) => {
                    try {
                        const result = await rewriteText(text, profile);
                        return result;
                    } catch (error) {
                        console.error("Erro no módulo AI:", error);
                        return "Erro ao reescrever o texto.";
                    }
                }
            };
            
            sendResponse({ module: aiModule, success: true });
        },
        
        "saveSettings": async () => {
            // Salva configurações no armazenamento local
            await chrome.storage.local.set(request.data);
            sendResponse({ success: true });
        },
        
        "getProfiles": async () => {
            // Busca perfis salvos
            const result = await chrome.storage.local.get(['profiles']);
            sendResponse({ profiles: result.profiles || {}, success: true });
        },
        
        "getSelectedProfile": async () => {
            // Busca o perfil selecionado
            const profile = await getSelectedProfile();
            sendResponse({ profile, success: true });
        },
        
        "isContentScriptActive": () => {
            // Verifica se o content script está ativo
            sendResponse({ active: true });
        }
    };

    if (actions[request.action]) {
        actions[request.action]();
        return true; // Permite resposta assíncrona
    }
    
    sendResponse({ success: false, error: "Ação desconhecida" });
    return false;
});

// Escuta eventos do menu de contexto
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!isValidURL(tab.url)) {
        console.warn("🚫 Menu de contexto não pode ser executado nesta página:", tab.url);
        return;
    }

    // Mapeia os IDs dos menus para as ações correspondentes
    const actions = {
        aiRewrite: { action: "aiRewrite", data: info.selectionText },
        formatText: { action: "showFormattingMenu", data: info.selectionText },
        insertEmoji: { action: "showEmojiMenu" },
        openAIPanel: { action: "showAIPanel" },
        openOptions: { action: "openOptions" }
    };

    const actionInfo = actions[info.menuItemId];
    if (!actionInfo) return;

    // Se for para abrir as opções, abrir a página de opções
    if (actionInfo.action === "openOptions") {
        chrome.runtime.openOptionsPage();
        return;
    }

    // Envia a mensagem para o content script
    chrome.tabs.sendMessage(tab.id, actionInfo)
        .catch(err => console.error(`❌ Erro ao executar ação ${info.menuItemId}:`, err));
});

// Escuta os comandos de teclado
chrome.commands.onCommand.addListener((command, tab) => {
    const commands = {
        "open_ai_rewrite": { action: "aiRewrite" },
        "open_ai_panel": { action: "showAIPanel" },
        "format_text": { action: "showFormattingMenu" },
        "insert_emoji": { action: "showEmojiMenu" }
    };
    
    const commandAction = commands[command];
    if (commandAction) {
        chrome.tabs.sendMessage(tab.id, commandAction)
            .catch(err => console.error(`❌ Erro ao executar comando de teclado:`, err));
    }
});