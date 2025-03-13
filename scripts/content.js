/**
 * scripts/content.js
 * Script de conteúdo melhorado com novo menu flutuante e botão fixo
 */

// Verificação para evitar reinjeção do script
if (window.hasRunBlipSmartText) {
    console.warn("🚫 Blip SmartText já foi carregado nesta aba. Evitando duplicação.");
    throw new Error("Blip SmartText já está rodando.");
}
window.hasRunBlipSmartText = true;

// Importar funções da API 
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
let fixedButton = null;
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
    
    // Adicionar botão fixo
    createFixedButton();
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
    
    // Detecta teclas especiais
    document.addEventListener("keydown", handleKeyDown);
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
        if (!activeInput) return;
    
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
        return;
    }
    
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

function handleKeyDown(event) {
    // Atalhos de teclado
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        // Ctrl+B - Negrito
        event.preventDefault();
        formatText("*");
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        // Ctrl+I - Itálico
        event.preventDefault();
        formatText("_");
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        // Ctrl+E - Tachado
        event.preventDefault();
        formatText("~");
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        // Ctrl+K - Código
        event.preventDefault();
        formatText("`");
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
   BOTÃO FIXO
========================== */

function createFixedButton() {
    // Remove o botão existente, se houver
    if (fixedButton) {
        fixedButton.remove();
    }
    
    // Criar o botão flutuante fixo
    fixedButton = document.createElement("div");
    fixedButton.id = "blip-fixed-button";
    fixedButton.className = "blip-fixed-button";
    fixedButton.innerHTML = `
        <div class="fixed-button-icon">✨</div>
        <div class="fixed-button-tooltip">Reescrever com IA</div>
    `;
    
    // Adicionar à página
    document.body.appendChild(fixedButton);
    
    // Adicionar evento de clique
    fixedButton.addEventListener("click", showAIPanelSidebar);
}

function showAIPanelSidebar() {
    // Remove o painel existente, se houver
    const existingPanel = document.getElementById("blip-ai-panel");
    if (existingPanel) {
        existingPanel.remove();
        return;
    }
    
    // Carregar perfis disponíveis
    chrome.storage.local.get(['profiles'], (result) => {
        const profiles = result.profiles || {};
        
        // Criar o painel lateral
        const panel = document.createElement("div");
        panel.id = "blip-ai-panel";
        panel.className = "blip-ai-panel";
        
        panel.innerHTML = `
            <div class="panel-header">
                <h2>Blip SmartText</h2>
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
                    <label for="profile-select">Perfil de Escrita</label>
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
                        Aplicar técnicas persuasivas sutis
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
        
        // Adicionar eventos
        panel.querySelector(".close-button").addEventListener("click", () => panel.remove());
        
        const rewriteButton = panel.querySelector("#rewrite-ai-btn");
        const copyButton = panel.querySelector("#copy-output-btn");
        const insertButton = panel.querySelector("#insert-output-btn");
        const inputTextarea = panel.querySelector("#ai-input");
        const outputTextarea = panel.querySelector("#ai-output");
        
        // Preencher o textarea com o texto selecionado, se houver
        const selectedText = getSelectedText();
        if (selectedText) {
            inputTextarea.value = selectedText;
        }
        
        // Evento de reescrita
        rewriteButton.addEventListener("click", async () => {
            const text = inputTextarea.value.trim();
            if (!text) {
                showNotification("Por favor, insira um texto para reescrever", "error");
                return;
            }
            
            try {
                rewriteButton.disabled = true;
                rewriteButton.textContent = "Reescrevendo...";
                
                // Obter configurações selecionadas
                const profile = {
                    style: panel.querySelector("#profile-select").value,
                    uxWriting: panel.querySelector("#ux-optimization").checked,
                    cognitiveBias: panel.querySelector("#cognitive-bias").checked,
                    addEmojis: panel.querySelector("#add-emojis").checked
                };
                
                // Carregar o módulo AI se ainda não estiver carregado
                await ensureAIModuleLoaded();
                
                if (!aiModule || !aiModule.rewriteText) {
                    throw new Error("Módulo AI não disponível");
                }
                
                // Chamar a função de reescrita
                const rewrittenText = await aiModule.rewriteText(text);
                
                // Mostrar o texto reescrito
                outputTextarea.value = rewrittenText;
                
                showNotification("Texto reescrito com sucesso!", "success");
            } catch (error) {
                console.error("❌ Erro ao reescrever texto com IA:", error);
                showNotification("Não foi possível reescrever o texto. Tente novamente mais tarde.", "error");
            } finally {
                rewriteButton.disabled = false;
                rewriteButton.textContent = "🔄 Reescrever";
            }
        });
        
        // Evento de cópia
        copyButton.addEventListener("click", () => {
            const text = outputTextarea.value.trim();
            if (!text) {
                showNotification("Nenhum texto para copiar", "error");
                return;
            }
            
            navigator.clipboard.writeText(text)
                .then(() => showNotification("Texto copiado para a área de transferência!", "success"))
                .catch(() => showNotification("Erro ao copiar texto", "error"));
        });
        
        // Evento de inserção
        insertButton.addEventListener("click", () => {
            const text = outputTextarea.value.trim();
            if (!text) {
                showNotification("Nenhum texto para inserir", "error");
                return;
            }
            
            if (!activeInput || !isEditable(activeInput)) {
                showNotification("Selecione um campo de texto antes", "error");
                return;
            }
            
            if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
                activeInput.value = text;
                activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // Para elementos com contentEditable
                activeInput.textContent = text;
                activeInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            showNotification("Texto inserido com sucesso!", "success");
            panel.remove();
        });
    });
}

/* ==========================
   FUNÇÕES DO MENU FLUTUANTE
========================== */

function showFloatingMenu() {
    removeFloatingMenu(); // Evita menus duplicados

    if (!getSelectedText()) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    // Criar o menu flutuante
    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-menu";
    floatingMenu.className = "blip-floating-menu";
    floatingMenu.innerHTML = getNewMenuHTML();
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
    
    // Evita que o menu fique fora da tela
    if (left + floatingMenu.offsetWidth > viewportWidth) {
        left = viewportWidth - floatingMenu.offsetWidth - 10;
    }
    
    if (left < 10) {
        left = 10;
    }
    
    // Verifica se o menu ficaria abaixo da área visível
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
            }
        }, 200);
    }
}

/* ==========================
   NOVAS FUNÇÕES DO MENU
========================== */

function getNewMenuHTML() {
    return `
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
}

function attachMenuEventListeners() {
    // Botões regulares
    floatingMenu.querySelectorAll(".menu-btn:not(.dropdown-btn)").forEach(button => {
        if (button.dataset.action !== "show-more") {
            button.addEventListener("click", handleMenuAction);
        }
    });
    
    // Botão de dropdown
    const dropdownBtn = floatingMenu.querySelector(".dropdown-btn");
    if (dropdownBtn) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const dropdownContent = floatingMenu.querySelector(".dropdown-content");
            dropdownContent.classList.toggle("show");
        });
    }
    
    // Itens do dropdown
    floatingMenu.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", handleMenuAction);
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener("click", (e) => {
        if (!floatingMenu) return;
        
        const dropdownContent = floatingMenu.querySelector(".dropdown-content");
        if (dropdownContent && dropdownContent.classList.contains("show")) {
            if (!e.target.matches(".dropdown-btn") && !e.target.closest(".dropdown-content")) {
                dropdownContent.classList.remove("show");
            }
        }
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

    removeFloatingMenu();
}

function formatList(prefix) {
    if (!activeInput || !isEditable(activeInput)) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    // Formata como lista ou citação
    const lines = selectedText.split('\n');
    const formattedText = lines.map(line => `${prefix}${line}`).join('\n');

    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        
        // Aplica a formatação
        activeInput.value = text.slice(0, start) + formattedText + text.slice(end);
        
        // Atualiza a posição do cursor
        activeInput.selectionStart = activeInput.selectionEnd = start + formattedText.length;
        
        // Dispara um evento input
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // Para elementos com contentEditable
        try {
            document.execCommand("insertText", false, formattedText);
        } catch (e) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            
            const newTextNode = document.createTextNode(formattedText);
            
            range.deleteContents();
            range.insertNode(newTextNode);
            
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(newTextNode);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }

    removeFloatingMenu();
}

function clearFormatting() {
    if (!activeInput || !isEditable(activeInput)) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    // Remove formatação (asteriscos, underscores, etc.)
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
        
        activeInput.value = text.slice(0, start) + cleanText + text.slice(end);
        activeInput.selectionStart = activeInput.selectionEnd = start + cleanText.length;
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        try {
            document.execCommand("insertText", false, cleanText);
        } catch (e) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const cleanNode = document.createTextNode(cleanText);
            
            range.deleteContents();
            range.insertNode(cleanNode);
            
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(cleanNode);
            newRange.collapse(false);
            selection.addRange(newRange);
        }
    }

    removeFloatingMenu();
}

