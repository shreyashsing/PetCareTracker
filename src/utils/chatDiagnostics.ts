import { supabase } from "../services/supabase";

/**
 * Gets the SQL needed to create the chat tables properly
 * This is a specialized function to provide SQL for fixing chat tables
 * with proper foreign key constraints
 */
export const getChatTablesSQLFix = (): string => {
  return `
/* 
 * Chat System Tables Fix
 * This script fixes issues with the chat tables, particularly foreign key constraints
 */

-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Force refresh the schema cache
ANALYZE;

-- Check if chat_sessions table exists and fix or create it
DO $$
BEGIN
  -- If chat_sessions table doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_sessions'
  ) THEN
    CREATE TABLE chat_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      name TEXT,
      pet_id UUID NULL, -- Making pet_id nullable to avoid foreign key issues
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add indexes
    CREATE INDEX chat_sessions_user_id_idx ON chat_sessions(user_id);
    CREATE INDEX chat_sessions_pet_id_idx ON chat_sessions(pet_id);
    
    -- Setup Row Level Security
    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Create policy
    CREATE POLICY chat_sessions_user_policy ON chat_sessions
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
      
    RAISE NOTICE 'Created chat_sessions table with nullable pet_id column';
  ELSE
    -- Table exists, check if pet_id is already nullable
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
      AND column_name = 'pet_id' AND is_nullable = 'NO'
    ) THEN
      -- Make pet_id nullable
      ALTER TABLE chat_sessions 
      ALTER COLUMN pet_id DROP NOT NULL;
      
      RAISE NOTICE 'Modified chat_sessions table to make pet_id nullable';
    ELSE
      RAISE NOTICE 'chat_sessions table exists and pet_id is already nullable';
    END IF;
    
    -- Check for title column issue
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
      AND column_name = 'title'
    ) THEN
      -- Check if name column exists
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
        AND column_name = 'name'
      ) THEN
        -- Both columns exist, migrate data and drop title
        UPDATE chat_sessions 
        SET name = title 
        WHERE name IS NULL AND title IS NOT NULL;
        
        ALTER TABLE chat_sessions DROP COLUMN title;
        RAISE NOTICE 'Merged title column into name column and dropped title';
      ELSE
        -- Only title exists, rename to name
        ALTER TABLE chat_sessions RENAME COLUMN title TO name;
        RAISE NOTICE 'Renamed title column to name';
      END IF;
    ELSE
      -- Check if name column exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
        AND column_name = 'name'
      ) THEN
        -- Neither column exists, add name
        ALTER TABLE chat_sessions ADD COLUMN name TEXT;
        RAISE NOTICE 'Added missing name column';
      END IF;
    END IF;
  END IF;
END
$$;

-- Check if chat_messages table exists and fix or create it
DO $$
BEGIN
  -- If chat_messages table doesn't exist, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    CREATE TABLE chat_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add index
    CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);
    
    -- Setup Row Level Security
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    
    -- Create policy
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
      
    RAISE NOTICE 'Created chat_messages table';
  ELSE
    RAISE NOTICE 'chat_messages table already exists';
  END IF;
END
$$;

-- Fix or create foreign key constraints
DO $$
BEGIN
  -- Check if the foreign key from chat_messages to chat_sessions exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_session_id_fkey' 
    AND table_name = 'chat_messages'
  ) THEN
    -- Add the constraint
    ALTER TABLE chat_messages 
    ADD CONSTRAINT chat_messages_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint from chat_messages to chat_sessions';
  ELSE
    RAISE NOTICE 'Foreign key from chat_messages to chat_sessions already exists';
  END IF;
  
  -- Check if pets table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pets'
  ) THEN
    -- Check if the foreign key from chat_sessions to pets exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'chat_sessions_pet_id_fkey' 
      AND table_name = 'chat_sessions'
    ) THEN
      -- Drop the existing constraint
      ALTER TABLE chat_sessions 
      DROP CONSTRAINT chat_sessions_pet_id_fkey;
      
      RAISE NOTICE 'Dropped existing foreign key constraint to pets table';
    END IF;
    
    -- Add the constraint with ON DELETE SET NULL
    ALTER TABLE chat_sessions 
    ADD CONSTRAINT chat_sessions_pet_id_fkey 
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added proper foreign key constraint to pets table with ON DELETE SET NULL';
  ELSE
    RAISE NOTICE 'Pets table does not exist. Foreign key constraint not added.';
  END IF;
END
$$;

-- Force refresh of schema cache for tables
ANALYZE chat_sessions;
ANALYZE chat_messages;

-- Verify if everything is set up correctly
DO $$
DECLARE
  sessions_count INTEGER;
  has_title BOOLEAN;
  has_name BOOLEAN;
BEGIN
  -- Count existing sessions
  SELECT COUNT(*) INTO sessions_count FROM chat_sessions;
  RAISE NOTICE 'Current chat_sessions count: %', sessions_count;
  
  -- Verify column situation
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
           AND column_name = 'title') INTO has_title;
    
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
           AND column_name = 'name') INTO has_name;
  
  RAISE NOTICE 'Column check - Title exists: %, Name exists: %', has_title, has_name;
END
$$;
`;
};

