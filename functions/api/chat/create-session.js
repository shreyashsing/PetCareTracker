const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment, env } = require('../../utils/environment');
const { v4: uuidv4 } = require('uuid');

/**
 * API function to securely create a new chat session
 */
async function createSessionHandler(event, context) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    console.error('Environment validation failed');
    return createResponse(null, 500, 'Server configuration error');
  }

  try {
    // Log environment status
    console.log('GEMINI_API_KEY configured:', Boolean(env.GEMINI_API_KEY));
    console.log('SUPABASE_URL configured:', Boolean(env.SUPABASE_URL));
    console.log('SUPABASE_ANON_KEY configured:', Boolean(env.SUPABASE_ANON_KEY));
    
    // Only accept POST requests with JSON body
    if (event.httpMethod !== 'POST') {
      return createResponse(null, 405, 'Method Not Allowed');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      console.error('Error parsing request body:', e);
      return createResponse(null, 400, 'Invalid request body');
    }

    // Extract optional parameters
    const { petId, title } = body;
    const sessionTitle = title || 'New Chat Session';
    
    console.log('Creating chat session for user:', event.user.id);
    console.log('Pet ID:', petId || 'none');

    // Generate a new session ID
    const sessionId = uuidv4();

    try {
      // Create a new chat session - removed 'title' field since it doesn't exist in the schema
      const { data: session, error: sessionError } = await event.supabaseClient
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: event.user.id,
          pet_id: petId || null
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating chat session:', sessionError);
        return createResponse(null, 500, `Failed to create chat session: ${sessionError.message}`);
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

      console.log('Chat session created successfully:', sessionId);
      return createResponse({
        sessionId,
        title: sessionTitle, // Still return title in the response, just don't store it in DB
        created_at: session.created_at,
        petId: petId || null,
        welcomeMessage
      });
    } catch (supabaseError) {
      console.error('Supabase operation error:', supabaseError);
      return createResponse(null, 500, `Database operation failed: ${supabaseError.message}`);
    }
  } catch (error) {
    console.error('Error in create-session function:', error);
    return createResponse(null, 500, `Internal server error: ${error.message}`);
  }
}

// Export the handler with authentication middleware
exports.handler = withAuth(createSessionHandler); 