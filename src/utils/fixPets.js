import { supabase } from '../services/supabase';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { STORAGE_KEYS } from '../services/db/constants';
import { generateUUID } from './helpers';

/**
 * Check if any pets exist in Supabase and display information
 */
export async function checkPetsInSupabase() {
  console.log('Checking pets in Supabase...');
  
  try {
    // First check directly with Supabase
    const { data, error } = await supabase
      .from('pets')
      .select('*');
    
    if (error) {
      console.error('Error checking pets in Supabase:', error);
      return { success: false, error };
    }
    
    console.log(`Found ${data.length} pets in Supabase:`);
    data.forEach(pet => {
      console.log(`- ${pet.name} (ID: ${pet.id}, UserID: ${pet.user_id})`);
    });
    
    return { success: true, data };
  } catch (error) {
    console.error('Exception checking pets in Supabase:', error);
    return { success: false, error };
  }
}

/**
 * Check local pets in AsyncStorage
 */
export async function checkLocalPets() {
  console.log('Checking local pets in AsyncStorage...');
  
  try {
    const petsJson = await AsyncStorageService.getItem(STORAGE_KEYS.PETS);
    const pets = petsJson ? JSON.parse(petsJson) : [];
    
    console.log(`Found ${pets.length} pets in AsyncStorage:`);
    pets.forEach(pet => {
      console.log(`- ${pet.name} (ID: ${pet.id}, UserID: ${pet.userId})`);
    });
    
    return { success: true, data: pets };
  } catch (error) {
    console.error('Exception checking local pets:', error);
    return { success: false, error };
  }
}

/**
 * Sync a local pet from AsyncStorage to Supabase
 */
export async function syncPetToSupabase(petId) {
  console.log(`Attempting to sync pet ${petId} to Supabase...`);
  
  try {
    // First get the local pet
    const petsJson = await AsyncStorageService.getItem(STORAGE_KEYS.PETS);
    const pets = petsJson ? JSON.parse(petsJson) : [];
    
    const pet = pets.find(p => p.id === petId);
    if (!pet) {
      console.error(`No local pet found with ID: ${petId}`);
      return { success: false, error: 'Pet not found in local storage' };
    }
    
    console.log(`Found local pet: ${pet.name} (ID: ${pet.id})`);
    
    // Format dates correctly for Supabase
    const formattedPet = {
      id: pet.id,
      user_id: pet.userId,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      birth_date: pet.birthDate ? new Date(pet.birthDate).toISOString() : null,
      adoption_date: pet.adoptionDate ? new Date(pet.adoptionDate).toISOString() : null,
      gender: pet.gender,
      weight: pet.weight,
      weight_unit: pet.weightUnit,
      microchipped: pet.microchipped || false,
      microchip_id: pet.microchipId,
      neutered: pet.neutered || false,
      color: pet.color || '',
      image: pet.image,
      medical_conditions: Array.isArray(pet.medicalConditions) ? pet.medicalConditions : [],
      allergies: Array.isArray(pet.allergies) ? pet.allergies : [],
      status: pet.status || 'healthy',
      created_at: new Date().toISOString()
    };
    
    console.log('Formatted pet for Supabase:', JSON.stringify(formattedPet, null, 2));
    
    // Check if pet already exists in Supabase
    const { data: existingPet, error: checkError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', pet.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking if pet exists in Supabase:', checkError);
    }
    
    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('pets')
      .upsert([formattedPet])
      .select();
    
    if (error) {
      console.error('Error upserting pet to Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Successfully synced pet to Supabase:', data[0]);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception syncing pet to Supabase:', error);
    return { success: false, error };
  }
}

/**
 * Sync all local pets to Supabase
 */
export async function syncAllPetsToSupabase() {
  console.log('Syncing all local pets to Supabase...');
  
  try {
    // Get all local pets
    const localResult = await checkLocalPets();
    if (!localResult.success || !localResult.data || localResult.data.length === 0) {
      console.error('No local pets found to sync');
      return { success: false, error: 'No local pets found' };
    }
    
    // Sync each pet
    const results = [];
    for (const pet of localResult.data) {
      const result = await syncPetToSupabase(pet.id);
      results.push({ petId: pet.id, success: result.success });
    }
    
    console.log('Sync results:', results);
    return { success: true, data: results };
  } catch (error) {
    console.error('Exception syncing all pets:', error);
    return { success: false, error };
  }
}

/**
 * Add a test pet directly to Supabase (use only for testing)
 */
export async function addTestPetToSupabase(userId) {
  console.log(`Adding test pet for user ${userId}...`);
  
  try {
    const petId = generateUUID();
    const now = new Date();
    
    const testPet = {
      id: petId,
      user_id: userId,
      name: `Test Pet ${now.toISOString().split('T')[0]}`,
      type: 'dog',
      breed: 'Mixed Breed',
      birth_date: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()).toISOString(),
      gender: 'unknown',
      weight: 15,
      weight_unit: 'kg',
      microchipped: false,
      neutered: false,
      color: 'Brown',
      medical_conditions: [],
      allergies: [],
      status: 'healthy',
      created_at: now.toISOString()
    };
    
    const { data, error } = await supabase
      .from('pets')
      .insert([testPet])
      .select();
    
    if (error) {
      console.error('Error creating test pet:', error);
      return { success: false, error };
    }
    
    console.log('Test pet created successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Exception creating test pet:', error);
    return { success: false, error };
  }
} 