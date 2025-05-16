const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment, env } = require('../../utils/environment');

/**
 * Simple health check endpoint for the chat API
 * Used to verify the backend is available and API keys are configured
 */
async function healthCheckHandler(event, context) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse({ success: false, message: 'Server configuration error' }, 500);
  }
  
  // Verify API key is configured
  if (!env.GEMINI_API_KEY) {
    return createResponse({ success: false, message: 'API key not configured' }, 500);
  }

  // Simple health check response
  return createResponse({ 
    success: true, 
    message: 'API available',
    apiConfigured: true,
    auth: event.user ? 'authenticated' : 'unauthenticated'
  });
}

/**
 * Public version of health check that doesn't require authentication
 * This allows the app to check if the backend is available before login
 */
async function publicHealthCheck(event, context) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse({ success: false, message: 'Server configuration error' }, 500);
  }
  
  // Check if the API key is configured, but don't reveal its existence
  const apiConfigured = !!env.GEMINI_API_KEY;

  // Simple health check response without sensitive details
  return createResponse({ 
    success: true, 
    message: 'API available',
    apiConfigured
  });
}

// Export the authenticated handler and the public handler
exports.handler = withAuth(healthCheckHandler);
exports.publicHealthCheck = publicHealthCheck; 