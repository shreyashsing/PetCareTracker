import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSupabaseClient } from '../services/supabase';
import { getPets } from '../repositories/petRepository';
import { useAuth } from '../contexts/AuthContext';
import { getLastSyncTime, saveLastSyncTime } from '../utils/syncStorage';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { supabaseUtil } from '../utils/supabaseUtil';
import { formatDate } from '../utils/dateUtils';

const PetSyncDebug = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [localPets, setLocalPets] = useState<any[]>([]);
  const [remotePets, setRemotePets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    const syncTime = await getLastSyncTime();
    setLastSyncTime(syncTime);
  };

  const log = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const loadLocalPets = async () => {
    try {
      log('Loading pets from local storage...');
      const pets = await getPets();
      setLocalPets(pets);
      log(`Found ${pets.length} pets in local storage.`);
      return pets;
    } catch (error) {
      log(`Error loading local pets: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  };

  const loadRemotePets = async () => {
    if (!user) {
      log('No user logged in. Cannot fetch remote pets.');
      return [];
    }

    try {
      log('Loading pets from Supabase...');
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }

      setRemotePets(data || []);
      log(`Found ${data?.length || 0} pets in Supabase.`);
      return data || [];
    } catch (error) {
      log(`Error loading remote pets: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  };

  const checkTableStructure = async () => {
    try {
      log('Checking pets table structure in Supabase...');
      const supabase = getSupabaseClient();
      
      // Get table information through Postgres introspection
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'pets');
      
      if (error) {
        throw error;
      }

      log(`Table structure: ${JSON.stringify(data)}`);
    } catch (error) {
      log(`Error checking table structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runDiagnostics = async () => {
    setIsLoading(true);
    clearLogs();
    log('Starting pet sync diagnostics...');
    
    try {
      // Check if Supabase is accessible
      log('Testing Supabase connection...');
      const supabase = getSupabaseClient();
      const { data: healthData, error: healthError } = await supabase.from('pets').select('count(*)');
      
      if (healthError) {
        log(`Supabase connection error: ${healthError.message}`);
      } else {
        log('Supabase connection successful');
      }

      // Load local and remote pets
      const local = await loadLocalPets();
      const remote = await loadRemotePets();

      // Compare pets
      if (local.length > 0 && remote.length > 0) {
        log('Comparing local and remote pets...');
        
        // Get pets in local but not in remote
        const localOnlyIds = local.filter(
          lp => !remote.some(rp => rp.id === lp.id)
        ).map(p => p.id);
        
        if (localOnlyIds.length > 0) {
          log(`Pets in local storage but not in Supabase: ${localOnlyIds.join(', ')}`);
        } else {
          log('All local pets exist in Supabase.');
        }
        
        // Get pets in remote but not in local
        const remoteOnlyIds = remote.filter(
          rp => !local.some(lp => lp.id === rp.id)
        ).map(p => p.id);
        
        if (remoteOnlyIds.length > 0) {
          log(`Pets in Supabase but not in local storage: ${remoteOnlyIds.join(', ')}`);
        } else {
          log('All Supabase pets exist in local storage.');
        }
      }
      
      // Save current time as last sync check
      const now = new Date().toISOString();
      await saveLastSyncTime(now);
      setLastSyncTime(now);
      log('Diagnostics completed. Last sync time updated.');
      
    } catch (error) {
      log(`Diagnostics error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const forceSync = async () => {
    setIsLoading(true);
    log('Forcing sync of local pets to Supabase...');
    
    try {
      const local = await loadLocalPets();
      
      if (!user) {
        log('No user logged in. Cannot sync to Supabase.');
        return;
      }
      
      if (local.length === 0) {
        log('No local pets to sync.');
        return;
      }
      
      const supabase = getSupabaseClient();
      
      for (const pet of local) {
        log(`Syncing pet: ${pet.name} (${pet.id})`);
        
        // Ensure pet has user_id
        const petWithUserId = {
          ...pet,
          user_id: user.id,
        };
        
        // Convert any dates to ISO strings
        const preparedPet = supabaseUtil.prepareObjectForSupabase(petWithUserId);
        
        const { data, error } = await supabase
          .from('pets')
          .upsert(preparedPet, { onConflict: 'id' })
          .select();
        
        if (error) {
          log(`Error syncing pet ${pet.name}: ${error.message}`);
        } else {
          log(`Successfully synced pet: ${pet.name}`);
        }
      }
      
      // Update last sync time
      const now = new Date().toISOString();
      await saveLastSyncTime(now);
      setLastSyncTime(now);
      
      // Reload remote pets to show updated state
      await loadRemotePets();
      
      log('Sync completed');
    } catch (error) {
      log(`Sync error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pet Sync Debug</Text>
        {lastSyncTime && (
          <Text style={styles.subtitle}>
            Last sync check: {formatDate(new Date(lastSyncTime))}
          </Text>
        )}
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Run Diagnostics" 
          onPress={runDiagnostics} 
          loading={isLoading}
          style={styles.button}
        />
        <Button 
          title="Force Sync to Supabase" 
          onPress={forceSync} 
          loading={isLoading}
          style={styles.button}
        />
        <Button 
          title="Check Table Structure" 
          onPress={checkTableStructure} 
          loading={isLoading}
          style={styles.button}
        />
      </View>
      
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <Text style={styles.cardTitle}>Local Storage</Text>
          <Text>{localPets.length} pets</Text>
        </Card>
        <Card style={styles.statsCard}>
          <Text style={styles.cardTitle}>Supabase</Text>
          <Text>{remotePets.length} pets</Text>
        </Card>
      </View>
      
      <Card style={styles.logContainer}>
        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Logs</Text>
          <TouchableOpacity onPress={clearLogs}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logEntry}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyLog}>No logs yet. Run diagnostics to see results.</Text>
          )}
        </ScrollView>
      </Card>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  button: {
    marginRight: 8,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logContainer: {
    flex: 1,
    padding: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearButton: {
    color: 'blue',
  },
  logScroll: {
    flex: 1,
  },
  logEntry: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  emptyLog: {
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default PetSyncDebug; 