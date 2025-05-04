/**
 * Special function to set environment variables programmatically
 * This helps overcome restrictions on editing .env files directly
 * 
 * NOTE: This function should be protected or removed in production
 */
exports.handler = async function(event, context) {
  try {
    // Check if this is a POST request
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    
    // Set environment variables
    if (body.supabaseUrl) process.env.SUPABASE_URL = body.supabaseUrl;
    if (body.supabaseServiceKey) process.env.SUPABASE_SERVICE_KEY = body.supabaseServiceKey;
    if (body.supabaseAnonKey) process.env.SUPABASE_ANON_KEY = body.supabaseAnonKey;
    if (body.jwtSecret) process.env.JWT_SECRET = body.jwtSecret;
    if (body.geminiApiKey) process.env.GEMINI_API_KEY = body.geminiApiKey;
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: "Environment variables set successfully",
        environmentNow: {
          supabaseUrl: process.env.SUPABASE_URL ? true : false,
          supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ? true : false, 
          supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? true : false,
          jwtSecret: process.env.JWT_SECRET ? true : false,
          geminiApiKey: process.env.GEMINI_API_KEY ? true : false
        }
      })
    };
  } catch (error) {
    console.error('Error setting environment variables:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to set environment variables: ' + error.message 
      })
    };
  }
}; 