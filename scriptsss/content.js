/**
 * scripts/content.js
 * Script injetado nas páginas para fornecer funcionalidade de formatação e IA
 */

import { showToast, showLoader, hideLoader, createFloatingMenu, createFixedButton, isEditable, getSelectedText } from './ui.js';
import { addRecentEmoji, getRecentEmojis } from './storage.js';

// State global
let activeInput = null;
let floatingMenu = null;
let aiModule = null;
let settings = {
    floatingMenu: true,
    fixedButton: true,
    keyboardShortcuts: true
};

// Verificar se o script já está rodando
if (window.hasRunSmartText) {
    console.warn("🚫 SmartText já está rodando nesta página.");
} else {
    window.hasRunSmartText = true;
    
    // Inicializar o script
    initialize();
}

/**
 * Inicializa o script
 */
async function initialize() {
    console.log("🚀 SmartText: Inicializando script de conteúdo");
    
    // Carregar configurações
    await loadSettings();
    
    // Configurar observadores e listeners
    setupEventListeners();
    setupMutationObserver();
    
    // Adicionar botão fixo se habilitado
    if (settings.fixedButton) {
        createFixedButton("✨", "SmartText: Reescrever com IA", showAIPanel);
    }
    
    // Carregar o módulo AI
    await ensureAIModuleLoaded();
    
    console.log("✅ SmartText: Script de conteúdo inicializado com sucesso");
}

/**
 * Carrega as configurações do storage
 */
async function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
            if (result.settings) {
                settings = { ...settings, ...result.settings };
            }
            resolve();
        });
    });
}

/**
 * Configura os event listeners
 */
function setupEventListeners() {
    // Detecta quando o usuário foca em um campo editável
    document.addEventListener("focusin", handleFocusIn);
    
    // Detecta seleção de texto para mostrar o menu
    document.addEventListener("mouseup", handleTextSelection);
    
    // Detecta mudanças de seleção de texto
    document.addEventListener("selectionchange", handleSelectionChange);
    
    // Detecta teclas especiais para atalhos
    document.addEventListener("keydown", handleKeyDown);
    
    // Escuta mensagens do background script
    chrome.runtime.onMessage.addListener(handleMessages);
}

/**
 * Configura o observador de mutações do DOM
 */
function setupMutationObserver() {
    const observer = new MutationObserver(handleDOMChanges);
    
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
}

/**
 * Carrega o módulo AI do background script
 */
async function ensureAIModuleLoaded() {
    if (aiModule) return aiModule;
    
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getAIModule" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Erro ao carregar módulo AI:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success && response.module) {
                aiModule = response.module;
                resolve(aiModule);
            } else {
                const error = new Error("Falha ao carregar módulo AI");
                console.error("❌", error);
                reject(error);
            }
        });
    });
}

/* ==========================
   HANDLERS DE EVENTOS
========================== */

/**
 * Manipula eventos de foco em elementos
 * @param {FocusEvent} event - Evento de foco
 */
function handleFocusIn(event) {
    const target = event.target;
    if (isEditable(target)) {
        activeInput = target;
    }
}

/**
 * Manipula eventos de seleção de texto
 */
function handleTextSelection() {
    // Pequeno delay para evitar conflitos com outros eventos
    setTimeout(() => {
        if (!settings.floatingMenu) return;
        
        const selectedText = getSelectedText();
        if (selectedText.length > 0) {
            showFormatMenu();
        } else {
            removeFormatMenu();
        }
    }, 10);
}

/**
 * Manipula mudanças na seleção de texto
 */
function handleSelectionChange() {
    if (!settings.floatingMenu || !floatingMenu) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // Atualizar posição do menu se a seleção tiver tamanho
    if (range.toString().trim().length > 0) {
        updateMenuPosition(floatingMenu, range);
    } else {
        removeFormatMenu();
    }
}

/**
 * Manipula atalhos de teclado
 * @param {KeyboardEvent} event - Evento de teclado
 */
