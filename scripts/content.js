/**
 * scripts/content.js
 * Script de conteúdo injetado nas páginas
 */

// Verificação para evitar reinjeção do script
if (window.hasRunBlipSmartText) {
    console.warn("🚫 Blip SmartText já foi carregado nesta aba. Evitando duplicação.");
    throw new Error("Blip SmartText já está rodando.");
}
window.hasRunBlipSmartText = true;

// Importar funções da API 
// Usamos uma técnica para carregar módulos dinamicamente quando necessário
let aiModule = null;
function ensureAIModuleLoaded() {
    if (aiModule) return Promise.resolve(aiModule);
    
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getAIModule" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Erro ao obter módulo AI:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }
            
            aiModule = response.module;
            resolve(aiModule);
        });
    });
}

// Variáveis globais
let floatingMenu = null;
let activeInput = null;
let settings = {
    autoRewrite: false,
    defaultStyle: 'Professional'
};

/* ==========================
   INICIALIZAÇÃO
========================== */

function initialize() {
    console.log("🚀 Content script carregado e rodando!");
    
    // Configurar observadores e listeners
    setupEventListeners();
    setupMutationObserver();
    
    // Carregar configurações
    loadSettings();
    
    // Escutar mensagens do background script
    setupMessageListener();
}

function setupEventListeners() {
    // Detecta quando o usuário foca em um campo editável
    document.addEventListener("focusin", handleFocusIn);
    
    // Detecta seleção de texto para mostrar o menu
    document.addEventListener("mouseup", handleTextSelection);
    
    // Fecha o menu ao clicar fora
    document.addEventListener("click", handleOutsideClick);
    
    // Detecta mudanças de seleção de texto
    document.addEventListener("selectionchange", handleSelectionChange);
}

function setupMutationObserver() {
    // Observador para modificações no DOM
    const observer = new MutationObserver(handleDOMChanges);
    
    // Observa mudanças em todo o corpo da página
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

function loadSettings() {
    // Carrega configurações do storage local
    chrome.storage.local.get(['autoRewrite', 'defaultStyle'], (result) => {
        if (result.autoRewrite !== undefined) {
            settings.autoRewrite = result.autoRewrite;
        }
        if (result.defaultStyle) {
            settings.defaultStyle = result.defaultStyle;
        }
    });
}

function setupMessageListener() {
    // Escuta mensagens do background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("📨 Mensagem recebida:", request.action);
        
        const actions = {
            "ping": () => sendResponse({ status: "active" }),
            "aiRewrite": () => rewriteSelectedText(),
            "showFormattingMenu": () => showFloatingMenu(),
            "showEmojiMenu": () => showEmojiMenu(),
            "updateSettings": (data) => updateSettings(data)
        };
        
        if (actions[request.action]) {
            actions[request.action](request.data);
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "Ação desconhecida" });
        }
        
        return true; // Keep the message channel open for async response
    });
}

function updateSettings(newSettings) {
    if (newSettings) {
        settings = { ...settings, ...newSettings };
    }
}

/* ==========================
   GERENCIADORES DE EVENTOS
========================== */

function handleFocusIn(event) {
    const target = event.target;
    if (isEditable(target)) {
        console.log("📝 Campo de entrada focado:", target);
        activeInput = target;
    }
}

function handleTextSelection() {
    // Pequeno delay para evitar conflitos com outros eventos
    setTimeout(() => {
        if (!activeInput || !isEditable(activeInput)) return;
    
        const selectedText = getSelectedText();
        if (selectedText.length > 0) {
            console.log("📌 Texto selecionado:", selectedText);
            showFloatingMenu();
            
            // Auto-reescrita se habilitada
            if (settings.autoRewrite && selectedText.length > 10) {
                rewriteSelectedText();
            }
        } else {
            removeFloatingMenu();
        }
    }, 10);
}

