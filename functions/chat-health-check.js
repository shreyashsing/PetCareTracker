// Simple health check endpoint for the chat service
// This endpoint doesn't require authentication

const { publicHealthCheck } = require('./api/chat/health-check');

exports.handler = async (event, context) => {
  try {
    // Call the public health check function that doesn't require authentication
    return publicHealthCheck(event, context);
  } catch (error) {
    console.error('Health check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        message: 'Health check failed',
        error: error.message 
      })
    };
  }
}; 