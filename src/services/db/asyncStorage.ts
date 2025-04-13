import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility class for handling AsyncStorage operations
 */
export class AsyncStorageService {
  /**
   * Store data with the given key
   * @param key Storage key
   * @param value Data to store
   */
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  }

  /**
   * Retrieve data for the given key
   * @param key Storage key
   * @returns The stored data or null if not found
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      throw error;
    }
  }

  /**
   * Remove data for the given key
   * @param key Storage key
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  }

  /**
   * Clear all stored data
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Get all keys stored in AsyncStorage
   * @returns Array of keys
   */
  static async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      throw error;
    }
  }

  /**
   * Batch store multiple items
   * @param items Array of [key, value] pairs
   */
  static async multiSet(items: [string, string][]): Promise<void> {
    try {
      await AsyncStorage.multiSet(items);
    } catch (error) {
      console.error('Error storing multiple items:', error);
      throw error;
    }
  }

  /**
   * Batch retrieve multiple items
   * @param keys Array of keys to retrieve
   * @returns Array of [key, value] pairs
   */
  static async multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> {
    try {
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Error retrieving multiple items:', error);
      throw error;
    }
  }

  /**
   * Batch remove multiple items
   * @param keys Array of keys to remove
   */
  static async multiRemove(keys: readonly string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error removing multiple items:', error);
      throw error;
    }
  }
} 