/**
 * OpenAI Service
 * Provides functionality for interacting with OpenAI API from the server
 */

import { config, hasApiKey } from '../config';

interface ChatCompletionParams {
  prompt: string;
  systemMessage?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  language?: 'en' | 'hi' | 'mr';
}

interface CompletionResponse {
  text: string;
  isError: boolean;
  status?: number;
  errorMessage?: string;
}

/**
 * Send a request to OpenAI for chat completion
 * @param params - Parameters for the completion request
 * @returns Formatted response from OpenAI
 */
export async function getChatCompletion(params: ChatCompletionParams): Promise<CompletionResponse> {
  const { 
    prompt,
    systemMessage = "You are a helpful assistant for the Maharashtra Water Dashboard.",
    model = 'gpt-3.5-turbo',
    maxTokens = 150,
    temperature = 0.7,
    language = 'en'
  } = params;
  
  // Check if API key is configured
  if (!hasApiKey('OPENAI_API_KEY')) {
    console.error('OpenAI API key is not configured on the server');
    return {
      text: "I'm unable to process advanced queries at the moment. The OpenAI integration is not properly configured.",
      isError: true,
      errorMessage: "API key not configured"
    };
  }
  
  // Get the correct language for the system message
  const languageLabel = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
  const languageSystemMessage = `${systemMessage} Respond in ${languageLabel}.`;
  
  try {
    // Prepare request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKeys.openai}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: languageSystemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      })
    });
    
    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try again or ask a simpler question.",
        isError: true,
        status: response.status,
        errorMessage: errorData.error?.message || `HTTP error ${response.status}`
      };
    }
    
    // Parse the response
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || '';
    
    return {
      text: completionText.trim(),
      isError: false
    };
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      text: "I encountered a technical issue while processing your request. Please try again later.",
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Simple language detection
 * @param text - Text to detect language for
 * @returns Language code ('en', 'hi', 'mr')
 */
export function detectLanguage(text: string): 'en' | 'hi' | 'mr' {
  // Hindi Unicode range
  const hindiPattern = /[\u0900-\u097F]/g;
  // Marathi uses same Unicode range as Hindi, but we can check for some Marathi-specific patterns
  const marathiPattern = /[\u0900-\u097F][\u0900-\u097F]\s/g;
  
  if (marathiPattern.test(text)) {
    return 'mr'; // Marathi
  } else if (hindiPattern.test(text)) {
    return 'hi'; // Hindi
  }
  
  return 'en'; // Default to English
}

/**
 * Translate text using OpenAI
 * @param text - Text to translate
 * @param targetLanguage - Target language code ('en', 'hi', 'mr')
 * @returns Translated text
 */
export async function translateText(text: string, targetLanguage: 'en' | 'hi' | 'mr'): Promise<string> {
  const languageNames = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi'
  };
  
  const response = await getChatCompletion({
    prompt: `Translate the following text to ${languageNames[targetLanguage]}: "${text}"`,
    maxTokens: 200,
    temperature: 0.3,
    language: targetLanguage
  });
  
  return response.isError ? text : response.text;
}

export default {
  getChatCompletion,
  detectLanguage,
  translateText
};