import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment, env } from '../../utils/environment';
import axios from 'axios';

/**
 * API function to securely process and send chat messages
 */
async function sendMessageHandler(event: AuthenticatedRequest, context: HandlerContext) {
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
    const { sessionId, message, petId } = body;
    if (!sessionId || !message) {
      return createResponse(null, 400, 'Session ID and message are required');
    }

    // Verify the user has access to this chat session
    const { data: sessionData, error: sessionError } = await event.supabaseClient
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', event.user.id)
      .single();

    if (sessionError || !sessionData) {
      // Create a new session if it doesn't exist
      const { data: newSession, error: createError } = await event.supabaseClient
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: event.user.id,
          title: 'Chat session',
          pet_id: petId || null
        })
        .select()
        .single();

      if (createError || !newSession) {
        console.error('Error creating chat session:', createError);
        return createResponse(null, 500, 'Failed to create a new chat session');
      }
    }

    // Save the user message to the database
    const { data: savedMessage, error: saveError } = await event.supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      })
      .select()
      .single();

    if (saveError || !savedMessage) {
      console.error('Error saving user message:', saveError);
      return createResponse(null, 500, 'Failed to save user message');
    }

    // Fetch previous messages for context
    const { data: prevMessages, error: prevError } = await event.supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (prevError) {
      console.error('Error fetching previous messages:', prevError);
      return createResponse(null, 500, 'Failed to fetch previous messages');
    }

    // Format messages for the Gemini API
    const formattedMessages = prevMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Fetch pet information if petId is provided
    let petInfo = '';
    if (petId) {
      const { data: pet, error: petError } = await event.supabaseClient
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('user_id', event.user.id)
        .single();

      if (!petError && pet) {
        petInfo = `This conversation is about a pet: ${pet.name}, a ${pet.type} (${pet.breed}), 
        ${pet.gender}, ${pet.age || 'unknown age'}.`;
      }
    }

    // Add pet care system prompt
    const systemPrompt = {
      role: 'system',
      parts: [{ 
        text: `You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, 
        training, and behavior. ${petInfo}
        
        Your expertise includes:
        - Pet health: common illnesses, preventative care, emergency symptoms, medication information
        - Nutrition: dietary needs for different species/breeds, food allergies, weight management
        - Training: positive reinforcement techniques, behavior modification, age-appropriate training
        - Care routines: grooming, exercise requirements, environmental enrichment
        - Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish
        
        When giving advice:
        - Prioritize animal welfare and evidence-based information
        - Recognize serious health issues that require veterinary attention
        - Provide practical, actionable advice for pet owners
        - Consider the pet's age, breed, and health condition when relevant
        - Be clear about the limitations of remote advice
        
        Only answer questions related to pets and pet care. Be concise and direct in your responses.`
      }]
    };

    // Call Gemini API for AI response
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return createResponse(null, 500, 'API key not configured on server');
    }

    // Make the API request to Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`,
      {
        contents: [systemPrompt, ...formattedMessages],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          topP: 0.95,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }
    );

    // Extract the AI response text
    const aiResponse = response.data.candidates[0]?.content?.parts[0]?.text || 'I apologize, but I was unable to generate a response.';

    // Save the AI response to the database
    const { data: savedAiMessage, error: saveAiError } = await event.supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
      })
      .select()
      .single();

    if (saveAiError) {
      console.error('Error saving AI response:', saveAiError);
      // Don't fail the request, just log the error
    }

    // Return the AI response
    return createResponse({
      message: aiResponse,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error in send-message function:', error);
    return createResponse(null, 500, 'Internal server error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(sendMessageHandler); 
 