function openSettings() {
    chrome.runtime.openOptionsPage();
    removeFloatingMenu();
}

/* ==========================
   REESCRITA DE TEXTO COM IA
========================== */

async function rewriteSelectedText() {
    const selectedText = getSelectedText();
    if (!selectedText || selectedText.length < 2) {
        showNotification("Por favor, selecione um texto para reescrever.", "error");
        return;
    }

    // Mostrar indicador de carregamento
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
        
        showNotification("Texto reescrito com sucesso!", "success");
    } catch (error) {
        console.error("❌ Erro ao reescrever texto com IA:", error);
        
        // Mostrar mensagem de erro para o usuário
        showNotification("Não foi possível reescrever o texto. Tente novamente mais tarde.", "error");
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

/* ==========================
   MENU DE EMOJIS
========================== */

function showEmojiMenu() {
    if (!activeInput || !isEditable(activeInput)) return;
    
    // Remove menu flutuante existente se houver
    removeFloatingMenu();
    
    // Criar menu de emojis
    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-emoji-menu";
    floatingMenu.className = "blip-floating-menu emoji-menu";
    
    // Lista de emojis populares com categorias
    const emojiCategories = {
        "Recente": ["👍", "❤️", "✅", "🎉", "👋", "🙏", "💯", "🔥"],
        "Sorrisos": ["😊", "😂", "😍", "😭", "😎", "😁", "😒", "🥰", "😔", "🤔", "😉", "😌"],
        "Gestos": ["👍", "👋", "🙏", "👏", "🤝", "✌️", "👌", "🤞", "🤟", "🤘", "👆", "👉"],
        "Objetos": ["📱", "💻", "🖥️", "⌨️", "📝", "📊", "📈", "📚", "🗓️", "📌", "📧", "🔍"],
        "Símbolos": ["❤️", "✅", "⚠️", "🚫", "💯", "⭐", "🔥", "👍", "👎", "❓", "‼️", "✨"]
    };
    
    // Criar o HTML do menu
    let emojiMenuHTML = `
        <div class="emoji-header">
            <h3>Escolha um emoji</h3>
            <button class="emoji-close-btn">×</button>
        </div>
        <div class="emoji-categories-tabs">
    `;
    
    // Adicionar as abas de categorias
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
    
    // Adicionar os contêineres de emojis para cada categoria
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
    
    floatingMenu.innerHTML = emojiMenuHTML;
    document.body.appendChild(floatingMenu);
    
    // Posiciona o menu
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        updateTooltipPosition(rect);
    } else if (activeInput) {
        const rect = activeInput.getBoundingClientRect();
        updateTooltipPosition(rect);
    }
    
    // Adicionar eventos
    
    // Botão de fechar
    floatingMenu.querySelector('.emoji-close-btn').addEventListener('click', removeFloatingMenu);
    
    // Botões de emoji
    floatingMenu.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', insertEmoji);
    });
    
    // Abas de categorias
    floatingMenu.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remover classe ativa de todas as abas e contêineres
            floatingMenu.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            floatingMenu.querySelectorAll('.emoji-container').forEach(c => c.classList.remove('active'));
            
            // Adicionar classe ativa à aba clicada e ao contêiner correspondente
            e.target.classList.add('active');
            const category = e.target.dataset.category;
            floatingMenu.querySelector(`.emoji-container[data-category="${category}"]`).classList.add('active');
        });
    });
    
    // Campo de busca
    const searchInput = floatingMenu.querySelector('.emoji-search-input');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            // Restaurar a visualização normal das categorias
            floatingMenu.querySelectorAll('.emoji-container').forEach(container => {
                container.querySelectorAll('.emoji-btn').forEach(btn => {
                    btn.style.display = 'block';
                });
            });
            return;
        }
        
        // Filtrar emojis em todas as categorias
        floatingMenu.querySelectorAll('.emoji-container').forEach(container => {
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
                floatingMenu.querySelector(`.category-tab[data-category="${container.dataset.category}"]`).classList.add('active');
            } else {
                container.classList.remove('active');
                floatingMenu.querySelector(`.category-tab[data-category="${container.dataset.category}"]`).classList.remove('active');
            }
        });
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
        
        // Limita a 8 emojis recentes
        recentEmojis = recentEmojis.slice(0, 8);
        
        // Salva no storage
        chrome.storage.local.set({ recentEmojis });
    });
}

/* ==========================
   NOTIFICAÇÕES E INDICADORES
========================== */

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
 * Mostra uma notificação
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Cria elemento de notificação
    const notification = document.createElement('div');
    notification.className = `blip-notification ${type}`;
    
    // Ícones para cada tipo de notificação
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type] || 'ℹ️'}</div>
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

// Inicializa o script
initialize();