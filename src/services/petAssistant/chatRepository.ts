import { supabase } from '../supabase';

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

class ChatRepository {
  // Create a new chat session
  async createSession(userId: string, petId?: string): Promise<string | null> {
    try {
      if (!userId) {
        console.error('Error: Cannot create chat session - no user ID provided');
        throw new Error('User ID is required to create a chat session');
      }

      console.log(`Creating chat session for user: ${userId}, pet: ${petId || 'none'}`);
      
      // Verify user exists in auth.users
      try {
        const { data: userCheck, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.log('Cannot verify user through auth API, continuing anyway');
        } else if (!userCheck?.user) {
          console.warn(`Warning: User ID ${userId} not found in auth data, but continuing`);
        } else {
          console.log(`User ${userId} verified through auth API`);
        }
      } catch (authError) {
        // This might fail if admin privileges aren't available
        console.log('Auth verification skipped, continuing with session creation');
      }
      
      // Prepare session data
      const sessionData: any = {
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only add pet_id if it was provided
      if (petId) {
        // Verify pet exists and belongs to user
        try {
          const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('id')
            .eq('id', petId)
            .eq('user_id', userId)  // Ensure pet belongs to this user
            .single();
          
          if (!petError && pet) {
            // Pet found and belongs to user, include it in session
            sessionData.pet_id = petId;
            console.log(`Pet ${petId} verified and added to session`);
          } else {
            // Pet not found or doesn't belong to user
            console.log(`Warning: Pet ID ${petId} not found or doesn't belong to user, creating session without pet reference`);
            // Continue without pet_id
          }
        } catch (petError) {
          console.error('Error verifying pet:', petError);
          // Continue without pet_id
        }
      }
      
      console.log('Creating chat session with data:', JSON.stringify(sessionData));
      
      // Make sure auth is refreshed before creating the session
      await this.refreshAuthIfNeeded();
      
      // Create the session with retry mechanism
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase
            .from('chat_sessions')
            .insert(sessionData)
            .select('id')
            .single();

          if (error) {
            lastError = error;
            console.error(`Error creating chat session (attempt ${attempts + 1}/${maxAttempts}):`, error);
            
            // If it's a foreign key violation, try without pet_id
            if (error.code === '23503' && sessionData.pet_id) {
              console.log('Foreign key violation detected, trying again without pet_id');
              delete sessionData.pet_id;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              continue;
            }
          } else {
            console.log(`Chat session created with ID: ${data?.id}`);
            return data?.id || null;
          }
        } catch (attemptError) {
          lastError = attemptError;
          console.error(`Exception in chat session creation attempt ${attempts + 1}/${maxAttempts}:`, attemptError);
          attempts++;
          if (attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
        }
      }
      
      console.error(`Failed to create chat session after ${maxAttempts} attempts. Last error:`, lastError);
      return null;
    } catch (error) {
      console.error('Exception creating chat session:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.stack) console.error('Stack trace:', error.stack);
      }
      return null;
    }
  }
  
  // Helper method to refresh auth token if needed
  private async refreshAuthIfNeeded(): Promise<void> {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session or it's about to expire, refresh it
      if (!session) {
        console.log('ChatRepository: No active session, attempting to refresh');
        await supabase.auth.refreshSession();
        return;
      }
      
      // Check if token will expire in the next 5 minutes
      const tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (tokenExpiry && tokenExpiry < fiveMinutesFromNow) {
        console.log('ChatRepository: Token expiring soon, refreshing session');
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('ChatRepository: Error refreshing auth:', error);
    }
  }

  // Update the session's last update time
  async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
      await this.refreshAuthIfNeeded();
      
      const { error } = await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating chat session timestamp:', error);
      }
    } catch (error) {
      console.error('Exception updating chat session timestamp:', error);
    }
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
      
      // Update the session timestamp
      await this.updateSessionTimestamp(sessionId);

      const messageData = {
        session_id: sessionId,
        content,
        role,
        timestamp: new Date().toISOString(),
        tokens
      };

      console.log('Message data prepared:', JSON.stringify({
        session_id: sessionId,
        role,
        content_length: content.length,
        tokens
      }));
      
      // Ensure auth is refreshed before adding message
      await this.refreshAuthIfNeeded();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select('id')
        .single();

      if (error) {
        console.error('Error adding chat message:', error);
        console.error('Error details:', JSON.stringify(error));
        return null;
      }

      console.log(`Message added successfully with ID: ${data?.id}`);
      return data?.id || null;
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
      await this.refreshAuthIfNeeded();
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching chat messages:', error);
      return [];
    }
  }

  // Get recent sessions for a user
  async getUserSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    try {
      await this.refreshAuthIfNeeded();
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user chat sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching user chat sessions:', error);
      return [];
    }
  }

  // Delete a chat session and its messages
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await this.refreshAuthIfNeeded();
      
      // First delete all messages in the session
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) {
        console.error('Error deleting chat messages:', messagesError);
        return false;
      }

      // Then delete the session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Error deleting chat session:', sessionError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting chat session:', error);
      return false;
    }
  }
}

export const chatRepository = new ChatRepository(); 