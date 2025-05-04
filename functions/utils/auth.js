const { createClient } = require('@supabase/supabase-js');
const { env } = require('./environment');

// Initialize Supabase client (for server-side use only)
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

/**
 * Create a standard API response
 * @param {any} data The data to return
 * @param {number} statusCode HTTP status code
 * @param {string} message Optional message
 * @returns {object} Formatted response object
 */
function createResponse(data, statusCode = 200, message = null) {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      data: data,
      error: message,
      timestamp: new Date().toISOString()
    })
  };
  
  return response;
}

module.exports = {
  supabase,
  createResponse
}; 
 