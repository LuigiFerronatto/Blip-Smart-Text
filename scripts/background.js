chrome.runtime.onInstalled.addListener(() => {
    console.log("Blip SmartText Extension Installed!");

    // Create a context menu for AI rewriting
    chrome.contextMenus.create({
        id: "aiRewrite",
        title: "Rewrite with AI 🤖",
        contexts: ["selection"]
    });

    // Create a context menu for text formatting
    chrome.contextMenus.create({
        id: "formatText",
        title: "Format Text (Bold, Italic, etc.) ✍️",
        contexts: ["selection"]
    });

    // Create a context menu for inserting emojis
    chrome.contextMenus.create({
        id: "insertEmoji",
        title: "Insert Emoji 😀",
        contexts: ["editable"]
    });

    // Add keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
        if (command === "open_ai_rewrite") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    function: openAIRewriteFromShortcut
                });
            });
        }
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "aiRewrite") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: openAIRewriteFromContextMenu
        });
    }
    if (info.menuItemId === "formatText") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: showFloatingMenu
        });
    }
    if (info.menuItemId === "insertEmoji") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: showEmojiMenu
        });
    }
});

// Function to call AI rewrite from shortcut
function openAIRewriteFromShortcut() {
    let selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        openAIRewriteMenu();
    }
}

// Function to call AI rewrite from context menu
function openAIRewriteFromContextMenu() {
    let selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        openAIRewriteMenu();
    }
}

// Ensure these functions are defined somewhere in your code
function openAIRewriteMenu() {
    // Implementation for opening AI rewrite menu
}

function showFloatingMenu() {
    // Implementation for showing floating menu
}

function showEmojiMenu() {
    // Implementation for showing emoji menu
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.scripting.registerContentScripts([{
        id: "blipContent",
        matches: ["*://*.blip.ai/*"],
        js: ["scripts/content.js"],
        css: ["styles/content.css"],
        runAt: "document_start",
        allFrames: true
    }]);
    console.log("✅ Content script registrado via background.js!");
});
