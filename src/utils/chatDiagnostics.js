import { supabase } from '../services/supabase';

/**
 * Diagnostic utility to check if the chat-related tables exist in the Supabase database
 * and diagnose issues with creating chat sessions.
 */
export async function diagnoseChatTables() {
  console.log('🔍 Starting Chat Table Diagnostics');
  const results = {
    tables: {
      pets: { exists: false, columns: [] },
      chat_sessions: { exists: false, columns: [] },
      chat_messages: { exists: false, columns: [] }
    },
    relationships: {
      petForeignKeyWorks: false
    },
    pets: {
      count: 0,
      first: null
    },
    testSession: {
      created: false,
      error: null
    }
  };

  try {
    // Get current user
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    
    if (!userId) {
      console.log('❌ No authenticated user found. Please sign in first.');
      return {
        ...results,
        error: 'No authenticated user'
      };
    }

    // Check for pets table
    console.log('Checking pets table...');
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('id, name, user_id')
        .limit(5);
      
      if (error) {
        console.error('❌ Error accessing pets table:', error.message);
        if (error.code === '42P01') {
          console.error('   The pets table does not exist');
        }
      } else {
        results.tables.pets.exists = true;
        console.log(`✅ Pets table exists with ${data.length} sample records`);
        
        // Count total pets
        const { count, error: countError } = await supabase
          .from('pets')
          .select('*', { count: 'exact', head: true });
        
        if (!countError) {
          results.pets.count = count || 0;
          console.log(`ℹ️ Total pets in database: ${count}`);
        }
        
        // Get the first pet for testing
        if (data && data.length > 0) {
          results.pets.first = data[0];
          console.log(`ℹ️ Found pet: ${data[0].name} (ID: ${data[0].id})`);
        }
      }
    } catch (e) {
      console.error('Unexpected error checking pets table:', e);
    }

    // Check for chat_sessions table
    console.log('\nChecking chat_sessions table...');
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, user_id, pet_id')
        .limit(5);
      
      if (error) {
        console.error('❌ Error accessing chat_sessions table:', error.message);
        if (error.code === '42P01') {
          console.error('   The chat_sessions table does not exist');
        }
      } else {
        results.tables.chat_sessions.exists = true;
        console.log(`✅ chat_sessions table exists with ${data.length} sample records`);
      }
    } catch (e) {
      console.error('Unexpected error checking chat_sessions table:', e);
    }

    // Check for chat_messages table
    console.log('\nChecking chat_messages table...');
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, session_id, content, role')
        .limit(5);
      
      if (error) {
        console.error('❌ Error accessing chat_messages table:', error.message);
        if (error.code === '42P01') {
          console.error('   The chat_messages table does not exist');
        }
      } else {
        results.tables.chat_messages.exists = true;
        console.log(`✅ chat_messages table exists with ${data.length} sample records`);
      }
    } catch (e) {
      console.error('Unexpected error checking chat_messages table:', e);
    }

    // Test foreign key relationship by creating a test session
    if (results.tables.chat_sessions.exists && results.pets.first) {
      console.log('\nTesting chat_sessions foreign key constraint with pet...');
      
      const testSessionData = {
        user_id: userId,
        pet_id: results.pets.first.id,
        title: 'Diagnostic Test Session',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .insert(testSessionData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Error creating test chat session:', error.message);
          results.testSession.error = error.message;
          
          if (error.code === '23503') {
            console.error('   Foreign key constraint violation - check that the pet exists and tables are correctly related');
          }
        } else {
          console.log('✅ Successfully created test chat session with ID:', session.id);
          results.testSession.created = true;
          results.relationships.petForeignKeyWorks = true;
          
          // Clean up test session
          console.log('   Cleaning up test session...');
          const { error: deleteError } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', session.id);
          
          if (deleteError) {
            console.error('   Warning: Could not delete test session:', deleteError.message);
          } else {
            console.log('   Test session deleted successfully');
          }
        }
      } catch (e) {
        console.error('Unexpected error testing chat session creation:', e);
        results.testSession.error = e.message;
      }
    } else if (!results.pets.first) {
      console.log('\n⚠️ Cannot test chat session creation - no pets found in database');
    } else {
      console.log('\n⚠️ Cannot test chat session creation - chat_sessions table does not exist');
    }

    // Summary
    console.log('\n📊 Chat Tables Diagnostic Summary:');
    console.log(`- Pets table exists: ${results.tables.pets.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`- Chat Sessions table exists: ${results.tables.chat_sessions.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`- Chat Messages table exists: ${results.tables.chat_messages.exists ? '✅ Yes' : '❌ No'}`);
    console.log(`- Pet foreign key relationship works: ${results.relationships.petForeignKeyWorks ? '✅ Yes' : '❌ No'}`);

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!results.tables.pets.exists) {
      console.log('- Create the pets table in Supabase');
    }
    
    if (!results.tables.chat_sessions.exists || !results.tables.chat_messages.exists) {
      console.log('- Run the createChatTablesSQL script from migrations.ts in the Supabase SQL editor');
    }
    
    if (results.tables.chat_sessions.exists && !results.relationships.petForeignKeyWorks) {
      console.log('- The foreign key constraint between chat_sessions and pets is not working.');
      console.log('  You may need to fix the constraint with:');
      console.log(`
  ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;
  ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey 
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;`);
    }

    return results;
  } catch (error) {
    console.error('❌ An unexpected error occurred during diagnostics:', error);
    return {
      ...results,
      error: error.message
    };
  }
}

// Function to get SQL to fix chat tables
export function getChatTablesSQLFix() {
  return `
-- Run this in the Supabase SQL Editor to fix chat tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  pet_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tokens INTEGER,
  CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pet_id ON chat_sessions(pet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Fix foreign key to pets table
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey 
FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can access their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can access their own chat sessions" 
  ON chat_sessions 
  FOR ALL
  USING (auth.uid() = user_id);
  
DROP POLICY IF EXISTS "Users can access their own chat messages" ON chat_messages;
CREATE POLICY "Users can access their own chat messages" 
  ON chat_messages 
  FOR ALL
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- Grant permissions
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
  `;
} 