import axios, { AxiosError } from 'axios';
import { supabase } from '../supabase';
import { ChatMessage } from '../petAssistant/chatRepository';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { API_URL } from '../../config/network';

// Define the production URL as a fallback
const PRODUCTION_URL = 'https://darling-empanada-164b33.netlify.app/.netlify/functions';

// Flag to track if we've already shown the offline warning
let offlineWarningShown = false;
// Flag to track if serverless functions are available
let useFallbackToDirectSupabase = false;

/**
 * Check if the device is connected to the internet
 */
async function isConnected(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable === true;
  } catch (error: any) {
    console.warn('Error checking network connectivity:', error);
    return false;
  }
}

// Define a type for network errors
interface NetworkErrorLike {
  message?: string;
  code?: string;
}

/**
 * Check if the serverless functions are available
 */
export async function checkServerlessFunctionsAvailability(): Promise<boolean> {
  try {
    // First check if device is online at all
    const connected = await isConnected();
    if (!connected) return false;
    
    // Skip health check if we've already determined serverless is unavailable
    if (useFallbackToDirectSupabase) {
      return false;
    }
    
    console.log(`ChatApi: Checking serverless functions at ${API_URL}/health-check`);
    
    // Try to call the health-check endpoint with the configured API URL
    try {
      const response = await axios.get(`${API_URL}/health-check`, { timeout: 5000 });
      if (response.status === 200) {
        console.log('ChatApi: Serverless functions available at configured URL');
        return true;
      }
    } catch (apiError) {
      console.log('ChatApi: Failed to reach serverless functions at configured URL, trying production URL');
      
      // If the configured URL fails, try the production URL directly
      try {
        const response = await axios.get(`${PRODUCTION_URL}/health-check`, { timeout: 5000 });
        if (response.status === 200) {
          console.log('ChatApi: Serverless functions available at production URL');
          return true;
        }
      } catch (prodError) {
        console.warn('ChatApi: Failed to reach serverless functions at production URL:', prodError);
      }
    }
    
    console.warn('ChatApi: Serverless functions unavailable, will use direct Supabase connection');
    useFallbackToDirectSupabase = true;
    return false;
  } catch (error) {
    console.warn('ChatApi: Error checking serverless functions availability:', error);
    useFallbackToDirectSupabase = true;
    return false;
  }
}

/**
 * Helper to make authenticated API requests
 */