function handleKeyDown(event) {
    if (!settings.keyboardShortcuts) return;
    
    // Ctrl+Shift+H - Reescrever com IA
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'h') {
        event.preventDefault();
        rewriteSelectedText();
        return;
    }
    
    // Atalhos de formatação
    if ((event.ctrlKey || event.metaKey)) {
        switch (event.key) {
            case 'b': // Negrito
                event.preventDefault();
                formatText("*");
                break;
            case 'i': // Itálico
                event.preventDefault();
                formatText("_");
                break;
            case 'e': // Tachado
                event.preventDefault();
                formatText("~");
                break;
            case 'k': // Código
                event.preventDefault();
                formatText("`");
                break;
        }
    }
}

/**
 * Manipula mudanças no DOM
 * @param {MutationRecord[]} mutations - Lista de mutações
 */
function handleDOMChanges(mutations) {
    // Verificar se ainda temos uma seleção válida
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        if (floatingMenu) {
            floatingMenu.style.opacity = "0";
            setTimeout(() => {
                if (floatingMenu) floatingMenu.remove();
                floatingMenu = null;
            }, 200);
        }
        return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    // Se houver uma seleção válida e o menu estiver ativo
    if (selectedText.length > 0 && settings.floatingMenu) {
        if (!floatingMenu) {
            showFormatMenu();
        } else {
            updateMenuPosition(floatingMenu, range);
        }
    }
}

/**
 * Manipula mensagens do background script
 * @param {Object} request - Mensagem recebida
 * @param {Object} sender - Remetente
 * @param {Function} sendResponse - Função para responder
 * @returns {boolean} - Se a resposta será assíncrona
 */
function handleMessages(request, sender, sendResponse) {
    console.log("📨 SmartText: Mensagem recebida:", request.action);
    
    const actions = {
        "ping": () => {
            sendResponse({ status: "active" });
        },
        "aiRewrite": () => {
            rewriteSelectedText();
            sendResponse({ success: true });
        },
        "showFormatMenu": () => {
            showFormatMenu();
            sendResponse({ success: true });
        },
        "showEmojiMenu": () => {
            showEmojiMenu();
            sendResponse({ success: true });
        },
        "showAIPanel": () => {
            showAIPanel();
            sendResponse({ success: true });
        },
        "updateSettings": (data) => {
            settings = { ...settings, ...request.data };
            sendResponse({ success: true });
        }
    };
    
    if (actions[request.action]) {
        actions[request.action](request.data);
        return true; // Mantém o canal de mensagem aberto para resposta assíncrona
    }
    
    sendResponse({ success: false, error: "Ação desconhecida" });
    return false;
}

/* ==========================
   MENU DE FORMATAÇÃO
========================== */

/**
 * Mostra o menu de formatação
 */
