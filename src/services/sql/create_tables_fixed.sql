/* 
 * This is a fixed version of the chat tables creation script
 * It creates chat tables with a nullable pet_id column to avoid foreign key constraint issues
 * This script should be run in the Supabase SQL Editor
 */

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_sessions table if not exists
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT,
  pet_id UUID NULL, -- NOTE: Making pet_id nullable to avoid foreign key issues
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index for performance
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_pet_id_idx ON chat_sessions(pet_id);

-- Setup Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for chat_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'chat_sessions_user_policy'
  ) THEN
    CREATE POLICY chat_sessions_user_policy ON chat_sessions
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Create chat_messages table if not exists
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index for performance
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);

-- Setup Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_user_policy'
  ) THEN
    CREATE POLICY chat_messages_user_policy ON chat_messages
      USING (EXISTS (
        SELECT 1 FROM chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM chat_sessions
        WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
      ));
  END IF;
END
$$;

-- Add foreign key to pets table only if it exists
DO $$
BEGIN
  -- Check if pets table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pets'
  ) THEN
    -- Check if foreign key constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'chat_sessions_pet_id_fkey' 
      AND table_name = 'chat_sessions'
    ) THEN
      -- Add foreign key constraint
      ALTER TABLE chat_sessions 
      ADD CONSTRAINT chat_sessions_pet_id_fkey 
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
      
      RAISE NOTICE 'Foreign key constraint to pets table added successfully.';
    ELSE
      RAISE NOTICE 'Foreign key constraint to pets table already exists.';
    END IF;
  ELSE
    RAISE NOTICE 'Pets table does not exist. Foreign key constraint not added.';
  END IF;
END
$$; 