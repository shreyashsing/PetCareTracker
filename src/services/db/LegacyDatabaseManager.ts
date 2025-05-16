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
import { ActivitySessionRepository } from './activitySessionRepository';
import { generateUUID } from '../../utils/helpers';
import { Pet, Task, Meal, FoodItem, Medication, HealthRecord, WeightRecord, ActivitySession, User } from '../../types/components';
import { supabase } from '../supabase';
import { createChatTablesSQL } from './migrations';

/**
 * @deprecated Use UnifiedDatabaseManager instead. This manager is being phased out.
 * Legacy database manager for the application.
 * Provides access to all repositories.
 */
export class LegacyDatabaseManager {
  // Repositories
  pets: PetRepository;
  tasks: TaskRepository;
  meals: MealRepository;
  foodItems: FoodItemRepository;
  healthRecords: HealthRecordRepository;
  medications: MedicationRepository;
  users: UserRepository;
  activitySessions: ActivitySessionRepository;

  constructor() {
    // Initialize repositories
    this.pets = new PetRepository();
    this.tasks = new TaskRepository();
    this.meals = new MealRepository();
    this.foodItems = new FoodItemRepository();
    this.healthRecords = new HealthRecordRepository();
    this.medications = new MedicationRepository();
    this.users = new UserRepository();
    this.activitySessions = new ActivitySessionRepository();
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
      status: "healthy"
    };
    
    await this.pets.create(pet);
    