function showFormatMenu() {
    // Remover menu existente
    removeFormatMenu();
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (selectedText.length === 0) return;
    
    // Criar menu flutuante
    floatingMenu = document.createElement("div");
    floatingMenu.id = "smarttext-format-menu";
    floatingMenu.className = "smarttext-floating-menu";
    
    // HTML do menu
    floatingMenu.innerHTML = `
        <div class="menu-row primary-format">
            <button class="menu-btn" data-action="bold" title="Negrito (Ctrl+B)">
                <b>B</b>
            </button>
            <button class="menu-btn" data-action="italic" title="Itálico (Ctrl+I)">
                <i>I</i>
            </button>
            <button class="menu-btn" data-action="strike" title="Tachado (Ctrl+E)">
                <s>S</s>
            </button>
            <button class="menu-btn" data-action="code" title="Código (Ctrl+K)">
                <code>{ }</code>
            </button>
            <div class="menu-separator"></div>
            <button class="menu-btn" data-action="list-ordered" title="Lista Numerada">
                <span class="icon">1.</span>
            </button>
            <button class="menu-btn" data-action="list-unordered" title="Lista com Marcadores">
                <span class="icon">•</span>
            </button>
            <button class="menu-btn" data-action="quote" title="Citação">
                <span class="icon">&gt;</span>
            </button>
        </div>
        <div class="menu-row secondary-actions">
            <button class="menu-btn ai-btn" data-action="ai-rewrite" title="Reescrever com IA">
                <span class="icon">✨</span> <span class="btn-text">Reescrever com IA</span>
            </button>
            <div class="dropdown-group">
                <button class="menu-btn dropdown-btn" data-action="show-more" title="Mais opções">
                    <span class="icon">⋮</span>
                </button>
                <div class="dropdown-content">
                    <button class="dropdown-item" data-action="emoji" title="Inserir Emoji">
                        😀 Emojis
                    </button>
                    <button class="dropdown-item" data-action="clear-format" title="Limpar Formatação">
                        Aa Limpar Formatação
                    </button>
                    <button class="dropdown-item" data-action="settings" title="Configurações">
                        ⚙️ Configurações
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar à página
    document.body.appendChild(floatingMenu);
    
    // Atualizar posição
    updateMenuPosition(floatingMenu, range);
    
    // Adicionar eventos
    attachMenuEvents(floatingMenu);
}

/**
 * Remove o menu de formatação
 */
function removeFormatMenu() {
    if (floatingMenu) {
        floatingMenu.style.opacity = "0";
        setTimeout(() => {
            if (floatingMenu && floatingMenu.parentNode) {
                floatingMenu.remove();
                floatingMenu = null;
            }
        }, 200);
    }
}

/**
 * Atualiza a posição do menu
 * @param {HTMLElement} menu - Elemento do menu
 * @param {Range} range - Range de seleção
 */
function updateMenuPosition(menu, range) {
    if (!menu) return;
    
    const rect = range.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Posição padrão abaixo da seleção
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - (menu.offsetWidth / 2);
    
    // Evitar que o menu fique fora da tela
    if (left < 10) left = 10;
    if (left + menu.offsetWidth > viewportWidth - 10) {
        left = viewportWidth - menu.offsetWidth - 10;
    }
    
    // Se o menu ficar abaixo da área visível, posicioná-lo acima da seleção
    if (top + menu.offsetHeight > viewportHeight + window.scrollY) {
        top = rect.top + window.scrollY - menu.offsetHeight - 10;
    }
    
    // Aplicar posição
    menu.style.opacity = "1";
    menu.style.position = "absolute";
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.zIndex = "2147483647";
}

/**
 * Adiciona eventos ao menu
 * @param {HTMLElement} menu - Elemento do menu
 */
function attachMenuEvents(menu) {
    // Botões regulares
    menu.querySelectorAll(".menu-btn:not(.dropdown-btn)").forEach(button => {
        if (button.dataset.action !== "show-more") {
            button.addEventListener("click", handleMenuAction);
        }
    });
    
    // Botão de dropdown
    const dropdownBtn = menu.querySelector(".dropdown-btn");
    if (dropdownBtn) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const dropdownContent = menu.querySelector(".dropdown-content");
            dropdownContent.classList.toggle("show");
        });
    }
    
    // Itens do dropdown
    menu.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", handleMenuAction);
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener("click", (e) => {
        if (!menu) return;
        
        const dropdownContent = menu.querySelector(".dropdown-content");
        if (dropdownContent && dropdownContent.classList.contains("show")) {
            if (!e.target.matches(".dropdown-btn") && !e.target.closest(".dropdown-content")) {
                dropdownContent.classList.remove("show");
            }
        }
    });
    
    // Fechar menu ao clicar fora (exceto em elementos editáveis)
    document.addEventListener("click", (e) => {
        if (!menu) return;
        
        if (!menu.contains(e.target) && !isEditable(e.target)) {
            removeFormatMenu();
        }
    });
}

/**
 * Manipula ações do menu
 * @param {Event} event - Evento de clique
 */
function handleMenuAction(event) {
    const button = event.target.closest("button");
    if (!button) return;
    
    const action = button.dataset.action;
    if (!action) return;
    
    // Adiciona feedback visual
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 200);
    
    // Mapeia ações para funções
    const actions = {
        "bold": () => formatText("*"),
        "italic": () => formatText("_"),
        "strike": () => formatText("~"),
        "code": () => formatText("`"),
        "list-ordered": () => formatList("1. "),
        "list-unordered": () => formatList("- "),
        "quote": () => formatList("> "),
        "ai-rewrite": () => rewriteSelectedText(),
        "emoji": () => showEmojiMenu(),
        "clear-format": () => clearFormatting(),
        "settings": () => openSettings()
    };
    
    if (actions[action]) {
        actions[action]();
    }
}

/* ==========================
   FORMATAÇÃO DE TEXTO
========================== */

/**
 * Formata o texto selecionado
 * @param {string} marker - Marcador de formatação
 */