function handleOutsideClick(event) {
    if (!floatingMenu) return;

    // Verifica se o clique foi dentro do menu ou no campo editável
    if (floatingMenu.contains(event.target) || isEditable(event.target)) {
        console.log("✅ Clique dentro do menu ou campo editável. Não fechar.");
        return;
    }

    console.log("🛑 Clique fora do menu. Fechando...");
    
    // Pequeno delay para permitir que outras ações sejam processadas
    setTimeout(() => {
        removeFloatingMenu();
    }, 100);
}

function handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    // Atualiza posição do menu se ele existir e a seleção tiver tamanho
    if (floatingMenu && rect.width > 0 && rect.height > 0) {
        updateTooltipPosition(rect);
    }
}

function handleDOMChanges(mutations) {
    // Ao detectar mudanças no DOM, verificar se ainda temos uma seleção válida
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        if (floatingMenu) {
            floatingMenu.style.opacity = "0";
            floatingMenu.style.pointerEvents = "none";
        }
        return;
    }

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    // Se houver uma seleção válida, mostrar ou atualizar o menu
    if (rect.width > 0 && rect.height > 0) {
        if (!floatingMenu) {
            showFloatingMenu();
        } else {
            updateTooltipPosition(rect);
        }
    }
}

/* ==========================
   FUNÇÕES UTILITÁRIAS
========================== */

function isEditable(element) {
    return element && (
        element.tagName === "INPUT" || 
        element.tagName === "TEXTAREA" || 
        element.isContentEditable ||
        element.classList.contains('editable') ||
        element.getAttribute('role') === 'textbox'
    );
}

function getSelectedText() {
    return window.getSelection().toString().trim();
}

/* ==========================
   FUNÇÕES DO MENU FLUTUANTE
========================== */

function showFloatingMenu() {
    removeFloatingMenu(); // Evita menus duplicados

    if (!activeInput || !isEditable(activeInput)) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    // Criar o menu flutuante
    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-menu";
    floatingMenu.className = "blip-floating-menu";
    floatingMenu.innerHTML = getMenuHTML();
    document.body.appendChild(floatingMenu);

    // Atualiza a posição e a visibilidade do menu
    updateTooltipPosition(rect);
    
    // Anexa os eventos aos botões
    attachMenuEventListeners();
}

function updateTooltipPosition(rect) {
    if (!floatingMenu) return;

    // Calcula posição ideal considerando o viewport
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - (floatingMenu.offsetWidth / 2);
    
    // Evita que o menu fique fora da tela à direita
    if (left + floatingMenu.offsetWidth > viewportWidth) {
        left = viewportWidth - floatingMenu.offsetWidth - 10;
    }
    
    // Evita que o menu fique fora da tela à esquerda
    if (left < 10) {
        left = 10;
    }
    
    // Verifica se o menu ficaria abaixo da área visível
    // Se sim, coloca-o acima da seleção
    if (top + floatingMenu.offsetHeight > viewportHeight + window.scrollY) {
        top = rect.top + window.scrollY - floatingMenu.offsetHeight - 10;
    }
    
    // Aplica posição
    floatingMenu.style.opacity = "1";
    floatingMenu.style.pointerEvents = "auto";
    floatingMenu.style.position = "absolute";
    floatingMenu.style.left = `${left}px`;
    floatingMenu.style.top = `${top}px`;
}

function removeFloatingMenu() {
    if (floatingMenu) {
        // Fade out animation
        floatingMenu.style.opacity = "0";
        
        // Remove após a animação
        setTimeout(() => {
            if (floatingMenu && floatingMenu.parentNode) {
                floatingMenu.remove();
                floatingMenu = null;
                console.log("🗑️ Menu removido.");
            }
        }, 200);
    }
}

/* ==========================
   FUNÇÕES AUXILIARES DO MENU
========================== */