    // Create health records for the pet
    // Using type assertion to bypass strict type checking for this legacy code
    const healthRecords = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(2023, 0, 15), // January 15, 2023
        type: "vaccination",
        title: "Annual Vaccinations",
        description: "DHPP, Rabies, Bordetella",
        provider: {
          name: "Dr. Sarah Johnson",
          clinic: "Pawsome Veterinary Clinic"
        },
        attachments: [],
        cost: 150,
        insuranceCovered: true,
        followUpNeeded: true,
        status: "completed"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(2023, 3, 5), // April 5, 2023
        type: "checkup",
        title: "Routine Checkup",
        description: "General health assessment",
        provider: {
          name: "Dr. Sarah Johnson",
          clinic: "Pawsome Veterinary Clinic"
        },
        attachments: [],
        cost: 75,
        insuranceCovered: true,
        followUpNeeded: false,
        status: "completed"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(2022, 6, 10), // July 10, 2022
        type: "dental",
        title: "Dental Cleaning",
        description: "Routine dental cleaning and assessment",
        provider: {
          name: "Dr. Michael Chen",
          clinic: "Pawsome Veterinary Clinic"
        },
        attachments: [],
        cost: 200,
        insuranceCovered: true,
        followUpNeeded: false,
        status: "completed"
      }
    ] as unknown as HealthRecord[];
    
    for (const record of healthRecords) {
      await this.healthRecords.create(record);
    }
    
    // Create medications
    // Using type assertion to bypass strict type checking for this legacy code
    const medications = [
      {
        id: generateUUID(),
        petId: petId,
        name: "Apoquel",
        type: "pill",
        dosage: {
          amount: 16,
          unit: "mg"
        },
        frequency: {
          times: 1,
          period: "day",
          specificTimes: ["08:00"]
        },
        duration: {
          startDate: new Date(2023, 2, 15), // March 15, 2023
          endDate: new Date(2023, 8, 30), // September 30, 2023
          indefinite: false
        },
        administrationMethod: "oral",
        prescribedBy: "Dr. Sarah Johnson",
        refillsRemaining: 2,
        refillable: true,
        purpose: "Allergy control",
        status: "active",
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        history: [],
        inventory: {
          currentAmount: 30,
          totalAmount: 30,
          unit: "tablet(s)",
          lowStockThreshold: 5,
          reorderAlert: true
        }
      },
      {
        id: generateUUID(),
        petId: petId,
        name: "Heartgard Plus",
        type: "chewable",
        dosage: {
          amount: 1,
          unit: "tablet(s)"
        },
        frequency: {
          times: 1,
          period: "month",
          specificTimes: ["18:00"]
        },
        duration: {
          startDate: new Date(2023, 0, 1), // January 1, 2023
          indefinite: true
        },
        administrationMethod: "oral",
        prescribedBy: "Dr. Sarah Johnson",
        refillsRemaining: 12,
        refillable: true,
        purpose: "Heartworm prevention",
        status: "active",
        reminderSettings: {
          enabled: true,
          reminderTime: 15
        },
        history: [],
        inventory: {
          currentAmount: 12,
          totalAmount: 12,
          unit: "tablet(s)",
          lowStockThreshold: 2,
          reorderAlert: true
        }
      }
    ] as unknown as Medication[];
    
    for (const medication of medications) {
      await this.medications.create(medication);
    }
    
    // Create tasks
    // Using type assertion to bypass strict type checking for this legacy code
    const tasks = [
      {
        id: generateUUID(),
        petId: petId,
        title: "Grooming Appointment",
        description: "Full grooming service including bath, haircut, nail trim, and ear cleaning",
        category: "grooming",
        priority: "medium",
        scheduleInfo: {
          date: new Date(new Date().setDate(new Date().getDate() + 5)), // 5 days from now
          time: new Date(new Date().setHours(14, 30, 0, 0)), // 2:30 PM
        },
        location: {
          name: "Furry Friends Grooming"
        },
        reminderSettings: {
          enabled: true,
          times: [60],
          notificationType: "push"
        },
        status: "pending"
      },
      {
        id: generateUUID(),
        petId: petId,
        title: "Evening Walk",
        description: "30-minute walk around the neighborhood park",
        category: "exercise",
        priority: "medium",
        scheduleInfo: {
          date: new Date(), // Today
          time: new Date(new Date().setHours(18, 0, 0, 0)), // 6:00 PM
          recurringPattern: "daily"
        },
        reminderSettings: {
          enabled: true,
          times: [15],
          notificationType: "push"
        },
        status: "pending"
      }
    ] as unknown as Task[];
    
    for (const task of tasks) {
      await this.tasks.create(task);
    }
    
    // Create meals
    // Using type assertion to bypass strict type checking for this legacy code
    const meals = [
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
          times: [10],
          notificationType: "push"
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
          times: [15],
          notificationType: "push"
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
          times: [10],
          notificationType: "push"
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
          waterAmount: 250,
          unit: "ml"
        },
        completed: true,
        skipped: false,
        reaction: "good",
        fedBy: "Jane",
        reminderSettings: {
          enabled: true,
          times: [15],
          notificationType: "push"
        },
        recurring: true,
        recurrencePattern: "daily"
      }
    ] as unknown as Meal[];
    
    for (const meal of meals) {
      await this.meals.create(meal);
    }
    
    // Create food items
    // Using type assertion to bypass strict type checking for this legacy code
    const foodItems = [
      {
        id: generateUUID(),
        petId: petId,
        name: "Royal Canin Medium Adult Dry Food",
        brand: "Royal Canin",
        type: "dry",
        mainIngredient: "Chicken",
        caloriesPerServing: 340,
        servingSize: {
          amount: 1,
          unit: "cup",
          caloriesPerServing: 340
        },
        nutritionalInfo: {
          calories: 340,
          protein: 23,
          fat: 12,
          fiber: 3.5,
          ingredients: ["Chicken", "Rice", "Corn", "Wheat"]
        },
        notes: "Main daily food",
        purchaseInfo: {
          store: "Pet Smart",
          price: 64.99,
          size: "15 lb bag"
        },
        expirationDate: new Date(2024, 5, 15), // June 15, 2024
        openedDate: new Date(2023, 8, 1), // September 1, 2023
        inventory: {
          currentAmount: 10,
          totalAmount: 15,
          unit: "lb",
          dailyFeedingAmount: 1,
          dailyFeedingUnit: "cups",
          daysRemaining: 15,
          lowStockThreshold: 3,
          reorderAlert: true
        }
      },
      {
        id: generateUUID(),
        petId: petId,
        name: "Blue Buffalo Wilderness Wet Food",
        brand: "Blue Buffalo",
        type: "wet",
        mainIngredient: "Turkey & Chicken",
        caloriesPerServing: 160,
        servingSize: {
          amount: 0.5,
          unit: "can",
          caloriesPerServing: 160
        },
        nutritionalInfo: {
          calories: 160,
          protein: 10,
          fat: 9,
          fiber: 1.5,
          ingredients: ["Turkey", "Chicken", "Fish Broth", "Carrots"]
        },
        notes: "Mixed with dry food for dinner",
        purchaseInfo: {
          store: "Chewy.com",
          price: 36.99,
          size: "12 pack of 12.5 oz cans"
        },
        expirationDate: new Date(2025, 2, 10), // March 10, 2025
        inventory: {
          currentAmount: 8,
          totalAmount: 12,
          unit: "cans",
          dailyFeedingAmount: 1,
          dailyFeedingUnit: "cans",
          daysRemaining: 8,
          lowStockThreshold: 2,
          reorderAlert: true
        }
      }
    ] as unknown as FoodItem[];
    
    for (const foodItem of foodItems) {
      await this.foodItems.create(foodItem);
    }
    
    // Create activity sessions
    // Using type assertion to bypass strict type checking for this legacy code
    const activitySessions = [
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 1)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(7, 30, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 1)).setHours(8, 0, 0, 0)),
        type: "walk",
        duration: 35,
        distance: 2.1,
        distanceUnit: "km",
        intensity: "moderate",
        notes: "Evening walk around the park. Luna was very energetic and played with two other dogs.",
        weatherConditions: {
          condition: "sunny",
          temperature: 72,
          temperatureUnit: "F",
          humidity: 65
        },
        location: {
          name: "City Park"
        },
        mood: "energetic"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 2)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 0, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 2)).setHours(17, 45, 0, 0)),
        type: "play",
        duration: 25,
        intensity: "high",
        notes: "Played fetch in the backyard. Luna was extremely excited about the new ball.",
        weatherConditions: {
          condition: "cloudy",
          temperature: 68,
          temperatureUnit: "F"
        },
        location: {
          name: "Home"
        },
        mood: "happy"
      },
      {
        id: generateUUID(),
        petId: petId,
        date: new Date(new Date().setDate(new Date().getDate() - 3)),
        startTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 0, 0, 0)),
        endTime: new Date(new Date(new Date().setDate(new Date().getDate() - 3)).setHours(16, 30, 0, 0)),
        type: "training",
        duration: 20,
        intensity: "low",
        notes: "Practiced 'stay' and 'come' commands. Luna is getting better at staying for longer periods.",
        weatherConditions: {
          condition: "sunny",
          temperature: 72,
          temperatureUnit: "F"
        },
        location: {
          name: "Home"
        },
        mood: "energetic"
      }
    ] as unknown as ActivitySession[];
    
    for (const session of activitySessions) {
      await this.activitySessions.create(session);
    }
    
    console.log('Default values set successfully');
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