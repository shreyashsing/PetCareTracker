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
      // If petId is provided, verify it exists first
      if (petId) {
        const { data: pet, error: petError } = await supabase
          .from('pets')
          .select('id')
          .eq('id', petId)
          .single();
        
        // If pet doesn't exist or error occurred, create session without pet_id
        if (petError || !pet) {
          console.log('Warning: Pet ID not found, creating session without pet reference');
          const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (error) {
            console.error('Error creating chat session:', error);
            return null;
          }

          return data?.id || null;
        }
      }
      
      // Create session with pet_id if it exists or was verified
      const sessionData: any = {
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only add pet_id if it was provided and verified
      if (petId) {
        sessionData.pet_id = petId;
      }
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating chat session:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Exception creating chat session:', error);
      return null;
    }
  }

  // Update the session's last update time
  async updateSessionTimestamp(sessionId: string): Promise<void> {
    try {
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
      // Update the session timestamp
      await this.updateSessionTimestamp(sessionId);

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          content,
          role,
          timestamp: new Date().toISOString(),
          tokens
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error adding chat message:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Exception adding chat message:', error);
      return null;
    }
  }

  // Get all messages for a session
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
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