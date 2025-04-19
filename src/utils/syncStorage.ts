import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_KEYS = {
  LAST_PET_SYNC: 'last_pet_sync_time',
  LAST_HEALTH_SYNC: 'last_health_sync_time',
  LAST_FEEDING_SYNC: 'last_feeding_sync_time',
};

/**
 * Save the last sync time for pets
 * @param timestamp ISO string timestamp
 */
export const saveLastSyncTime = async (timestamp: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SYNC_KEYS.LAST_PET_SYNC, timestamp);
  } catch (error) {
    console.error('Error saving sync time:', error);
  }
};

/**
 * Get the last sync time for pets
 * @returns ISO string timestamp or null if not found
 */
export const getLastSyncTime = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(SYNC_KEYS.LAST_PET_SYNC);
  } catch (error) {
    console.error('Error getting sync time:', error);
    return null;
  }
};

/**
 * Save entity-specific sync time
 * @param entityType Type of entity ('pet', 'health', 'feeding')
 * @param timestamp ISO string timestamp
 */
export const saveEntitySyncTime = async (
  entityType: 'pet' | 'health' | 'feeding', 
  timestamp: string
): Promise<void> => {
  try {
    const key = entityType === 'pet' 
      ? SYNC_KEYS.LAST_PET_SYNC 
      : entityType === 'health' 
        ? SYNC_KEYS.LAST_HEALTH_SYNC 
        : SYNC_KEYS.LAST_FEEDING_SYNC;
    
    await AsyncStorage.setItem(key, timestamp);
  } catch (error) {
    console.error(`Error saving ${entityType} sync time:`, error);
  }
};

/**
 * Get entity-specific sync time
 * @param entityType Type of entity ('pet', 'health', 'feeding')
 * @returns ISO string timestamp or null if not found
 */
export const getEntitySyncTime = async (
  entityType: 'pet' | 'health' | 'feeding'
): Promise<string | null> => {
  try {
    const key = entityType === 'pet' 
      ? SYNC_KEYS.LAST_PET_SYNC 
      : entityType === 'health' 
        ? SYNC_KEYS.LAST_HEALTH_SYNC 
        : SYNC_KEYS.LAST_FEEDING_SYNC;
    
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting ${entityType} sync time:`, error);
    return null;
  }
};

/**
 * Clear all sync timestamps
 */
export const clearAllSyncTimes = async (): Promise<void> => {
  try {
    const keys = Object.values(SYNC_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing sync times:', error);
  }
}; 