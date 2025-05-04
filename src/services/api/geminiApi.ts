import axios from 'axios';
import { supabase } from '../supabase';

// Define API URL based on development mode
// Use localhost for development, and the real URL for production
const API_URL = __DEV__ 
  ? 'http://localhost:8888/.netlify/functions' 
  : 'https://your-netlify-site.netlify.app/.netlify/functions';

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

    const response = await axios({
      method,
      url: `${API_URL}/${endpoint}`,
      data: method === 'POST' ? data : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Unknown API error');
    }

    return response.data.data;
  } catch (error) {
    console.error(`API error for ${endpoint}:`, error);
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
      const response = await makeAuthenticatedRequest<{ available: boolean }>(
        'GET',
        'api/chat/health-check'
      );
      
      return response.available;
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
    const response = await makeAuthenticatedRequest<{ response: any }>(
      'POST',
      'api/chat/proxy-gemini',
      {
        contents: messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
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
  }
}; 