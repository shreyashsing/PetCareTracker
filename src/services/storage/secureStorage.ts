import * as SecureStore from 'expo-secure-store';
import { AsyncStorageService } from '../db/asyncStorage';
import { encryptData, decryptData, generateEncryptionKey } from '../../utils/encryption';

// Key for storing the encryption key
const ENCRYPTION_KEY_STORAGE = 'app_encryption_key';

/**
 * Get or generate encryption key
 * @returns Encryption key
 */
const getEncryptionKey = async (): Promise<string> => {
  try {
    // Try to get existing encryption key
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
    
    // If no key exists, generate a new one
    if (!key) {
      key = await generateEncryptionKey();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
    }
    
    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw error;
  }
};

/**
 * Secure Storage Service for handling sensitive data
 * Automatically encrypts data before storing and decrypts when retrieving
 */
export class SecureStorageService {
  /**
   * Store sensitive data securely
   * @param key Storage key
   * @param value Data to store
   */
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      // Serialize value
      const jsonValue = JSON.stringify(value);
      
      // Get encryption key
      const encryptionKey = await getEncryptionKey();
      
      // Encrypt value
      const encryptedValue = await encryptData(jsonValue, encryptionKey);
      
      // Store in SecureStore
      await SecureStore.setItemAsync(key, encryptedValue);
    } catch (error) {
      console.error('Error storing secure data:', error);
      
      // Fallback to AsyncStorage, but still encrypt the data
      try {
        const jsonValue = JSON.stringify(value);
        const encryptionKey = await getEncryptionKey();
        const encryptedValue = await encryptData(jsonValue, encryptionKey);
        await AsyncStorageService.setItem(`encrypted_${key}`, encryptedValue);
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Retrieve sensitive data
   * @param key Storage key
   * @returns The stored data or null if not found
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      // Get encrypted value from SecureStore
      const encryptedValue = await SecureStore.getItemAsync(key);
      
      if (!encryptedValue) {
        // Try fallback storage
        const fallbackValue = await AsyncStorageService.getItem<string>(`encrypted_${key}`);
        if (!fallbackValue) return null;
        
        // Decrypt fallback value
        const encryptionKey = await getEncryptionKey();
        const decryptedValue = await decryptData(fallbackValue, encryptionKey);
        return JSON.parse(decryptedValue) as T;
      }
      
      // Get encryption key
      const encryptionKey = await getEncryptionKey();
      
      // Decrypt value
      const decryptedValue = await decryptData(encryptedValue, encryptionKey);
      
      // Parse JSON
      return JSON.parse(decryptedValue) as T;
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  }

  /**
   * Remove sensitive data
   * @param key Storage key
   */
  static async removeItem(key: string): Promise<void> {
    try {
      // Remove from SecureStore
      await SecureStore.deleteItemAsync(key);
      
      // Also try to remove from fallback storage
      await AsyncStorageService.removeItem(`encrypted_${key}`);
    } catch (error) {
      console.error('Error removing secure data:', error);
      throw error;
    }
  }
} 