import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useAppColors } from '../hooks/useAppColors';
import { forceSyncPetsToSupabase, loadLocalPets, loadRemotePets, checkPetsTableExists, PetData } from '../utils/petSync';
import { Pet } from '../types/pet';
import { getLastSyncTime } from '../utils/syncStorage';
import { formatDateForDisplay } from '../utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';

const PetSync: React.FC = () => {
  const { colors } = useAppColors();
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const [localPets, setLocalPets] = useState<PetData[]>([]);
  const [remotePets, setRemotePets] = useState<PetData[]>([]);
  const [tableStatus, setTableStatus] = useState<{exists: boolean; error?: string}>({exists: false});

  // Helper function to add logs
  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setLogs(['Loading data...']);
    
    try {
      // Check if pets table exists in Supabase
      const tableExists = await checkPetsTableExists();
      setTableStatus(tableExists);
      addLog(`Pets table exists: ${tableExists.exists}`);
      if (tableExists.error) {
        addLog(`Table check error: ${tableExists.error}`);
      }
      
      // Load local pets
      const pets = await loadLocalPets();
      setLocalPets(pets);
      addLog(`Loaded ${pets.length} local pets`);
      
      // Only load remote pets if table exists
      if (tableExists.exists) {
        const remPets = await loadRemotePets();
        setRemotePets(remPets);
        addLog(`Loaded ${remPets.length} remote pets`);
      }
      
      // Get last sync time
      const syncTime = await getLastSyncTime();
      setLastSyncTime(syncTime);
      addLog(`Last sync: ${syncTime ? formatDateForDisplay(syncTime, true) : 'Never'}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error loading data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const runSync = async () => {
    setIsLoading(true);
    setLogs(['Starting pet synchronization...']);
    
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
      
      // Reload data after sync
      await loadInitialData();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Error syncing pets: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if a pet exists in remote
  const isPetSynced = (pet: PetData): boolean => {
    return remotePets.some(remotePet => remotePet.id === pet.id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Pet Synchronization
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={[styles.infoContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Last sync: {lastSyncTime ? formatDateForDisplay(lastSyncTime, true) : 'Never'}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Supabase table: {tableStatus.exists ? 'Available' : 'Not available'}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Local pets: {localPets.length}
          </Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Remote pets: {remotePets.length}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runSync}
          disabled={isLoading || !tableStatus.exists}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sync Pets to Supabase</Text>
          )}
        </TouchableOpacity>
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Local Pets
        </Text>
        
        <ScrollView 
          style={styles.petsContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          {localPets.map((pet) => (
            <View key={pet.id} style={[styles.petItem, { backgroundColor: colors.card }]}>
              <View style={styles.petInfo}>
                <Text style={[styles.petName, { color: colors.text }]}>{pet.name}</Text>
                <Text style={[styles.petBreed, { color: colors.placeholder }]}>
                  {pet.type} / {pet.breed}
                </Text>
              </View>
              <View style={styles.syncStatus}>
                {isPetSynced(pet) ? (
                  <Ionicons name="cloud-done" size={24} color="green" />
                ) : (
                  <Ionicons name="cloud-offline" size={24} color="orange" />
                )}
              </View>
            </View>
          ))}
          
          {localPets.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>
              No pets found in local storage
            </Text>
          )}
        </ScrollView>
        
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Sync Logs
        </Text>
        
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
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>
              No sync logs yet
            </Text>
          )}
        </ScrollView>
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
  infoContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    marginBottom: 8,
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  petsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  petItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  petBreed: {
    fontSize: 14,
  },
  syncStatus: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
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
  emptyText: {
    padding: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PetSync; 