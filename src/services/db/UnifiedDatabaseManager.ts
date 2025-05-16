import { STORAGE_KEYS } from './constants';
import { DataManager, BaseEntity } from './DataManager';
import { Pet, Task, Meal, FoodItem, Medication, HealthRecord, ActivitySession, User } from '../../types/components';
import { createEntityTables } from './migrations';

/**
 * Extended DataManager for FoodItems with additional methods
 */
class FoodItemDataManager extends DataManager<FoodItem> {
  /**
   * Get food items that are low in stock
   * @param petId Pet ID
   * @returns Array of food items that are low in stock
   */
  async getLowStock(petId: string): Promise<FoodItem[]> {
    return this.find(item => {
      const { inventory } = item;
      return (
        item.petId === petId && 
        inventory.currentAmount <= inventory.lowStockThreshold
      );
    });
  }
  
  /**
   * Get food items by category
   * @param petId Pet ID
   * @param category Food category
   * @returns Array of food items in the given category
   */
  async getByCategory(petId: string, category: FoodItem['category']): Promise<FoodItem[]> {
    return this.find(item => item.petId === petId && item.category === category);
  }
  
  /**
   * Get food items by pet preference
   * @param petId Pet ID
   * @param preference Pet preference
   * @returns Array of food items with the given preference
   */
  async getByPreference(petId: string, preference: FoodItem['petPreference']): Promise<FoodItem[]> {
    return this.find(item => 
      item.petId === petId && 
      item.petPreference === preference
    );
  }
  
  /**
   * Get food items that are expiring soon
   * @param petId Pet ID
   * @param daysThreshold Number of days to check for expiry
   * @returns Array of food items expiring within the threshold
   */
  async getExpiringSoon(petId: string, daysThreshold = 30): Promise<FoodItem[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysThreshold);
    
    return this.find(item => {
      // Check if the item is for the specified pet
      if (item.petId !== petId) return false;
      
      // Check if there's an expiry date
      if (!item.purchaseDetails?.expiryDate) return false;
      
      // Check if the expiry date is within the threshold
      const expiryDate = new Date(item.purchaseDetails.expiryDate);
      return expiryDate >= now && expiryDate <= future;
    });
  }
  
  /**
   * Update inventory amount
   * @param id Food item ID
   * @param newAmount New amount
   * @returns Updated food item if found, null otherwise
   */
  async updateInventory(id: string, newAmount: number): Promise<FoodItem | null> {
    // First get the current food item
    const foodItem = await this.getById(id);
    
    if (!foodItem) {
      return null;
    }
    
    // Calculate days remaining based on new amount and daily feeding amount
    const daysRemaining = Math.floor(newAmount / foodItem.inventory.dailyFeedingAmount);
    
    // Update the inventory with the new amount and days remaining
    const updatedInventory = {
      ...foodItem.inventory,
      currentAmount: newAmount,
      daysRemaining,
      reorderAlert: daysRemaining <= foodItem.inventory.lowStockThreshold
    };
    
    // Update the food item
    return this.update(id, {
      ...foodItem,
      inventory: updatedInventory,
      lowStock: daysRemaining <= foodItem.inventory.lowStockThreshold
    });
  }
}

/**
 * Extended DataManager for Pets with additional methods
 */
class PetDataManager extends DataManager<Pet> {
  /**
   * Get pets by user ID
   * @param userId User ID
   * @returns Array of pets for the user
   */
  async getByUserId(userId: string): Promise<Pet[]> {
    return this.find(pet => pet.userId === userId);
  }
  
  /**
   * Get pets by type/species
   * @param petType Pet type (dog, cat, etc.)
   * @returns Array of pets of the specified type
   */
  async getBySpecies(petType: string): Promise<Pet[]> {
    return this.find(pet => pet.type === petType);
  }
  
  /**
   * Find pets by health status
   * @param status Health status
   * @returns Array of pets with the given status
   */
  async findByStatus(status: Pet['status']): Promise<Pet[]> {
    return this.find(pet => pet.status === status);
  }
  
  /**
   * Find pets with a specific health condition
   * @param condition Health condition to search for
   * @returns Array of pets with the given condition
   */
  async findByMedicalCondition(condition: string): Promise<Pet[]> {
    return this.find(pet => 
      pet.medicalConditions?.some(c => 
        c.toLowerCase().includes(condition.toLowerCase())
      )
    );
  }
  
  /**
   * Get pets sorted by name
   * @param ascending Whether to sort in ascending order
   * @returns Array of pets sorted by name
   */
  async getSortedByName(ascending = true): Promise<Pet[]> {
    const pets = await this.getAll();
    return pets.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return ascending ? comparison : -comparison;
    });
  }
}

/**
 * Extended DataManager for Medications with additional methods
 */
class MedicationDataManager extends DataManager<Medication> {
  /**
   * Get active medications for a pet
   * @param petId Pet ID
   * @returns Array of active medications
   */
  async getActiveMedications(petId: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.petId === petId && 
      medication.status === 'active'
    );
  }
  
  /**
   * Get medications by type
   * @param petId Pet ID
   * @param type Medication type
   * @returns Array of medications of the specified type
   */
  async getByType(petId: string, type: string): Promise<Medication[]> {
    return this.find(medication => 
      medication.petId === petId && 
      medication.type === type
    );
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
}