/**
 * Diagnoses issues with the chat system database structure
 */
export const diagnoseChatTables = async (): Promise<{
  tablesExist: boolean;
  foreignKeyIssue: boolean;
  titleColumnIssue: boolean;
  message: string;
}> => {
  try {
    // Check if chat_sessions table exists
    const { data: sessionTable, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id")
      .limit(1);
    
    if (sessionError) {
      console.error("Error checking chat_sessions table:", sessionError);
      
      if (sessionError.code === "42P01") {
        // Table doesn't exist
        return {
          tablesExist: false,
          foreignKeyIssue: false,
          titleColumnIssue: false,
          message: "Chat tables don't exist. Run the SQL fix to create them."
        };
      }
      
      // Check for the title column error
      if (sessionError.message && 
          sessionError.message.includes('title') && 
          sessionError.message.includes('column')) {
        return {
          tablesExist: true,
          foreignKeyIssue: false,
          titleColumnIssue: true,
          message: "Title column issue detected in chat_sessions. Run the fix."
        };
      }
      
      return {
        tablesExist: false,
        foreignKeyIssue: false,
        titleColumnIssue: false,
        message: `Error checking tables: ${sessionError.message}`
      };
    }
    
    // Check if title column exists but name doesn't (or vice versa)
    let titleColumnIssue = false;
    try {
      const { data: columnCheck, error: columnError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
                  AND column_name = 'title') as has_title,
            EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
                  AND column_name = 'name') as has_name
        `
      });
      
      if (!columnError && columnCheck && columnCheck.length > 0) {
        const hasTitle = columnCheck[0].has_title;
        const hasName = columnCheck[0].has_name;
        
        // Problem if we have title but not name, or both
        titleColumnIssue = hasTitle;
      }
    } catch (columnCheckError) {
      console.error("Error checking for title column:", columnCheckError);
    }
    
    // Check if we can create a session with a null pet_id
    const { data: testSession, error: createError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: "00000000-0000-0000-0000-000000000000", // Dummy ID for test
        name: "Test Session",
        pet_id: null
      })
      .select();
    
    // If creation fails due to foreign key constraint, we have an issue
    if (createError) {
      console.error("Error creating test session:", createError);
      
      // Check for title column issue again
      if (createError.message && 
          createError.message.includes('title') && 
          createError.message.includes('column')) {
        return {
          tablesExist: true,
          foreignKeyIssue: false,
          titleColumnIssue: true,
          message: "Title column issue detected in chat_sessions. Run the fix."
        };
      }
      
      if (createError.message.includes("foreign key") || 
          createError.message.includes("violates") || 
          createError.message.includes("not-null")) {
        
        return {
          tablesExist: true,
          foreignKeyIssue: true,
          titleColumnIssue: titleColumnIssue,
          message: "Foreign key or NOT NULL constraint issue detected. Run the SQL fix."
        };
      }
      
      return {
        tablesExist: true,
        foreignKeyIssue: false,
        titleColumnIssue: titleColumnIssue,
        message: `Unknown issue: ${createError.message}`
      };
    }
    
    // If we got here, clean up the test session
    if (testSession && testSession.length > 0) {
      await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", testSession[0].id);
    }
    
    return {
      tablesExist: true,
      foreignKeyIssue: false,
      titleColumnIssue: titleColumnIssue,
      message: titleColumnIssue 
        ? "Title column issue detected in chat_sessions. Run the fix."
        : "Chat tables exist and appear to be correctly configured."
    };
  } catch (error) {
    console.error("Error in diagnoseChatTables:", error);
    
    // Check for title column issue in the error
    if (error instanceof Error && 
        error.message.includes('title') && 
        error.message.includes('column')) {
      return {
        tablesExist: true,
        foreignKeyIssue: false,
        titleColumnIssue: true,
        message: "Title column issue detected in chat_sessions. Run the fix."
      };
    }
    
    return {
      tablesExist: false,
      foreignKeyIssue: true,
      titleColumnIssue: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Specialized fix for the "title" column schema issue in chat_sessions
 */
export const fixTitleColumnIssue = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log("Fixing title column issue in chat_sessions...");
    
    // Check if either 'title' or 'name' columns exist
    const { data: columnCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
                 AND column_name = 'title') as has_title,
          EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' AND table_name = 'chat_sessions' 
                 AND column_name = 'name') as has_name
      `
    });
    
    if (checkError) {
      console.error("Error checking columns:", checkError);
      return {
        success: false,
        message: `Error checking columns: ${checkError.message}`
      };
    }
    
    // Parse the results
    const hasTitle = columnCheck && columnCheck.length > 0 ? columnCheck[0].has_title : false;
    const hasName = columnCheck && columnCheck.length > 0 ? columnCheck[0].has_name : false;
    
    console.log(`Column check: Title column exists: ${hasTitle}, Name column exists: ${hasName}`);
    
    // Apply the appropriate fix based on what columns exist
    if (hasTitle && !hasName) {
      // Rename title to name
      const { error: renameError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE chat_sessions RENAME COLUMN title TO name;`
      });
      
      if (renameError) {
        console.error("Error renaming title to name:", renameError);
        return {
          success: false,
          message: `Failed to rename title to name: ${renameError.message}`
        };
      }
      
      return {
        success: true,
        message: "Successfully renamed 'title' column to 'name'"
      };
    } else if (hasTitle && hasName) {
      // Both columns exist, keep name and drop title after migrating any data
      const { error: migrateError } = await supabase.rpc('exec_sql', {
        sql: `
          UPDATE chat_sessions 
          SET name = title 
          WHERE name IS NULL AND title IS NOT NULL;
          
          ALTER TABLE chat_sessions DROP COLUMN title;
        `
      });
      
      if (migrateError) {
        console.error("Error handling title and name columns:", migrateError);
        return {
          success: false,
          message: `Failed to handle title and name columns: ${migrateError.message}`
        };
      }
      
      return {
        success: true,
        message: "Successfully merged data from 'title' into 'name' and dropped 'title' column"
      };
    } else if (!hasName) {
      // Neither column exists, add name column
      const { error: addError } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE chat_sessions ADD COLUMN name TEXT;`
      });
      
      if (addError) {
        console.error("Error adding name column:", addError);
        return {
          success: false,
          message: `Failed to add name column: ${addError.message}`
        };
      }
      
      return {
        success: true,
        message: "Successfully added 'name' column to chat_sessions"
      };
    }
    
    return {
      success: true,
      message: "No column issues to fix, schema looks correct"
    };
  } catch (error) {
    console.error("Error in fixTitleColumnIssue:", error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}; 