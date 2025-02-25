/**
 * scripts/background.js
 * Script em segundo plano da extensão
 */

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

// Escuta mensagens de outros componentes da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Mensagens do content script ou popup
    if (request.action === "saveSettings") {
        chrome.storage.local.set(request.data, () => {
            sendResponse({ success: true });
        });
        return true; // Keep the message channel open for the async response
    }
    
    // Verificar se o content script está ativo
    if (request.action === "isContentScriptActive") {
        sendResponse({ active: true });
    }
});