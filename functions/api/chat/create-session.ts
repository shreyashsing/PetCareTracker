import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment } from '../../utils/environment';
import { v4 as uuidv4 } from 'uuid';

/**
 * API function to securely create a new chat session
 */
async function createSessionHandler(event: AuthenticatedRequest, context: HandlerContext) {
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

    // Extract optional parameters
    const { petId, title } = body;
    const sessionTitle = title || 'New Chat Session';

    // Generate a new session ID
    const sessionId = uuidv4();

    // Create a new chat session
    const { data: session, error: sessionError } = await event.supabaseClient
      .from('chat_sessions')
      .insert({
        id: sessionId,
        user_id: event.user.id,
        title: sessionTitle,
        pet_id: petId || null
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating chat session:', sessionError);
      return createResponse(null, 500, 'Failed to create chat session');
    }

    // Create a welcome message for the session
    const welcomeMessage = petId
      ? 'Hello! I\'m your pet care assistant. How can I help with your pet today?'
      : 'Hello! I\'m your pet care assistant. How can I help you with your pet care questions?';

    // Save the AI welcome message to the database
    const { error: messageError } = await event.supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: welcomeMessage,
      });

    if (messageError) {
      console.error('Error saving welcome message:', messageError);
      // Don't fail the request, just log the error
    }

    return createResponse({
      sessionId,
      title: sessionTitle,
      created_at: session.created_at,
      petId: petId || null,
      welcomeMessage
    });
  } catch (error) {
    console.error('Error in create-session function:', error);
    return createResponse(null, 500, 'Internal server error');
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(createSessionHandler); 
 