import { chatApi } from '../api/chatApi';

export interface ChatSession {
  id: string;
  user_id: string;
  pet_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  tokens?: number;
}

/**
 * Secure Chat Repository
 * This replaces direct Supabase queries with secure API calls to serverless functions
 */
class SecureChatRepository {
  // Create a new chat session
  async createSession(userId: string, petId?: string): Promise<string | null> {
    try {
      if (!userId) {
        console.error('Error: Cannot create chat session - no user ID provided');
        throw new Error('User ID is required to create a chat session');
      }

      console.log(`Creating chat session for user: ${userId}, pet: ${petId || 'none'}`);
      
      // Use the secure API instead of direct Supabase queries
      const sessionId = await chatApi.createSession(petId);
      
      console.log(`Chat session created with ID: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Exception creating chat session:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.stack) console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  // Update the session's last update time
  // This is now handled automatically by the server
  async updateSessionTimestamp(sessionId: string): Promise<void> {
    // No implementation needed as the server handles this automatically when messages are added
    console.log('Session timestamp update is handled by the server');
  }

  // Add a message to a chat session
  async addMessage(
    sessionId: string, 
    content: string, 
    role: 'user' | 'assistant' | 'system',
    tokens?: number
  ): Promise<string | null> {
    try {
      if (!sessionId) {
        console.error('Error: Cannot add message - no session ID provided');
        throw new Error('Session ID is required to add a message');
      }

      console.log(`Adding message to session ${sessionId}, role: ${role}, content length: ${content.length}`);
      
      // Use the secure API instead of direct Supabase queries
      const messageId = await chatApi.addMessage(sessionId, content, role, tokens);
      
      console.log(`Message added successfully with ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Exception adding chat message:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.stack) console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }

  // Get all messages for a session
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      // Use the secure API instead of direct Supabase queries
      return await chatApi.getSessionMessages(sessionId);
    } catch (error) {
      console.error('Exception fetching chat messages:', error);
      return [];
    }
  }

  // Get recent sessions for a user
  async getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    try {
      // Use the secure API instead of direct Supabase queries
      return await chatApi.getUserSessions(limit);
    } catch (error) {
      console.error('Error fetching user chat sessions:', error);
      return [];
    }
  }

  // Delete a chat session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Use the secure API instead of direct Supabase queries
      return await chatApi.deleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const secureChatRepository = new SecureChatRepository(); 