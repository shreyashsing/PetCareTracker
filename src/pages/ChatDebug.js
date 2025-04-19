import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../services/supabase';
import { petAssistantService } from '../services/petAssistant';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ensurePetsTable, createTestPet } from '../utils/debugUtils';
import { diagnoseChatTables, getChatTablesSQLFix } from '../utils/chatDiagnostics';

const ChatDebug = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [tablesInfo, setTablesInfo] = useState({
    petsTable: { exists: false, columns: [] },
    sessionsTable: { exists: false, columns: [] },
    messagesTable: { exists: false, columns: [] },
  });
  const [petInfo, setPetInfo] = useState({
    count: 0,
    first: null
  });
  const [user, setUser] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      addLog('Got current user: ' + (data.user ? data.user.id : 'Not logged in'));
    };
    getUser();
  }, []);

  const addLog = (message) => {
    setLogs(prev => [...prev, { message, timestamp: new Date().toISOString() }]);
  };

  const checkTables = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Starting diagnostics...');

    try {
      // Run the chat tables diagnostics
      const results = await diagnoseChatTables();
      if (results.error) {
        addLog(`❌ Diagnostics error: ${results.error}`);
      } else {
        // Display diagnostic results
        Object.keys(results.tables).forEach(tableName => {
          const table = results.tables[tableName];
          addLog(`${table.exists ? '✅' : '❌'} ${tableName} table: ${table.exists ? 'exists' : 'not found'}`);
        });
        
        if (results.pets.count > 0) {
          addLog(`Found ${results.pets.count} pets in database`);
          if (results.pets.first) {
            addLog(`Sample pet: ${results.pets.first.name} (ID: ${results.pets.first.id})`);
            setPetInfo({
              count: results.pets.count,
              first: results.pets.first
            });
          }
        } else {
          addLog('❌ No pets found in database');
        }
        
        if (results.relationships.petForeignKeyWorks) {
          addLog('✅ Foreign key relationship between chat_sessions and pets is working');
        } else {
          addLog('❌ Foreign key relationship between chat_sessions and pets is NOT working');
        }
      }
    } catch (error) {
      addLog(`❌ Error running diagnostics: ${error.message}`);
      setErrorDetails(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const checkPetsTable = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Checking pets table...');
    
    try {
      const result = await ensurePetsTable();
      if (result) {
        addLog('✅ Pets table exists and is accessible');
      } else {
        addLog('❌ Pets table is missing or inaccessible');
        addLog('Check the console for SQL to create the table');
      }
      
      // Try to create a test pet if the user is logged in
      if (user && user.id) {
        addLog('Attempting to create a test pet...');
        const createResult = await createTestPet(user.id);
        
        if (createResult.success) {
          addLog(`✅ Successfully created test pet with ID: ${createResult.petId}`);
          
          // Try to delete the test pet
          const { error: deleteError } = await supabase
            .from('pets')
            .delete()
            .eq('id', createResult.petId);
          
          if (deleteError) {
            addLog(`⚠️ Could not delete test pet: ${deleteError.message}`);
          } else {
            addLog('Test pet deleted successfully');
          }
        } else {
          addLog(`❌ Failed to create test pet: ${createResult.error?.message || 'Unknown error'}`);
          if (createResult.error?.code) {
            addLog(`Error code: ${createResult.error.code}`);
          }
        }
      } else {
        addLog('⚠️ Not logged in, skipping test pet creation');
      }
    } catch (error) {
      addLog(`❌ Error checking pets table: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCreateSession = async () => {
    if (!user) {
      addLog('❌ You must be logged in to test session creation');
      return;
    }

    if (!petInfo.first) {
      addLog('❌ No pet found to test with. Please add a pet first.');
      return;
    }

    setLoading(true);
    addLog('Testing chat session creation...');

    try {
      // First, try using petAssistantService
      addLog('Attempting to create session using petAssistantService...');
      const sessionId = await petAssistantService.startNewSession(user.id, petInfo.first.id);
      
      if (sessionId) {
        addLog(`✅ Successfully created chat session with ID: ${sessionId}`);
        
        // Try to clean up
        addLog('Cleaning up test session...');
        await petAssistantService.deleteSession(sessionId);
        addLog('Test session deleted');
      } else {
        addLog('❌ Failed to create chat session using service');
        
        // Try direct creation as a fallback
        addLog('Attempting direct session creation...');
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            pet_id: petInfo.first.id,
            title: 'Debug Test Session',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (sessionError) {
          addLog(`❌ Error creating test chat session: ${sessionError.message}`);
          setErrorDetails(sessionError);
          
          if (sessionError.code === '23503') {
            addLog('🔍 Foreign key constraint error detected. The pet_id in chat_sessions must reference a valid pet id.');
            addLog('This usually happens when:');
            addLog('1. The pets table doesn\'t exist');
            addLog('2. The pet with the provided ID doesn\'t exist');
            addLog('3. The foreign key constraint is incorrectly defined');
          }
        } else {
          addLog(`✅ Direct session creation successful with ID: ${session.id}`);
          
          // Clean up
          const { error: deleteError } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', session.id);
          
          if (deleteError) {
            addLog(`⚠️ Warning: Could not delete test session: ${deleteError.message}`);
          } else {
            addLog('Test session deleted successfully');
          }
        }
      }
    } catch (error) {
      addLog(`❌ Unexpected error: ${error.message}`);
      setErrorDetails(error);
    } finally {
      setLoading(false);
    }
  };

  const traceSessionCreation = async () => {
    if (!user) {
      addLog('❌ You must be logged in to trace session creation');
      return;
    }

    if (!petInfo.first) {
      addLog('❌ No pet found to test with. Please add a pet first.');
      return;
    }

    setLoading(true);
    addLog('Tracing session creation process...');

    try {
      // 1. Verify pet exists
      addLog(`1. Verifying pet exists with ID: ${petInfo.first.id}`);
      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id, name, user_id')
        .eq('id', petInfo.first.id)
        .single();
      
      if (petError) {
        addLog(`❌ Could not verify pet: ${petError.message}`);
      } else {
        addLog(`✅ Pet verified: ${pet.name} (ID: ${pet.id}, User: ${pet.user_id})`);
        
        // Check if pet belongs to current user
        if (pet.user_id !== user.id) {
          addLog(`⚠️ Warning: Pet belongs to user ${pet.user_id}, not current user ${user.id}`);
        }
      }
      
      // 2. Check chat_sessions table structure - avoid using RPC/information_schema
      addLog('2. Checking chat_sessions table accessibility');
      
      // Simple check if the table exists by querying it
      const { data: sessionCheck, error: sessionCheckError } = await supabase
        .from('chat_sessions')
        .select('id')
        .limit(1);
      
      if (sessionCheckError) {
        if (sessionCheckError.code === '42P01') {
          addLog('❌ chat_sessions table does not exist');
          addLog('You need to create it using the SQL in migrations.ts');
        } else {
          addLog(`❌ Error accessing chat_sessions: ${sessionCheckError.message}`);
        }
      } else {
        addLog('✅ chat_sessions table exists and is accessible');
      }
      
      // 3. Attempt minimal session creation
      addLog('3. Attempting minimal session creation (without pet_id)');
      const { data: minSession, error: minSessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'Minimal Test Session',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (minSessionError) {
        addLog(`❌ Error creating minimal session: ${minSessionError.message}`);
      } else {
        addLog(`✅ Created minimal session with ID: ${minSession.id}`);
        
        // Try to create a session with pet_id
        addLog('4. Attempting full session creation (with pet_id)');
        const { data: fullSession, error: fullSessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            pet_id: petInfo.first.id,
            title: 'Full Test Session',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (fullSessionError) {
          addLog(`❌ Error creating full session: ${fullSessionError.message}`);
          setErrorDetails(fullSessionError);
          
          if (fullSessionError.code === '23503') {
            addLog(`
FOREIGN KEY CONSTRAINT ISSUE DETECTED:
- This means the foreign key from chat_sessions.pet_id to pets.id is not working
- Common causes:
  1. Different column types (non-UUID vs UUID)
  2. Incorrect constraint definition
  3. Pet ID doesn't exist in pets table
  
Try running this SQL to fix the constraint:
  
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_pet_id_fkey;
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_pet_id_fkey 
FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
            `);
          }
        } else {
          addLog(`✅ Created full session with ID: ${fullSession.id} and Pet ID: ${fullSession.pet_id}`);
          
          // Try to add a message to the session
          addLog('5. Testing message creation');
          const { data: message, error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              session_id: fullSession.id,
              user_id: user.id,  // Add user_id
              content: 'Test message',
              role: 'user',
              created_at: new Date().toISOString()  // Match the column name to created_at
            })
            .select()
            .single();
          
          if (messageError) {
            addLog(`❌ Error creating message: ${messageError.message}`);
          } else {
            addLog(`✅ Created test message with ID: ${message.id}`);
          }
          
          // Clean up
          addLog('6. Cleaning up test sessions');
          await supabase.from('chat_sessions').delete().eq('id', minSession.id);
          await supabase.from('chat_sessions').delete().eq('id', fullSession.id);
          addLog('Test sessions deleted');
        }
      }
    } catch (error) {
      addLog(`❌ Unexpected error during tracing: ${error.message}`);
      setErrorDetails(error);
    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Running full diagnostics...');
    
    try {
      // First check the pets table
      await checkPetsTable();
      
      // Then check the chat tables
      await checkTables();
      
      // Finally try creating a session
      if (petInfo.first) {
        await testCreateSession();
      } else {
        addLog('⚠️ Cannot test session creation - no pets found');
      }
      
      addLog('Full diagnostics completed');
    } catch (error) {
      addLog(`❌ Error in full diagnostics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderLogItem = ({ item, index }) => {
    // Format timestamp to show time only
    const timestamp = new Date(item.timestamp).toLocaleTimeString();
    return (
      <View style={styles.logItem} key={index}>
        <Text style={styles.logTime}>{timestamp}</Text>
        <Text style={styles.logText}>{item.message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat System Diagnostics</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={checkPetsTable}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Pets Table</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={checkTables}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Chat Tables</Text>
          </TouchableOpacity>
          
          {petInfo.first && (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={testCreateSession}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Test Create Session</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.fullWidthButton, loading && styles.buttonDisabled]}
            onPress={runFullDiagnostics}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Run Full Diagnostics</Text>
          </TouchableOpacity>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Running diagnostics...</Text>
          </View>
        )}
        
        <View style={styles.logsContainer}>
          <Text style={styles.sectionTitle}>Diagnostic Logs</Text>
          {logs.map((log, index) => renderLogItem({ item: log, index }))}
          
          {logs.length === 0 && !loading && (
            <Text style={styles.emptyText}>Run a diagnostic to see results</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  fullWidthButton: {
    width: '100%',
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 6,
  },
  logTime: {
    color: '#999',
    fontSize: 12,
    marginRight: 8,
    width: 80,
  },
  logText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default ChatDebug; 