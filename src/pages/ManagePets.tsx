import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { useActivePet } from '../hooks/useActivePet';
import { Pet } from '../types/components';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

type ManagePetsScreenProps = NativeStackScreenProps<RootStackParamList, 'ManagePets'>;

const ManagePets: React.FC<ManagePetsScreenProps> = ({ navigation }) => {
  const { colors } = useAppColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activePetId, setActivePetId } = useActivePet();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      setIsLoading(true);
      if (!user) {
        console.error('No user logged in');
        setPets([]);
        setIsLoading(false);
        return;
      }
      
      // Get all pets and filter by current user's ID
      const allPets = await unifiedDatabaseManager.pets.getAll();
      const userPets = allPets.filter(pet => pet.userId === user.id);
      setPets(userPets);
    } catch (error) {
      console.error('Error loading pets:', error);
      Alert.alert('Error', 'Failed to load pets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPet = (pet: Pet) => {
    navigation.navigate('EditPet', { petId: pet.id });
  };

  const handleDeletePet = (pet: Pet) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to delete ${pet.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete pet from local database
              await unifiedDatabaseManager.pets.delete(pet.id);
              
              // Also delete pet from Supabase
              const { error } = await supabase
                .from('pets')
                .delete()
                .eq('id', pet.id);
                
              if (error) {
                console.error('Error deleting pet from Supabase:', error);
                // Continue even if Supabase delete fails - we've already deleted from local storage
              } else {
                console.log('Pet successfully deleted from Supabase');
              }
              
              // If this was the active pet, clear the active pet
              if (activePetId === pet.id) {
                await AsyncStorageService.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
                setActivePetId(null);
              }
              
              // Update the UI by filtering out the deleted pet
              setPets(currentPets => currentPets.filter(p => p.id !== pet.id));
              
              // Show success message
              Alert.alert('Success', `${pet.name} has been deleted.`);
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'There was an error deleting the pet. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSetActivePet = async (pet: Pet) => {
    try {
      // First update in AsyncStorage
      await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, pet.id);
      
      // Then update in context
      setActivePetId(pet.id);
      
      // Show success message
      Alert.alert('Success', `${pet.name} is now your active pet.`);
      
      // Brief delay to ensure AsyncStorage update completes
      setTimeout(() => {
        // Navigate to the Home screen to see the updated pet
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }, 100);
    } catch (error) {
      console.error('Error setting active pet:', error);
      Alert.alert('Error', 'There was an error setting the active pet. Please try again.');
    }
  };

  const handleAddPet = () => {
    navigation.navigate('AddPet');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const renderPetItem = ({ item }: { item: Pet }) => {
    return (
      <View style={[styles.petCard, { backgroundColor: colors.card }]}>
        <View style={styles.petHeader}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.petImage} />
          ) : (
            <View style={[styles.petImagePlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.petImageText, { color: colors.primary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.petInfo}>
            <Text style={[styles.petName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.petBreed, { color: colors.text + '80' }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.breed}
            </Text>
            <View style={styles.statusContainer}>
              {activePetId === item.id && (
                <View style={[styles.activeTag, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeTagText, { color: colors.primary }]}>Active</Text>
                </View>
              )}
              <View style={[styles.statusTag, { 
                backgroundColor: 
                  item.status === 'healthy' ? '#4CAF5020' :
                  item.status === 'ill' ? '#F4433620' :
                  item.status === 'recovering' ? '#FFC10720' : '#E0E0E020'
              }]}>
                <Text style={[styles.statusTagText, { 
                  color: 
                    item.status === 'healthy' ? '#4CAF50' :
                    item.status === 'ill' ? '#F44336' :
                    item.status === 'recovering' ? '#FFC107' : '#9E9E9E'
                }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          {activePetId !== item.id && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]} 
              onPress={() => handleSetActivePet(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionButtonText}>Set Active</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.secondary }]} 
            onPress={() => handleEditPet(item)}
          >
            <Ionicons name="create-outline" size={18} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#F44336' }]} 
            onPress={() => handleDeletePet(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#fff" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right
    }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Pets</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPet}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading pets...</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="paw" size={80} color={colors.primary + '30'} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pets Yet</Text>
          <Text style={[styles.emptyDescription, { color: colors.text + '80' }]}>
            Add your first pet to get started with tracking their care
          </Text>
          <TouchableOpacity 
            style={[styles.addPetButton, { backgroundColor: colors.primary }]}
            onPress={handleAddPet}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.addPetButtonText}>Add Your First Pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.petList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!isLoading && pets.length > 0 && (
        <TouchableOpacity
          style={[styles.floatingAddButton, { backgroundColor: colors.primary }]}
          onPress={handleAddPet}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
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
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addPetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  petList: {
    padding: 16,
  },
  petCard: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImageText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  petInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petBreed: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  activeTagText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionIcon: {
    marginRight: 4,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});

export default ManagePets; 