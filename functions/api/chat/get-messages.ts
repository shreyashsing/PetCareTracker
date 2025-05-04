import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment } from '../../utils/environment';

/**
 * API function to securely get chat messages for a user session
 */
async function getMessagesHandler(event: AuthenticatedRequest, context: HandlerContext) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    return createResponse(null, 500, 'Server configuration error');
  }

  try {
    // Only accept POST requests with JSON body
    if (event.httpMethod !== 'POST') {
      return createResponse(null, 405, 'Method Not Allowed');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return createResponse(null, 400, 'Invalid request body');
    }

    // Validate required parameters
    const { sessionId } = body;
    if (!sessionId) {
      return createResponse(null, 400, 'Session ID is required');
    }

    // Verify the user has access to this chat session
    const { data: sessionData, error: sessionError } = await event.supabaseClient
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', event.user.id)
      .single();

    if (sessionError || !sessionData) {
      return createResponse(null, 403, 'You do not have access to this chat session');
    }

    // Get messages for this session
    const { data: messages, error: messagesError } = await event.supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError);
      return createResponse(null, 500, 'Failed to retrieve chat messages');
    }

    // Format messages for the client
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at
    }));

    return createResponse(formattedMessages);
  } catch (error) {
    console.error('Error in get-messages function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(getMessagesHandler); 
 