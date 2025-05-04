const { createResponse } = require('../utils/auth');
const { env } = require('../utils/environment');

/**
 * Simple test function to verify the serverless function setup
 */
exports.handler = async function(event, context) {
  try {
    return createResponse({
      message: "Serverless function is working correctly!",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: env.NODE_ENV,
        hasSupabaseUrl: !!env.SUPABASE_URL,
        hasSupabaseKey: !!env.SUPABASE_SERVICE_KEY,
        hasJwtSecret: !!env.JWT_SECRET,
        hasGeminiKey: !!env.GEMINI_API_KEY
      }
    }, 200);
  } catch (error) {
    console.error('Test function error:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}; 
 