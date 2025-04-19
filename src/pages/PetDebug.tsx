import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  SafeAreaView,
  Button
} from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { checkPetSchemaMismatch } from '../utils/debugUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { forceSyncPetsToSupabase } from '../utils/petSync';

const FIX_SQL = `
-- Run this in the Supabase SQL Editor

-- First check if the column exists
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if the insurance_info column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pets'
    AND column_name = 'insurance_info'
  ) INTO column_exists;
  
  -- If column exists, drop it
  IF column_exists THEN
    RAISE NOTICE 'Found insurance_info column, dropping it...';
    ALTER TABLE public.pets DROP COLUMN insurance_info;
    RAISE NOTICE 'Successfully removed insurance_info column from pets table!';
  ELSE
    RAISE NOTICE 'No insurance_info column found in pets table, no action needed.';
  END IF;
END $$;
`;

const PetDebug: React.FC = () => {
  const { colors } = useAppColors();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    setLogs(['Starting diagnostics...']);
    
    try {
      // Override console.log to capture output
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        setLogs(prev => [...prev, args.join(' ')]);
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        setLogs(prev => [...prev, `ERROR: ${args.join(' ')}`]);
      };
      
      // Run the diagnostics
      await checkPetSchemaMismatch();
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      setLogs(prev => [...prev, 'Diagnostics complete']);
    } catch (error) {
      setLogs(prev => [...prev, `Error running diagnostics: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyFixSQL = async () => {
    await Clipboard.setStringAsync(FIX_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSyncPets = async () => {
    setLogs(['Starting pet synchronization...']);
    setIsLoading(true);
    
    try {
      const syncResult = await forceSyncPetsToSupabase();
      addLog(`Pet sync result: ${syncResult.success ? 'SUCCESS' : 'PARTIAL/FAILURE'}`);
      addLog(`Total pets: ${syncResult.totalPets}, Synced: ${syncResult.syncedPets}`);
      
      if (syncResult.errors.length > 0) {
        addLog('Sync errors:');
        syncResult.errors.forEach(err => {
          addLog(`  - Pet ${err.petId}: ${err.error}`);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error syncing pets: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Pet Database Diagnostics
        </Text>
      </View>
      
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runDiagnostics}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run Schema Diagnostics</Text>
          )}
        </TouchableOpacity>
        
        <View style={[styles.sqlContainer, { backgroundColor: colors.card }]}>
          <View style={styles.sqlHeader}>
            <Text style={[styles.sqlTitle, { color: colors.text }]}>SQL Fix</Text>
            <TouchableOpacity onPress={copyFixSQL} style={styles.copyButton}>
              <Ionicons 
                name={copied ? "checkmark" : "copy-outline"} 
                size={20} 
                color={colors.text} 
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sqlContent}>
            <Text style={[styles.sqlText, { color: colors.text }]}>{FIX_SQL}</Text>
          </ScrollView>
        </View>
        
        <ScrollView 
          style={[styles.logContainer, { backgroundColor: colors.card }]}
          contentContainerStyle={styles.logContent}
        >
          {logs.map((log, index) => (
            <Text key={index} style={[styles.logText, { color: colors.text }]}>
              {log}
            </Text>
          ))}
          {logs.length === 0 && (
            <Text style={[styles.placeholderText, { color: colors.text }]}>
              Run diagnostics to see results here
            </Text>
          )}
        </ScrollView>

        <Button 
          title="Force Sync Pets" 
          onPress={runSyncPets} 
          color="#ff9800"
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sqlContainer: {
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 200,
  },
  sqlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  sqlTitle: {
    fontWeight: 'bold',
  },
  copyButton: {
    padding: 8,
  },
  sqlContent: {
    padding: 8,
  },
  sqlText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  logContainer: {
    flex: 1,
    borderRadius: 8,
  },
  logContent: {
    padding: 8,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  placeholderText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PetDebug; 