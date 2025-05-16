const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment } = require('../../utils/environment');

/**
 * API function to securely retrieve a user's chat sessions
 * This replaces direct Supabase queries from the mobile app
 */
async function getUserSessionsHandler(event, context) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse(null, 500, 'Server configuration error');
  }

  try {
    // Only accept GET requests
    if (event.httpMethod !== 'GET') {
      return createResponse(null, 405, 'Method Not Allowed');
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 10;
    
    // Validate the limit parameter
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return createResponse(null, 400, 'Invalid limit parameter. Must be between 1 and 50.');
    }

    // Get the user's sessions from Supabase using the authenticated client
    const { data: sessions, error } = await event.supabaseClient
      .from('chat_sessions')
      .select('*')
      .eq('user_id', event.user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user chat sessions:', error);
      return createResponse(null, 500, 'Failed to retrieve chat sessions');
    }

    return createResponse({
      sessions: sessions || []
    });
  } catch (error) {
    console.error('Error in get-user-sessions function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
exports.handler = withAuth(getUserSessionsHandler); 