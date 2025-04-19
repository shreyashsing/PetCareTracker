import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { checkSupabaseTables } from '../utils/debugUtils';
import { createPetsTable } from '../utils/supabaseTools';
import { runMigrationsToEnsureTablesExist } from '../services/db/migrations';
import { useAuth } from '../contexts/AuthContext';

/**
 * A component to help users set up their Supabase tables
 */
const SupabaseSetup: React.FC<any> = ({ navigation }) => {
  const { colors } = useAppColors();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  // Setup console log interceptor to capture logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      originalConsoleLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setLog(prev => [...prev, `LOG: ${message}`]);
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setLog(prev => [...prev, `ERROR: ${message}`]);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  const checkTables = async () => {
    setLoading(true);
    setStatus('Checking Supabase tables...');
    setLog([]);
    
    try {
      await checkSupabaseTables();
      setStatus('Check complete. See logs for details.');
    } catch (error) {
      console.error('Error checking tables:', error);
      setStatus('Error checking tables. See logs for details.');
    } finally {
      setLoading(false);
    }
  };

  const createTables = async () => {
    setLoading(true);
    setStatus('Attempting to create tables...');
    setLog([]);
    
    try {
      const result = await createPetsTable();
      setStatus(`Create table result: ${result.message}`);
      
      if (!result.success) {
        Alert.alert(
          'Manual Setup Required',
          'You need to create the tables manually in Supabase. Would you like to open the SQL script in a text viewer?',
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'View SQL',
              onPress: () => navigation.navigate('SQLViewer', { scriptType: 'pets' })
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating tables:', error);
      setStatus('Error creating tables. See logs for details.');
    } finally {
      setLoading(false);
    }
  };

  const runMigrations = async () => {
    setLoading(true);
    setStatus('Running migrations...');
    setLog([]);
    
    try {
      const result = await runMigrationsToEnsureTablesExist();
      setStatus(`Migrations completed: ${result ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Error running migrations:', error);
      setStatus('Error running migrations. See logs for details.');
    } finally {
      setLoading(false);
    }
  };

  const openSupabaseDashboard = () => {
    Linking.openURL('https://app.supabase.io/');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Supabase Setup</Text>
      
      {!user && (
        <View style={[styles.warningCard, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.warningText, { color: colors.error }]}>
            You need to be logged in to set up Supabase tables
          </Text>
        </View>
      )}
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Setup Tools</Text>
        <Text style={[styles.description, { color: colors.text + '99' }]}>
          Use these tools to check and set up your Supabase database tables
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={checkTables}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Check Tables
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.secondary }]}
            onPress={createTables}
            disabled={loading || !user}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Create Tables
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={runMigrations}
            disabled={loading || !user}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Run Migrations
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.text + '30' }]}
            onPress={openSupabaseDashboard}
            disabled={loading}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Open Supabase Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Status</Text>
        {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}
        {status && (
          <Text style={[styles.statusText, { color: colors.text }]}>
            {status}
          </Text>
        )}
      </View>
      
      <View style={[styles.logCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Logs</Text>
        <ScrollView style={styles.logScroll}>
          {log.map((entry, index) => (
            <Text 
              key={index} 
              style={[
                styles.logEntry, 
                { 
                  color: entry.startsWith('ERROR') ? colors.error : colors.text + 'CC',
                  backgroundColor: entry.startsWith('ERROR') ? colors.error + '10' : 'transparent'
                }
              ]}
            >
              {entry}
            </Text>
          ))}
          {log.length === 0 && (
            <Text style={[styles.emptyLog, { color: colors.text + '80' }]}>
              Run a command to see logs
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 12,
  },
  statusText: {
    fontSize: 16,
    lineHeight: 24,
  },
  logCard: {
    borderRadius: 12,
    padding: 16,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logScroll: {
    flex: 1,
    marginTop: 8,
  },
  logEntry: {
    fontFamily: 'monospace',
    fontSize: 12,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  emptyLog: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  }
});

export default SupabaseSetup; 