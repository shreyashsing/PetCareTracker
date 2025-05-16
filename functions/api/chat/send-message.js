const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment, env } = require('../../utils/environment');
const axios = require('axios');

// Simple in-memory rate limiter using the token bucket algorithm
// This will persist across requests within the same function instance
const rateLimiter = (() => {
  let tokens = 5; // Start with 5 tokens (reduced from 10)
  const maxTokens = 5; // Maximum number of tokens (reduced from 10)
  const refillRate = 0.5; // Tokens per second to refill (reduced from 1)
  let lastRefillTimestamp = Date.now();
  
  console.log('Initializing rate limiter with tokens:', tokens);
  
  return {
    // Check if a request can be made
    canMakeRequest: () => {
      // Refill tokens based on time elapsed
      const now = Date.now();
      const timeElapsed = (now - lastRefillTimestamp) / 1000; // Convert to seconds
      const tokensToAdd = timeElapsed * refillRate;
      
      if (tokensToAdd > 0) {
        tokens = Math.min(maxTokens, tokens + tokensToAdd);
        lastRefillTimestamp = now;
      }
      
      // Check if we have at least 1 token
      return tokens >= 1;
    },
    
    // Consume a token for a request
    consumeToken: () => {
      if (tokens >= 1) {
        tokens -= 1;
        console.log(`Rate limiter: token consumed, ${tokens} remaining`);
        return true;
      }
      return false;
    },
    
    // Get wait time in milliseconds until next token is available
    getWaitTime: () => {
      if (tokens >= 1) return 0;
      
      // Calculate time until next token
      const tokensNeeded = 1 - tokens;
      return Math.ceil((tokensNeeded / refillRate) * 1000);
    }
  };
})();

/**
 * Generate a fallback response when Gemini API is unavailable
 * @param {string} userMessage - The user's message
 * @param {string} petInfo - Optional information about the pet
 * @returns {string} - A generated response
 */
function generateFallbackResponse(userMessage, petInfo = '') {
  const query = userMessage.toLowerCase();
  
  // Extract pet information if available
  let petName = '';
  let petType = '';
  let petBreed = '';
  
  if (petInfo) {
    const nameMatch = petInfo.match(/pet: ([^,]+)/);
    if (nameMatch) petName = nameMatch[1].trim();
    
    const typeMatch = petInfo.match(/a ([^(]+)/);
    if (typeMatch) petType = typeMatch[1].trim();
    
    const breedMatch = petInfo.match(/\(([^)]+)\)/);
    if (breedMatch) petBreed = breedMatch[1].trim();
  }
  
  // Handle greetings
  if (query.match(/\b(hi|hello|hey|greetings|howdy)\b/i)) {
    if (petName) {
      return `Hello! I'm your pet care assistant. How can I help you with ${petName} today?`;
    }
    return "Hello! I'm your pet care assistant. How can I help with your pet care questions today?";
  }
  
  // Handle help/what can you do
  if (query.includes('help') || query.includes('what can you do')) {
    return 'I can help with pet health, nutrition, training, and care advice. Please ask specific questions about your pet and I\'ll do my best to assist you!';
  }
  
  // Handle dog food inquiries
  if (query.includes('dog') && (query.includes('food') || query.includes('eat') || query.includes('diet'))) {
    return 'Dogs need a balanced diet with protein, carbohydrates, fats, vitamins, and minerals. Commercial dog foods are formulated to meet these needs, but the specific amount depends on your dog\'s size, age, and activity level. Always provide fresh water and consult your vet for specific dietary recommendations.';
  }
  
  // Handle cat food inquiries
  if (query.includes('cat') && (query.includes('food') || query.includes('eat') || query.includes('diet'))) {
    return 'Cats are obligate carnivores and need a high-protein diet. Commercial cat foods are formulated to meet their nutritional needs, with specific formulations for kittens, adults, and seniors. Always provide fresh water and consult your vet for specific dietary recommendations.';
  }
  
  // Handle training questions
  if (query.includes('train') || query.includes('training')) {
    if (query.includes('dog')) {
      return 'Dog training works best with positive reinforcement. Use treats, praise, and play as rewards for good behavior. Be consistent with commands and training sessions. Start with basic commands like sit, stay, and come before moving to more complex behaviors.';
    }
    return 'Positive reinforcement is the most effective training method for pets. Use treats, praise, and play as rewards for good behavior. Be consistent and patient, keeping training sessions short and fun.';
  }
  
  // Handle health/illness questions
  if (query.includes('health') || query.includes('sick') || query.includes('vet') || query.includes('ill')) {
    return 'For health concerns, it\'s best to consult with a veterinarian. Regular check-ups, vaccinations, parasite prevention, dental care, and proper nutrition are essential for maintaining your pet\'s health. Watch for changes in behavior, appetite, water intake, or waste elimination as signs of potential health issues.';
  }
  
  // Handle breed-specific questions if we have the information
  if (petBreed && petType && (query.includes('breed') || query.includes(petBreed.toLowerCase()))) {
    if (petType.toLowerCase() === 'dog') {
      return `${petBreed} dogs have specific care needs based on their breed characteristics. It's important to research breed-specific health concerns, exercise requirements, and training approaches. Your veterinarian can provide targeted advice for ${petName}'s specific needs as a ${petBreed}.`;
    } else if (petType.toLowerCase() === 'cat') {
      return `${petBreed} cats have specific care needs based on their breed characteristics. Some breeds require special grooming, have breed-specific health concerns, or distinctive behavioral traits. Your veterinarian can provide targeted advice for ${petName}'s specific needs as a ${petBreed}.`;
    }
  }
  
  // Default response
  return 'I understand you have a question about pet care. Currently, I\'m operating in a limited capacity due to high demand. Please try asking a more specific question about your pet\'s health, nutrition, training, or care, or try again later when our service availability improves.';
}

