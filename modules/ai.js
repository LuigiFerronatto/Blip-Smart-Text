/**
 * modules/ai.js
 * Funcionalidade de IA para reescrita de texto
 */

import { API_CONFIG } from './config.js';
import { getSelectedProfile } from './storage.js';

/**
 * Reescreve texto usando a API OpenAI com base no perfil selecionado
 * @param {string} text - Texto a ser reescrito
 * @param {Object} customProfile - (Opcional) Perfil personalizado a ser usado
 * @returns {Promise<string>} - Texto reescrito
 */
export async function rewriteText(text, customProfile = null) {
  try {
    // Obter o perfil, priorizando o perfil personalizado ou usando o perfil salvo
    const profile = customProfile || await getSelectedProfile();
    
    // Construir o prompt com base no perfil
    const promptData = buildPrompt(text, profile);
    
    // Fazer a requisição para a API
    const response = await makeAPIRequest(promptData);
    
    return response;
  } catch (error) {
    console.error("Erro detalhado na reescrita de texto:", {
      message: error.message,
      stack: error.stack,
      text: text?.substring(0, 100) // Logar apenas os primeiros 100 caracteres por privacidade
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
 * Construir o prompt para a API com base nas preferências do perfil
 * @param {string} text - Texto original
 * @param {Object} profile - Perfil de configuração
 * @returns {Object} - Objeto contendo systemPrompt e userPrompt
 */
function buildPrompt(text, profile) {
  // Mapeamento de estilos
  const styleMappings = {
    'Professional': 'Use um tom formal e objetivo com linguagem precisa para ambientes corporativos.',
    'Casual': 'Use um tom amigável e conversacional, como se estivesse falando com um amigo.',
    'Creative': 'Use uma linguagem imaginativa e envolvente com metáforas e descrições vívidas.',
    'Technical': 'Use uma linguagem técnica clara e precisa com terminologia específica.',
    'Persuasive': 'Crie um texto persuasivo e motivador que influencie positivamente o leitor.'
  };

  // Construir o prompt do sistema aprimorado
  let systemPrompt = `Você é um especialista em reescrita de texto que ajuda a melhorar a qualidade da escrita enquanto mantém o significado original.`;
  
  // Adicionar instruções específicas com base nas configurações do perfil
  if (profile.uxWriting) {
    systemPrompt += ` Você aplica princípios de UX writing: clareza, concisão e utilidade. Você torna o texto mais escaneável e amigável ao usuário, usando linguagem direta e acionável.`;
  }
  
  if (profile.cognitiveBias) {
    systemPrompt += ` Você entende princípios psicológicos e vieses cognitivos, incorporando sutilmente técnicas como prova social, escassez, reciprocidade ou autoridade para tornar o texto mais persuasivo e envolvente.`;
  }
  
  if (profile.addEmojis) {
    systemPrompt += ` Você incorpora emojis relevantes de forma equilibrada para melhorar a conexão emocional com o leitor, sem exagerar.`;
  }
  
  // Usar prompt personalizado, se existir
  if (profile.customPrompt && profile.customPrompt.trim().length > 0) {
    systemPrompt += ` ${profile.customPrompt.trim()}`;
  }

  // Construir o prompt do usuário
  let userPrompt = `Reescreva o texto a seguir mantendo o significado e a intenção originais, mas melhorando sua qualidade:

Texto Original:
"${text}"

Diretrizes de Estilo:
- Estilo de Escrita: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Otimize para clareza e experiência do usuário: torne o texto escaneável, conciso e orientado para ação' : ''}
${profile.cognitiveBias ? '- Aplique técnicas persuasivas sutis para torná-lo mais envolvente e convincente' : ''}
${profile.addEmojis ? '- Adicione emojis relevantes onde apropriado para melhorar a mensagem' : ''}

Preserve qualquer informação-chave, termos técnicos ou exemplos específicos do original. Sua reescrita deve ter aproximadamente o mesmo comprimento do original, a menos que a brevidade melhore a clareza.`;

  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * Fazer a requisição para a API de IA
 * @param {Object} promptData - Objeto contendo systemPrompt e userPrompt
 * @returns {Promise<string>} - Texto retornado pela API
 */
async function makeAPIRequest(promptData) {
  // Obter a configuração da API - usar os valores armazenados se disponíveis
  // ou usar os valores padrão do config.js
  let { apiKey, url } = API_CONFIG;
  
  try {
    // Verificar se há valores armazenados
    const settingsFromStorage = await chrome.storage.local.get('smarttext_settings');
    if (settingsFromStorage.smarttext_settings) {
      const storedSettings = settingsFromStorage.smarttext_settings;
      
      // Usar valores armazenados apenas se existirem e não estiverem vazios
      if (storedSettings.apiKey && storedSettings.apiKey.trim() !== '') {
        apiKey = storedSettings.apiKey;
      }
      
      if (storedSettings.apiUrl && storedSettings.apiUrl.trim() !== '') {
        url = storedSettings.apiUrl;
      }
    }
  } catch (error) {
    console.warn("Não foi possível recuperar as configurações da API armazenadas, usando os padrões:", error);
  }
  
  // Verificar se temos valores para prosseguir
  if (!apiKey || !url) {
    throw new Error("Configuração da API incompleta");
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Timeout de 30 segundos
    
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
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Erro na API: ${response.status}`;
      try {
        const errorBody = await response.text();
        errorMessage += ` - ${errorBody}`;
      } catch (e) {
        // Se não conseguirmos analisar o corpo do erro, usar apenas o status
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Validar resposta
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Resposta inválida da API");
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    // Tratar erro de timeout especificamente
    if (error.name === 'AbortError') {
      throw new Error("A requisição para a API expirou. Por favor, tente novamente.");
    }
    
    console.error("Erro na chamada da API:", error);
    throw error;  // Passar o erro para tratamento em nível superior
  }
}

// Exportar um módulo de IA mock para testes - útil quando a API não está disponível
export const mockAiModule = {
  rewriteText: async (text) => {
    console.log("Usando módulo de IA mock");
    return `[MOCK IA] Versão melhorada: ${text}`;
  }
};