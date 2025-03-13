/**
 * scripts/ai.js
 * Funções para reescrita de texto usando IA com melhorias de tratamento de erro
 */

import { API_CONFIG } from './config.js';
import { getSelectedProfile } from './storage.js';

/**
 * Reescreve um texto usando a API OpenAI com base no perfil selecionado
 * @param {string} text - Texto a ser reescrito
 * @returns {Promise<string>} - Texto reescrito
 */
export async function rewriteText(text) {
    try {
        // Obter o perfil salvo, com fallback para perfil padrão
        const profile = await getSelectedProfile() || {
            style: 'Professional',
            uxWriting: false,
            cognitiveBias: false,
            addEmojis: false
        };
        
        // Construir o prompt baseado no perfil
        const prompt = buildPrompt(text, profile);
        
        // Fazer requisição para a API
        const response = await makeAPIRequest(prompt);
        
        return response;
    } catch (error) {
        console.error("Erro detalhado na reescrita de texto:", {
            message: error.message,
            stack: error.stack,
            text: text
        });

        // Mensagens de erro mais detalhadas
        if (error.message.includes('fetch')) {
            return "Erro de conexão. Verifique sua internet.";
        }
        if (error.message.includes('API')) {
            return "Problema com o serviço de IA. Tente novamente mais tarde.";
        }
        
        return "Ocorreu um erro ao reescrever o texto. Por favor, tente novamente.";
    }
}

/**
 * Constrói o prompt para a API com base nas preferências do perfil
 * @param {string} text - Texto original
 * @param {Object} profile - Perfil de configuração
 * @returns {string} - Prompt formatado
 */
function buildPrompt(text, profile) {
    const styleMappings = {
        'Professional': 'Use a formal, objective tone with precise language.',
        'Casual': 'Write in a friendly, conversational style.',
        'Creative': 'Use imaginative and engaging language.',
        'Technical': 'Employ clear, precise technical language.',
        'Persuasive': 'Craft a compelling, motivational text.'
    };

    let prompt = `Rewrite the following text considering these guidelines:

Original Text:
"${text}"

Style Guidelines:
- Writing Style: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Optimize for clarity and user experience' : ''}
${profile.cognitiveBias ? '- Apply subtle persuasive techniques' : ''}
${profile.addEmojis ? '- Consider adding relevant emojis' : ''}

Rewritten Text:`;

    return prompt;
}

/**
 * Faz a requisição para a API de IA com melhor tratamento de erros
 * @param {string} prompt - Prompt para enviar
 * @returns {Promise<string>} - Texto respondido pela API
 */
async function makeAPIRequest(prompt) {
    const { apiKey, url } = API_CONFIG;
    
    if (!apiKey || !url) {
        throw new Error("Configuração de API incompleta");
    }
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: 'gpt-4-0613',
                messages: [
                    { role: "system", content: "You are a helpful assistant that rewrites text while maintaining the original meaning." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        
        // Log adicional para depuração
        console.log("Resposta da API:", {
            status: response.status,
            choices: data.choices
        });

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Erro na chamada da API:", error);
        throw error;  // Repassa o erro para tratamento superior
    }
}