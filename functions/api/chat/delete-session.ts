import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment } from '../../utils/environment';

/**
 * API function to securely delete a chat session and its messages
 * This replaces direct Supabase queries from the mobile app
 */
async function deleteSessionHandler(event: AuthenticatedRequest, context: HandlerContext) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse(null, 500, 'Server configuration error');
  }

  try {
    // Only accept DELETE requests
    if (event.httpMethod !== 'DELETE') {
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

    // Delete all messages first due to foreign key constraints
    const { error: messagesError } = await event.supabaseClient
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (messagesError) {
      console.error('Error deleting chat messages:', messagesError);
      return createResponse(null, 500, 'Failed to delete chat messages');
    }

    // Now delete the session
    const { error: deleteError } = await event.supabaseClient
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      console.error('Error deleting chat session:', deleteError);
      return createResponse(null, 500, 'Failed to delete chat session');
    }

    return createResponse({
      success: true,
      message: 'Session and all messages deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete-session function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(deleteSessionHandler); 