/**
 * Implements exponential backoff retry logic
 * @param {Function} fn - The function to retry
 * @param {Number} maxRetries - Maximum number of retries
 * @param {Number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - The result of the function
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for a token to be available before making the request
      while (!rateLimiter.canMakeRequest()) {
        const waitTime = rateLimiter.getWaitTime();
        console.log(`Rate limiting in effect. Waiting ${Math.round(waitTime/1000)} seconds before attempting request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Consume a token and make the request
      rateLimiter.consumeToken();
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Retry on rate limit errors (429) and service unavailable errors (503)
      const statusCode = error.response?.status;
      const shouldRetry = statusCode === 429 || statusCode === 503;
      
      if (!shouldRetry) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      const errorType = statusCode === 429 ? "Rate limit exceeded" : "Service temporarily unavailable";
      console.log(`${errorType}. Retrying in ${Math.round(delay/1000)} seconds (attempt ${attempt + 1}/${maxRetries})`);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * API function to securely process and send chat messages
 */
async function sendMessageHandler(event, context) {
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
      console.log('Creating new session, existing session not found');
      // Create a new session if it doesn't exist
      const { data: newSession, error: createError } = await event.supabaseClient
        .from('chat_sessions')
        .insert({
          id: sessionId,
          user_id: event.user.id,
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
      console.error('Gemini API key not configured');
      return createResponse(null, 500, 'API key not configured on server');
    }

    console.log('Sending request to Gemini API');
    
    // Make the API request to Gemini with a simplified format and retry logic
    let aiResponse;
    try {
      const response = await withRetry(async () => {
        return await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                role: "user",
                parts: [
                  { 
                    text: `You are a specialized pet care assistant with deep knowledge in veterinary medicine, animal nutrition, training, and behavior.
                    
Your expertise includes:
- Pet health: common illnesses, preventative care, emergency symptoms, medication information
- Nutrition: dietary needs for different species/breeds, food allergies, weight management
- Training: positive reinforcement techniques, behavior modification, age-appropriate training
- Care routines: grooming, exercise requirements, environmental enrichment
- Species-specific knowledge: dogs, cats, birds, small mammals, reptiles, fish

${petInfo}

User message: ${message}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
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
      });
      
      console.log('Received response from Gemini API');
      // Extract the AI response text
      aiResponse = response.data.candidates[0]?.content?.parts[0]?.text || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      console.error('Failed to get response from Gemini API after retries:', error);
      
      // Get the status code if available
      const statusCode = error.response?.status;
      
      // If this is a service error (429 or 503), use our fallback response generator
      if (statusCode === 429 || statusCode === 503) {
        const errorType = statusCode === 429 ? 'rate limiting' : 'service unavailability';
        console.log(`Using fallback response generator due to API ${errorType}`);
        aiResponse = generateFallbackResponse(message, petInfo);
        
        // Log error details for debugging
        console.log('API error details:', {
          status: statusCode,
          headers: error.response?.headers,
          data: error.response?.data || {}
        });
      } else {
        // For other errors, provide a generic response
        aiResponse = 'I apologize, but I am currently experiencing technical difficulties. Please try again in a few moments.';
      }
    }

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
exports.handler = withAuth(sendMessageHandler); 