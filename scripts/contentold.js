//scripts/content.js


console.log("🚀 Content script carregado e rodando!");

// Global Variables
let floatingMenu = null;
let activeInput = null;

/* ==========================
   EVENT LISTENERS
========================== */

// Detects when the user focuses on an editable field
document.removeEventListener("focusin", handleFocusIn);
document.addEventListener("focusin", handleFocusIn);

// Detects text selection for showing the menu
document.removeEventListener("mouseup", handleTextSelection);
document.addEventListener("mouseup", handleTextSelection);

// Closes the menu when clicking outside
document.removeEventListener("click", handleOutsideClick);
document.addEventListener("click", handleOutsideClick);

/* ==========================
   EVENT HANDLER FUNCTIONS
========================== */

function handleFocusIn(event) {
    const target = event.target;
    if (isEditable(target)) {
        console.log("📝 Campo de entrada focado:", target);
        activeInput = target;
    }
}

function handleTextSelection() {
    setTimeout(() => {
        if (!activeInput || !isEditable(activeInput)) return;
    
        const selectedText = getSelectedText();
        if (selectedText.length > 0) {
            console.log("📌 Texto selecionado:", selectedText);
            showFloatingMenu();
        } else {
            removeFloatingMenu();
        }
    }, 10); // Pequeno delay para evitar conflitos
}


function handleOutsideClick(event) {
    if (!floatingMenu) return;

    // Verifica se o clique foi dentro do tooltip ou no campo editável
    if (floatingMenu.contains(event.target) || isEditable(event.target)) {
        console.log("✅ Clique dentro do menu ou campo editável. Não fechar.");
        return;
    }

    console.log("🛑 Clique fora do menu. Fechando...");
    
    setTimeout(() => {
        removeFloatingMenu();
    }, 100);
}

/* ==========================
   UTIL FUNCTIONS
========================== */

function isEditable(element) {
    return element && (
        element.tagName === "INPUT" || 
        element.tagName === "TEXTAREA" || 
        element.isContentEditable
    );
}

function getSelectedText() {
    return window.getSelection().toString().trim();
}

/* ==========================
   FLOATING MENU FUNCTIONS
========================== */

function showFloatingMenu() {
    removeFloatingMenu(); // Evita menus duplicados

    if (!activeInput || !isEditable(activeInput)) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect(); // Pega a posição do texto selecionado

    // Criar o tooltip apenas se ainda não existir
    if (!floatingMenu) {
        floatingMenu = document.createElement("div");
        floatingMenu.id = "tooltip";
        floatingMenu.innerHTML = getMenuHTML();
        document.body.appendChild(floatingMenu);
    }

    // Atualiza a posição e a visibilidade do tooltip
    updateTooltipPosition(rect);
    attachMenuEventListeners();
}

function updateTooltipPosition(rect) {
    if (!floatingMenu) return;

    let top = rect.bottom + window.scrollY + 10; // Ajuste fino para melhor posição
    let left = rect.left + window.scrollX + (rect.width / 2) - (floatingMenu.offsetWidth / 2);

    floatingMenu.style.opacity = "1";
    floatingMenu.style.pointerEvents = "auto";
    floatingMenu.style.position = "absolute";
    floatingMenu.style.left = `${left}px`;
    floatingMenu.style.top = `${top}px`;
}




function removeFloatingMenu() {
    if (floatingMenu) {
        floatingMenu.remove();
        floatingMenu = null;
        console.log("🗑️ Tooltip removido.");
    }
}

