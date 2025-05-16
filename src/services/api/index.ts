import { supabase } from '../supabase';
import { API_URL } from '../../config/network';

// Define API base URL - use the centralized configuration
const API_BASE_URL = API_URL;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

/**
 * Generic API client for making authenticated requests to our serverless functions
 */
class ApiClient {
  /**
   * Get the API base URL
   * @returns The base URL for API requests
   */
  getApiBaseUrl(): string {
    return API_BASE_URL;
  }
  
  /**
   * Make an authenticated API request
   * @param endpoint API endpoint path
   * @param options Request options
   * @returns Response data or error
   */
  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          success: false,
          data: null,
          error: 'Not authenticated',
          timestamp: new Date().toISOString()
        };
      }

      // Default options
      const defaultOptions: ApiOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      };

      // Merge options
      const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      };

      // Convert body to JSON
      if (mergedOptions.body && typeof mergedOptions.body !== 'string') {
        mergedOptions.body = JSON.stringify(mergedOptions.body);
      }

      // Make request
      const url = `${API_BASE_URL}/${endpoint}`;
      console.log(`API Request: ${mergedOptions.method} ${url}`);
      
      const response = await fetch(url, mergedOptions as RequestInit);
      const data = await response.json();

      if (!response.ok) {
        console.error(`API error (${response.status}):`, data.error);
        return {
          success: false,
          data: null,
          error: data.error || `HTTP error ${response.status}`,
          timestamp: data.timestamp || new Date().toISOString()
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// API client instance
const apiClient = new ApiClient();

/**
 * Chat API service for secure chat operations
 */
export const chatApi = {
  /**
   * Check if the chat API is available
   * @returns True if the API is available
   */
  async checkHealth() {
    try {
      console.log(`Checking chat health at: ${API_BASE_URL}/chat-health-check`);
      const response = await fetch(`${API_BASE_URL}/chat-health-check`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  /**
   * Get messages for a chat session
   * @param sessionId The chat session ID
   * @returns Chat messages
   */
  async getMessages(sessionId: string) {
    return apiClient.request('chat-get-session-messages', {
      body: { sessionId }
    });
  },

  /**
   * Send a message to the chat
   * @param sessionId The chat session ID
   * @param message The message to send
   * @param petId Optional pet ID
   * @returns The AI response
   */
  async sendMessage(sessionId: string, message: string, petId?: string) {
    return apiClient.request('chat-send-message', {
      body: { sessionId, message, petId }
    });
  },

  /**
   * Create a new chat session
   * @param petId Optional pet ID
   * @param title Optional session title
   * @returns The new session details
   */
  async createSession(petId?: string, title?: string) {
    return apiClient.request('chat-create-session', {
      body: { petId, title }
    });
  }
};

// Export the full API client
export default apiClient; 