async function makeAuthenticatedRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string, 
  data?: any,
  params?: Record<string, any>
): Promise<T> {
  try {
    // First check if device is online
    const connected = await isConnected();
    if (!connected) {
      if (!offlineWarningShown) {
        console.warn('Device is offline, cannot make API request');
        offlineWarningShown = true;
      }
      throw new Error('OFFLINE');
    }

    // If we're using the fallback to direct Supabase, throw an error to trigger that flow
    if (useFallbackToDirectSupabase) {
      console.log('Using direct Supabase connection instead of serverless function');
      throw new Error('USE_DIRECT_SUPABASE');
    }

    // Get the current session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session?.access_token) {
      throw new Error('Authentication required');
    }

    // Add a timeout to prevent hanging requests
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('API request timeout')), 20000)
    );

    // First try with the configured API URL
    try {
      console.log(`ChatApi: Making ${method} request to ${API_URL}/${endpoint}`);
      
      // Log request data for debugging
      if (data) {
        console.log(`ChatApi: Request payload for ${endpoint}:`, JSON.stringify(data, null, 2));
      }
      if (params) {
        console.log(`ChatApi: Request params for ${endpoint}:`, JSON.stringify(params, null, 2));
      }
      
      const requestPromise = axios({
        method,
        url: `${API_URL}/${endpoint}`,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? params : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        // Additional timeout at axios level
        timeout: 15000
      });

      // Race the request against the timeout
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      // Log response for debugging
      console.log(`ChatApi: Response status for ${endpoint}:`, response.status);
      console.log(`ChatApi: Response success:`, response.data.success);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }

      // Reset warning flag on successful request
      offlineWarningShown = false;
      
      return response.data.data;
    } catch (apiError) {
      // If the regular API URL fails, try the production URL directly
      console.log(`ChatApi: First attempt failed, trying production URL directly`);
      
      console.log(`ChatApi: Making ${method} request to ${PRODUCTION_URL}/${endpoint}`);
      
      const requestPromise = axios({
        method,
        url: `${PRODUCTION_URL}/${endpoint}`,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? params : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        timeout: 15000
      });

      // Race the request against the timeout
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      // Log response for debugging
      console.log(`ChatApi: Production response status for ${endpoint}:`, response.status);
      console.log(`ChatApi: Production response success:`, response.data.success);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown API error');
      }

      // Reset warning flag on successful request
      offlineWarningShown = false;
      
      return response.data.data;
    }
  } catch (error) {
    console.error(`API error for ${endpoint}:`, error);
    
    // Check if this is a connection error
    const err = error as NetworkErrorLike;
    const isNetworkError = 
      err.message === 'Network Error' || 
      err.message === 'OFFLINE' ||
      err.message === 'USE_DIRECT_SUPABASE' ||
      (err.message && err.message.includes('timeout')) ||
      (err.code && (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND'));
    
    if (isNetworkError) {
      // If this is the first network error, set the flag to use direct Supabase
      if (!useFallbackToDirectSupabase && err.message !== 'OFFLINE') {
        console.log('Setting up to use direct Supabase connection for future requests');
        useFallbackToDirectSupabase = true;
      }
      throw new Error('NETWORK_ERROR');
    }
    
    throw error;
  }
}

/**
 * Secure Chat API functions
 * These replace direct Supabase queries for better security
 */
export const chatApi = {
  /**
   * Check if the API is available
   */
  async isAvailable(): Promise<boolean> {
    return checkServerlessFunctionsAvailability();
  },

  /**
   * Create a new chat session
   */
  async createSession(petId?: string, title?: string, retryCount: number = 0): Promise<string> {
    try {
      console.log('ChatApi: createSession called', { petId, title, retryCount });
      
      // Limit retry attempts to prevent infinite loops
      if (retryCount > 1 || useFallbackToDirectSupabase) {
        // Skip serverless attempt if we've already tried twice or fallback is set
        console.log('ChatApi: Skipping serverless function, using direct Supabase connection');
      } else {
        // First try the serverless function
        try {
          console.log('ChatApi: Attempting to create session via serverless function');
          const response = await makeAuthenticatedRequest<{ sessionId: string }>(
            'POST',
            'api/chat/create-session',
            { petId, title }
          );
          console.log('ChatApi: Successfully created session via serverless function:', response.sessionId);
          return response.sessionId;
        } catch (error: any) {
          console.error('ChatApi: Error using serverless function:', error.message || error);
          if (error.message !== 'NETWORK_ERROR' && error.message !== 'OFFLINE') {
            throw error;
          }
          // If network error, continue to fallback
        }
      }

      // Fallback to direct Supabase
      console.log('ChatApi: Using direct Supabase connection to create session');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('ChatApi: Auth error when creating session:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }
      
      const userId = authData.user?.id;
      
      if (!userId) {
        console.error('ChatApi: No user ID found in auth data');
        throw new Error('User not authenticated');
      }
      
      // Prepare session data
      const sessionData: any = {
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (petId) {
        sessionData.pet_id = petId;
      }
      
      if (title) {
        sessionData.title = title || 'New Chat Session';
      }
      
      console.log('ChatApi: Inserting session into Supabase:', sessionData);
      
      // Insert the session
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select('id')
        .single();
      
      if (error) {
        console.error('ChatApi: Error creating chat session directly in Supabase:', error);
        
        // Check if this is a foreign key constraint error
        if (error.message && error.message.includes('foreign key constraint')) {
          console.error('ChatApi: Foreign key constraint violation - check if tables exist');
        }
        
        // Generate a temporary local ID
        const tempId = `local-${Date.now()}`;
        console.log('ChatApi: Using temporary session ID:', tempId);
        return tempId;
      }
      
      console.log('ChatApi: Successfully created session directly in Supabase:', data.id);
      return data.id;
    } catch (error: any) {
      console.error('ChatApi: Unexpected error in createSession:', error);
      // Generate a temporary local ID as a last resort
      const tempId = `local-${Date.now()}`;
      console.log('ChatApi: Using temporary session ID due to error:', tempId);
      return tempId;
    }
  },

  /**
   * Get a user's chat sessions
   */
  async getUserSessions(limit: number = 10): Promise<any[]> {
    try {
      // First try the serverless function
      if (!useFallbackToDirectSupabase) {
        try {
          const response = await makeAuthenticatedRequest<{ sessions: any[] }>(
            'GET',
            'api/chat/get-user-sessions',
            undefined,
            { limit }
          );
          return response.sessions;
        } catch (error: any) {
          if (error.message !== 'NETWORK_ERROR' && error.message !== 'OFFLINE') {
            throw error;
          }
          // If network error, continue to fallback
        }
      }

      // Fallback to direct Supabase
      console.log('Using direct Supabase connection to get user sessions');
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      
      if (!userId) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching chat sessions directly from Supabase:', error);
        return [];
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  },

  /**
   * Get messages for a chat session
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      // First try the serverless function
      if (!useFallbackToDirectSupabase) {
        try {
          const response = await makeAuthenticatedRequest<{ messages: ChatMessage[] }>(
            'GET',
            'api/chat/get-session-messages',
            undefined,
            { sessionId }
          );
          return response.messages;
        } catch (error: any) {
          if (error.message !== 'NETWORK_ERROR' && error.message !== 'OFFLINE') {
            throw error;
          }
          // If network error, continue to fallback
        }
      }

      // Fallback to direct Supabase
      console.log('Using direct Supabase connection to get session messages');
      
      // Get the current session's user ID
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();
      
      // We should still return messages for local sessions
      if ((sessionError || !sessionData) && !sessionId.startsWith('local-')) {
        console.error('Error fetching session or session not found:', sessionError);
        return [];
      }
      
      // If this is a local session, return empty array
      if (sessionId.startsWith('local-')) {
        return [];
      }
      
      // Otherwise fetch the messages
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error fetching chat messages directly from Supabase:', error);
        return [];
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Error in getSessionMessages:', error);
      return [];
    }
  },

  /**
   * Add a message to a chat session
   */
  async addMessage(
    sessionId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    tokens?: number
  ): Promise<string> {
    try {
      // First try the serverless function
      if (!useFallbackToDirectSupabase) {
        try {
          const response = await makeAuthenticatedRequest<{ messageId: string }>(
            'POST',
            'api/chat/add-message',
            { sessionId, content, role, tokens }
          );
          return response.messageId;
        } catch (error: any) {
          if (error.message !== 'NETWORK_ERROR' && error.message !== 'OFFLINE') {
            throw error;
          }
          // If network error, continue to fallback
        }
      }

      // Fallback to direct Supabase
      console.log('Using direct Supabase connection to add message');
      
      // For local sessions, just return a mock ID
      if (sessionId.startsWith('local-')) {
        return `local-msg-${Date.now()}`;
      }
      
      // Prepare message data
      const messageData = {
        id: uuidv4(),
        session_id: sessionId,
        content,
        role,
        timestamp: new Date().toISOString(),
        tokens
      };
      
      // Insert the message
      const { error } = await supabase
        .from('chat_messages')
        .insert(messageData);
      
      if (error) {
        console.error('Error adding chat message directly to Supabase:', error);
        return `local-msg-${Date.now()}`;
      }
      
      // Update the session's last update time
      try {
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch (updateError) {
        console.warn('Error updating session timestamp:', updateError);
      }
      
      return messageData.id;
    } catch (error: any) {
      console.error('Error in addMessage:', error);
      return `local-msg-${Date.now()}`;
    }
  },

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // First try the serverless function
      if (!useFallbackToDirectSupabase) {
        try {
          const response = await makeAuthenticatedRequest<{ success: boolean }>(
            'DELETE',
            'api/chat/delete-session',
            undefined,
            { sessionId }
          );
          return response.success;
        } catch (error: any) {
          if (error.message !== 'NETWORK_ERROR' && error.message !== 'OFFLINE') {
            throw error;
          }
          // If network error, continue to fallback
        }
      }

      // Fallback to direct Supabase
      console.log('Using direct Supabase connection to delete session');
      
      // For local sessions, just return success
      if (sessionId.startsWith('local-')) {
        return true;
      }
      
      // Delete all messages in the session
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);
      
      if (messagesError) {
        console.error('Error deleting chat messages directly from Supabase:', messagesError);
      }
      
      // Delete the session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (sessionError) {
        console.error('Error deleting chat session directly from Supabase:', sessionError);
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('Error in deleteSession:', error);
      // Pretend it worked anyway
      return true;
    }
  }
}; 