/* ==========================
   MENU HELPER FUNCTIONS
========================== */
function getMenuStyles(rect, selection) {
    let top = rect.bottom + window.scrollY + 5; // Ajusta para viewport
    let left = rect.left + window.scrollX + (rect.width / 2) - 50; // Centraliza um pouco mais

    // Se for um input ou textarea, ajustamos com base no cursor
    if (activeInput && (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA")) {
        let inputRect = activeInput.getBoundingClientRect();
        top = inputRect.bottom + window.scrollY + 5;
        left = inputRect.left + window.scrollX + 5;
    }

    return `
        position: absolute;
        top: ${top}px;
        left: ${left}px;
        background: #fff;
        padding: 8px;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        z-index: 99999;
        transition: opacity 0.2s ease-in-out;
    `;
}



function getMenuHTML() {
    return `
        <button class="menu-btn" data-action="bold"><b>B</b></button>
        <button class="menu-btn" data-action="italic"><i>I</i></button>
        <button class="menu-btn" data-action="strike"><s>S</s></button>
        <button class="menu-btn" data-action="code">⟩⟩</button>
        <button class="menu-btn" data-action="list-ordered">1️⃣</button>
        <button class="menu-btn" data-action="list-unordered">🔘</button>
        <button class="menu-btn special" data-action="ai-rewrite">✨</button>
    `;
}

function attachMenuEventListeners() {
    floatingMenu.querySelectorAll(".menu-btn").forEach(button => {
        button.addEventListener("click", handleMenuAction);
    });
}

/* ==========================
   MENU ACTIONS
========================== */

function handleMenuAction(event) {
    const action = event.target.closest("button").dataset.action;
    if (!action) return;

    switch (action) {
        case "bold":
            formatText("*");
            break;
        case "italic":
            formatText("_");
            break;
        case "strike":
            formatText("~");
            break;
        case "code":
            formatText("`");
            break;
        case "list-ordered":
            formatText("\n1. ");
            break;
        case "list-unordered":
            formatText("\n- ");
            break;
        case "ai-rewrite":
            rewriteSelectedText();
            break;
        default:
            console.warn("⚠️ Ação desconhecida:", action);
    }
}

/* ==========================
   TEXT FORMATTING
========================== */

function formatText(style) {
    if (!activeInput || !isEditable(activeInput)) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
        // Adiciona a formatação diretamente no valor do input
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const text = activeInput.value;
        activeInput.value = text.slice(0, start) + style + selectedText + style + text.slice(end);
        
        // Mantém o cursor na posição correta
        activeInput.selectionStart = activeInput.selectionEnd = start + style.length + selectedText.length;
    } else {
        // Para elementos `contenteditable`, usamos `execCommand`
        document.execCommand("insertText", false, style + selectedText + style);
    }

    console.log("🎨 Texto formatado com sucesso!");
    removeFloatingMenu();
}


/* ==========================
   AI TEXT REWRITE (PLACEHOLDER)
========================== */

async function rewriteSelectedText() {
    let selectedText = getSelectedText();
    if (!selectedText) return;

    console.log("🤖 Enviando texto para reescrita IA:", selectedText);

    try {
        const rewrittenText = await rewriteText(selectedText); // External function assumed
        
        if (activeInput.tagName === "INPUT" || activeInput.tagName === "TEXTAREA") {
            const start = activeInput.selectionStart;
            const end = activeInput.selectionEnd;
            const text = activeInput.value;
            activeInput.value = text.slice(0, start) + rewrittenText + text.slice(end);
            activeInput.selectionStart = activeInput.selectionEnd = start + rewrittenText.length;
        } else {
            document.execCommand("insertText", false, rewrittenText);
        }

        console.log("✅ Texto reescrito com IA:", rewrittenText);
    } catch (error) {
        console.error("❌ Erro ao reescrever texto com IA:", error);
    } finally {
        removeFloatingMenu();
    }
}


function openAIRewriteFromContextMenu() {
    let selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        openAIRewriteMenu();
    }
}

document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    if (floatingMenu && rect.width > 0 && rect.height > 0) {
        updateTooltipPosition(rect);
    }
});


document.addEventListener("mouseup", () => {
    const selectedText = getSelectedText();
    if (!selectedText) {
        if (floatingMenu) {
            floatingMenu.style.opacity = "0"; // Esconde suavemente
            floatingMenu.style.pointerEvents = "none"; // Impede cliques
        }
    }
});


const observer = new MutationObserver(() => {
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

    if (rect.width > 0 && rect.height > 0) {
        if (!floatingMenu) {
            floatingMenu = document.createElement("div");
            floatingMenu.id = "blip-menu";
            floatingMenu.innerHTML = getMenuHTML();
            document.body.appendChild(floatingMenu);
        }

        updateTooltipPosition(rect);
    }
});

// Observa mudanças em todo o corpo do WhatsApp Web
observer.observe(document.body, { childList: true, subtree: true });


if (window.hasRunBlipSmartText) {
    console.warn("🚫 Blip SmartText já foi carregado nesta aba. Evitando duplicação.");
    throw new Error("Blip SmartText já está rodando.");
}
window.hasRunBlipSmartText = true;
console.log("🚀 Content script carregado e rodando!");


if (!floatingMenu) {
    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-menu";
    floatingMenu.innerHTML = getMenuHTML();
    document.body.appendChild(floatingMenu);
}
