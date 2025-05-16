/**
 * Health check function to verify the API and Netlify Functions are working
 * This endpoint doesn't require authentication
 */
exports.handler = async function(event, context) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Platform',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }
  
  try {
    // Log request for debugging
    console.log("Health check called from:", event.headers['user-agent'], 
      "platform:", event.headers['x-client-platform'] || 'unknown');
    
    // Check for required env variables without revealing them
    const envVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'GEMINI_API_KEY'
    ];
    
    const missingVars = envVars.filter(name => !process.env[name]);
    const apiConfigured = missingVars.length === 0;
    
    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "PetCareTracker API is operational",
        apiConfigured,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      })
    };
  } catch (error) {
    console.error("Health check error:", error);
    
    // Return error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "API health check failed",
        error: error.message
      })
    };
  }
}; 
 