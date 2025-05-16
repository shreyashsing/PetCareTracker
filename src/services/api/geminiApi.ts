import axios from 'axios';
import { supabase } from '../supabase';
import { API_URL } from '../../config/network';

// Log the API URL for debugging
console.log(`GeminiApi using API URL: ${API_URL}`);

/**
 * Helper to make authenticated API requests
 */
async function makeAuthenticatedRequest<T>(
  method: 'GET' | 'POST',
  endpoint: string, 
  data?: any
): Promise<T> {
  try {
    // Get the current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session?.access_token) {
      throw new Error('Authentication required');
    }

    console.log(`GeminiApi: Making ${method} request to ${API_URL}/${endpoint}`);
    // Log the request payload for debugging
    if (data) {
      console.log(`GeminiApi: Request payload:`, JSON.stringify(data, null, 2));
    }

    try {
      const response = await axios({
        method,
        url: `${API_URL}/${endpoint}`,
        data: method === 'POST' ? data : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        timeout: 15000, // Increase timeout to 15 seconds to handle slow connections
        timeoutErrorMessage: 'NETWORK_ERROR' // Set a specific error message for timeouts
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }

      return response.data.data;
    } catch (apiError) {
      // If the regular API URL fails, try the production URL directly
      console.log(`GeminiApi: First attempt failed, trying production URL directly`);
      
      const productionUrl = 'https://darling-empanada-164b33.netlify.app/.netlify/functions';
      console.log(`GeminiApi: Making ${method} request to ${productionUrl}/${endpoint}`);
      
      const response = await axios({
        method,
        url: `${productionUrl}/${endpoint}`,
        data: method === 'POST' ? data : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        timeout: 15000,
        timeoutErrorMessage: 'NETWORK_ERROR'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }

      return response.data.data;
    }
  } catch (error: any) {
    console.error(`API error for ${endpoint}:`, error);
    
    // Check if error is a network error (timeout, connection refused, etc.)
    if (error.message === 'NETWORK_ERROR' || error.code === 'ECONNABORTED' || 
        error.message === 'Network Error' || !navigator.onLine) {
      throw new Error('NETWORK_ERROR');
    }
    
    // Check if error is due to offline state
    if (error.message.includes('offline') || 
        error.message.includes('network') || 
        error.message.includes('connection')) {
      throw new Error('OFFLINE');
    }
    
    throw error;
  }
}

/**
 * Defines the structure of a chat message
 */
export interface GeminiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Secure Gemini API functions
 * These replace direct API calls to Gemini for better security
 */
export const geminiApi = {
  /**
   * Check if the backend API is available and properly configured
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      // Try with a shorter timeout for health checks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(`${API_URL}/health-check`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          return data.success && data.data?.available;
        }
        
        return false;
      } catch (fetchError) {
        console.error('Health check fetch error:', fetchError);
        clearTimeout(timeoutId);
        return false;
      }
    } catch (error) {
      console.error('Error checking API availability:', error);
      return false;
    }
  },

  /**
   * Generate chat completion using the secure proxy
   */
  async generateChatResponse(
    messages: GeminiChatMessage[],
    temperature: number = 0.7,
    maxTokens: number = 8192
  ): Promise<string> {
    try {
      // Extract system messages and user/assistant messages
      const systemMessages = messages.filter(msg => msg.role === 'system');
      const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
      
      // Format messages for Gemini API which doesn't directly support system messages
      const formattedContents = [];
      
      // If there are system messages, combine them and add as a special user message
      if (systemMessages.length > 0) {
        const systemContent = systemMessages.map(msg => msg.content).join('\n\n');
        
        // Add system instructions as a user message
        formattedContents.push({
          role: 'user',
          parts: [{ text: `[SYSTEM INSTRUCTIONS]:\n${systemContent}` }]
        });
        
        // Add model acknowledgment
        formattedContents.push({
          role: 'model',
          parts: [{ text: "I'll follow these instructions for our conversation." }]
        });
      }
      
      // Add the regular conversation messages
      nonSystemMessages.forEach(msg => {
        formattedContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });

      console.log(`GeminiApi: Sending ${messages.length} messages to Gemini API (${formattedContents.length} after formatting)`);
      
      const response = await makeAuthenticatedRequest<{ response: any }>(
        'POST',
        'chat-proxy-gemini',
        {
          contents: formattedContents,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95
          }
        }
      );

      // Extract the text response from the Gemini response structure
      if (response.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.response.candidates[0].content.parts[0].text;
      }
      
      throw new Error('Invalid response format from Gemini API');
    } catch (error: any) {
      // Handle network errors for better offline experience
      if (error.message === 'NETWORK_ERROR' || error.message === 'OFFLINE') {
        throw error; // Propagate specific network errors for fallback handling
      }
      
      console.error('Error generating chat response:', error);
      throw new Error('Failed to get a response. Please try again later.');
    }
  }
};