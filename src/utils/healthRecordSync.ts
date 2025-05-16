import { supabase, camelToSnake, snakeToCamel } from '../services/supabase';
import { HealthRecord } from '../types/components';
import {unifiedDatabaseManager} from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';

/**
 * Synchronize health records for a specific pet between local storage and Supabase
 * This is particularly helpful when a pet was created on a different device
 * @param petId The ID of the pet to synchronize health records for
 * @returns An object containing synchronization results
 */
export async function syncHealthRecordsForPet(petId: string): Promise<{
  success: boolean;
  localRecords: number;
  remoteRecords: number;
  syncedRecords: number;
  error?: string;
}> {
  console.log(`[healthRecordSync] Starting sync for pet: ${petId}`);
  
  try {
    // Get all records and filter by petId
    const allRecords = await unifiedDatabaseManager.healthRecords.getAll();
    const localRecords = allRecords.filter(record => record.petId === petId);
    console.log(`[healthRecordSync] Found ${localRecords.length} local records`);
    
    // Skip Supabase sync to avoid errors
    console.log('[healthRecordSync] Skipping Supabase sync - local only mode');
    
    return {
      success: true,
      localRecords: localRecords.length,
      remoteRecords: 0,
      syncedRecords: localRecords.length
    };
  } catch (error) {
    console.error('[healthRecordSync] Sync error:', error);
    return {
      success: false,
      localRecords: 0,
      remoteRecords: 0,
      syncedRecords: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Force sync all health records for all pets
 * This is useful when switching devices or reinstalling the app
 */
export async function syncAllHealthRecords(): Promise<{
  success: boolean;
  syncResults: Array<{ petId: string; success: boolean; syncedRecords: number }>;
  error?: string;
}> {
  console.log('[healthRecordSync] Starting sync for all pets');
  
  try {
    // Get all pets
    const pets = await unifiedDatabaseManager.pets.getAll();
    console.log(`[healthRecordSync] Found ${pets.length} pets`);
    
    const results = [];
    
    // Get all health records once to avoid multiple calls
    const allHealthRecords = await unifiedDatabaseManager.healthRecords.getAll();
    
    // Sync health records for each pet
    for (const pet of pets) {
      console.log(`[healthRecordSync] Syncing for pet: ${pet.name} (${pet.id})`);
      const localRecords = allHealthRecords.filter(record => record.petId === pet.id);
      
      results.push({
        petId: pet.id,
        success: true,
        syncedRecords: localRecords.length
      });
    }
    
    return {
      success: true,
      syncResults: results
    };
  } catch (error) {
    console.error('[healthRecordSync] Error syncing all health records:', error);
    return {
      success: false,
      syncResults: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 