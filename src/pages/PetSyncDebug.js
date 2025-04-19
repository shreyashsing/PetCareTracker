import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../services/supabase';
import {
  checkPetsInSupabase,
  checkLocalPets,
  syncPetToSupabase,
  syncAllPetsToSupabase,
  addTestPetToSupabase
} from '../utils/fixPets';

const PetSyncDebug = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [localPets, setLocalPets] = useState([]);
  const [supabasePets, setSupabasePets] = useState([]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        addLog(`Current user: ${data.user ? data.user.id : 'Not logged in'}`);
      } catch (error) {
        addLog(`Error getting user: ${error.message}`);
      }
    };
    getUser();
  }, []);

  const addLog = (message) => {
    setLogs(prev => [...prev, { message, timestamp: new Date().toISOString() }]);
  };

  const checkPets = async () => {
    setLoading(true);
    setLogs([]);
    addLog('Checking pets in both AsyncStorage and Supabase...');

    try {
      // Check local pets
      const localResult = await checkLocalPets();
      if (localResult.success) {
        setLocalPets(localResult.data || []);
        addLog(`Found ${localResult.data.length} pets in AsyncStorage`);
      } else {
        addLog(`Error checking local pets: ${localResult.error}`);
      }

      // Check Supabase pets
      const supabaseResult = await checkPetsInSupabase();
      if (supabaseResult.success) {
        setSupabasePets(supabaseResult.data || []);
        addLog(`Found ${supabaseResult.data.length} pets in Supabase`);
      } else {
        addLog(`Error checking Supabase pets: ${supabaseResult.error}`);
      }
    } catch (error) {
      addLog(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncAll = async () => {
    setLoading(true);
    addLog('Syncing all pets to Supabase...');

    try {
      const result = await syncAllPetsToSupabase();
      if (result.success) {
        addLog(`Sync complete. ${result.data.filter(r => r.success).length}/${result.data.length} pets synced successfully.`);
        // Refresh the list
        await checkPets();
      } else {
        addLog(`Error syncing pets: ${result.error}`);
      }
    } catch (error) {
      addLog(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addTestPet = async () => {
    if (!user) {
      addLog('You must be logged in to add a test pet');
      return;
    }

    setLoading(true);
    addLog('Adding test pet to Supabase...');

    try {
      const result = await addTestPetToSupabase(user.id);
      if (result.success) {
        addLog(`Test pet added successfully: ${result.data.name} (ID: ${result.data.id})`);
        // Refresh the list
        await checkPets();
      } else {
        addLog(`Error adding test pet: ${result.error}`);
      }
    } catch (error) {
      addLog(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPetList = (title, pets, source) => {
    return (
      <View style={styles.petListContainer}>
        <Text style={styles.petListTitle}>{title} ({pets.length})</Text>
        {pets.length === 0 ? (
          <Text style={styles.emptyMessage}>No pets found</Text>
        ) : (
          pets.map((pet, index) => (
            <View key={`${source}-${pet.id || index}`} style={styles.petItem}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petInfo}>ID: {pet.id}</Text>
              <Text style={styles.petInfo}>Type: {pet.type}</Text>
              <Text style={styles.petInfo}>User ID: {source === 'local' ? pet.userId : pet.user_id}</Text>
              
              {source === 'local' && (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={async () => {
                    setLoading(true);
                    addLog(`Syncing pet ${pet.name} (${pet.id}) to Supabase...`);
                    try {
                      const result = await syncPetToSupabase(pet.id);
                      if (result.success) {
                        addLog(`Successfully synced ${pet.name} to Supabase`);
                        await checkPets();
                      } else {
                        addLog(`Error syncing pet: ${result.error}`);
                      }
                    } catch (error) {
                      addLog(`Unexpected error: ${error.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={styles.syncButtonText}>Sync to Supabase</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pet Sync Diagnostic</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={checkPets}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Check Pets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={syncAll}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Sync All to Supabase</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.fullWidthButton, loading && styles.buttonDisabled]}
              onPress={addTestPet}
              disabled={loading || !user}
            >
              <Text style={styles.buttonText}>Add Test Pet to Supabase</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}

          <View style={styles.petsContainer}>
            {renderPetList('Local Pets (AsyncStorage)', localPets, 'local')}
            {renderPetList('Supabase Pets', supabasePets, 'supabase')}
          </View>

          <View style={styles.logsContainer}>
            <Text style={styles.sectionTitle}>Logs</Text>
            {logs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logText}>{log.message}</Text>
              </View>
            ))}
            {logs.length === 0 && (
              <Text style={styles.emptyMessage}>No logs yet. Run a diagnostic.</Text>
            )}
          </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  buttonContainer: {
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
  petsContainer: {
    marginBottom: 16,
  },
  petListContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  petListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  petItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  petInfo: {
    fontSize: 14,
    color: '#666',
  },
  syncButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  logsContainer: {
    backgroundColor: 'white',
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
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
});

export default PetSyncDebug; 