/**
 * Extended DataManager for Tasks with additional methods
 */
class TaskDataManager extends DataManager<Task> {
  /**
   * Get tasks for a specific date
   * @param petId Pet ID
   * @param date Date to filter by
   * @returns Array of tasks for the specified date
   */
  async getByDate(petId: string, date: Date): Promise<Task[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.find(task => {
      if (task.petId !== petId) return false;
      
      const taskDate = new Date(task.scheduleInfo.date);
      taskDate.setHours(0, 0, 0, 0);
      
      return taskDate.getTime() === targetDate.getTime();
    });
  }
  
  /**
   * Get upcoming tasks
   * @param petId Pet ID
   * @param days Number of days to look ahead
   * @returns Array of upcoming tasks
   */
  async getUpcoming(petId: string, days: number = 7): Promise<Task[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + days);
    
    return this.find(task => {
      if (task.petId !== petId) return false;
      
      const taskDate = new Date(task.scheduleInfo.date);
      taskDate.setHours(0, 0, 0, 0);
      
      return taskDate >= now && taskDate <= futureDate;
    });
  }
  
  /**
   * Mark a task as completed
   * @param id Task ID
   * @param completedBy ID of the user who completed the task
   * @param notes Optional notes about the completion
   * @returns Updated task if found, null otherwise
   */
  async markAsCompleted(id: string, completedBy: string, notes?: string): Promise<Task | null> {
    // Get the existing task first
    const existingTask = await this.getById(id);
    if (!existingTask) {
      return null;
    }
    
    const completionDetails = {
      completedAt: new Date(),
      completedBy,
      notes
    };
    
    // Update the task
    return this.update(id, {
      status: 'completed',
      completionDetails
    });
  }
}

/**
 * Extended DataManager for Meals with additional methods
 */
class MealDataManager extends DataManager<Meal> {
  /**
   * Get meals for a pet on a specific date
   * @param petId Pet ID
   * @param date Date to get meals for
   * @returns Array of meals for the pet on the date
   */
  async getByPetIdAndDate(petId: string, date: Date): Promise<Meal[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.find(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return meal.petId === petId && mealDate.getTime() === targetDate.getTime();
    });
  }
  
  /**
   * Mark a meal as completed
   * @param id Meal ID
   * @returns Updated meal if found, null otherwise
   */
  async markAsCompleted(id: string): Promise<Meal | null> {
    return this.update(id, {
      completed: true,
      skipped: false
    });
  }
  
  /**
   * Mark a meal as skipped
   * @param id Meal ID
   * @returns Updated meal if found, null otherwise
   */
  async markAsSkipped(id: string): Promise<Meal | null> {
    return this.update(id, {
      completed: false,
      skipped: true
    });
  }
  
  /**
   * Get upcoming meals for a pet
   * @param petId Pet ID
   * @param limit Maximum number of meals to return
   * @returns Array of upcoming meals for the pet
   */
  async getUpcoming(petId: string, limit = 5): Promise<Meal[]> {
    const now = new Date();
    
    const meals = await this.find(meal => {
      // Check if the meal is for the specified pet
      if (meal.petId !== petId) return false;
      
      // Check if the meal is not completed or skipped
      if (meal.completed || meal.skipped) return false;
      
      // Check if the meal is in the future or current
      const mealDate = new Date(meal.date);
      const mealTime = new Date(meal.time);
      const mealDateTime = new Date(
        mealDate.getFullYear(),
        mealDate.getMonth(),
        mealDate.getDate(),
        mealTime.getHours(),
        mealTime.getMinutes()
      );
      
      return mealDateTime >= now;
    });
    
    // Sort by date and time
    meals.sort((a, b) => {
      const aDate = new Date(a.date);
      const aTime = new Date(a.time);
      const aDateTime = new Date(
        aDate.getFullYear(),
        aDate.getMonth(),
        aDate.getDate(),
        aTime.getHours(),
        aTime.getMinutes()
      );
      
      const bDate = new Date(b.date);
      const bTime = new Date(b.time);
      const bDateTime = new Date(
        bDate.getFullYear(),
        bDate.getMonth(),
        bDate.getDate(),
        bTime.getHours(),
        bTime.getMinutes()
      );
      
      return aDateTime.getTime() - bDateTime.getTime();
    });
    
    return meals.slice(0, limit);
  }
}

/**
 * Extended DataManager for HealthRecords with additional methods
 */
class HealthRecordDataManager extends DataManager<HealthRecord> {
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
      // Check if follow-up is needed and not completed
      if (!record.followUpNeeded || record.status === 'completed') return false;
      
      // Check if follow-up date is within the specified range
      if (!record.followUpDate) return false;
      
      const followUpDate = new Date(record.followUpDate);
      return followUpDate >= now && followUpDate <= future;
    });
  }
}

/**
 * Extended DataManager for ActivitySessions with additional methods
 */
