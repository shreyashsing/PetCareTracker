/**
 * Health check function to verify the API and Netlify Functions are working
 * This endpoint doesn't require authentication
 */
exports.handler = async function(event, context) {
  try {
    // Return a simple response with information about env vars
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: "API is up and running!",
        timestamp: new Date().toISOString(),
        hasEnvVars: {
          supabaseUrl: process.env.SUPABASE_URL ? true : false,
          supabaseKey: process.env.SUPABASE_ANON_KEY ? true : false,
          jwtSecret: process.env.JWT_SECRET ? true : false
        }
      })
    };
  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: "Health check failed",
        error: error.message
      })
    };
  }
}; 
 