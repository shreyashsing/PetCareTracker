import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Share,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput
} from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { checkSupabaseTables } from '../utils/supabaseTables';
import { runFixedSqlScript } from '../utils/runSqlFix';

// Pet table creation SQL
const PET_TABLE_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  breed TEXT,
  birth_date TIMESTAMP WITH TIME ZONE,
  gender TEXT,
  weight NUMERIC,
  weight_unit TEXT DEFAULT 'kg',
  microchipped BOOLEAN DEFAULT false,
  microchip_id TEXT,
  neutered BOOLEAN DEFAULT false,
  adoption_date TIMESTAMP WITH TIME ZONE,
  color TEXT,
  image TEXT,
  medical_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- Set up Row Level Security
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to view and modify their own pets
CREATE POLICY "Users can view their own pets" 
  ON pets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets" 
  ON pets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets" 
  ON pets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets" 
  ON pets 
  FOR DELETE 
  USING (auth.uid() = user_id);
`;

// Chat tables SQL
const CHAT_TABLES_SQL = `
-- IMPORTANT: This SQL creates chat tables with a more flexible foreign key setup

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

-- RLS Policies for chat_sessions
CREATE POLICY chat_sessions_select_policy ON chat_sessions 
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY chat_sessions_insert_policy ON chat_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY chat_sessions_update_policy ON chat_sessions 
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY chat_sessions_delete_policy ON chat_sessions 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chat_messages (through session)
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
`;

// Import the fixed SQL content as a string
const FIXED_CHAT_SQL = `
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
`;

/**
 * Component to view SQL scripts
 */
const SQLViewer: React.FC<any> = ({ navigation, route }) => {
  const { colors } = useAppColors();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlType, setSqlType] = useState('pets');
  const [sqlValue, setSqlValue] = useState('');
  const [chatSqlValue, setChatSqlValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  
  // Get script type from route params
  const scriptType = route?.params?.scriptType || 'pets';
  
  // Determine which SQL to display
  const sqlScript = scriptType === 'chat' ? CHAT_TABLES_SQL : PET_TABLE_SQL;
  const title = scriptType === 'chat' ? 'Chat Tables SQL' : 'Pets Table SQL';
  
  // Copy SQL to clipboard
  const copyToClipboard = async () => {
    try {
      setLoading(true);
      await Clipboard.setStringAsync(sqlScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      Alert.alert(
        'Copied to Clipboard',
        'SQL script has been copied. Paste it in the Supabase SQL Editor.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    } finally {
      setLoading(false);
    }
  };
  
  // Share SQL
  const shareSQL = async () => {
    try {
      await Share.share({
        message: sqlScript,
        title: 'Supabase SQL Script',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share SQL script');
    }
  };
  
  const runSql = async () => {
    // ... existing implementation ...
  };

  const runFixedScript = async () => {
    try {
      setIsLoading(true);
      setResult('Running fixed SQL script to create chat tables...');
      
      const outcome = await runFixedSqlScript();
      
      if (outcome.success) {
        setResult(`Success: ${outcome.message}\n\nThe chat tables have been created or updated with a more flexible schema to avoid foreign key constraints.`);
      } else {
        setResult(`Error: ${outcome.message}\n\nPlease try running the SQL script manually in the Supabase SQL Editor.`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkTables = async () => {
    try {
      setIsLoading(true);
      setResult('Checking Supabase tables...');
      
      // Capture console logs during the check
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalConsoleLog(...args);
      };
      
      await checkSupabaseTables();
      
      // Restore console log
      console.log = originalConsoleLog;
      
      // Display the logs in the result
      setResult(logs.join('\n'));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Database Administration</Text>
          <Text style={styles.subtitle}>Manage Supabase tables</Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setSqlType('pets')}>
            <Text style={styles.buttonText}>Pets Table SQL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setSqlType('chat')}>
            <Text style={styles.buttonText}>Chat Tables SQL</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setSqlType('fixedChat')}>
            <Text style={styles.buttonText}>Fixed Chat Tables</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={runFixedScript}>
            <Text style={styles.buttonText}>Run Fixed Script</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={runSql}>
            <Text style={styles.buttonText}>Run SQL in Editor</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={checkTables}>
            <Text style={styles.buttonText}>Check Tables</Text>
          </TouchableOpacity>
        </View>
        
        {sqlType === 'fixedChat' && (
          <TextInput
            multiline
            editable={false}
            value={FIXED_CHAT_SQL}
            style={styles.sqlInput}
          />
        )}
        
        {sqlType !== 'fixedChat' && (
          <TextInput
            multiline
            value={sqlType === 'pets' ? PET_TABLE_SQL : CHAT_TABLES_SQL}
            onChangeText={text => sqlType === 'pets' ? setSqlValue(text) : setChatSqlValue(text)}
            style={styles.sqlInput}
          />
        )}
        
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />
        ) : (
          <ScrollView style={styles.resultContainer}>
            <Text style={styles.resultText}>{result}</Text>
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  instructions: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  codeScroll: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  codeContainer: {
    padding: 16,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sqlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  loading: {
    marginTop: 16,
  },
  resultContainer: {
    padding: 16,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SQLViewer; 