import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { unifiedDatabaseManager } from '../services/db';
import { Pet } from '../types/components';
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

// Define a more comprehensive Pet interface that includes all possible properties
export interface PetData {
  id: string;
  name: string;
  type: string;
  breed?: string;
  birthDate?: string;
  weight?: number;
  gender?: string;
  color?: string;
  microchipped?: boolean;
  microchipId?: string;
  notes?: string;
  image?: string;
  created_at?: string;
  updated_at?: string;
  userId?: string;
  adoptionDate?: string;
  [key: string]: any; // Allow for additional properties
}

/**
 * Converts a pet object to the format expected by Supabase
 * This handles the conversion between camelCase and snake_case fields
 * @param pet The pet object to convert
 * @returns A pet object formatted for Supabase
 */
export const createPetForSupabase = (pet: PetData): Record<string, any> => {
  // Create a new object with snake_case keys for Supabase
  const supabasePet: Record<string, any> = {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    breed: pet.breed || null,
    // Always provide a valid date for birth_date
    birth_date: pet.birthDate ? 
      (typeof pet.birthDate === 'string' ? pet.birthDate : formatDateForSupabase(pet.birthDate)) : 
      new Date().toISOString(),
    weight: pet.weight || null,
    gender: pet.gender || null,
    color: pet.color || null,
    microchipped: pet.microchipped || false,
    microchip_id: pet.microchipId || "", // Use empty string instead of null
    image: pet.image || null,
    user_id: pet.userId || null,
    // Always provide a valid date for adoption_date or use birth_date as fallback
    adoption_date: pet.adoptionDate ? 
      (typeof pet.adoptionDate === 'string' ? pet.adoptionDate : formatDateForSupabase(pet.adoptionDate)) : 
      (pet.birthDate ? 
        (typeof pet.birthDate === 'string' ? pet.birthDate : formatDateForSupabase(pet.birthDate)) : 
        new Date().toISOString())
  };

  return supabasePet;
};

/**
 * Loads all pets from AsyncStorage
 */
export const loadLocalPets = async (): Promise<PetData[]> => {
  try {
    const petsJson = await AsyncStorage.getItem(KEYS.PETS);
    if (!petsJson) return [];
    // Convert from Pet to PetData
    const pets = JSON.parse(petsJson) as Pet[];
    return pets.map(pet => convertPetToPetData(pet));
  } catch (error) {
    console.error('Error loading local pets:', error);
    return [];
  }
};

/**
 * Loads all pets from Supabase for the current user
 */
export const loadRemotePets = async (): Promise<PetData[]> => {
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

    // Convert from DB format to PetData objects
    return (data || []).map(pet => {
      const convertedPet = snakeToCamel<PetData>(pet);
      return convertedPet;
    });
  } catch (error) {
    console.error('Error loading remote pets:', error);
    return [];
  }
};

/**
 * Helper function to convert Pet to PetData
 */
const convertPetToPetData = (pet: Pet): PetData => {
  return {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    birthDate: pet.birthDate instanceof Date ? pet.birthDate.toISOString() : pet.birthDate,
    weight: pet.weight,
    gender: pet.gender,
    color: pet.color,
    microchipped: pet.microchipped || false,
    microchipId: pet.microchipId || "",
    image: pet.image,
    userId: pet.userId,
    adoptionDate: pet.adoptionDate instanceof Date ? pet.adoptionDate.toISOString() : pet.adoptionDate,
    // Add any additional fields needed
  };
};

/**
 * Helper function to convert PetData to Pet
 */
const convertPetDataToPet = (petData: PetData): Pet => {
  // Create a basic Pet object with required fields
  const pet: Partial<Pet> = {
    id: petData.id,
    name: petData.name,
    // Convert string type to the specific enum values expected by Pet
    type: convertToPetType(petData.type),
    breed: petData.breed,
    // Convert string birthDate to Date if needed
    birthDate: petData.birthDate ? new Date(petData.birthDate) : undefined,
    weight: petData.weight,
    // Convert string gender to the specific enum values expected by Pet
    gender: convertToGenderType(petData.gender),
    color: petData.color,
    microchipped: petData.microchipped || false,
    microchipId: petData.microchipId || "",
    image: petData.image,
    userId: petData.userId,
    // Convert adoption date to Date if it exists
    adoptionDate: petData.adoptionDate ? new Date(petData.adoptionDate) : undefined,
    // Add default values for required Pet properties
    weightUnit: 'kg',
    neutered: false,
    medicalConditions: [],
    allergies: [],
    status: 'healthy'
  };
  
  return pet as Pet;
};

/**
 * Helper function to convert string type to Pet type enum
 */
const convertToPetType = (type: string | undefined): "dog" | "cat" | "bird" | "rabbit" | "fish" | "reptile" | "small_mammal" | "other" | undefined => {
  if (!type) return undefined;
  
  // Check if the type is already one of the valid values
  const validTypes = ["dog", "cat", "bird", "rabbit", "fish", "reptile", "small_mammal", "other"];
  if (validTypes.includes(type)) {
    return type as "dog" | "cat" | "bird" | "rabbit" | "fish" | "reptile" | "small_mammal" | "other";
  }
  
  // Default to "other" if not a valid type
  return "other";
};

/**
 * Helper function to convert string gender to Pet gender enum
 */
const convertToGenderType = (gender: string | undefined): "male" | "female" | "unknown" | undefined => {
  if (!gender) return undefined;
  
  // Check if the gender is already one of the valid values
  if (gender === "male" || gender === "female" || gender === "unknown") {
    return gender as "male" | "female" | "unknown";
  }
  
  // Default to "unknown" if not a valid gender
  return "unknown";
};

