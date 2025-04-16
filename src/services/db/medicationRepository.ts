import { Medication } from '../../types/components';
import { RELATED_KEYS, STORAGE_KEYS } from './constants';
import { BaseRepository } from './repository';

/**
 * Repository for managing Medication entities
 */
export class MedicationRepository extends BaseRepository<Medication> {
  constructor() {
    super(STORAGE_KEYS.MEDICATIONS);
  }

  private petMedicationsKey(petId: string): string {
    return RELATED_KEYS.PET_MEDICATIONS(petId);
  }

  /**
   * Get medications for a specific pet
   * @param petId Pet ID
   * @returns Array of medications for the pet
   */
  async getByPetId(petId: string): Promise<Medication[]> {
    return this.find(medication => medication.petId === petId);
  }

  /**
   * Get active medications for a specific pet
   * @param petId Pet ID
   * @returns Array of active medications for the pet
   */
  async getActiveByPetId(petId: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.petId === petId && 
      medication.status === 'active'
    );
  }

  /**
   * Get medications by type
   * @param type Medication type
   * @returns Array of medications with the given type
   */
  async getByType(type: Medication['type']): Promise<Medication[]> {
    return this.find(medication => medication.type === type);
  }

  /**
   * Get medications by status
   * @param status Medication status
   * @returns Array of medications with the given status
   */
  async getByStatus(status: Medication['status']): Promise<Medication[]> {
    return this.find(medication => medication.status === status);
  }

  /**
   * Get medications that are due within a specific time period
   * @param petId Pet ID
   * @param hours Number of hours to look ahead
   * @returns Array of medications due within the specified hours
   */
  async getDueWithinHours(petId: string, hours = 24): Promise<Medication[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return this.find(medication => {
      // Check if the medication is for the specified pet
      if (medication.petId !== petId) return false;
      
      // Check if the medication is active
      if (medication.status !== 'active') return false;
      
      // Check if the next due date is within the time period
      if (!medication.history || medication.history.length === 0) {
        // If no history, use start date as reference
        const startDate = new Date(medication.duration.startDate);
        return startDate <= futureTime;
      }
      
      // Sort history entries by date (newest first)
      const sortedHistory = [...medication.history].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Get the most recent entry
      const lastEntry = sortedHistory[0];
      const lastEntryDate = new Date(lastEntry.date);
      
      // Calculate when the next dose is due based on frequency
      let nextDueDate = new Date(lastEntryDate);
      
      if (medication.frequency.period === 'day') {
        nextDueDate.setDate(nextDueDate.getDate() + (1 / medication.frequency.times));
      } else if (medication.frequency.period === 'week') {
        nextDueDate.setDate(nextDueDate.getDate() + (7 / medication.frequency.times));
      } else if (medication.frequency.period === 'month') {
        nextDueDate.setDate(nextDueDate.getDate() + (30 / medication.frequency.times));
      }
      
      return nextDueDate <= futureTime;
    });
  }

  /**
   * Get medications with low inventory
   * @param petId Pet ID
   * @returns Array of medications with inventory below threshold
   */
  async getLowInventory(petId: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.petId === petId && 
      medication.inventory.currentAmount <= medication.inventory.lowStockThreshold
    );
  }

  /**
   * Add an administration record to a medication
   * @param id Medication ID
   * @param administered Whether the medication was administered
   * @param notes Optional notes about the administration
   * @param administeredBy Optional name of who administered the medication
   * @returns Updated medication if found, null otherwise
   */
  async addAdministrationRecord(
    id: string, 
    administered: boolean, 
    notes?: string, 
    administeredBy?: string
  ): Promise<Medication | null> {
    const medication = await this.getById(id);
    
    if (!medication) {
      return null;
    }
    
    const historyEntry = {
      date: new Date(),
      administered,
      skipped: !administered,
      notes,
      administeredBy
    };
    
    // Create a new history array with the new entry
    const updatedHistory = [...(medication.history || []), historyEntry];
    
    // Update inventory if administered
    let updatedInventory = { ...medication.inventory };
    if (administered && medication.inventory) {
      updatedInventory = {
        ...medication.inventory,
        currentAmount: Math.max(0, medication.inventory.currentAmount - medication.dosage.amount)
      };
    }
    
    return this.update(id, {
      history: updatedHistory,
      inventory: updatedInventory
    });
  }

  /**
   * Update medication status
   * @param id Medication ID
   * @param status New status
   * @returns Updated medication if found, null otherwise
   */
  async updateStatus(id: string, status: Medication['status']): Promise<Medication | null> {
    return this.update(id, { status });
  }

  /**
   * Get medications that need refill
   * @param petId Pet ID
   * @returns Array of medications that need refill
   */
  async getNeedingRefill(petId: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.petId === petId && 
      medication.status === 'active' &&
      medication.refillable &&
      (medication.refillsRemaining !== undefined && medication.refillsRemaining > 0) &&
      medication.inventory.currentAmount <= medication.inventory.lowStockThreshold &&
      medication.inventory.reorderAlert
    );
  }

  /**
   * Get medications by administration method
   * @param method Administration method
   * @returns Array of medications with the given administration method
   */
  async getByAdministrationMethod(method: Medication['administrationMethod']): Promise<Medication[]> {
    return this.find(medication => medication.administrationMethod === method);
  }

  /**
   * Get medications by prescription provider
   * @param provider Name of the provider who prescribed the medication
   * @returns Array of medications prescribed by the given provider
   */
  async getByProvider(provider: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.prescribedBy.toLowerCase().includes(provider.toLowerCase())
    );
  }
} 