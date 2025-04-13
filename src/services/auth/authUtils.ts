import * as SecureStore from 'expo-secure-store';
import { generateUUID } from '../../utils/helpers';
import { hashPassword, verifyPassword } from './passwordService';
import * as Crypto from 'expo-crypto';

// Constants for SecureStore keys
export const SECURE_STORE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
};

/**
 * Hash a password 
 * @param password Plain text password
 * @returns Hashed password
 */
export const hashUserPassword = async (password: string): Promise<string> => {
  return hashPassword(password);
};

/**
 * Compare a plain text password with a hashed password
 * @param password Plain text password
 * @param hashedPassword Hashed password
 * @returns True if password matches
 */
export const compareUserPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return verifyPassword(password, hashedPassword);
};

/**
 * Generate an authentication token
 * @returns Authentication token
 */
export const generateAuthToken = async (): Promise<string> => {
  // Generate a secure random string using expo-crypto
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const randomStr = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
    
  // Return a token with timestamp and UUID
  return `token_${generateUUID()}_${Date.now()}_${randomStr}`;
};

/**
 * Save authentication token to SecureStore
 * @param token Token to save
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN, token);
};

/**
 * Get authentication token from SecureStore
 * @returns Authentication token or null if not found
 */
export const getAuthToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN);
};

/**
 * Save user ID to SecureStore
 * @param userId User ID to save
 */
export const saveUserId = async (userId: string): Promise<void> => {
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.USER_ID, userId);
};

/**
 * Get user ID from SecureStore
 * @returns User ID or null if not found
 */
export const getUserId = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(SECURE_STORE_KEYS.USER_ID);
};

/**
 * Clear all authentication data from SecureStore
 */
export const clearAuthData = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.AUTH_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.USER_ID);
}; 