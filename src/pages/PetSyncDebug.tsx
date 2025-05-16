import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import {unifiedDatabaseManager} from "../services/db";
import { useAuth } from '../providers/AuthProvider';
import { getLastSyncTime, saveLastSyncTime } from '../utils/syncStorage';
import { Button } from '../forms';
import { formatDate } from '../utils/helpers';

// Define types for pets
interface Pet {
  id: string;
  name: string;
  user_id?: string;
  [key: string]: any;
}

const PetSyncDebug = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [localPets, setLocalPets] = useState<Pet[]>([]);
  const [remotePets, setRemotePets] = useState<Pet[]>([]);
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

  const loadLocalPets = async (): Promise<Pet[]> => {
    try {
      log('Loading pets from local storage...');
      const pets = await unifiedDatabaseManager.pets.getAll();
      setLocalPets(pets);
      log(`Found ${pets.length} pets in local storage.`);
      return pets;
    } catch (error) {
      log(`Error loading local pets: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  };

  const loadRemotePets = async (): Promise<Pet[]> => {
    if (!user) {
      log('No user logged in. Cannot fetch remote pets.');
      return [];
    }

    try {
      log('Loading pets from Supabase...');
      
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
          (lp: Pet) => !remote.some((rp: Pet) => rp.id === lp.id)
        ).map((p: Pet) => p.id);
        
        if (localOnlyIds.length > 0) {
          log(`Pets in local storage but not in Supabase: ${localOnlyIds.join(', ')}`);
        } else {
          log('All local pets exist in Supabase.');
        }
        
        // Get pets in remote but not in local
        const remoteOnlyIds = remote.filter(
          (rp: Pet) => !local.some((lp: Pet) => lp.id === rp.id)
        ).map((p: Pet) => p.id);
        
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
      
      for (const pet of local) {
        log(`Syncing pet: ${pet.name} (${pet.id})`);
        
        // Ensure pet has user_id
        const petWithUserId = {
          ...pet,
          user_id: user.id,
        };
        
        // Convert any dates to ISO strings
        const preparedPet = prepareObjectForSupabase(petWithUserId);
        
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
      
      // Reload remote pets to show changes
      await loadRemotePets();
      log('Sync completed.');
      
      // Save current time as last sync
      const now = new Date().toISOString();
      await saveLastSyncTime(now);
      setLastSyncTime(now);
      
    } catch (error) {
      log(`Force sync error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to prepare object for Supabase
  const prepareObjectForSupabase = (obj: any): any => {
    const prepared: any = { ...obj };
    
    // Convert dates to ISO strings
    Object.keys(prepared).forEach(key => {
      if (prepared[key] instanceof Date) {
        prepared[key] = prepared[key].toISOString();
      }
    });
    
    return prepared;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Pet Sync Diagnostics</Text>
          {lastSyncTime && (
            <Text style={styles.subtitle}>
              Last synced: {formatDate(new Date(lastSyncTime))}
            </Text>
          )}
        </View>
        
        <View style={styles.actionsContainer}>
          <Button
            title="Run Diagnostics"
            onPress={runDiagnostics}
            isLoading={isLoading}
            style={{ marginRight: 8, marginBottom: 8 }}
          />
          
          <Button
            title="Force Sync to Supabase"
            onPress={forceSync}
            isLoading={isLoading}
            style={{ marginRight: 8, marginBottom: 8 }}
          />
          
          <Button
            title="Check Table Structure"
            onPress={checkTableStructure}
            isLoading={isLoading}
            style={{ marginRight: 8, marginBottom: 8 }}
          />
        </View>
        
        <View style={styles.petInfoContainer}>
          <View style={styles.petCountContainer}>
            <View style={styles.petCountCard}>
              <Text style={styles.petCountLabel}>Local Pets</Text>
              <Text style={styles.petCount}>{localPets.length}</Text>
            </View>
            
            <View style={styles.petCountCard}>
              <Text style={styles.petCountLabel}>Remote Pets</Text>
              <Text style={styles.petCount}>{remotePets.length}</Text>
            </View>
          </View>
          
          <View style={styles.petsContainer}>
            <Text style={styles.sectionTitle}>Local Pets</Text>
            {localPets.map(pet => (
              <View key={pet.id} style={styles.petCard}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petId}>ID: {pet.id}</Text>
              </View>
            ))}
            
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Remote Pets</Text>
            {remotePets.map(pet => (
              <View key={pet.id} style={styles.petCard}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petId}>ID: {pet.id}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.logsContainer}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
            <Text style={styles.clearButtonText}>Clear Logs</Text>
          </TouchableOpacity>
          
          {logs.map((log, index) => (
            <Text key={index} style={styles.logItem}>{log}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  petInfoContainer: {
    marginBottom: 16,
  },
  petCountContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  petCountCard: {
    flex: 1,
    padding: 16,
    marginRight: 8,
  },
  petCountLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  petCount: {
    fontSize: 16,
  },
  petsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  petCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 8,
  },
  petName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petId: {
    fontSize: 12,
    color: '#666',
  },
  logsContainer: {
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 4,
  },
  clearButtonText: {
    color: 'blue',
    fontSize: 12,
  },
  logItem: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default PetSyncDebug; 