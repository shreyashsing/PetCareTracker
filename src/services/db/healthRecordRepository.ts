import { HealthRecord } from '../../types/components';
import { RELATED_KEYS, STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';
import { AsyncStorageService } from './asyncStorage';

/**
 * @deprecated Use unifiedDatabaseManager.healthRecords instead. This repository is being phased out.
 * Repository for managing HealthRecord entities
 */
export class HealthRecordRepository extends BaseRepository<HealthRecord> {
  constructor() {
    super(STORAGE_KEYS.HEALTH_RECORDS);
  }

  private petHealthRecordsKey(petId: string): string {
    return RELATED_KEYS.PET_HEALTH_RECORDS(petId);
  }

  /**
   * Save all health records to AsyncStorage
   * @param records Array of health records to save
   */
  private async saveAll(records: HealthRecord[]): Promise<void> {
    try {
      await AsyncStorageService.setItem(STORAGE_KEYS.HEALTH_RECORDS, records);
    } catch (error) {
      console.error('[HealthRecordRepository] Error in saveAll:', error);
      throw error;
    }
  }

  /**
   * Get all health records for a specific pet
   * Only fetches from AsyncStorage to avoid Supabase errors
   * @param petId Pet ID
   * @returns Array of health records for the pet
   */
  async getByPetId(petId: string): Promise<HealthRecord[]> {
    try {
      console.log(`[HealthRecordRepository] Getting health records for pet: ${petId}`);
      
      // Get records from AsyncStorage only
      const localRecords = await this.find(record => record.petId === petId);
      console.log(`[HealthRecordRepository] Found ${localRecords.length} local health records`);
      
      return localRecords;
    } catch (error) {
      console.error('[HealthRecordRepository] Error in getByPetId:', error);
      return [];
    }
  }

  /**
   * Create a health record - only save to local storage
   * @override
   */
  async create(record: HealthRecord): Promise<HealthRecord> {
    try {
      // Save to local storage only
      const createdRecord = await super.create(record);
      console.log('[HealthRecordRepository] Record created locally');
      return createdRecord;
    } catch (error) {
      console.error('[HealthRecordRepository] Error in create:', error);
      throw error;
    }
  }

  /**
   * Get health records for a pet by type
   * @param petId Pet ID
   * @param type Health record type
   * @returns Array of health records for the pet with the given type
   */
  async getByPetIdAndType(petId: string, type: HealthRecord['type']): Promise<HealthRecord[]> {
    // Get all records for the pet
    const records = await this.getByPetId(petId);
    
    // Filter by type
    return records.filter(record => record.type === type);
  }

  /**
   * Get health records for a date range
   * @param petId Pet ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Array of health records within the date range
   */
  async getByDateRange(petId: string, startDate: Date, endDate: Date): Promise<HealthRecord[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Get all records for the pet
    const records = await this.getByPetId(petId);
    
    // Filter by date range
    return records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= start && recordDate <= end;
    });
  }

  /**
   * Get records that require follow-up
   * @param petId Pet ID
   * @returns Array of health records that need follow-up
   */
  async getFollowUpNeeded(petId: string): Promise<HealthRecord[]> {
    // Get all records for the pet
    const records = await this.getByPetId(petId);
    
    return records.filter(record => 
      record.followUpNeeded === true && 
      record.status !== 'completed'
    );
  }

  /**
   * Get upcoming follow-up records
   * @param petId Pet ID
   * @param days Number of days in the future to look
   * @returns Array of health records with upcoming follow-ups
   */
  async getUpcomingFollowUps(petId: string, days = 7): Promise<HealthRecord[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    
    // Get all records for the pet
    const records = await this.getByPetId(petId);
    
    return records.filter(record => {
      // Check if follow-up is needed and not completed
      if (!record.followUpNeeded || record.status === 'completed') return false;
      
      // Check if follow-up date is within the specified range
      if (!record.followUpDate) return false;
      
      const followUpDate = new Date(record.followUpDate);
      return followUpDate >= now && followUpDate <= future;
    });
  }

  /**
   * Get latest health record for a pet
   * @param petId Pet ID
   * @returns Most recent health record
   */
  async getLatest(petId: string): Promise<HealthRecord | null> {
    const records = await this.getByPetId(petId);
    
    if (records.length === 0) {
      return null;
    }
    
    // Sort by date in descending order
    records.sort((a, b) => {
      const aDate = new Date(a.date).getTime();
      const bDate = new Date(b.date).getTime();
      return bDate - aDate;
    });
    
    return records[0];
  }

  /**
   * Get health records by provider
   * @param provider Provider name
   * @returns Array of health records from the given provider
   */
  async getByProvider(provider: string): Promise<HealthRecord[]> {
    return this.find(record => 
      record.provider.name.toLowerCase().includes(provider.toLowerCase())
    );
  }
} 