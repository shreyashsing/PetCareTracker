// Load environment variables from .env file
require('dotenv').config();

/**
 * Environment variables for serverless functions
 * These get set during the build process from your Netlify environment variables
 */
const env = {
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
function validateEnvironment() {
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

module.exports = {
  env,
  validateEnvironment
}; 
 