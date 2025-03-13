/**
 * scripts/background.js
 * Script em segundo plano da extensão com tratamento de módulo AI
 */

// Função de reescrita - definida diretamente no script
async function rewriteText(text) {
    try {
        // Configuração da API
        const apiKey = "22c921ec30c04a28aa32c86edd034156";
        const url = "https://dev-openai-take.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-03-15-preview";

        // Obter o perfil salvo, com fallback para perfil padrão
        const profile = await getSelectedProfile();
        
        // Construir o prompt baseado no perfil
        const prompt = buildPrompt(text, profile);
        
        // Fazer requisição para a API
        const response = await makeAPIRequest(prompt, apiKey, url);
        
        return response;
    } catch (error) {
        console.error("Erro ao reescrever texto:", error);
        return "Ocorreu um erro ao reescrever o texto. Por favor, tente novamente.";
    }
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

// Construir prompt
function buildPrompt(text, profile) {
    const styleMappings = {
        'Professional': 'Use a formal, objective tone with precise language.',
        'Casual': 'Write in a friendly, conversational style.',
        'Creative': 'Use imaginative and engaging language.',
        'Technical': 'Employ clear, precise technical language.',
        'Persuasive': 'Craft a compelling, motivational text.'
    };

    let prompt = `Rewrite the following text considering these guidelines:

Original Text:
"${text}"

Style Guidelines:
- Writing Style: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Optimize for clarity and user experience' : ''}
${profile.cognitiveBias ? '- Apply subtle persuasive techniques' : ''}
${profile.addEmojis ? '- Consider adding relevant emojis' : ''}

Rewritten Text:`;

    return prompt;
}

// Função para fazer requisição à API
async function makeAPIRequest(prompt, apiKey, url) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: 'gpt-4-0613',
            messages: [
                { role: "system", content: "You are a helpful assistant that rewrites text while maintaining the original meaning." },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

// Inicialização da extensão
chrome.runtime.onInstalled.addListener(() => {
    console.log("📌 Blip SmartText instalado!");

    // Criação de menus de contexto
    createContextMenus();
    
    // Inicializar configurações padrão se necessário
    initializeDefaultSettings();
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
            { id: "openOptions", title: "Configurações ⚙️", contexts: ["all"] }
        ];

        contextMenus.forEach(menu => chrome.contextMenus.create(menu));
        console.log("✅ Menus de contexto criados!");
    });
}

/**
 * Inicializa configurações padrão se necessário
 */
function initializeDefaultSettings() {
    chrome.storage.local.get(['initialized'], (result) => {
        if (!result.initialized) {
            chrome.storage.local.set({
                initialized: true,
                autoRewrite: false,
                defaultStyle: 'Professional'
            });
        }
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

// Tratamento de mensagens para módulo AI e outras ações
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Mensagem recebida no background:", request.action);

    switch(request.action) {
        case "getAIModule":
            // Cria um módulo de AI com a função rewriteText
            const aiModule = {
                rewriteText: async (text) => {
                    try {
                        const result = await rewriteText(text);
                        return result;
                    } catch (error) {
                        console.error("Erro no módulo AI:", error);
                        return "Erro ao reescrever o texto.";
                    }
                }
            };

            // Envia o módulo corretamente
            sendResponse({ 
                module: aiModule,
                success: true 
            });
            break;

        case "saveSettings":
            // Salva configurações no armazenamento local
            chrome.storage.local.set(request.data, () => {
                sendResponse({ success: true });
            });
            return true; // Permite resposta assíncrona

        case "isContentScriptActive":
            // Verifica se o content script está ativo
            sendResponse({ active: true });
            break;

        default:
            sendResponse({ success: false });
    }

    return true; // Permite resposta assíncrona
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
    if (command === "open_ai_rewrite") {
        chrome.tabs.sendMessage(tab.id, { action: "aiRewrite" })
            .catch(err => console.error("❌ Erro ao executar comando de teclado:", err));
    }
});