import { Pet } from '../../types/components';
import { STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';
import { supabase, camelToSnake, snakeToCamel } from '../../services/supabase';
import { generateUUID } from '../../utils/helpers';

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
    try {
      // First save to AsyncStorage (using parent implementation)
      await super.create(pet);
      
      // Then save to Supabase
      const newPet = {
        ...camelToSnake(pet),
        id: pet.id,
        created_at: new Date().toISOString(),
      };
      
      console.log('Saving pet to Supabase:', JSON.stringify(newPet));
      
      const { data, error } = await supabase
        .from('pets')
        .insert([newPet])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating pet in Supabase:', error);
        console.error('Error details:', JSON.stringify(error));
        
        // Return the pet anyway since it's saved in AsyncStorage
        return pet;
      }
      
      console.log('Pet saved to Supabase successfully:', data);
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
        return snakeToCamel<Pet[]>(data);
      }
    } catch (e) {
      console.error('Exception fetching pets from Supabase:', e);
    }
    
    // Fallback to local storage
    return this.find(pet => pet.userId === userId);
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