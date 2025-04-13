import { AsyncStorageService } from '../db/asyncStorage';
import { STORAGE_KEYS } from '../db/constants';
import { databaseManager } from '../db';
import { User } from '../../types/components';
import { generateUUID } from '../../utils/helpers';
import * as SecureStore from 'expo-secure-store';
import { hashPassword, verifyPassword } from './passwordService';
import * as Crypto from 'expo-crypto';

// Secure storage keys
const SECURE_STORE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id'
};

/**
 * Generate an authentication token
 * @returns Authentication token
 */
const generateAuthToken = async (userId: string): Promise<string> => {
  // Generate a secure random string using expo-crypto
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const randomStr = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
    
  // Return a token with userId and timestamp
  return `token_${userId}_${Date.now()}_${randomStr}`;
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

      // Hash the password using our custom implementation
      const passwordHash = await hashPassword(password);

      // Create new user
      const newUser: User = {
        id: generateUUID(),
        email,
        passwordHash, // Store hashed password
        name,
        createdAt: new Date(),
        petIds: []
      };

      // Save user to database
      await databaseManager.users.create(newUser);

      // Generate and store authentication token in SecureStore
      const authToken = await generateAuthToken(newUser.id);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, authToken);
      
      // Store user ID in SecureStore
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_ID, newUser.id);

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

      // Check password using our custom verification
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        console.error('Invalid password');
        return null;
      }

      // Generate and store authentication token in SecureStore
      const authToken = await generateAuthToken(user.id);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, authToken);
      
      // Store user ID in SecureStore
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_ID, user.id);

      // Update last login timestamp
      if (user.lastLogin) {
        user.lastLogin = new Date();
        await databaseManager.users.update(user.id, user);
      }

      return user;
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Remove auth token and user ID from SecureStore
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER_ID);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Get current authenticated user
   * @returns User object if authenticated, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Get user ID from SecureStore
      const userId = await SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_ID);
      
      if (!userId) {
        return null;
      }
      
      // Get user from database
      const user = await databaseManager.users.getById(userId);
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Request password reset
   * @param email User email
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Find user by email
      const user = await databaseManager.users.findByEmail(email);
      
      // For security, don't reveal if user exists
      if (!user) {
        console.log(`Password reset requested for non-existent email: ${email}`);
        return true; // Return true to not leak user existence
      }
      
      // In a real app, send email with password reset link
      // For demo, just log info
      console.log(`Password reset requested for user: ${user.id}`);
      return true;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService(); 