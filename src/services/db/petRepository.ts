import { Pet } from '../../types/components';
import { STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';
import { supabase, camelToSnake, snakeToCamel } from '../../services/supabase';
import { generateUUID } from '../../utils/helpers';
import { formatDateForSupabase } from '../../utils/dateUtils';
import { createPetForSupabase, PetData } from '../../utils/petSync';

/**
 * @deprecated Use unifiedDatabaseManager.pets instead. This repository is being phased out.
 * Repository for managing Pet entities
 */
export class PetRepository extends BaseRepository<Pet> {
  constructor() {
    super(STORAGE_KEYS.PETS);
  }

  /**
   * Override create method to save to both AsyncStorage and Supabase
   * @param pet Pet to create
   * @returns Created pet
   */
  async create(pet: Pet): Promise<Pet> {
    console.log('PetRepository.create called with pet:', JSON.stringify({
      id: pet.id,
      name: pet.name, 
      userId: pet.userId
    }));
    
    try {
      // First save to AsyncStorage (using parent implementation)
      await super.create(pet);
      console.log('Pet saved to AsyncStorage successfully');
      
      // Then try to save to Supabase using the correct schema structure
      try {
        // Convert Pet to PetData for Supabase compatibility
        const petForSupabase: PetData = {
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          birthDate: pet.birthDate instanceof Date ? pet.birthDate.toISOString() : pet.birthDate,
          weight: pet.weight,
          gender: pet.gender,
          color: pet.color,
          microchipped: pet.microchipped,
          microchipId: pet.microchipId,
          image: pet.image,
          userId: pet.userId
        };
        
        // Use the utility function to create Supabase-compatible pet data
        const petData = createPetForSupabase(petForSupabase);
        
        // Ensure user_id is set correctly
        if (!petData.user_id && pet.userId) {
          petData.user_id = pet.userId;
        }
        
        // If still no user_id, try to get from current auth
        if (!petData.user_id) {
          const { data } = await supabase.auth.getUser();
          if (data && data.user) {
            petData.user_id = data.user.id;
            
            // Also update the pet object for local storage
            pet.userId = data.user.id;
            await super.update(pet.id, pet);
          }
        }
        
        console.log('Attempting to save pet to Supabase:', JSON.stringify({
          id: petData.id,
          name: petData.name,
          user_id: petData.user_id
        }));
        
        const { data, error } = await supabase
          .from('pets')
          .insert([petData])
          .select()
          .single();
        
        if (error) {
          console.error('Error saving pet to Supabase:', error);
          // Still return the pet since it was saved locally
          return pet;
        }
        
        console.log('Pet saved to Supabase successfully:', data);
        
        // Update local pet with any server-generated fields
        const updatedPet = snakeToCamel<Pet>(data);
        
        // Handle user_id to userId conversion
        if (data.user_id && !updatedPet.userId) {
          updatedPet.userId = data.user_id;
        }
        
        // Update local storage with the complete data
        await super.update(pet.id, { ...pet, ...updatedPet });
        
        // Return the updated pet
        return { ...pet, ...updatedPet };
      } catch (supabaseError) {
        console.error('Exception saving pet to Supabase:', supabaseError);
        // Still return the pet since it was saved locally
        return pet;
      }
    } catch (error) {
      console.error('Error in PetRepository.create:', error);
      throw error;
    }
  }

  /**
   * Override update method to save to both AsyncStorage and Supabase
   * @param id Pet ID
   * @param update Pet data to update (partial)
   * @returns Updated pet
   */
  async update(id: string, update: Partial<Pet>): Promise<Pet | null> {
    console.log('PetRepository.update called for pet:', id);
    console.log('Update data received:', JSON.stringify(update, null, 2));
    
    try {
      // First update in AsyncStorage using parent method
      const updatedPet = await super.update(id, update);
      
      if (!updatedPet) {
        console.log('Pet not found in local storage');
        return null;
      }
      
      console.log('Pet updated in AsyncStorage successfully');
      
      // Then try to update in Supabase
      try {
        // Convert Pet to PetData for Supabase compatibility
        const petForSupabase: PetData = {
          id: updatedPet.id,
          name: updatedPet.name,
          type: updatedPet.type,
          breed: updatedPet.breed,
          birthDate: updatedPet.birthDate instanceof Date ? updatedPet.birthDate.toISOString() : updatedPet.birthDate,
          weight: updatedPet.weight,
          gender: updatedPet.gender,
          color: updatedPet.color,
          microchipped: updatedPet.microchipped,
          microchipId: updatedPet.microchipId,
          image: updatedPet.image,
          userId: updatedPet.userId
        };
        
        // Use the utility function to create Supabase-compatible pet data
        const petData = createPetForSupabase(petForSupabase);
        
        // Ensure user_id is set correctly
        if (!petData.user_id && updatedPet.userId) {
          petData.user_id = updatedPet.userId;
        }
        
        // If still no user_id, try to get from current auth
        if (!petData.user_id) {
          const { data } = await supabase.auth.getUser();
          if (data && data.user) {
            petData.user_id = data.user.id;
            
            // Also update the pet object for local storage
            const petWithUserId = { ...updatedPet, userId: data.user.id };
            await super.update(id, { userId: data.user.id });
          }
        }
        
        console.log('Attempting to update pet in Supabase:', JSON.stringify({
          id: petData.id,
          name: petData.name,
          user_id: petData.user_id
        }));
        
        const { data, error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating pet in Supabase:', error);
          
          // Check if the error is because the pet doesn't exist in Supabase
          if (error.code === 'PGRST116') {
            console.log('Pet not found in Supabase, attempting to insert instead');
            
            // Try to insert the pet instead
            const { data: insertData, error: insertError } = await supabase
              .from('pets')
              .insert([petData])
              .select()
              .single();
            
            if (insertError) {
              console.error('Error inserting pet in Supabase:', insertError);
              return updatedPet;
            }
            
            console.log('Pet inserted in Supabase successfully:', insertData);
            
            // Update local pet with any server-generated fields
            const supabasePet = snakeToCamel<Pet>(insertData);
            
            // Handle user_id to userId conversion
            if (insertData.user_id && !supabasePet.userId) {
              supabasePet.userId = insertData.user_id;
            }
            
            // Update local storage with the complete data
            const finalPet = { ...updatedPet, ...supabasePet };
            await super.update(id, finalPet);
            
            return finalPet;
          }
          
          // For other errors, just return the local pet
          return updatedPet;
        }
        
        console.log('Pet updated in Supabase successfully:', data);
        
        // Update local pet with any server-generated fields
        const supabasePet = snakeToCamel<Pet>(data);
        
        // Handle user_id to userId conversion
        if (data.user_id && !supabasePet.userId) {
          supabasePet.userId = data.user_id;
        }
        
        // Update local storage with the complete data if there are server changes
        const finalPet = { ...updatedPet, ...supabasePet };
        
        // Only update local storage again if there are actual changes from Supabase
        const hasServerChanges = JSON.stringify(updatedPet) !== JSON.stringify(finalPet);
        if (hasServerChanges) {
          await super.update(id, finalPet);
          return finalPet;
        }
        
        return updatedPet;
      } catch (supabaseError) {
        console.error('Exception updating pet in Supabase:', supabaseError);
        // Still return the pet since it was updated locally
        return updatedPet;
      }
    } catch (error) {
      console.error('Error in PetRepository.update:', error);
      throw error;
    }
  }

  /**
   * Find pets by user ID
   * @param userId User ID
   * @returns Array of pets belonging to the user
   */
  async findByUserId(userId: string): Promise<Pet[]> {
    // Try to get from Supabase first
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error(`Error fetching pets for user ${userId} from Supabase:`, error);
        // Fall back to local storage
        return this.find(pet => pet.userId === userId);
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} pets in Supabase for user ${userId}`);
        return snakeToCamel<Pet[]>(data);
      } else {
        console.log(`No pets found in Supabase for user ${userId}, checking local storage...`);
      }
    } catch (e) {
      console.error('Exception fetching pets from Supabase:', e);
    }
    
    // Fallback to local storage
    const localPets = await this.find(pet => pet.userId === userId);
    console.log(`Found ${localPets.length} pets in local storage for user ${userId}`);
    return localPets;
  }

  /**
   * Find pets by type
   * @param type Pet type
   * @returns Array of pets with the given type
   */
  async findByType(type: Pet['type']): Promise<Pet[]> {
    return this.find(pet => pet.type === type);
  }

  /**
   * Find pets by health status
   * @param status Health status
   * @returns Array of pets with the given status
   */
  async findByStatus(status: Pet['status']): Promise<Pet[]> {
    return this.find(pet => pet.status === status);
  }

  /**
   * Find pets with a specific health condition
   * @param condition Health condition to search for
   * @returns Array of pets with the given condition
   */
  async findByMedicalCondition(condition: string): Promise<Pet[]> {
    return this.find(pet => 
      pet.medicalConditions.some(c => 
        c.toLowerCase().includes(condition.toLowerCase())
      )
    );
  }

  /**
   * Find pets with a specific allergy
   * @param allergy Allergy to search for
   * @returns Array of pets with the given allergy
   */
  async findByAllergy(allergy: string): Promise<Pet[]> {
    return this.find(pet => 
      pet.allergies.some(a => 
        a.toLowerCase().includes(allergy.toLowerCase())
      )
    );
  }

  /**
   * Get pets sorted by name
   * @param ascending Whether to sort in ascending order
   * @returns Array of pets sorted by name
   */
  async getSortedByName(ascending = true): Promise<Pet[]> {
    const pets = await this.getAll();
    return pets.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Get pets sorted by age
   * @param ascending Whether to sort in ascending order
   * @returns Array of pets sorted by age
   */
  async getSortedByAge(ascending = true): Promise<Pet[]> {
    const pets = await this.getAll();
    return pets.sort((a, b) => {
      const aAge = a.birthDate.getTime();
      const bAge = b.birthDate.getTime();
      // Older pets (smaller birthDate value) are considered to have higher age
      const comparison = bAge - aAge;
      return ascending ? comparison : -comparison;
    });
  }
} 