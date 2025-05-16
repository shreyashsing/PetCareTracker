const { createResponse, withAuth } = require('../../utils/auth');
const { validateEnvironment, env } = require('../../utils/environment');
const axios = require('axios');

/**
 * Secure proxy for Gemini API requests
 * This prevents API keys from being exposed in the mobile app
 */
async function proxyGeminiHandler(event, context) {
  // Ensure required environment variables are set
  if (!validateEnvironment()) {
    console.error('Server configuration error: Missing required environment variables');
    return createResponse(null, 500, 'Server configuration error');
  }

  try {
    // Only accept POST requests with JSON body
    if (event.httpMethod !== 'POST') {
      console.error(`Method not allowed: ${event.httpMethod}`);
      return createResponse(null, 405, 'Method Not Allowed');
    }

    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
      console.log('Received request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('Invalid request body:', e);
      return createResponse(null, 400, 'Invalid request body');
    }

    // Validate required parameters
    const { contents, generationConfig, safetySettings } = body;
    if (!contents) {
      console.error('Message contents are required');
      return createResponse(null, 400, 'Message contents are required');
    }

    // Validate contents format
    if (!Array.isArray(contents)) {
      console.error('Contents must be an array');
      return createResponse(null, 400, 'Contents must be an array of message objects');
    }

    // Check for valid contents format
    for (const message of contents) {
      if (!message.role || !message.parts || !Array.isArray(message.parts)) {
        console.error('Invalid message format:', message);
        return createResponse(null, 400, 'Each message must have a role and parts array');
      }
      
      // Ensure role is either 'user' or 'model' (Gemini doesn't support 'system')
      if (message.role !== 'user' && message.role !== 'model') {
        console.error(`Invalid role: ${message.role}. Must be 'user' or 'model'`);
        return createResponse(null, 400, "Message role must be 'user' or 'model'");
      }
    }

    // Get API key from environment variables
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('API key not configured on server');
      return createResponse(null, 500, 'API key not configured on server');
    }

    // Define the complete request data
    const requestData = {
      contents,
      generationConfig: generationConfig || {
        temperature: 0.7,
        maxOutputTokens: 8192,
        topP: 0.95,
      },
      safetySettings: safetySettings || [
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
    };

    console.log('Sending request to Gemini API');
    
    // Make the API request to Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      requestData
    );

    console.log('Received response from Gemini API');
    
    // Return the Gemini API response
    return createResponse({
      response: response.data
    });
  } catch (error) {
    console.error('Error in proxy-gemini function:', error);
    // Check if it's an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      console.error('Gemini API error details:', {
        status: error.response.status,
        data: error.response.data
      });
      return createResponse(null, error.response.status, 
        `Gemini API error: ${error.response.data?.error?.message || error.message}`);
    }
    return createResponse(null, 500, 
      'Internal server error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Export the handler with authentication middleware
exports.handler = withAuth(proxyGeminiHandler);