function formatText(marker) {
    if (!activeInput || !isEditable(activeInput)) return;
    
    const selectedText = getSelectedText();
    if (!selectedText) return;
    
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplicar formatação
        activeInput.value = text.slice(0, start) + marker + selectedText + marker + text.slice(end);
        
        // Posicionar cursor após o texto formatado
        activeInput.selectionStart = activeInput.selectionEnd = start + marker.length + selectedText.length + marker.length;
        
        // Disparar evento para notificar outras bibliotecas
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            document.execCommand("insertText", false, marker + selectedText + marker);
        } catch (e) {
            // Fallback para manipulação direta do DOM
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            const newText = document.createTextNode(marker + selectedText + marker);
            range.deleteContents();
            range.insertNode(newText);
            
            // Redefinir seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newText);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }
    
    removeFormatMenu();
}

/**
 * Formata o texto como lista ou citação
 * @param {string} prefix - Prefixo de linha
 */
function formatList(prefix) {
    if (!activeInput || !isEditable(activeInput)) return;
    
    const selectedText = getSelectedText();
    if (!selectedText) return;
    
    // Formatar cada linha
    const lines = selectedText.split('\n');
    const formattedText = lines.map(line => `${prefix}${line}`).join('\n');
    
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplicar formatação
        activeInput.value = text.slice(0, start) + formattedText + text.slice(end);
        
        // Posicionar cursor após o texto formatado
        activeInput.selectionStart = activeInput.selectionEnd = start + formattedText.length;
        
        // Disparar evento
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            document.execCommand("insertText", false, formattedText);
        } catch (e) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            const newText = document.createTextNode(formattedText);
            range.deleteContents();
            range.insertNode(newText);
            
            // Redefinir seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newText);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }
    
    removeFormatMenu();
}

/**
 * Remove a formatação do texto
 */
function clearFormatting() {
    if (!activeInput || !isEditable(activeInput)) return;
    
    const selectedText = getSelectedText();
    if (!selectedText) return;
    
    // Remover marcadores de formatação
    const cleanText = selectedText
        .replace(/\*\*?(.*?)\*\*?/g, '$1')  // Remove asteriscos (negrito)
        .replace(/__(.*?)__/g, '$1')        // Remove underscores duplos
        .replace(/_(.*?)_/g, '$1')          // Remove underscores simples (itálico)
        .replace(/~~(.*?)~~/g, '$1')        // Remove tildes (tachado)
        .replace(/`(.*?)`/g, '$1');         // Remove backticks (código)
    
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplicar texto limpo
        activeInput.value = text.slice(0, start) + cleanText + text.slice(end);
        activeInput.selectionStart = activeInput.selectionEnd = start + cleanText.length;
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            document.execCommand("insertText", false, cleanText);
        } catch (e) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            const newText = document.createTextNode(cleanText);
            range.deleteContents();
            range.insertNode(newText);
            
            // Redefinir seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newText);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }
    
    removeFormatMenu();
}

/**
 * Abre as configurações da extensão
 */
function openSettings() {
    chrome.runtime.sendMessage({ action: "openOptions" });
    removeFormatMenu();
}

/* ==========================
   MENU DE EMOJIS
========================== */

/**
 * Mostra o menu de emojis
 */
