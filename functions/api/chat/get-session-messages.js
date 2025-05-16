const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment } = require('../../utils/environment');

/**
 * API function to securely retrieve messages for a specific chat session
 * This replaces direct Supabase queries from the mobile app
 */
async function getSessionMessagesHandler(event, context) {
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
    const sessionId = queryParams.sessionId;
    
    // Validate sessionId parameter
    if (!sessionId) {
      return createResponse(null, 400, 'Session ID is required');
    }

    // First verify that this session belongs to the authenticated user
    const { data: sessionCheck, error: sessionError } = await event.supabaseClient
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', event.user.id)
      .maybeSingle();

    if (sessionError) {
      console.error('Error verifying session ownership:', sessionError);
      return createResponse(null, 500, 'Failed to verify session');
    }

    if (!sessionCheck) {
      return createResponse(null, 403, 'Access denied: Session not found or does not belong to you');
    }

    // Now get all messages for this session
    const { data: messages, error: messagesError } = await event.supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError);
      return createResponse(null, 500, 'Failed to retrieve chat messages');
    }

    // Update the session timestamp
    try {
      await event.supabaseClient
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (updateError) {
      console.error('Error updating session timestamp:', updateError);
      // Don't fail the whole request because of this
    }

    return createResponse({
      messages: messages || []
    });
  } catch (error) {
    console.error('Error in get-session-messages function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
exports.handler = withAuth(getSessionMessagesHandler); 