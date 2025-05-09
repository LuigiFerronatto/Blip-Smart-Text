/**
 * modules/ai.js
 * AI functionality for text rewriting
 */

import { API_CONFIG } from './config.js';
import { getSelectedProfile } from './storage.js';

/**
 * Rewrite text using the OpenAI API based on the selected profile
 * @param {string} text - Text to rewrite
 * @param {Object} customProfile - (Optional) Custom profile to use
 * @returns {Promise<string>} - Rewritten text
 */
export async function rewriteText(text, customProfile = null) {
  try {
    // Get profile, with priority for custom profile or fallback to saved profile
    const profile = customProfile || await getSelectedProfile();
    
    // Build prompt based on profile
    const promptData = buildPrompt(text, profile);
    
    // Make API request
    const response = await makeAPIRequest(promptData);
    
    return response;
  } catch (error) {
    console.error("Detailed error in text rewriting:", {
      message: error.message,
      stack: error.stack,
      text: text?.substring(0, 100) // Log only first 100 chars for privacy
    });

    // More detailed error messages
    if (error.message.includes('fetch') || error.message.includes('network')) {
      throw new Error("Connection error. Check your internet.");
    }
    if (error.message.includes('API') || error.message.includes('key') || error.message.includes('401')) {
      throw new Error("AI service issue. Check your API credentials.");
    }
    
    throw new Error("An error occurred while rewriting the text. Please try again.");
  }
}

/**
 * Build prompt for the API based on profile preferences
 * @param {string} text - Original text
 * @param {Object} profile - Configuration profile
 * @returns {Object} - Object containing systemPrompt and userPrompt
 */
function buildPrompt(text, profile) {
  // Style mappings
  const styleMappings = {
    'Professional': 'Use a formal and objective tone with precise language for corporate environments.',
    'Casual': 'Use a friendly and conversational tone, as if talking to a friend.',
    'Creative': 'Use imaginative and engaging language with metaphors and vivid descriptions.',
    'Technical': 'Use clear and precise technical language with specific terminology.',
    'Persuasive': 'Create persuasive and motivating text that positively influences the reader.'
  };

  // Build improved system prompt
  let systemPrompt = `You are a text rewriting expert who helps improve writing quality while maintaining the original meaning.`;
  
  // Add specific instructions based on profile settings
  if (profile.uxWriting) {
    systemPrompt += ` You apply UX writing principles: clarity, conciseness, and utility. You make text more scannable and user-friendly, using direct and actionable language.`;
  }
  
  if (profile.cognitiveBias) {
    systemPrompt += ` You understand psychological principles and cognitive biases, subtly incorporating techniques like social proof, scarcity, reciprocity, or authority to make the text more persuasive and engaging.`;
  }
  
  if (profile.addEmojis) {
    systemPrompt += ` You incorporate relevant emojis in a balanced way to improve emotional connection with the reader, without overusing them.`;
  }
  
  // Use custom prompt if it exists
  if (profile.customPrompt && profile.customPrompt.trim().length > 0) {
    systemPrompt += ` ${profile.customPrompt.trim()}`;
  }

  // Build user prompt
  let userPrompt = `Rewrite the following text keeping the original meaning and intent, but improving its quality:

Original Text:
"${text}"

Style Guidelines:
- Writing Style: ${styleMappings[profile.style] || styleMappings['Professional']}
${profile.uxWriting ? '- Optimize for clarity and user experience: make text scannable, concise, and action-oriented' : ''}
${profile.cognitiveBias ? '- Apply subtle persuasive techniques to make it more engaging and convincing' : ''}
${profile.addEmojis ? '- Add relevant emojis where appropriate to enhance the message' : ''}

Preserve any key information, technical terms, or specific examples from the original. Your rewrite should be approximately the same length as the original unless brevity improves clarity.`;

  return {
    systemPrompt,
    userPrompt
  };
}

/**
 * Make request to AI API
 * @param {Object} promptData - Object containing systemPrompt and userPrompt
 * @returns {Promise<string>} - Text returned by API
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
    console.warn("Could not retrieve stored API settings, using defaults:", error);
  }
  
  // Verificar se temos valores para prosseguir
  if (!apiKey || !url) {
    throw new Error("Incomplete API configuration");
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
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
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorBody = await response.text();
        errorMessage += ` - ${errorBody}`;
      } catch (e) {
        // If we can't parse the error body, just use the status
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Validate response
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid API response");
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    // Handle abort error specifically
    if (error.name === 'AbortError') {
      throw new Error("API request timed out. Please try again.");
    }
    
    console.error("API call error:", error);
    throw error;  // Pass error up for higher-level handling
  }
}

// Export a mock AI module for testing - útil quando a API não está disponível
export const mockAiModule = {
  rewriteText: async (text) => {
    console.log("Using mock AI module");
    return `[MOCK AI] Improved version: ${text}`;
  }
};