async function showEmojiMenu() {
    if (!activeInput || !isEditable(activeInput)) return;
    
    // Remover menu existente
    removeFormatMenu();
    
    // Obter emojis recentes
    const recentEmojis = await getRecentEmojis();
    
    // Lista de emojis por categoria
    const emojiCategories = {
        "Recente": recentEmojis,
        "Sorrisos": ["😊", "😂", "😍", "😭", "😎", "😁", "😒", "🥰", "😔", "🤔", "😉", "😌"],
        "Gestos": ["👍", "👋", "🙏", "👏", "🤝", "✌️", "👌", "🤞", "🤟", "🤘", "👆", "👉"],
        "Objetos": ["📱", "💻", "🖥️", "⌨️", "📝", "📊", "📈", "📚", "🗓️", "📌", "📧", "🔍"],
        "Símbolos": ["❤️", "✅", "⚠️", "🚫", "💯", "⭐", "🔥", "👍", "👎", "❓", "‼️", "✨"]
    };
    
    // Criar menu de emojis
    const emojiMenu = document.createElement("div");
    emojiMenu.id = "smarttext-emoji-menu";
    emojiMenu.className = "smarttext-floating-menu emoji-menu";
    
    // Criar o HTML do menu
    let emojiMenuHTML = `
        <div class="emoji-header">
            <h3>Escolha um emoji</h3>
            <button class="emoji-close-btn">×</button>
        </div>
        <div class="emoji-categories-tabs">
    `;
    
    // Adicionar abas de categorias
    Object.keys(emojiCategories).forEach((category, index) => {
        emojiMenuHTML += `
            <button class="category-tab ${index === 0 ? 'active' : ''}" data-category="${category}">
                ${category}
            </button>
        `;
    });
    
    emojiMenuHTML += `
        </div>
        <div class="emoji-content">
    `;
    
    // Adicionar contêineres de emojis para cada categoria
    Object.keys(emojiCategories).forEach((category, index) => {
        emojiMenuHTML += `
            <div class="emoji-container ${index === 0 ? 'active' : ''}" data-category="${category}">
        `;
        
        emojiCategories[category].forEach(emoji => {
            emojiMenuHTML += `
                <button class="emoji-btn" data-emoji="${emoji}">${emoji}</button>
            `;
        });
        
        emojiMenuHTML += `
            </div>
        `;
    });
    
    emojiMenuHTML += `
        </div>
        <div class="emoji-search">
            <input type="text" placeholder="Buscar emoji..." class="emoji-search-input">
        </div>
    `;
    
    emojiMenu.innerHTML = emojiMenuHTML;
    document.body.appendChild(emojiMenu);
    
    // Posicionar o menu próximo ao input ativo
    if (activeInput) {
        const rect = activeInput.getBoundingClientRect();
        updateMenuPosition(emojiMenu, {
            getBoundingClientRect: () => ({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                height: rect.height
            })
        });
    }
    
    // Botão de fechar
    emojiMenu.querySelector('.emoji-close-btn').addEventListener('click', () => {
        emojiMenu.remove();
    });
    
    // Botões de emoji
    emojiMenu.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', insertEmoji);
    });
    
    // Abas de categorias
    emojiMenu.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remover classe ativa de todas as abas e contêineres
            emojiMenu.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            emojiMenu.querySelectorAll('.emoji-container').forEach(c => c.classList.remove('active'));
            
            // Adicionar classe ativa à aba clicada e ao contêiner correspondente
            e.target.classList.add('active');
            const category = e.target.dataset.category;
            emojiMenu.querySelector(`.emoji-container[data-category="${category}"]`).classList.add('active');
        });
    });
    
    // Campo de busca
    const searchInput = emojiMenu.querySelector('.emoji-search-input');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            // Restaurar a visualização normal das categorias
            emojiMenu.querySelectorAll('.emoji-container').forEach(container => {
                container.querySelectorAll('.emoji-btn').forEach(btn => {
                    btn.style.display = 'block';
                });
            });
            return;
        }
        
        // Filtrar emojis em todas as categorias
        emojiMenu.querySelectorAll('.emoji-container').forEach(container => {
            let hasVisibleEmojis = false;
            
            container.querySelectorAll('.emoji-btn').forEach(btn => {
                const emoji = btn.textContent;
                const category = container.dataset.category.toLowerCase();
                
                // Mostrar apenas emojis que correspondem à busca
                if (emoji.includes(searchTerm) || category.includes(searchTerm)) {
                    btn.style.display = 'block';
                    hasVisibleEmojis = true;
                } else {
                    btn.style.display = 'none';
                }
            });
            
            // Mostrar/esconder categorias inteiras com base na busca
            if (hasVisibleEmojis) {
                container.classList.add('active');
                emojiMenu.querySelector(`.category-tab[data-category="${container.dataset.category}"]`).classList.add('active');
            } else {
                container.classList.remove('active');
                emojiMenu.querySelector(`.category-tab[data-category="${container.dataset.category}"]`).classList.remove('active');
            }
        });
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (emojiMenu.contains(e.target) || e.target === activeInput) return;
        emojiMenu.remove();
    }, { once: true });
}

/**
 * Insere um emoji no campo ativo
 * @param {Event} event - Evento de clique
 */
