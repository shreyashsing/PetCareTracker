import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { Pet, PetTable, petToDbFormat, dbFormatToPet } from '../types/pet';
import { saveLastSyncTime } from './syncStorage';
import { formatDateForSupabase } from './dateUtils';
import { getUser } from '../services/auth';

const KEYS = {
  PETS: 'pets',
};

interface SyncResult {
  success: boolean;
  totalPets: number;
  syncedPets: number;
  errors: Array<{ petId: string; error: string }>;
}

/**
 * Creates a properly formatted pet object for Supabase that matches the actual table schema
 * Only includes fields that exist in the Supabase pets table
 */
export function createPetForSupabase(pet: Pet): any {
  // Only include fields that actually exist in the Supabase schema
  return {
    id: pet.id,
    user_id: pet.userId,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    birth_date: pet.birthDate ? new Date(pet.birthDate).toISOString() : null,
    gender: pet.gender,
    weight: pet.weight || null,
    weight_unit: pet.weightUnit || null,
    microchipped: pet.microchipped || null,
    microchip_id: pet.microchipId || null,
    neutered: pet.neutered || null,
    adoption_date: pet.adoptionDate ? new Date(pet.adoptionDate).toISOString() : null,
    color: pet.color || null,
    image: pet.image || null,
    medical_conditions: pet.medicalConditions || [],
    allergies: pet.allergies || [],
    status: pet.status || 'healthy',
    created_at: new Date().toISOString()
  };
}

/**
 * Loads all pets from AsyncStorage
 */
export const loadLocalPets = async (): Promise<Pet[]> => {
  try {
    const petsJson = await AsyncStorage.getItem(KEYS.PETS);
    if (!petsJson) return [];
    return JSON.parse(petsJson);
  } catch (error) {
    console.error('Error loading local pets:', error);
    return [];
  }
};

/**
 * Loads all pets from Supabase for the current user
 */
export const loadRemotePets = async (): Promise<Pet[]> => {
  try {
    const user = await getUser();
    if (!user) {
      console.log('No authenticated user');
      return [];
    }

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error loading remote pets:', error);
      return [];
    }

    // Convert from DB format to Pet objects
    return (data || []).map(pet => dbFormatToPet(pet as PetTable));
  } catch (error) {
    console.error('Error loading remote pets:', error);
    return [];
  }
};

/**
 * Force synchronize all local pets to Supabase
 */
export const forceSyncPetsToSupabase = async (): Promise<SyncResult> => {
  const result: SyncResult = {
    success: false,
    totalPets: 0,
    syncedPets: 0,
    errors: [],
  };

  try {
    const user = await getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Load local pets
    const localPets = await loadLocalPets();
    result.totalPets = localPets.length;

    // Process each pet
    for (const pet of localPets) {
      try {
        // Convert pet to database format
        const petData = createPetForSupabase(pet);
        
        // Ensure user_id is set correctly
        petData.user_id = user.id;

        // Check if pet already exists in Supabase
        const { data: existingPet, error: checkError } = await supabase
          .from('pets')
          .select('id')
          .eq('id', pet.id)
          .eq('user_id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
          throw new Error(`Error checking pet existence: ${checkError.message}`);
        }

        // Update or insert based on existence
        if (existingPet) {
          // Update existing pet
          const { error: updateError } = await supabase
            .from('pets')
            .update(petData)
            .eq('id', pet.id)
            .eq('user_id', user.id);

          if (updateError) {
            throw new Error(`Error updating pet: ${updateError.message}`);
          }
        } else {
          // Insert new pet
          const { error: insertError } = await supabase
            .from('pets')
            .insert([petData]);

          if (insertError) {
            throw new Error(`Error inserting pet: ${insertError.message}`);
          }
        }

        result.syncedPets++;
      } catch (petError) {
        const errorMessage = petError instanceof Error ? petError.message : 'Unknown error';
        result.errors.push({
          petId: pet.id,
          error: errorMessage,
        });
        console.error(`Error syncing pet ${pet.id}:`, petError);
      }
    }

    // Update sync time if at least one pet was synced
    if (result.syncedPets > 0) {
      await saveLastSyncTime(new Date().toISOString());
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    console.error('Error in forceSyncPetsToSupabase:', error);
    result.success = false;
    return result;
  }
};

/**
 * Checks if the pets table exists in Supabase
 */
export const checkPetsTableExists = async (): Promise<{ exists: boolean; error?: string }> => {
  try {
    // Try to query the pets table
    const { error } = await supabase
      .from('pets')
      .select('id')
      .limit(1);

    // If there's no error, the table exists
    if (!error) {
      return { exists: true };
    }

    // If the error is related to the table not existing
    if (error.code === '42P01') { // PostgreSQL code for undefined_table
      return { exists: false, error: 'Pets table does not exist' };
    }

    // Other errors might indicate permission issues
    return { exists: false, error: `Error checking pets table: ${error.message}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { exists: false, error: `Exception checking pets table: ${errorMessage}` };
  }
}; 