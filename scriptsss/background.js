/**
 * scripts/background.js
 * Script em segundo plano da extensão, responsável por gerenciar a comunicação
 * entre componentes e inicializar a extensão
 */

import { initializeStorage } from './storage.js';
import { rewriteText } from './ai.js';

// Inicialização da extensão
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("📌 SmartText instalado!");
    
    // Inicializar configurações e perfis
    await initializeStorage();
    
    // Criar menus de contexto
    createContextMenus();
    
    // Mostrar página de boas-vindas na primeira instalação
    if (details.reason === "install") {
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
                console.log(`Injetando content script em ${tab.url}`);
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
                        throw error;
                    }
                }
            };
            
            sendResponse({ module: aiModule, success: true });
        },
        
        "openOptions": () => {
            chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
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
        formatText: { action: "showFormatMenu", data: info.selectionText },
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
        "format_text": { action: "showFormatMenu" },
        "insert_emoji": { action: "showEmojiMenu" }
    };
    
    const commandAction = commands[command];
    if (commandAction) {
        chrome.tabs.sendMessage(tab.id, commandAction)
            .catch(err => console.error(`❌ Erro ao executar comando de teclado:`, err));
    }
});