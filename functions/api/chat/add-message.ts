import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment } from '../../utils/environment';

/**
 * API function to securely add a message to a chat session
 * This replaces direct Supabase queries from the mobile app
 */
async function addMessageHandler(event: AuthenticatedRequest, context: HandlerContext) {
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
    const { sessionId, content, role, tokens } = body;
    
    if (!sessionId) {
      return createResponse(null, 400, 'Session ID is required');
    }
    
    if (!content) {
      return createResponse(null, 400, 'Message content is required');
    }
    
    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return createResponse(null, 400, 'Valid role is required (user, assistant, or system)');
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

    // Add the message to the database
    const messageData = {
      session_id: sessionId,
      content,
      role,
      timestamp: new Date().toISOString(),
      tokens: tokens || null
    };

    const { data: message, error: messageError } = await event.supabaseClient
      .from('chat_messages')
      .insert(messageData)
      .select('id')
      .single();

    if (messageError) {
      console.error('Error adding chat message:', messageError);
      return createResponse(null, 500, 'Failed to add message');
    }

    return createResponse({
      messageId: message.id,
      timestamp: messageData.timestamp
    });
  } catch (error) {
    console.error('Error in add-message function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(addMessageHandler); 