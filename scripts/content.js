console.log("🚀 Content script carregado e rodando!");

// Global Variables
let floatingMenu = null;
let activeInput = null;

/* ==========================
   EVENT LISTENERS
========================== */

// Detects when the user focuses on an editable field
document.addEventListener("focusin", handleFocusIn);

// Detects text selection for showing the menu
document.addEventListener("mouseup", handleTextSelection);

// Closes the menu when clicking outside
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
    if (!activeInput) return;

    const selectedText = getSelectedText();
    if (selectedText.length > 0) {
        console.log("📌 Texto selecionado:", selectedText);
        showFloatingMenu();
    } else {
        removeFloatingMenu();
    }
}

function handleOutsideClick(event) {
    if (floatingMenu && !floatingMenu.contains(event.target)) {
        console.log("🛑 Clique fora do menu. Fechando...");
        removeFloatingMenu();
    }
}

/* ==========================
   UTIL FUNCTIONS
========================== */

function isEditable(element) {
    return element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable);
}

function getSelectedText() {
    return window.getSelection().toString().trim();
}

/* ==========================
   FLOATING MENU FUNCTIONS
========================== */

function showFloatingMenu() {
    removeFloatingMenu(); // Ensure no duplicates

    if (!activeInput) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const selectedText = getSelectedText();
    if (!selectedText) return;

    let range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();

    floatingMenu = document.createElement("div");
    floatingMenu.id = "blip-menu";
    floatingMenu.style.cssText = getMenuStyles(rect);
    floatingMenu.innerHTML = getMenuHTML();

    document.body.appendChild(floatingMenu);
    attachMenuEventListeners();
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

function getMenuStyles(rect) {
    return `
        position: fixed;
        top: ${rect.bottom + window.scrollY + 5}px;
        left: ${rect.left + window.scrollX}px;
        background: #333;
        padding: 8px;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        display: flex;
        gap: 6px;
        z-index: 99999999;
        font-family: Arial, sans-serif;
        align-items: center;
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
    document.querySelectorAll(".menu-btn").forEach(button => {
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
    let selection = window.getSelection();
    let selectedText = getSelectedText();
    if (!selectedText) return;

    let range = selection.getRangeAt(0);
    let span = document.createElement("span");
    span.textContent = `${style}${selectedText}${style}`;

    range.deleteContents();
    range.insertNode(span);

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
        document.execCommand("insertText", false, rewrittenText);
        console.log("✅ Texto reescrito com IA:", rewrittenText);
    } catch (error) {
        console.error("❌ Erro ao reescrever texto com IA:", error);
    } finally {
        removeFloatingMenu();
    }
}
