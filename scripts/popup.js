//scripts/popup.js


import { saveProfile, getProfiles, deleteProfile } from "./storage.js";

document.addEventListener("DOMContentLoaded", () => {
    loadProfiles();

    // Navigation
    document.getElementById("configure-btn").addEventListener("click", () => toggleScreen("config-screen"));
    document.getElementById("back-btn").addEventListener("click", () => toggleScreen("home-screen"));

    // Profile Actions
    document.getElementById("saveProfile").addEventListener("click", saveCurrentProfile);
    document.getElementById("newProfile").addEventListener("click", createNewProfile);
    document.getElementById("deleteProfile").addEventListener("click", deleteSelectedProfile);

    // Custom Prompt Toggle
    document.getElementById("togglePrompt").addEventListener("click", () => {
        document.getElementById("customPrompt").classList.toggle("hidden");
    });
});

function toggleScreen(screenId) {
    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("config-screen").classList.add("hidden");
    document.getElementById(screenId).classList.remove("hidden");
}

// Load Profiles into the Select Dropdown
function loadProfiles() {
    
    const profileSelector = document.getElementById("profileSelector");
    profileSelector.innerHTML = "";

    let profiles = getProfiles();
    if (!profiles || Object.keys(profiles).length === 0) {
        console.warn("⚠️ Nenhum perfil salvo no localStorage.");
        return;
    }
    console.log("🔍 Perfis carregados:", profiles);
    for (let name in profiles) {
        let option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        profileSelector.appendChild(option);
    }
}

// Save Current Profile
function saveCurrentProfile() {
    let profileName = document.getElementById("profileSelector").value;
    if (!profileName) {
        alert("Por favor, selecione um perfil para salvar.");
        return;
    }

    let profile = {
        style: document.querySelector('input[name="style"]:checked')?.value || "Professional",
        uxWriting: document.getElementById("uxWriting").checked,
        cognitiveBias: document.getElementById("cognitiveBias").checked,
        addEmojis: document.getElementById("addEmojis").checked,
        autoRewrite: document.getElementById("autoRewrite").checked,
        customPrompt: document.getElementById("customPrompt").value
    };

    try {
        saveProfile(profileName, profile);
        alert("Perfil salvo com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar o perfil:", error);
        alert("Erro ao salvar o perfil. Verifique o console para mais detalhes.");
    }
}

// Create a New Profile and Reset Fields
function createNewProfile() {
    let newProfileName = prompt("Digite o nome do novo perfil:");
    if (newProfileName) {
        try {
            saveProfile(newProfileName, {});
            loadProfiles();
            clearProfileSettings();
            alert(`Perfil "${newProfileName}" criado com sucesso!`);
        } catch (error) {
            console.error("Erro ao criar o novo perfil:", error);
            alert("Erro ao criar o novo perfil. Verifique o console para mais detalhes.");
        }
    }
}

// Delete Selected Profile
function deleteSelectedProfile() {
    let profileSelector = document.getElementById("profileSelector");
    let profileName = profileSelector.value;

    if (!profileName) {
        alert("Nenhum perfil selecionado para excluir.");
        return;
    }

    let confirmDelete = confirm(`Tem certeza que deseja excluir o perfil "${profileName}"?`);
    if (confirmDelete) {
        try {
            deleteProfile(profileName);
            loadProfiles();
            clearProfileSettings();
            alert(`Perfil "${profileName}" excluído com sucesso.`);
        } catch (error) {
            console.error("Erro ao excluir o perfil:", error);
            alert("Erro ao excluir o perfil. Verifique o console para mais detalhes.");
        }
    }
}

// Clear Profile Fields when Creating a New One
function clearProfileSettings() {
    document.querySelectorAll('input[name="style"]').forEach(el => el.checked = false);
    document.getElementById("uxWriting").checked = false;
    document.getElementById("cognitiveBias").checked = false;
    document.getElementById("addEmojis").checked = false;
    document.getElementById("autoRewrite").checked = false;
    document.getElementById("customPrompt").value = "";
}