import { AsyncStorageService } from '../db/asyncStorage';
import { STORAGE_KEYS } from '../db/constants';
import { databaseManager } from '../db';
import { User } from '../../types/components';
import { generateUUID } from '../../utils/helpers';

/**
 * Simple password hashing function (in production app use better methods)
 * @param password Password to hash
 * @returns Hashed password
 */
const hashPassword = (password: string): string => {
  // In a real app, use a proper cryptography library
  // This is a simple hash for demonstration purposes only
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};

/**
 * Authentication service for user management
 */
export class AuthService {
  /**
   * Register a new user
   * @param email User email
   * @param password User password
   * @param name User name
   * @returns User object if successful, null if failed
   */
  async register(email: string, password: string, name: string): Promise<User | null> {
    try {
      // Check if user with email already exists
      const existingUser = await databaseManager.users.findByEmail(email);
      if (existingUser) {
        console.error('User with this email already exists');
        return null;
      }

      // Create new user
      const newUser: User = {
        id: generateUUID(),
        email,
        passwordHash: hashPassword(password),
        name,
        createdAt: new Date(),
        petIds: []
      };

      // Save user to database
      await databaseManager.users.create(newUser);

      // Store current user ID in AsyncStorage
      await AsyncStorageService.setItem(STORAGE_KEYS.CURRENT_USER, newUser.id);

      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  /**
   * Login user
   * @param email User email
   * @param password User password
   * @returns User object if successful, null if failed
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      // Find user by email
      const user = await databaseManager.users.findByEmail(email);
      if (!user) {
        console.error('User with this email does not exist');
        return null;
      }

      // Check password
      if (user.passwordHash !== hashPassword(password)) {
        console.error('Invalid password');
        return null;
      }

      // Store current user ID in AsyncStorage
      await AsyncStorageService.setItem(STORAGE_KEYS.CURRENT_USER, user.id);

      return user;
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Remove current user from AsyncStorage
      await AsyncStorageService.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  /**
   * Get current logged in user
   * @returns User object if logged in, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Get current user ID from AsyncStorage
      const userId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.CURRENT_USER);
      if (!userId) {
        return null;
      }

      // Get user from database
      return await databaseManager.users.findById(userId);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is logged in
   * @returns True if logged in, false otherwise
   */
  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}

// Export singleton instance
export const authService = new AuthService(); 