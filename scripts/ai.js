/**
 * scripts/ai.js
 * Funções para reescrita de texto usando IA
 */

// Importando constantes de configuração (melhor prática de segurança)
import { API_CONFIG } from './config.js';

/**
 * Reescreve um texto usando a API OpenAI com base no perfil selecionado
 * @param {string} text - Texto a ser reescrito
 * @returns {Promise<string>} - Texto reescrito
 */
export async function rewriteText(text) {
    try {
        // Obter o perfil salvo, com fallback para perfil padrão
        const profile = await getSelectedProfile();
        
        // Construir o prompt baseado no perfil
        const prompt = buildPrompt(text, profile);
        
        // Mostrar indicador de carregamento
        toggleLoadingIndicator(true);
        
        // Fazer requisição para a API
        const response = await makeAPIRequest(prompt);
        
        return response;
    } catch (error) {
        console.error("Error rewriting text:", error);
        return "Ocorreu um erro ao reescrever o texto. Por favor, tente novamente.";
    } finally {
        // Esconder indicador de carregamento
        toggleLoadingIndicator(false);
    }
}

/**
 * Obtém o perfil selecionado do armazenamento local
 * @returns {Object} - Perfil selecionado ou perfil padrão
 */
async function getSelectedProfile() {
    try {
        const profileData = localStorage.getItem("profile_Selected");
        if (!profileData) {
            console.warn("Nenhum perfil encontrado, usando perfil padrão");
            return { 
                style: "Professional", 
                uxWriting: false, 
                cognitiveBias: false, 
                addEmojis: false 
            };
        }
        return JSON.parse(profileData);
    } catch (error) {
        console.error("Erro ao obter perfil:", error);
        return { style: "Professional" };
    }
}

/**
 * Constrói o prompt para a API com base nas preferências do perfil
 * @param {string} text - Texto original
 * @param {Object} profile - Perfil de configuração
 * @returns {string} - Prompt formatado
 */
function buildPrompt(text, profile) {
    let prompt = `Rewrite this text:\n\n"${text}"\n\n`;

    // Adicionar instruções baseadas no perfil
    prompt += `Style: ${profile.style || 'Professional'}\n`;
    
    if (profile.uxWriting) prompt += `- Optimize for UX Writing: clear, concise, helpful\n`;
    if (profile.cognitiveBias) prompt += `- Apply cognitive biases: social proof, scarcity\n`;
    if (profile.addEmojis) prompt += `- Add relevant emojis where appropriate\n`;
    
    // Se houver um prompt personalizado, usá-lo
    if (profile.customPrompt) {
        prompt += `\nAdditional instructions: ${profile.customPrompt}\n`;
    }
    
    return prompt;
}

/**
 * Alterna a visibilidade do indicador de carregamento
 * @param {boolean} isVisible - Indicador deve estar visível
 */
function toggleLoadingIndicator(isVisible) {
    const loadingIndicator = document.getElementById("loadingIndicator");
    if (loadingIndicator) {
        loadingIndicator.style.display = isVisible ? "block" : "none";
    }
}

/**
 * Faz a requisição para a API de IA
 * @param {string} prompt - Prompt para enviar
 * @returns {Promise<string>} - Texto respondido pela API
 */
async function makeAPIRequest(prompt) {
    // Usar configurações da importação para maior segurança
    const { apiKey, url } = API_CONFIG;
    
    // Verificar se as configurações estão presentes
    if (!apiKey || !url) {
        throw new Error("API configuration missing");
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: "You are a helpful assistant that rewrites text." },
                { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    // Corrigido para o formato de resposta de chat completions
    return data.choices[0].message.content.trim();
}