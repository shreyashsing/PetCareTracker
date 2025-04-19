import { Pet } from '../../types/components';
import { STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';
import { supabase, camelToSnake, snakeToCamel } from '../../services/supabase';
import { generateUUID } from '../../utils/helpers';
import { formatDateForSupabase } from '../../utils/dateUtils';
import { createPetForSupabase } from '../../utils/petSync';

/**
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
        // Use the same function that works during sync to ensure schema compatibility
        const petData = createPetForSupabase(pet);
        
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
          console.error('Error creating pet in Supabase:', error);
          console.error('Error details:', JSON.stringify(error));
          
          // Additional diagnostics for specific error types
          if (error.code === '42P01') {
            console.error('The pets table does not exist in Supabase');
          } else if (error.code === '42703') {
            console.error('Column error - schema mismatch between app and Supabase');
            console.error('Error message:', error.message);
            // Log the full petData object to see what fields might be causing issues
            console.error('Pet data structure:', Object.keys(petData).join(', '));
          } else if (error.code === '23505') {
            console.error('Unique constraint violation - pet ID already exists');
          } else if (error.code === '23503') {
            console.error('Foreign key constraint violation - user_id may not exist');
          }
          
          console.log('Pet was saved to local storage only. Will sync later when Supabase is available.');
        } else {
          console.log('Pet saved to Supabase successfully:', data);
          return snakeToCamel<Pet>(data);
        }
      } catch (supabaseError) {
        console.error('Exception saving to Supabase:', supabaseError);
        console.log('Pet was saved to local storage only. Will sync later when Supabase is available.');
      }
      
      // Return the pet regardless of whether Supabase save succeeded
      return pet;
    } catch (error) {
      console.error('Exception creating pet in repository:', error);
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