async function insertEmoji(event) {
    const emoji = event.target.dataset.emoji;
    if (!emoji || !activeInput) return;
    
    // Inserir o emoji no cursor
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const cursorPos = activeInput.selectionStart;
        const text = activeInput.value;
        
        activeInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
        
        // Atualizar posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = cursorPos + emoji.length;
        
        // Disparar evento
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        document.execCommand("insertText", false, emoji);
    }
    
    // Armazenar como recente
    await addRecentEmoji(emoji);
    
    // Fechar menu
    const emojiMenu = document.getElementById('smarttext-emoji-menu');
    if (emojiMenu) emojiMenu.remove();
}

/* ==========================
   REESCRITA COM IA
========================== */

/**
 * Reescreve o texto selecionado com IA
 */
async function rewriteSelectedText() {
    const selectedText = getSelectedText();
    if (!selectedText || selectedText.length < 2) {
        showToast("Por favor, selecione um texto para reescrever.", "error");
        return;
    }
    
    // Mostrar indicador de carregamento
    showLoader("Reescrevendo texto...");
    
    try {
        // Carregar o módulo AI
        await ensureAIModuleLoaded();
        
        if (!aiModule || !aiModule.rewriteText) {
            throw new Error("Módulo AI não disponível");
        }
        
        // Chamar a função de reescrita
        const rewrittenText = await aiModule.rewriteText(selectedText);
        
        // Aplicar o texto reescrito
        applyRewrittenText(rewrittenText);
        
        showToast("Texto reescrito com sucesso!", "success");
    } catch (error) {
        console.error("❌ Erro ao reescrever texto com IA:", error);
        showToast(error.message || "Não foi possível reescrever o texto.", "error");
    } finally {
        // Esconder indicador de carregamento
        hideLoader();
        removeFormatMenu();
    }
}

/**
 * Aplica o texto reescrito no elemento ativo
 * @param {string} rewrittenText - Texto reescrito
 */
function applyRewrittenText(rewrittenText) {
    if (!activeInput || !isEditable(activeInput)) return;
    
    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplicar o texto reescrito
        activeInput.value = text.slice(0, start) + rewrittenText + text.slice(end);
        
        // Atualizar posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = start + rewrittenText.length;
        
        // Disparar evento
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            document.execCommand("insertText", false, rewrittenText);
        } catch (e) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            const newText = document.createTextNode(rewrittenText);
            range.deleteContents();
            range.insertNode(newText);
            
            // Redefinir seleção
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newText);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }
}

/* ==========================
   PAINEL DE IA
========================== */

/**
 * Mostra o painel lateral de IA
 */
