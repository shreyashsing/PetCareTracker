// Database services
export * from './asyncStorage';
export * from './constants';
export * from './repository';

// Entity-specific repositories
export * from './petRepository';
export * from './taskRepository';
export * from './mealRepository';
export * from './foodItemRepository';
export * from './healthRecordRepository';
export * from './medicationRepository';
export * from './userRepository';

// Database manager
import { AsyncStorageService } from './asyncStorage';
import { STORAGE_KEYS } from './constants';
import { FoodItemRepository } from './foodItemRepository';
import { HealthRecordRepository } from './healthRecordRepository';
import { MealRepository } from './mealRepository';
import { MedicationRepository } from './medicationRepository';
import { PetRepository } from './petRepository';
import { TaskRepository } from './taskRepository';
import { UserRepository } from './userRepository';
import { generateUUID } from '../../utils/helpers';
import { Pet, Task, Meal, FoodItem, Medication, HealthRecord, WeightRecord, ActivitySession, User } from '../../types/components';
import { supabase } from '../supabase';
import { createChatTablesSQL } from './migrations';

/**
 * Database manager class for initializing repositories and handling app data
 */
export class DatabaseManager {
  // Repositories
  pets: PetRepository;
  tasks: TaskRepository;
  meals: MealRepository;
  foodItems: FoodItemRepository;
  healthRecords: HealthRecordRepository;
  medications: MedicationRepository;
  users: UserRepository;

  constructor() {
    // Initialize repositories
    this.pets = new PetRepository();
    this.tasks = new TaskRepository();
    this.meals = new MealRepository();
    this.foodItems = new FoodItemRepository();
    this.healthRecords = new HealthRecordRepository();
    this.medications = new MedicationRepository();
    this.users = new UserRepository();
  }

  /**
   * Initialize the database with default values if needed
   */
  async initialize(): Promise<void> {
    try {
      // Check if it's the first run
      const hasData = await AsyncStorageService.getItem<boolean>('dbInitialized');
      
      // Import here to avoid circular dependency
      const { runMigrations } = require('./migrations');
      
      // Set a timeout to prevent hanging
      const initPromise = new Promise<void>(async (resolve, reject) => {
        try {
          if (!hasData) {
            console.log('First run, initializing database...');
            
            // Check if any pets already exist
            const existingPets = await this.pets.getAll();
            
            // Only set default values if no pets exist
            if (existingPets.length === 0) {
              await this.setDefaultValues();
            } else {
              console.log('Pets already exist, skipping default pet creation');
            }
            
            await AsyncStorageService.setItem('dbInitialized', true);
          }
          
          // Run migrations regardless of initialization status
          // This ensures database schema is up to date
          await runMigrations();
          
          resolve();
        } catch (err) {
          console.error('Error in database initialization:', err);
          reject(err);
        }
      });
      
      // Set 5 second timeout to prevent hanging
      const timeoutPromise = new Promise<void>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Database initialization timed out')), 5000);
      });
      