function getMenuHTML() {
    return `
        <button class="menu-btn" data-action="bold" title="Negrito"><b>B</b></button>
        <button class="menu-btn" data-action="italic" title="Itálico"><i>I</i></button>
        <button class="menu-btn" data-action="strike" title="Tachado"><s>S</s></button>
        <button class="menu-btn" data-action="code" title="Código">⟩⟨</button>
        <button class="menu-btn" data-action="list-ordered" title="Lista Numerada">1.</button>
        <button class="menu-btn" data-action="list-unordered" title="Lista com Marcadores">•</button>
        <button class="menu-btn special" data-action="ai-rewrite" title="Reescrever com IA">✨</button>
    `;
}

function attachMenuEventListeners() {
    floatingMenu.querySelectorAll(".menu-btn").forEach(button => {
        button.addEventListener("click", handleMenuAction);
    });
}

/* ==========================
   AÇÕES DO MENU
========================== */

function handleMenuAction(event) {
    const button = event.target.closest("button");
    if (!button) return;
    
    const action = button.dataset.action;
    if (!action) return;

    // Adiciona classe de feedback visual ao botão
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 200);

    // Mapeia ações para funções
    const actions = {
        "bold": () => formatText("*"),
        "italic": () => formatText("_"),
        "strike": () => formatText("~"),
        "code": () => formatText("`"),
        "list-ordered": () => formatText("\n1. "),
        "list-unordered": () => formatText("\n- "),
        "ai-rewrite": () => rewriteSelectedText()
    };

    if (actions[action]) {
        actions[action]();
    } else {
        console.warn("⚠️ Ação desconhecida:", action);
    }
}

/* ==========================
   FORMATAÇÃO DE TEXTO
========================== */

function formatText(style) {
    if (!activeInput || !isEditable(activeInput)) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    // Diferenciação entre campos de entrada normais e de conteúdo editável
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        // Formatação para elementos de formulário padrão
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplica a formatação
        activeInput.value = text.slice(0, start) + style + selectedText + style + text.slice(end);
        
        // Atualiza a posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = start + style.length + selectedText.length + style.length;
        
        // Dispara um evento input para garantir que outras bibliotecas saibam da mudança
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Formatação para elementos com contentEditable
        try {
            // Tenta usar execCommand (maneira mais confiável para contenteditable)
            document.execCommand("insertText", false, style + selectedText + style);
        } catch (e) {
            // Fallback: modifica diretamente o HTML
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            // Cria um novo nó de texto com o conteúdo formatado
            const formattedText = document.createTextNode(style + selectedText + style);
            
            // Substitui o conteúdo atual pela versão formatada
            range.deleteContents();
            range.insertNode(formattedText);
            
            // Atualiza a seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(formattedText);
            newRange.collapse(false); // Colapsa para o final
            selection.addRange(newRange);
        }
    }

    console.log("🎨 Texto formatado com sucesso!");
    removeFloatingMenu();
}

/* ==========================
   REESCRITA DE TEXTO COM IA
========================== */

async function rewriteSelectedText() {
    const selectedText = getSelectedText();
    if (!selectedText || selectedText.length < 2) {
        console.log("⚠️ Nenhum texto selecionado para reescrita.");
        return;
    }

    console.log("🤖 Enviando texto para reescrita IA:", selectedText);
    
    // Mostrar indicador de carregamento no lugar do menu
    if (floatingMenu) {
        floatingMenu.innerHTML = '<div class="loading-spinner"></div><div>Reescrevendo...</div>';
    } else {
        showLoadingIndicator();
    }
    
    try {
        // Carregar o módulo AI se ainda não estiver carregado
        await ensureAIModuleLoaded();
        
        if (!aiModule || !aiModule.rewriteText) {
            throw new Error("Módulo AI não disponível");
        }
        
        // Chamar a função de reescrita
        const rewrittenText = await aiModule.rewriteText(selectedText);
        
        // Aplicar o texto reescrito
        applyRewrittenText(rewrittenText);
        
        console.log("✅ Texto reescrito com IA:", rewrittenText);
    } catch (error) {
        console.error("❌ Erro ao reescrever texto com IA:", error);
        
        // Mostrar mensagem de erro para o usuário
        showErrorNotification("Não foi possível reescrever o texto. Tente novamente mais tarde.");
    } finally {
        // Esconder indicador de carregamento
        hideLoadingIndicator();
        removeFloatingMenu();
    }
}

