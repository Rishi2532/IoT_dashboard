/**
 * Server Configuration Module
 * Centralizes access to configuration and environment variables for the server
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables with priority for local configurations
// 1. Check for .env.vscode (VS Code development)
// 2. Check for .env.local (general local development)
// 3. Fall back to .env

const envVscodePath = path.join(process.cwd(), '.env.vscode');
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envVscodePath)) {
  console.log('Loading VS Code environment configuration (.env.vscode)');
  dotenv.config({ path: envVscodePath });
} else if (fs.existsSync(envLocalPath)) {
  console.log('Loading local environment configuration (.env.local)');
  dotenv.config({ path: envLocalPath });
} else {
  console.log('Loading default environment configuration (.env)');
  dotenv.config({ path: envPath });
}

/**
 * Server environment configuration
 */
export const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Session configuration  
  sessionSecret: process.env.SESSION_SECRET || 'maharashtra-water-dashboard-secret',
  
  // Database configuration - used by simple-db.ts
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  },
  
  // API Keys
  apiKeys: {
    openai: process.env.OPENAI_API_KEY || '',
  },
  
  // Feature flags
  features: {
    useOpenAI: true,
    enableVoiceRecognition: true,
    enableTextToSpeech: true,
  }
};

/**
 * Get an API key by name
 * @param keyName - The name of the API key to retrieve
 * @returns The API key value or empty string if not found
 */
export function getApiKey(keyName: string): string {
  switch (keyName) {
    case 'OPENAI_API_KEY':
      return config.apiKeys.openai;
    default:
      return '';
  }
}

/**
 * Check if an API key is configured
 * @param keyName - The name of the API key to check
 * @returns True if the key exists and is not empty
 */
export function hasApiKey(keyName: string): boolean {
  const key = getApiKey(keyName);
  return !!key && key.length > 0;
}

export default config;