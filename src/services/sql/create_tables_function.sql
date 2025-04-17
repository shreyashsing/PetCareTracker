CREATE OR REPLACE FUNCTION create_chat_tables()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run as DB owner
AS $$
DECLARE
  pets_exists BOOLEAN;
BEGIN
  -- Create extension if not exists
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Check if pets table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pets'
  ) INTO pets_exists;
  
  -- Chat Sessions table - with conditional foreign key to pets
  IF pets_exists THEN
    -- Create table with reference to pets table
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Create table without reference to pets table
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      pet_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'The pets table does not exist. Creating chat_sessions without foreign key constraint.';
  END IF;

  -- Add indexes for chat_sessions
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_pet_id ON chat_sessions(pet_id);
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);

  -- Chat Messages table
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
  CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

  -- RLS Policies for chat_sessions
  ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS chat_sessions_select_policy ON chat_sessions;
  DROP POLICY IF EXISTS chat_sessions_insert_policy ON chat_sessions;
  DROP POLICY IF EXISTS chat_sessions_update_policy ON chat_sessions;
  DROP POLICY IF EXISTS chat_sessions_delete_policy ON chat_sessions;

  -- Create policies
  CREATE POLICY chat_sessions_select_policy ON chat_sessions 
    FOR SELECT USING (auth.uid() = user_id);
    
  CREATE POLICY chat_sessions_insert_policy ON chat_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
  CREATE POLICY chat_sessions_update_policy ON chat_sessions 
    FOR UPDATE USING (auth.uid() = user_id);
    
  CREATE POLICY chat_sessions_delete_policy ON chat_sessions 
    FOR DELETE USING (auth.uid() = user_id);

  -- RLS Policies for chat_messages (through session)
  ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS chat_messages_select_policy ON chat_messages;
  DROP POLICY IF EXISTS chat_messages_insert_policy ON chat_messages;
  DROP POLICY IF EXISTS chat_messages_update_policy ON chat_messages;
  DROP POLICY IF EXISTS chat_messages_delete_policy ON chat_messages;

  -- Create policies
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

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating chat tables: %', SQLERRM;
    RETURN FALSE;
END;
$$; 