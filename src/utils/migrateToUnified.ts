/**
 * Migration utility to migrate from the legacy database manager to the unified database manager
 */
import { Alert } from 'react-native';
import { unifiedDatabaseManager } from '../services/db';
import { supabase } from '../services/supabase';

/**
 * Utility functions for database migration and synchronization
 */
export const MigrationUtility = {
  /**
   * Migrate to the unified database manager and sync with Supabase
   * @param userId User ID to migrate data for
   * @returns True if migration was successful, false otherwise
   */
  async migrateAndSync(userId: string): Promise<boolean> {
    try {
      console.log(`Starting migration and sync for user ${userId}...`);
      
      // Show progress dialog
      Alert.alert(
        'Database Update',
        'We are updating your data to improve performance and reliability. This will only take a moment.',
        [{ text: 'OK' }]
      );
      
      // Load all data into the unified database manager
      await unifiedDatabaseManager.loadAllData(userId);
      
      // Sync all data with Supabase
      await unifiedDatabaseManager.syncAllData(userId);
      
      console.log('Migration and sync completed successfully');
      return true;
    } catch (error) {
      console.error('Error during migration and sync:', error);
      
      // Show error dialog
      Alert.alert(
        'Update Failed',
        'There was an error updating your data. Please try again later.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  },
  
  /**
   * Check if the user's data needs to be synced with Supabase
   * @param userId User ID to check
   * @returns True if sync is needed, false otherwise
   */
  async isSyncNeeded(userId: string): Promise<boolean> {
    try {
      // Check if the user is authenticated
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        return false;
      }
      
      // Check if the user has any pets in local storage
      const localPets = await unifiedDatabaseManager.pets.getAll();
      if (localPets.length === 0) {
        return false;
      }
      
      // Check if the same pets exist in Supabase
      const { data: remotePets, error } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error checking if sync is needed:', error);
        return true; // Assume sync is needed if there's an error
      }
      
      // If the counts don't match, sync is needed
      if (localPets.length !== remotePets.length) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if sync is needed:', error);
      return true; // Assume sync is needed if there's an error
    }
  }
}; 