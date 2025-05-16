import { unifiedDatabaseManager } from '../services/db';
import { supabase } from '../services/supabase';
import { Alert } from 'react-native';

/**
 * Utility functions for database migration and synchronization
 */
export const DatabaseMigration = {
  /**
   * Check if migration is needed
   * This function always returns false now since we've fully migrated to the unified database manager
   * @returns False since migration is complete
   */
  async isMigrationNeeded(): Promise<boolean> {
    return false;
  },
  
  /**
   * Migrate data from the legacy database manager to the unified database manager
   * This function is now a no-op since we've fully migrated to the unified database manager
   * @param userId User ID to migrate data for
   * @returns True since migration is complete
   */
  async migrateToUnifiedManager(userId: string): Promise<boolean> {
    console.log('Migration is already complete. Using unified database manager.');
    return true;
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
  },
  
  /**
   * Sync all data with Supabase
   * @param userId User ID to sync data for
   * @returns True if sync was successful, false otherwise
   */
  async syncAllData(userId: string): Promise<boolean> {
    try {
      console.log(`Starting sync for user ${userId}...`);
      
      // Show progress dialog
      Alert.alert(
        'Sync in Progress',
        'Please wait while we sync your data...'
      );
      
      // Sync all data with Supabase
      await unifiedDatabaseManager.syncAllData(userId);
      
      // Show success dialog
      Alert.alert(
        'Sync Complete',
        'Your data has been successfully synced with the cloud.'
      );
      
      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Error syncing data:', error);
      
      // Show error dialog
      Alert.alert(
        'Sync Failed',
        'There was an error syncing your data. Please try again later.'
      );
      
      return false;
    }
  }
}; 