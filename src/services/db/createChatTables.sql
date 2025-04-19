-- Create Chat Tables for Pet Care Tracker App
-- Run this script in the Supabase SQL Editor to set up chat functionality

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pet_id ON chat_sessions(pet_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- Add foreign key to pets table if it exists
-- This specifically handles the foreign key constraint that's causing issues with chat session creation
DO $$
BEGIN
  -- Check if pets table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pets') THEN
    -- Drop existing constraint if it exists
    ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;
    
    -- Add flexible foreign key constraint with deferred checking
    -- This is critical to fix the "missing foreign key constraint" issue
    ALTER TABLE chat_sessions 
    ADD CONSTRAINT chat_sessions_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) 
    ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    
    RAISE NOTICE 'Added deferred foreign key constraint to pets table';
  ELSE
    RAISE NOTICE 'Pets table does not exist. Foreign key constraint not added.';
  END IF;
END
$$;

-- Enable Row Level Security on tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_sessions table
DROP POLICY IF EXISTS "Users can access their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can access their own chat sessions" 
  ON chat_sessions 
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policies for chat_messages table  
DROP POLICY IF EXISTS "Users can access their own chat messages" ON chat_messages;
CREATE POLICY "Users can access their own chat messages" 
  ON chat_messages 
  FOR ALL
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- Grant necessary permissions
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

-- Update function for chat tables check
CREATE OR REPLACE FUNCTION check_chat_tables()
RETURNS BOOLEAN AS $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('chat_sessions', 'chat_messages')
  ) INTO tables_exist;
  
  RETURN tables_exist;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 