      // Use Promise.race to implement timeout
      await Promise.race([initPromise, timeoutPromise]);
      
    } catch (error) {
      console.error('Error initializing database:', error);
      // Throw error only for critical failures
      if (error instanceof Error && error.message.includes('timed out')) {
        throw error;
      }
    }
  }

  /**
   * Set default values for the database
   */
  private async setDefaultValues(): Promise<void> {
    // Generate a unique pet ID that we'll use for all related entities
    const petId = generateUUID();
    const userId = "123"; // Default user ID from the demo user
    
    // Create pet profile
    const pet: Pet = {
      id: petId,
      userId: userId, // Associate with the default user
      name: "Luna",
      type: "dog",
      breed: "Golden Retriever",
      birthDate: new Date(2021, 3, 15), // April 15, 2021
      gender: "female",
      weight: 28.5,
      weightUnit: "kg",
      microchipped: true,
      microchipId: "9834762583",
      neutered: true,
      adoptionDate: new Date(2021, 5, 20), // June 20, 2021
      color: "Golden",
      image: "https://images.unsplash.com/photo-1552053831-71594a27632d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1924&q=80",
      medicalConditions: ["Mild hip dysplasia", "Seasonal allergies"],
      allergies: ["Chicken", "Certain grass pollens"],
      veterinarian: {
        name: "Dr. Sarah Johnson",
        phone: "555-123-4567",
        clinic: "Pawsome Veterinary Clinic"
      },
      insuranceInfo: {
        provider: "PetProtect Insurance",
        policyNumber: "PP-76543210",
        expiryDate: new Date(2023, 11, 31) // December 31, 2023
      },
      status: "healthy"
    };
    
    // Create tasks for the pet
    const tasks: Task[] = [
      {
        id: generateUUID(),
        petId: petId,
        title: "Morning Walk",
        description: "30-minute walk in the neighborhood park",
        category: "exercise",
        priority: "medium",
        scheduleInfo: {
          date: new Date(),
          time: new Date(new Date().setHours(7, 30, 0, 0)),
          duration: 30,
          recurringPattern: "daily",
          recurringDays: [0, 1, 2, 3, 4, 5, 6],
        },
        reminderSettings: {
          enabled: true,
          times: [15],
          notificationType: "both"
        },
        status: "pending"
      },
      {
        id: generateUUID(),
        petId: petId,
        title: "Medication Time",
        description: "Administer allergy medication",
        category: "medication",
        priority: "high",
        scheduleInfo: {
          date: new Date(),
          time: new Date(new Date().setHours(8, 0, 0, 0)),
          recurringPattern: "daily",
        },
        reminderSettings: {
          enabled: true,
          times: [10, 5],
          notificationType: "push"
        },
        status: "pending"
      },
      {
        id: generateUUID(),
        petId: petId,
        title: "Grooming Session",
        description: "Brush coat and clean ears",
        category: "grooming",
        priority: "medium",
        scheduleInfo: {
          date: new Date(new Date().setDate(new Date().getDate() + 2)),
          time: new Date(new Date().setHours(17, 0, 0, 0)),
          duration: 45,
          recurringPattern: "weekly",
        },
        reminderSettings: {
          enabled: true,
          times: [60],
          notificationType: "both"
        },
        status: "pending"
      },
      {
        id: generateUUID(),
        petId: petId,
        title: "Vet Checkup",
        description: "Annual wellness examination",
        category: "veterinary",
        priority: "high",
        scheduleInfo: {
          date: new Date(new Date().setDate(new Date().getDate() + 14)),
          time: new Date(new Date().setHours(10, 15, 0, 0)),
          duration: 60,
        },
        location: {
          name: "Pawsome Veterinary Clinic",
          address: "123 Main Street, Anytown, USA"
        },
        reminderSettings: {
          enabled: true,
          times: [1440, 120], // 1 day and 2 hours before
          notificationType: "both"
        },
        status: "pending"
      },
      {
        id: generateUUID(),
        petId: petId,
        title: "Training Session",
        description: "Practice recall commands and leash training",
        category: "training",
        priority: "medium",
        scheduleInfo: {
          date: new Date(new Date().setDate(new Date().getDate() + 1)),
          time: new Date(new Date().setHours(16, 0, 0, 0)),
          duration: 45,
          recurringPattern: "weekdays",
        },
        reminderSettings: {
          enabled: true,
          times: [30],
          notificationType: "push"
        },
        status: "pending"
      }
    ];
    
    // Create food items
    const foodItems: FoodItem[] = [
      // Dummy food items have been removed
    ];
    
    // Create meals
    const meals: Meal[] = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(),
        time: new Date(new Date().setHours(7, 0, 0, 0)),
        type: "breakfast",
        foods: [],
        totalCalories: 0,
        hydration: {
          waterAmount: 200,
          unit: "ml"
        },
        completed: true,
        skipped: false,
        reaction: "good",
        fedBy: "Jane",
        reminderSettings: {
          enabled: true,
          reminderTime: 10
        },
        recurring: true,
        recurrencePattern: "daily"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(),
        time: new Date(new Date().setHours(18, 0, 0, 0)),
        type: "dinner",
        foods: [],
        totalCalories: 0,
        hydration: {
          waterAmount: 250,
          unit: "ml"
        },
        specialInstructions: "Mix wet and dry food thoroughly",
        completed: false,
        skipped: false,
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        recurring: true,
        recurrencePattern: "daily"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 1)),
        time: new Date(new Date().setHours(7, 0, 0, 0)),
        type: "breakfast",
        foods: [],
        totalCalories: 0,
        hydration: {
          waterAmount: 200,
          unit: "ml"
        },
        completed: true,
        skipped: false,
        reaction: "good",
        fedBy: "John",
        reminderSettings: {
          enabled: true,
          reminderTime: 10
        },
        recurring: true,
        recurrencePattern: "daily"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 1)),
        time: new Date(new Date().setHours(18, 0, 0, 0)),
        type: "dinner",
        foods: [],
        totalCalories: 0,
        hydration: {
          waterAmount: 200,
          unit: "ml"
        },
        completed: true,
        skipped: false,
        reaction: "good",
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        recurring: true,
        recurrencePattern: "daily"
      }
    ];
    
    // Create medications
    const medications: Medication[] = [
      {
        id: generateUUID(),
        petId: petId,
        name: "Zyrtec (Cetirizine)",
        genericName: "Cetirizine",
        type: "pill",
        dosage: {
          amount: 1,
          unit: "tablet(s)"
        },
        frequency: {
          times: 1,
          period: "day",
          specificTimes: ["08:00"]
        },
        duration: {
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 2)),
          indefinite: true
        },
        administrationMethod: "oral",
        prescribedBy: "Dr. Sarah Johnson",
        prescriptionNumber: "RX-78292",
        pharmacy: "PetMeds",
        refillable: true,
        refillsRemaining: 3,
        purpose: "Control seasonal allergies",
        sideEffects: ["Drowsiness", "Dry mouth"],
        specialInstructions: "Give with food if stomach upset occurs",
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        history: [
          {
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            administered: true,
            skipped: false,
            administeredBy: "Jane"
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 2)),
            administered: true,
            skipped: false,
            administeredBy: "John"
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 3)),
            administered: true,
            skipped: false,
            administeredBy: "Jane"
          }
        ],
        status: "active",
        inventory: {
          currentAmount: 25,
          totalAmount: 30,
          unit: "tablet(s)",
          lowStockThreshold: 5,
          reorderAlert: true
        }
      },
      {
        id: generateUUID(),
        petId: petId,
        name: "Joint Support Supplement",
        type: "chewable",
        dosage: {
          amount: 2,
          unit: "tablet(s)"
        },
        frequency: {
          times: 1,
          period: "day",
          specificTimes: ["18:00"]
        },
        duration: {
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          indefinite: true
        },
        administrationMethod: "oral",
        prescribedBy: "Dr. Sarah Johnson",
        purpose: "Support joint health and mobility",
        specialInstructions: "Can be given as a treat",
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        history: [
          {
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
            administered: true,
            skipped: false,
            administeredBy: "Jane"
          },
          {
            date: new Date(new Date().setDate(new Date().getDate() - 2)),
            administered: true,
            skipped: false,
            administeredBy: "John"
          }
        ],
        status: "active",
        refillable: true,
        inventory: {
          currentAmount: 38,
          totalAmount: 60,
          unit: "tablet(s)",
          lowStockThreshold: 10,
          reorderAlert: true
        }
      }
    ];
    
    // Create health records
    const healthRecords: HealthRecord[] = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        type: "checkup",
        title: "Annual Wellness Exam",
        description: "Comprehensive physical examination and vaccinations",
        diagnosis: "Healthy with mild hip dysplasia noted",
        treatment: "Continue joint supplements, maintain healthy weight",
        medications: [
          {
            name: "Rabies Vaccine",
            dosage: "1 dose",
            frequency: "Annual",
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 6))
          },
          {
            name: "DHPP Vaccine",
            dosage: "1 dose",
            frequency: "3 years",
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        ],
        labResults: [
          {
            name: "Complete Blood Count",
            value: "Normal",
            unit: "",
            normalRange: "Within range"
          },
          {
            name: "Chemistry Panel",
            value: "Normal",
            unit: "",
            normalRange: "Within range"
          }
        ],
        provider: {
          name: "Dr. Sarah Johnson",
          specialty: "General Veterinary Medicine",
          clinic: "Pawsome Veterinary Clinic",
          phone: "555-123-4567",
          email: "dr.johnson@pawsome.vet"
        },
        cost: 250,
        insuranceCovered: true,
        followUpNeeded: true,
        followUpDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        status: "completed"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        type: "specialized",
        title: "Dermatology Consultation",
        description: "Evaluation for seasonal skin irritation and allergies",
        symptoms: ["Itching", "Redness around paws", "Ear irritation"],
        diagnosis: "Seasonal environmental allergies",
        treatment: "Daily antihistamine, limited exposure to allergens, special shampoo",
        medications: [
          {
            name: "Zyrtec (Cetirizine)",
            dosage: "10mg",
            frequency: "Once daily",
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 3))
          },
          {
            name: "Medicated Shampoo",
            dosage: "As needed",
            frequency: "Twice monthly",
            startDate: new Date(new Date().setMonth(new Date().getMonth() - 3))
          }
        ],
        provider: {
          name: "Dr. Amy Lee",
          specialty: "Veterinary Dermatology",
          clinic: "Animal Skin Specialists",
          phone: "555-987-6543"
        },
        cost: 175,
        insuranceCovered: true,
        followUpNeeded: true,
        followUpDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        status: "completed"
      }
    ];
    
    // Create weight records
    const weightRecords: WeightRecord[] = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        weight: 27.5,
        unit: "kg",
        measuredBy: "Dr. Sarah Johnson",
        bodyConditionScore: 5
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        weight: 28,
        unit: "kg",
        measuredBy: "Dr. Amy Lee",
        bodyConditionScore: 5
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 7)),
        weight: 28.5,
        unit: "kg",
        measuredBy: "Jane",
        notes: "Home measurement on bathroom scale",
        bodyConditionScore: 5
      }
    ];
    
    // Create activity sessions
    const activitySessions: ActivitySession[] = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 1)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(7, 30, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(8, 0, 0, 0)),
        type: "walk",
        duration: 30,
        distance: 2.1,
        distanceUnit: "km",
        intensity: "moderate",
        location: {
          name: "Neighborhood Park"
        },
        weatherConditions: {
          temperature: 18,
          temperatureUnit: "C",
          condition: "sunny",
          humidity: 65
        },
        mood: "energetic",
        caloriesBurned: 120
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 2)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 0, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 45, 0, 0)),
        type: "play",
        duration: 45,
        intensity: "high",
        location: {
          name: "Backyard"
        },
        weatherConditions: {
          temperature: 22,
          temperatureUnit: "C",
          condition: "cloudy"
        },
        companions: ["Max", "Bella"],
        notes: "Played fetch and tug-of-war with neighboring dogs",
        mood: "happy",
        caloriesBurned: 180
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 3)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 0, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 30, 0, 0)),
        type: "training",
        duration: 30,
        intensity: "moderate",
        location: {
          name: "Home"
        },
        notes: "Practiced recall commands and leash walking",
        mood: "energetic",
        caloriesBurned: 90
      }
    ];
    
    // Save all the data to AsyncStorage
    await AsyncStorageService.setItem(STORAGE_KEYS.PETS, [pet]);
    await AsyncStorageService.setItem(STORAGE_KEYS.TASKS, tasks);
    await AsyncStorageService.setItem(STORAGE_KEYS.MEALS, meals);
    await AsyncStorageService.setItem(STORAGE_KEYS.FOOD_ITEMS, foodItems);
    await AsyncStorageService.setItem(STORAGE_KEYS.MEDICATIONS, medications);
    await AsyncStorageService.setItem(STORAGE_KEYS.HEALTH_RECORDS, healthRecords);
    await AsyncStorageService.setItem(STORAGE_KEYS.WEIGHT_RECORDS, weightRecords);
    await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVITY_SESSIONS, activitySessions);
    
    // Set this pet as the active pet
    await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petId);
  }

  /**
   * Reset the database to its initial state
   */
  async resetDatabase(): Promise<void> {
    try {
      await AsyncStorageService.clear();
      await this.setDefaultValues();
      await AsyncStorageService.setItem('dbInitialized', true);
      console.log('Database reset completed');
    } catch (error) {
      console.error('Error resetting database:', error);
    }
  }

  /**
   * Export the database to a JSON string
   * @returns Database as a JSON string
   */
  async exportDatabase(): Promise<string> {
    try {
      const exportData: Record<string, any> = {};
      
      // Get all keys
      const keys = await AsyncStorageService.getAllKeys();
      
      // Get all data
      for (const key of keys) {
        exportData[key] = await AsyncStorageService.getItem(key);
      }
      
      return JSON.stringify(exportData);
    } catch (error) {
      console.error('Error exporting database:', error);
      throw error;
    }
  }

  /**
   * Import data from a JSON string
   * @param jsonData JSON string containing database data
   */
  async importDatabase(jsonData: string): Promise<void> {
    try {
      // Parse the data
      const importData = JSON.parse(jsonData);
      
      // Clear the existing database
      await AsyncStorageService.clear();
      
      // Import each key-value pair
      for (const [key, value] of Object.entries(importData)) {
        await AsyncStorageService.setItem(key, value);
      }
      
      console.log('Database import completed');
    } catch (error) {
      console.error('Error importing database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

/**
 * Migrates existing pets that don't have a userId to assign them to the given user
 * @param userId The ID of the user to assign pets to
 * @returns Promise that resolves when migration is complete
 */
export async function migratePetsToUser(userId: string): Promise<void> {
  try {
    console.log(`Migrating pets without userId to user: ${userId}`);
    const allPets = await databaseManager.pets.getAll();
    
    // Find pets without a userId field
    const petsToMigrate = allPets.filter(pet => !pet.userId);
    
    if (petsToMigrate.length > 0) {
      console.log(`Found ${petsToMigrate.length} pets without userId, assigning to current user`);
      
      // Update each pet with the user ID
      for (const pet of petsToMigrate) {
        await databaseManager.pets.update(pet.id, { userId });
      }
      
      console.log(`Migration complete: ${petsToMigrate.length} pets updated with userId: ${userId}`);
    } else {
      console.log('No pets need migration');
    }
  } catch (error) {
    console.error('Error migrating pets:', error);
  }
}

/**
 * Create the chat tables if they don't exist
 */
export const createChatTables = async (): Promise<boolean> => {
  try {
    // Check if chat_sessions table exists
    const { error: sessionsError } = await supabase.from('chat_sessions').select('count').limit(1);
    
    if (sessionsError && sessionsError.code === '42P01') {
      console.log('Chat tables not found. You need to create them in Supabase.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createChatTablesSQL);
      
      // Alert the user
      alert(`The Pet Assistant requires database tables that don't exist yet. 
      
Please log into the Supabase dashboard and run the SQL shown in the console to create the required tables.`);
      
      return false;
    }
    
    // Check if chat_messages table exists 
    const { error: messagesError } = await supabase.from('chat_messages').select('count').limit(1);
    
    if (messagesError && messagesError.code === '42P01') {
      console.log('Chat messages table not found but sessions table exists. Running SQL to create it.');
      console.log('Run the following SQL in the Supabase SQL Editor:');
      console.log(createChatTablesSQL);
      
      // Alert the user
      alert(`The Pet Assistant requires the chat_messages table. 
      
Please log into the Supabase dashboard and run the SQL shown in the console to create the required tables.`);
      
      return false;
    }
    
    // Both tables exist
    return !sessionsError && !messagesError;
  } catch (error) {
    console.error('Error checking for chat tables:', error);
    return false;
  }
}; 