class ActivitySessionDataManager extends DataManager<ActivitySession> {
  /**
   * Get recent activity sessions for a pet
   * @param petId Pet ID
   * @param limit Maximum number of sessions to return
   * @returns Array of recent activity sessions
   */
  async getRecentByPetId(petId: string, limit: number = 10): Promise<ActivitySession[]> {
    const sessions = await this.find(session => session.petId === petId);
    
    // Sort by date descending (most recent first)
    return sessions
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }
}

/**
 * Unified Database Manager that provides a consistent API for all entity types
 * This replaces both the DatabaseManager and supabaseManager with a single interface
 */
export class UnifiedDatabaseManager {
  // Entity managers
  pets: PetDataManager;
  tasks: TaskDataManager;
  meals: MealDataManager;
  foodItems: FoodItemDataManager;
  medications: MedicationDataManager;
  healthRecords: HealthRecordDataManager;
  activitySessions: ActivitySessionDataManager;
  users: DataManager<User>;

  constructor() {
    // Initialize all entity managers with appropriate storage keys and table names
    this.pets = new PetDataManager(STORAGE_KEYS.PETS, 'pets');
    this.tasks = new TaskDataManager(STORAGE_KEYS.TASKS, 'tasks');
    this.meals = new MealDataManager(STORAGE_KEYS.MEALS, 'meals');
    this.foodItems = new FoodItemDataManager(STORAGE_KEYS.FOOD_ITEMS, 'food_items');
    this.medications = new MedicationDataManager(STORAGE_KEYS.MEDICATIONS, 'medications');
    this.healthRecords = new HealthRecordDataManager(STORAGE_KEYS.HEALTH_RECORDS, 'health_records');
    this.activitySessions = new ActivitySessionDataManager(STORAGE_KEYS.ACTIVITY_SESSIONS, 'activity_sessions');
    this.users = new DataManager<User>(STORAGE_KEYS.USERS, 'users');
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    console.log('Initializing UnifiedDatabaseManager...');
    
    try {
      // Check if required tables exist and create them if needed
      await createEntityTables();
      
      // Initialize all DataManagers with timeout
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timed out')), ms)
      );
      
      // Set a 10-second timeout for initialization
      await Promise.race([
        Promise.all([
          this.pets.tableExists(),
          this.tasks.tableExists(),
          this.meals.tableExists(),
          this.foodItems.tableExists(),
          this.medications.tableExists(),
          this.healthRecords.tableExists(),
          this.activitySessions.tableExists(),
          this.users.tableExists()
        ]),
        timeout(10000) // 10 seconds timeout
      ]).catch((error: Error) => {
        console.warn('Database initialization timeout or error:', error.message);
        console.warn('Continuing with initialization to prevent app from getting stuck');
      });
      
      console.log('UnifiedDatabaseManager initialized');
    } catch (error) {
      console.error('Error during database initialization:', error);
      console.warn('Continuing despite initialization error to prevent app from getting stuck');
    }
  }

  /**
   * Sync all data with Supabase
   * @param userId User ID to sync data for
   */
  async syncAllData(userId: string): Promise<void> {
    try {
      console.log(`Syncing all data for user ${userId}...`);
      
      // Sync all entity types
      await Promise.all([
        this.pets.syncToSupabase(),
        this.tasks.syncToSupabase(),
        this.meals.syncToSupabase(),
        this.foodItems.syncToSupabase(),
        this.medications.syncToSupabase(),
        this.healthRecords.syncToSupabase(),
        this.activitySessions.syncToSupabase()
      ]);
      
      console.log('All data synced successfully');
    } catch (error) {
      console.error('Error syncing all data:', error);
      throw error;
    }
  }

  /**
   * Load all data from Supabase
   * @param userId User ID to load data for
   */
  async loadAllData(userId: string): Promise<void> {
    try {
      console.log(`Loading all data for user ${userId}...`);
      
      // Load all entity types
      await Promise.all([
        this.pets.syncFromSupabase(userId),
        this.tasks.syncFromSupabase(userId),
        this.meals.syncFromSupabase(userId),
        this.foodItems.syncFromSupabase(userId),
        this.medications.syncFromSupabase(userId),
        this.healthRecords.syncFromSupabase(userId),
        this.activitySessions.syncFromSupabase(userId)
      ]);
      
      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Error loading all data:', error);
      throw error;
    }
  }

  /**
   * Reset the database
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('Resetting database...');
      
      // Clear all entity types from local storage
      await Promise.all([
        this.clearEntityType(this.pets),
        this.clearEntityType(this.tasks),
        this.clearEntityType(this.meals),
        this.clearEntityType(this.foodItems),
        this.clearEntityType(this.medications),
        this.clearEntityType(this.healthRecords),
        this.clearEntityType(this.activitySessions)
      ]);
      
      console.log('Database reset successfully');
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  /**
   * Clear all entities of a specific type
   * @param manager The DataManager to clear
   */
  private async clearEntityType<T extends BaseEntity>(manager: DataManager<T>): Promise<void> {
    const entities = await manager.getAll();
    for (const entity of entities) {
      await manager.delete(entity.id);
    }
  }
}

// Export singleton instance
export const unifiedDatabaseManager = new UnifiedDatabaseManager(); 