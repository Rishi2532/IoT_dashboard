/**
 * API keys for external services
 * 
 * This file centralizes API key management for the Maharashtra Water Dashboard application.
 * In a production environment, these keys should come from environment variables.
 * For local development in VS Code, we're using hard-coded values for simplicity.
 */

// API keys for various services
export const API_KEYS = {
  // OpenAI API Key for natural language processing
  OPENAI_API_KEY: 'tysSDZPzBxFJmKmA7du8BMMjoEfgI6Am6i2+42FkVp+XAn91',
  
  // Optional: Add other API keys here as needed
  // GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
  // WEATHER_API_KEY: 'your-weather-api-key',
};

/**
 * Get an API key based on its name
 * Tries environment variables first, then falls back to hardcoded values
 * 
 * @param key - The name of the API key to retrieve
 * @returns The API key value or empty string if not found
 */
export function getApiKey(key: keyof typeof API_KEYS): string {
  // Try to get from environment variables first (for Replit)
  if (key === 'OPENAI_API_KEY' && import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY as string;
  }
  
  // Fallback to hard-coded values (for VS Code)
  return API_KEYS[key] || '';
}