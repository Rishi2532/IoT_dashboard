// API Keys Configuration File
// This file contains API keys for various services used in the application
// In production, these should be moved to environment variables

export const API_KEYS = {
  // OpenAI API key for enhancing chatbot capabilities
  OPENAI_API_KEY: "tysSDZPzBxFJmKmA7du8BMMjoEfgI6Am6i2+42FkVp+XAn91",
  
  // Add other API keys as needed
};

// Helper function to get API keys with fallback to environment variables
export function getApiKey(key: keyof typeof API_KEYS): string {
  // Try to get from environment variables first (for production/secure deployments)
  const envKey = typeof process !== 'undefined' && process.env ? process.env[`VITE_${key}`] : null;
  if (envKey) return envKey;
  
  // Fall back to the hard-coded key (for development)
  return API_KEYS[key];
}