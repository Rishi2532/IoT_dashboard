import { API_KEYS, getApiKey } from '../config/api-keys';

interface OpenAICompletionParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  language?: string;
}

interface OpenAIResponse {
  text: string;
  isError: boolean;
}

/**
 * Send a request to OpenAI for chat completion
 * @param params - Parameters for the completion request
 * @returns Formatted response from OpenAI
 */
export async function getOpenAICompletion(params: OpenAICompletionParams): Promise<OpenAIResponse> {
  const { prompt, maxTokens = 150, temperature = 0.7, language = 'en' } = params;
  const apiKey = getApiKey('OPENAI_API_KEY');
  
  if (!apiKey) {
    console.error('OpenAI API key is not configured');
    return {
      text: "I'm unable to process advanced queries at the moment. Please try a simpler question or basic commands.",
      isError: true
    };
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an assistant for the Maharashtra Water Dashboard. Provide concise, 
                      helpful information about water infrastructure in Maharashtra. 
                      Respond in ${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English'}.`
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
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return {
        text: "I'm having trouble connecting to my knowledge base. Please try again or ask a simpler question.",
        isError: true
      };
    }
    
    const data = await response.json();
    const completionText = data.choices[0]?.message?.content || '';
    
    return {
      text: completionText.trim(),
      isError: false
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return {
      text: "I encountered a technical issue. Please try again with a different question.",
      isError: true
    };
  }
}

/**
 * Detect the language of a text input
 * Note: This is a simple implementation and might not be very accurate
 * @param text - Text to detect language for
 * @returns Language code (en, hi, mr)
 */
export function detectLanguage(text: string): string {
  // Basic language detection patterns
  // Hindi Unicode range
  const hindiPattern = /[\u0900-\u097F]/g;
  // Marathi uses the same Unicode range as Hindi, but we can check for some Marathi-specific patterns
  const marathiPattern = /[\u0900-\u097F][\u0900-\u097F]\s/g;
  
  if (marathiPattern.test(text)) {
    return 'mr'; // Marathi
  } else if (hindiPattern.test(text)) {
    return 'hi'; // Hindi
  }
  
  return 'en'; // Default to English
}

/**
 * Translate text between languages using OpenAI
 * @param text - Text to translate
 * @param targetLanguage - Target language code (en, hi, mr)
 * @returns Translated text
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const languageNames = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi'
  };
  
  const targetLangName = languageNames[targetLanguage as keyof typeof languageNames] || 'English';
  
  const response = await getOpenAICompletion({
    prompt: `Translate the following text to ${targetLangName}: "${text}"`,
    maxTokens: 200,
    temperature: 0.3
  });
  
  return response.isError ? text : response.text;
}