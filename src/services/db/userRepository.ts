import { User } from '../../types/components';
import { STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';

/**
 * Repository for managing User entities
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(STORAGE_KEYS.USERS);
  }

  /**
   * Find a user by email
   * @param email User email
   * @returns User with the given email or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const users = await this.find(user => user.email.toLowerCase() === email.toLowerCase());
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User with the given ID or null if not found
   */
  async findById(id: string): Promise<User | null> {
    return this.getById(id);
  }

  /**
   * Add a pet ID to a user's petIds array
   * @param userId User ID
   * @param petId Pet ID
   * @returns True if successful, false otherwise
   */
  async addPetToUser(userId: string, petId: string): Promise<boolean> {
    try {
      const user = await this.getById(userId);
      if (!user) return false;

      // Only add if not already in the array
      if (!user.petIds.includes(petId)) {
        user.petIds.push(petId);
        await this.update(userId, user);
      }
      return true;
    } catch (error) {
      console.error('Error adding pet to user:', error);
      return false;
    }
  }

  /**
   * Remove a pet ID from a user's petIds array
   * @param userId User ID
   * @param petId Pet ID
   * @returns True if successful, false otherwise
   */
  async removePetFromUser(userId: string, petId: string): Promise<boolean> {
    try {
      const user = await this.getById(userId);
      if (!user) return false;

      user.petIds = user.petIds.filter(id => id !== petId);
      await this.update(userId, user);
      return true;
    } catch (error) {
      console.error('Error removing pet from user:', error);
      return false;
    }
  }

  /**
   * Get all pets for a user
   * @param userId User ID
   * @returns Array of pet IDs for the user
   */
  async getUserPets(userId: string): Promise<string[]> {
    try {
      const user = await this.getById(userId);
      if (!user) return [];
      return user.petIds;
    } catch (error) {
      console.error('Error getting user pets:', error);
      return [];
    }
  }
} 