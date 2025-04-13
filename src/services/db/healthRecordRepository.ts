import { HealthRecord } from '../../types/components';
import { RELATED_KEYS, STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';

/**
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
   * Get all health records for a specific pet
   * @param petId Pet ID
   * @returns Array of health records for the pet
   */
  async getByPetId(petId: string): Promise<HealthRecord[]> {
    return this.find(record => record.petId === petId);
  }

  /**
   * Get health records for a pet by type
   * @param petId Pet ID
   * @param type Health record type
   * @returns Array of health records for the pet with the given type
   */
  async getByPetIdAndType(petId: string, type: HealthRecord['type']): Promise<HealthRecord[]> {
    return this.find(record => record.petId === petId && record.type === type);
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
    
    return this.find(record => {
      // Check if the record is for the specified pet
      if (record.petId !== petId) return false;
      
      // Check if the record is within the date range
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
    return this.find(record => 
      record.petId === petId && 
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
    
    return this.find(record => {
      // Check if the record is for the specified pet
      if (record.petId !== petId) return false;
      
      // Check if follow-up is needed and not completed
      if (!record.followUpNeeded || record.status === 'completed') return false;
      
      // Check if follow-up date is within the specified range
      if (!record.followUpDate) return false;
      
      const followUpDate = new Date(record.followUpDate);
      return followUpDate >= now && followUpDate <= future;
    });
  }

  /**
   * Mark a health record as completed
   * @param id Health record ID
   * @returns Updated health record if found, null otherwise
   */
  async markAsCompleted(id: string): Promise<HealthRecord | null> {
    return this.update(id, {
      status: 'completed'
    });
  }

  /**
   * Get total cost of health records for a date range
   * @param petId Pet ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Total cost of health records
   */
  async getTotalCost(petId: string, startDate: Date, endDate: Date): Promise<number> {
    const records = await this.getByDateRange(petId, startDate, endDate);
    return records.reduce((total, record) => total + record.cost, 0);
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