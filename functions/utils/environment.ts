import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the environment variable interface
interface EnvVars {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  API_SECRET: string;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  NODE_ENV: string;
  IS_PRODUCTION: boolean;
  [key: string]: string | boolean; // Index signature
}

/**
 * Environment variables for serverless functions
 * These get set during the build process from your Netlify environment variables
 */
export const env: EnvVars = {
  // Supabase credentials
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  
  // API security
  API_SECRET: process.env.API_SECRET || '',
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
  
  // Other API keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  
  // Environment flags
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

/**
 * Validate required environment variables
 * @returns True if all required variables are set, false otherwise
 */
export function validateEnvironment(): boolean {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GEMINI_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
} 
 
 