/**
 * Synchronizes pets between local storage and Supabase
 * @param userId The user ID to sync pets for
 * @returns A promise that resolves when the sync is complete
 */
export const syncPetsWithSupabase = async (userId: string): Promise<void> => {
  try {
    console.log(`Syncing pets for user: ${userId}`);
    
    if (!userId) {
      console.error('No user ID provided for pet sync');
      return;
    }
    
    // Load pets from Supabase
    const { data: remotePets, error } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error loading pets from Supabase:', error);
      return;
    }
    
    // Load local pets
    const localPets = await unifiedDatabaseManager.pets.find(pet => pet.userId === userId);
    
    // Sync remote pets to local storage
    if (remotePets && remotePets.length > 0) {
      console.log(`Syncing ${remotePets.length} remote pets to local storage`);
      
      for (const remotePet of remotePets) {
        const localPet = localPets.find(p => p.id === remotePet.id);
        
        // Convert snake_case to camelCase
        const formattedPet = snakeToCamel<PetData>(remotePet);
        
        // Ensure userId is set correctly (for backward compatibility)
        formattedPet.userId = userId;
        
        // Convert PetData to Pet for local storage
        const petForStorage = convertPetDataToPet(formattedPet);
        
        if (localPet) {
          // Update local pet
          await unifiedDatabaseManager.pets.update(remotePet.id, petForStorage);
        } else {
          // Create new local pet
          await unifiedDatabaseManager.pets.create(petForStorage);
        }
      }
    }
    
    // Sync local pets to Supabase
    for (const localPet of localPets) {
      try {
        const remotePet = remotePets?.find(p => p.id === localPet.id);
        
        if (!remotePet) {
          console.log(`Syncing local pet ${localPet.id} to Supabase`);
          
          // Convert Pet to PetData
          const petDataForSupabase = convertPetToPetData(localPet);
          
          // Create pet in Supabase with proper validation
          const petData = createPetForSupabase(petDataForSupabase);
          
          // Ensure user_id is set correctly
          petData.user_id = userId;
          
          const { error: insertError } = await supabase.from('pets').insert([petData]);
          
          if (insertError) {
            console.error(`Error syncing pet ${localPet.id} to Supabase:`, insertError);
          } else {
            console.log(`Pet ${localPet.name} saved to Supabase successfully:`, petData);
          }
        } else {
          // Update existing pet in Supabase
          const petDataForSupabase = convertPetToPetData(localPet);
          const petData = createPetForSupabase(petDataForSupabase);
          petData.user_id = userId;
          
          const { error: updateError } = await supabase
            .from('pets')
            .update(petData)
            .eq('id', localPet.id);
            
          if (updateError) {
            console.error(`Error updating pet ${localPet.id} in Supabase:`, updateError);
          } else {
            console.log(`Pet ${localPet.name} updated in Supabase successfully:`, petData);
          }
        }
      } catch (petError) {
        console.error(`[ERROR TRACKING] Exception syncing pet ${localPet.id}:`, petError);
      }
    }
    
    console.log('Pet synchronization complete');
  } catch (error) {
    console.error('Error synchronizing pets:', error);
  }
};

/**
 * Converts snake_case object keys to camelCase
 * @param obj The object to convert
 * @returns A new object with camelCase keys
 */
export function snakeToCamel<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = obj[key];
      
      // Keep the original key for backward compatibility
      if (key.includes('_')) {
        result[key] = obj[key];
      }
    }
  }
  
  return result as T;
}

/**
 * Loads all pets for a specific user from both local storage and Supabase
 * This is a critical function used by multiple components
 */
export const loadPetsForUser = async (userId: string): Promise<PetData[]> => {
  // Ensure this function is properly exported
  try {
    if (!userId) {
      console.error('No user ID provided for loading pets');
      return [];
    }
    
    console.log(`Loading pets for user: ${userId}`);
    
    // Try to load from database manager first
    try {
      const localPets = await unifiedDatabaseManager.pets.find(pet => pet.userId === userId);
      console.log(`Found ${localPets.length} pets in local database`);
      
      // Convert from Pet to PetData and ensure all required fields are set
      return localPets.map(pet => {
        const petData = convertPetToPetData(pet);
        
        // Ensure dates are properly formatted
        if (!petData.birthDate) {
          petData.birthDate = new Date().toISOString();
        }
        
        if (!petData.microchipId) {
          petData.microchipId = "";
        }
        
        if (!petData.adoptionDate) {
          petData.adoptionDate = petData.birthDate;
        }
        
        return petData;
      });
    } catch (dbError) {
      console.error('Error loading from database manager:', dbError);
      
      // Fall back to loading from Supabase directly
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error loading pets from Supabase:', error);
        return [];
      }
      
      console.log(`Loaded ${data?.length || 0} pets from Supabase`);
      
      // Convert from DB format to PetData objects with validation
      return (data || []).map(pet => {
        const convertedPet = snakeToCamel<PetData>(pet);
        
        // Ensure dates are properly formatted
        if (!convertedPet.birthDate) {
          convertedPet.birthDate = new Date().toISOString();
        }
        
        if (!convertedPet.microchipId) {
          convertedPet.microchipId = "";
        }
        
        if (!convertedPet.adoptionDate) {
          convertedPet.adoptionDate = convertedPet.birthDate;
        }
        
        return convertedPet;
      });
    }
  } catch (error) {
    console.error('Error in loadPetsForUser:', error);
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