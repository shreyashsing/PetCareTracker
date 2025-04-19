-- IMPORTANT: Run this SQL in the Supabase SQL Editor to create the chat tables
-- This version includes a more flexible foreign key setup to handle missing pets

-- First, create the UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table or modify if it already exists
DO $$
BEGIN
    -- Check if chat_sessions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_sessions') THEN
        -- Table exists, check if it needs modification
        BEGIN
            -- Drop the foreign key constraint if it exists and is causing problems
            ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;
            
            -- Add a more flexible constraint
            ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey 
                FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
            
            RAISE NOTICE 'Modified chat_sessions table foreign key constraint';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error modifying chat_sessions table: %', SQLERRM;
        END;
    ELSE
        -- Create the chat_sessions table without a strict foreign key
        CREATE TABLE chat_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            pet_id UUID, -- No foreign key constraint initially
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created chat_sessions table';
        
        -- Try to add the foreign key if pets table exists
        BEGIN
            -- Check if pets table exists
            IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pets') THEN
                -- Add foreign key constraint with deferred checking
                ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey 
                    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
                
                RAISE NOTICE 'Added foreign key constraint to chat_sessions table';
            ELSE
                RAISE NOTICE 'Pets table does not exist, chat_sessions created without foreign key constraint';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
        END;
    END IF;
END$$;

-- Add indexes for chat_sessions if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chat_sessions' AND indexname = 'idx_chat_sessions_user_id') THEN
        CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chat_sessions' AND indexname = 'idx_chat_sessions_pet_id') THEN
        CREATE INDEX idx_chat_sessions_pet_id ON chat_sessions(pet_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chat_sessions' AND indexname = 'idx_chat_sessions_updated_at') THEN
        CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at);
    END IF;
END$$;

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tokens INTEGER,
    CONSTRAINT valid_content CHECK (length(content) > 0)
);

-- Add indexes for chat_messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chat_messages' AND indexname = 'idx_chat_messages_session_id') THEN
        CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'chat_messages' AND indexname = 'idx_chat_messages_timestamp') THEN
        CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
    END IF;
END$$;

-- Set up Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS chat_sessions_select_policy ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_insert_policy ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_update_policy ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_delete_policy ON chat_sessions;

DROP POLICY IF EXISTS chat_messages_select_policy ON chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_policy ON chat_messages;
DROP POLICY IF EXISTS chat_messages_update_policy ON chat_messages;
DROP POLICY IF EXISTS chat_messages_delete_policy ON chat_messages;

-- Create new policies
CREATE POLICY chat_sessions_select_policy ON chat_sessions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY chat_sessions_insert_policy ON chat_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_sessions_update_policy ON chat_sessions 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY chat_sessions_delete_policy ON chat_sessions 
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for chat_messages
CREATE POLICY chat_messages_select_policy ON chat_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_insert_policy ON chat_messages 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_update_policy ON chat_messages 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY chat_messages_delete_policy ON chat_messages 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_messages TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat sessions between users and the pet assistant';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat sessions'; 