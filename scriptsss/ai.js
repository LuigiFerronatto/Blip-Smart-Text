/**
 * scripts/ai.js
 * Módulo de reescrita de texto usando IA
 */

import { API_CONFIG } from './config.js';
import { getSelectedProfile } from './storage.js';

/**
 * Reescreve um texto usando a API OpenAI com base no perfil selecionado
 * @param {string} text - Texto a ser reescrito
 * @param {Object} customProfile - (Opcional) Perfil customizado a ser usado
 * @returns {Promise<string>} - Texto reescrito
 */
export async function rewriteText(text, customProfile = null) {
    try {
        // Obter o perfil, com prioridade para o perfil customizado ou fallback para o perfil salvo
        const profile = customProfile || await getSelectedProfile();
        
        // Construir o prompt baseado no perfil
        const promptData = buildPrompt(text, profile);
        
        // Fazer requisição para a API
        const response = await makeAPIRequest(promptData);
        
        return response;
    } catch (error) {
        console.error("Erro detalhado na reescrita de texto:", {
            message: error.message,
            stack: error.stack,
            text: text?.substring(0, 100) // Log apenas os primeiros 100 caracteres para privacidade
        });

        // Mensagens de erro mais detalhadas
        if (error.message.includes('fetch') || error.message.includes('network')) {
            throw new Error("Erro de conexão. Verifique sua internet.");
        }
        if (error.message.includes('API') || error.message.includes('key') || error.message.includes('401')) {
            throw new Error("Problema com o serviço de IA. Verifique suas credenciais da API.");
        }
        
        throw new Error("Ocorreu um erro ao reescrever o texto. Por favor, tente novamente.");
    }
}

/**
 * Constrói o prompt para a API com base nas preferências do perfil
 * @param {string} text - Texto original
 * @param {Object} profile - Perfil de configuração
 * @returns {Object} - Objeto contendo systemPrompt e userPrompt
 */
function buildPrompt(text, profile) {
    // Mapeamentos de estilo para descrições
    const styleMappings = {
        'Professional': 'Use um tom formal e objetivo, com linguagem precisa para ambientes corporativos.',
        'Casual': 'Use um tom amigável e conversacional, como se estivesse falando com um amigo.',
        'Creative': 'Use linguagem imaginativa e envolvente, com metáforas e descrições vívidas.',
        'Technical': 'Use linguagem técnica clara e precisa, com terminologia específica da área.',
        'Persuasive': 'Crie um texto persuasivo e motivador, que influencie positivamente o leitor.'
    };

    // Construa um prompt do sistema melhorado
    let systemPrompt = `Você é um especialista em reescrita de texto que ajuda a melhorar a qualidade da escrita mantendo o significado original.`;
    
    // Adiciona instruções específicas com base nas configurações do perfil
    if (profile.uxWriting) {
        systemPrompt += ` Você aplica princípios de UX writing: clareza, concisão, e utilidade. Você torna o texto mais escaneável e amigável ao usuário, usando linguagem direta e acionável.`;
    }
    
    if (profile.cognitiveBias) {
        systemPrompt += ` Você compreende princípios psicológicos e vieses cognitivos, incorporando sutilmente técnicas como prova social, escassez, reciprocidade ou autoridade para tornar o texto mais persuasivo e envolvente.`;
    }
    
    if (profile.addEmojis) {
        systemPrompt += ` Você incorpora emojis relevantes de forma equilibrada para melhorar a conexão emocional com o leitor, sem exagerar no seu uso.`;
    }
    
    // Usar prompt personalizado se existir, caso contrário usar o padrão
    if (profile.customPrompt && profile.customPrompt.trim().length > 0) {
        systemPrompt += ` ${profile.customPrompt.trim()}`;
    }

    // Construção do prompt do usuário
    let userPrompt = `Reescreva o seguinte texto mantendo o significado e a intenção original, mas melhorando sua qualidade:

Texto Original:
"${text}"

Diretrizes de Estilo:
- Estilo de Escrita: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Otimize para clareza e experiência do usuário: torne o texto escaneável, conciso e orientado à ação' : ''}
${profile.cognitiveBias ? '- Aplique técnicas persuasivas sutis para torná-lo mais envolvente e convincente' : ''}
${profile.addEmojis ? '- Adicione emojis relevantes onde apropriado para melhorar a mensagem' : ''}

Preserve quaisquer informações-chave, termos técnicos ou exemplos específicos do original. Sua reescrita deve ter aproximadamente o mesmo tamanho do original, a menos que a brevidade melhore a clareza.`;

    return {
        systemPrompt,
        userPrompt
    };
}

/**
 * Faz a requisição para a API de IA
 * @param {Object} promptData - Objeto contendo systemPrompt e userPrompt
 * @returns {Promise<string>} - Texto respondido pela API
 */
async function makeAPIRequest(promptData) {
    const { apiKey, url } = API_CONFIG;
    
    if (!apiKey || !url) {
        throw new Error("Configuração de API incompleta");
    }
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: promptData.systemPrompt },
                    { role: "user", content: promptData.userPrompt }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro na API: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        
        // Validar a resposta
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("Resposta da API inválida");
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Erro na chamada da API:", error);
        throw error;  // Repassa o erro para tratamento superior
    }
}