/**
 * Aplica o texto reescrito no elemento ativo
 * @param {string} rewrittenText - Texto reescrito pela IA
 */
function applyRewrittenText(rewrittenText) {
    if (!activeInput || !isEditable(activeInput)) return;
    
    // Diferenciação entre campos de entrada normais e de conteúdo editável
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplica o texto reescrito
        activeInput.value = text.slice(0, start) + rewrittenText + text.slice(end);
        
        // Atualiza a posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = start + rewrittenText.length;
        
        // Dispara um evento input para garantir que outras bibliotecas saibam da mudança
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            // Tenta usar execCommand (maneira mais confiável para contenteditable)
            document.execCommand("insertText", false, rewrittenText);
        } catch (e) {
            // Fallback: modifica diretamente o conteúdo
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            // Cria um novo nó de texto com o conteúdo reescrito
            const newTextNode = document.createTextNode(rewrittenText);
            
            // Substitui o conteúdo selecionado pelo novo texto
            range.deleteContents();
            range.insertNode(newTextNode);
            
            // Atualiza a seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newTextNode);
            newRange.collapse(false); // Colapsa para o final
            selection.addRange(newRange);
        }
    }
}

/**
 * Mostra um indicador de carregamento na página
 */
function showLoadingIndicator() {
    // Verifica se já existe um indicador
    let indicator = document.getElementById('blip-loading-indicator');
    
    if (!indicator) {
        // Cria um novo indicador
        indicator = document.createElement('div');
        indicator.id = 'blip-loading-indicator';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Reescrevendo texto...</div>
        `;
        document.body.appendChild(indicator);
    }
    
    // Posiciona e mostra o indicador
    indicator.style.display = 'flex';
}

/**
 * Esconde o indicador de carregamento
 */
function hideLoadingIndicator() {
    const indicator = document.getElementById('blip-loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

/**
 * Mostra uma notificação de erro
 * @param {string} message - Mensagem de erro
 */
function showErrorNotification(message) {
    // Cria elemento de notificação
    const notification = document.createElement('div');
    notification.className = 'blip-notification error';
    notification.innerHTML = `
        <div class="notification-icon">❌</div>
        <div class="notification-message">${message}</div>
    `;
    
    // Adiciona à página
    document.body.appendChild(notification);
    
    // Remove após alguns segundos
    setTimeout(() => {
        notification.classList.add('fadeOut');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Mostra o menu de emojis
 */
function showEmojiMenu() {
    if (!activeInput || !isEditable(activeInput)) return;
    
    // Remove menu flutuante existente se houver
    removeFloatingMenu();
    
    // Criar menu de emojis
    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-emoji-menu";
    floatingMenu.className = "blip-floating-menu emoji-menu";
    
    // Lista de emojis populares
    const popularEmojis = [
        "😊", "👍", "👋", "🙏", "❤️", "👏", "🎉", "🔥", 
        "✨", "⭐", "✅", "⚠️", "📌", "💡", "📊", "🚀",
        "📝", "📅", "💪", "🤔", "👀", "🔍", "📣", "🎯"
    ];
    
    // Adiciona os emojis ao menu
    let emojiContent = '<div class="emoji-container">';
    popularEmojis.forEach(emoji => {
        emojiContent += `<button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>`;
    });
    emojiContent += '</div>';
    
    // Adiciona categorias (opcional)
    emojiContent += `
        <div class="emoji-categories">
            <button data-category="recent" class="active">Recentes</button>
            <button data-category="smileys">Sorrisos</button>
            <button data-category="objects">Objetos</button>
            <button data-category="symbols">Símbolos</button>
        </div>
    `;
    
    floatingMenu.innerHTML = emojiContent;
    document.body.appendChild(floatingMenu);
    
    // Posiciona perto do cursor ou input
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const rect = activeInput.getBoundingClientRect();
        updateTooltipPosition(rect);
    } else {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            updateTooltipPosition(rect);
        }
    }
    
    // Adiciona eventos aos botões de emoji
    floatingMenu.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', insertEmoji);
    });
    
    // Adiciona eventos às categorias
    floatingMenu.querySelectorAll('.emoji-categories button').forEach(btn => {
        btn.addEventListener('click', switchEmojiCategory);
    });
}

/**
 * Insere um emoji no campo de texto ativo
 * @param {Event} event - Evento de clique
 */
function insertEmoji(event) {
    const emoji = event.target.dataset.emoji;
    if (!emoji || !activeInput) return;
    
    // Insere o emoji no lugar do cursor
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const cursorPos = activeInput.selectionStart;
        const text = activeInput.value;
        
        activeInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
        
        // Atualiza a posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = cursorPos + emoji.length;
        
        // Dispara evento de input
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        document.execCommand("insertText", false, emoji);
    }
    
    // Armazena o emoji como recente
    storeRecentEmoji(emoji);
    
    // Fecha o menu
    removeFloatingMenu();
}

/**
 * Armazena um emoji usado recentemente
 * @param {string} emoji - Emoji a armazenar
 */
function storeRecentEmoji(emoji) {
    chrome.storage.local.get(['recentEmojis'], (result) => {
        let recentEmojis = result.recentEmojis || [];
        
        // Remove o emoji se já existir
        recentEmojis = recentEmojis.filter(e => e !== emoji);
        
        // Adiciona ao início
        recentEmojis.unshift(emoji);
        
        // Limita a 12 emojis recentes
        recentEmojis = recentEmojis.slice(0, 12);
        
        // Salva no storage
        chrome.storage.local.set({ recentEmojis });
    });
}

/**
 * Muda a categoria de emojis exibida
 * @param {Event} event - Evento de clique
 */
function switchEmojiCategory(event) {
    const category = event.target.dataset.category;
    if (!category || !floatingMenu) return;
    
    // Atualiza a classe ativa nos botões de categoria
    floatingMenu.querySelectorAll('.emoji-categories button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    
    // Se for a categoria "recentes", carrega do storage
    if (category === 'recent') {
        loadRecentEmojis();
        return;
    }
    
    // Para outras categorias, carregar os emojis apropriados
    let emojis = [];
    
    switch (category) {
        case 'smileys':
            emojis = ["😊", "😂", "😍", "😭", "😎", "😁", "😒", "🥰", "😔", "🤔", "😉", "😌"];
            break;
        case 'objects':
            emojis = ["📱", "💻", "🖥️", "⌨️", "📝", "📊", "📈", "📚", "🗓️", "📌", "📧", "🔍"];
            break;
        case 'symbols':
            emojis = ["❤️", "✅", "⚠️", "🚫", "💯", "⭐", "🔥", "👍", "👎", "❓", "‼️", "✨"];
            break;
        default:
            return;
    }
    
    // Atualiza o conteúdo do menu de emojis
    updateEmojiContainer(emojis);
}

/**
 * Carrega emojis recentes do storage
 */
function loadRecentEmojis() {
    chrome.storage.local.get(['recentEmojis'], (result) => {
        let recentEmojis = result.recentEmojis || [];
        
        // Se não houver emojis recentes, usar alguns padrão
        if (recentEmojis.length === 0) {
            recentEmojis = ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"];
        }
        
        updateEmojiContainer(recentEmojis);
    });
}

/**
 * Atualiza o contêiner de emojis com novos emojis
 * @param {Array} emojis - Lista de emojis a exibir
 */
function updateEmojiContainer(emojis) {
    if (!floatingMenu) return;
    
    const container = floatingMenu.querySelector('.emoji-container');
    if (!container) return;
    
    // Limpa o contêiner
    container.innerHTML = '';
    
    // Adiciona os novos emojis
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-btn';
        btn.dataset.emoji = emoji;
        btn.textContent = emoji;
        btn.addEventListener('click', insertEmoji);
        container.appendChild(btn);
    });
}

// Inicializa o script
initialize();