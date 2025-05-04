import { HandlerContext } from '@netlify/functions';
import { createResponse, withAuth, AuthenticatedRequest } from '../../utils/auth';
import { validateEnvironment, env } from '../../utils/environment';
import axios from 'axios';

/**
 * Secure proxy for Gemini API requests
 * This prevents API keys from being exposed in the mobile app
 */
async function proxyGeminiHandler(event: AuthenticatedRequest, context: HandlerContext) {
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
    const { contents, generationConfig, safetySettings } = body;
    if (!contents) {
      return createResponse(null, 400, 'Message contents are required');
    }

    // Get API key from environment variables
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
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

    // Make the API request to Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`,
      requestData
    );

    // Return the Gemini API response
    return createResponse({
      response: response.data
    });
  } catch (error) {
    console.error('Error in proxy-gemini function:', error);
    // Check if it's an Axios error with a response
    if (axios.isAxiosError(error) && error.response) {
      return createResponse(null, error.response.status, 
        `Gemini API error: ${error.response.data?.error?.message || error.message}`);
    }
    return createResponse(null, 500, 
      'Internal server error: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Export the handler with authentication middleware
export const handler = withAuth(proxyGeminiHandler); 