function showAIPanel() {
    // Remover painel existente
    const existingPanel = document.getElementById("smarttext-ai-panel");
    if (existingPanel) {
        existingPanel.remove();
        return;
    }
    
    // Criar o painel lateral
    const panel = document.createElement("div");
    panel.id = "smarttext-ai-panel";
    panel.className = "smarttext-ai-panel";
    
    panel.innerHTML = `
        <div class="panel-header">
            <h2>SmartText</h2>
            <button class="close-button">×</button>
        </div>
        
        <div class="panel-content">
            <h3>Reescrever Texto</h3>
            <p class="panel-description">Selecione um texto e escolha um perfil para reescrevê-lo com IA.</p>
            
            <div class="input-group">
                <label for="ai-input">Texto Original</label>
                <textarea id="ai-input" placeholder="Cole ou digite um texto aqui..."></textarea>
            </div>
            
            <div class="input-group">
                <label for="profile-select">Estilo de Escrita</label>
                <select id="profile-select">
                    <option value="Professional">Profissional</option>
                    <option value="Casual">Casual</option>
                    <option value="Creative">Criativo</option>
                    <option value="Technical">Técnico</option>
                    <option value="Persuasive">Persuasivo</option>
                </select>
            </div>
            
            <div class="checkbox-group">
                <label>
                    <input type="checkbox" id="ux-optimization"> 
                    Otimizar para experiência do usuário
                </label>
                <label>
                    <input type="checkbox" id="cognitive-bias"> 
                    Aplicar técnicas persuasivas
                </label>
                <label>
                    <input type="checkbox" id="add-emojis"> 
                    Adicionar emojis relevantes
                </label>
            </div>
            
            <button id="rewrite-ai-btn" class="rewrite-button">🔄 Reescrever</button>
            
            <div class="input-group">
                <label for="ai-output">Texto Reescrito</label>
                <textarea id="ai-output" placeholder="O texto reescrito aparecerá aqui..." readonly></textarea>
            </div>
            
            <div class="action-buttons">
                <button id="copy-output-btn" class="copy-button">📋 Copiar</button>
                <button id="insert-output-btn" class="insert-button">📝 Inserir no Campo</button>
            </div>
        </div>
    `;
    
    // Adicionar à página
    document.body.appendChild(panel);
    
    // Animar entrada
    setTimeout(() => panel.classList.add('active'), 10);
    
    // Adicionar eventos
    panel.querySelector(".close-button").addEventListener("click", () => {
        panel.classList.remove('active');
        setTimeout(() => panel.remove(), 300);
    });
    
    const rewriteButton = panel.querySelector("#rewrite-ai-btn");
    const copyButton = panel.querySelector("#copy-output-btn");
    const insertButton = panel.querySelector("#insert-output-btn");
    const inputTextarea = panel.querySelector("#ai-input");
    const outputTextarea = panel.querySelector("#ai-output");
    
    // Preencher com texto selecionado, se houver
    const selectedText = getSelectedText();
    if (selectedText) {
        inputTextarea.value = selectedText;
    }
    
    // Evento de reescrita
    rewriteButton.addEventListener("click", async () => {
        const text = inputTextarea.value.trim();
        if (!text) {
            showToast("Por favor, insira um texto para reescrever", "error");
            inputTextarea.focus();
            return;
        }
        
        try {
            rewriteButton.disabled = true;
            rewriteButton.innerHTML = '<span class="loading-spinner-small"></span> Reescrevendo...';
            
            // Obter configurações selecionadas
            const customProfile = {
                style: panel.querySelector("#profile-select").value,
                uxWriting: panel.querySelector("#ux-optimization").checked,
                cognitiveBias: panel.querySelector("#cognitive-bias").checked,
                addEmojis: panel.querySelector("#add-emojis").checked
            };
            
            // Carregar o módulo AI
            await ensureAIModuleLoaded();
            
            if (!aiModule || !aiModule.rewriteText) {
                throw new Error("Módulo AI não disponível");
            }
            
            // Chamar a função de reescrita com perfil personalizado
            const rewrittenText = await aiModule.rewriteText(text, customProfile);
            
            // Mostrar o texto reescrito
            outputTextarea.value = rewrittenText;
            
            showToast("Texto reescrito com sucesso!", "success");
        } catch (error) {
            console.error("❌ Erro ao reescrever texto com IA:", error);
            showToast(error.message || "Não foi possível reescrever o texto.", "error");
        } finally {
            rewriteButton.disabled = false;
            rewriteButton.innerHTML = "🔄 Reescrever";
        }
    });
    
    // Evento de cópia
    copyButton.addEventListener("click", () => {
        const text = outputTextarea.value.trim();
        if (!text) {
            showToast("Nenhum texto para copiar", "error");
            return;
        }
        
        navigator.clipboard.writeText(text)
            .then(() => showToast("Texto copiado para a área de transferência!", "success"))
            .catch(() => showToast("Erro ao copiar texto", "error"));
    });
    
    // Evento de inserção
    insertButton.addEventListener("click", () => {
        const text = outputTextarea.value.trim();
        if (!text) {
            showToast("Nenhum texto para inserir", "error");
            return;
        }
        
        if (!activeInput || !isEditable(activeInput)) {
            showToast("Selecione um campo de texto antes", "error");
            return;
        }
        
        if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
            const cursorPos = activeInput.selectionStart || 0;
            const currentText = activeInput.value;
            
            activeInput.value = currentText.slice(0, cursorPos) + text + currentText.slice(cursorPos);
            activeInput.selectionStart = activeInput.selectionEnd = cursorPos + text.length;
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // Para elementos com contentEditable
            document.execCommand("insertText", false, text);
        }
        
        showToast("Texto inserido com sucesso!", "success");
        panel.classList.remove('active');
        setTimeout(() => panel.remove(), 300);
    });
}