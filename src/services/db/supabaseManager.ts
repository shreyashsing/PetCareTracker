import { supabase, snakeToCamel, camelToSnake } from '../supabase';
import { generateUUID } from '../../utils/helpers';
import { Pet, Task, Meal, FoodItem, HealthRecord, WeightRecord, User } from '../../types/components';

// Define a helper function to maintain the same API
const uuidv4 = generateUUID;

// Define the service for managing pets
const petService = {
  async getAll(): Promise<Pet[]> {
    const { data, error } = await supabase.from('pets').select('*');
    
    if (error) {
      console.error('Error fetching pets:', error);
      throw error;
    }
    
    return snakeToCamel<Pet[]>(data || []);
  },
  
  async getById(id: string): Promise<Pet | null> {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching pet with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<Pet>(data) : null;
  },
  
  async findByUserId(userId: string): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error(`Error fetching pets for user ${userId}:`, error);
      throw error;
    }
    
    return snakeToCamel<Pet[]>(data || []);
  },
  
  async create(pet: Omit<Pet, 'id'>): Promise<Pet> {
    const newPet = {
      ...camelToSnake(pet),
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('pets')
      .insert([newPet])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating pet:', error);
      throw error;
    }
    
    return snakeToCamel<Pet>(data);
  },
  
  async update(id: string, pet: Partial<Pet>): Promise<Pet> {
    const { data, error } = await supabase
      .from('pets')
      .update(camelToSnake(pet))
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating pet with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<Pet>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting pet with ID ${id}:`, error);
      throw error;
    }
  },
  
  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    
    if (error) {
      console.error(`Error checking if pet with ID ${id} exists:`, error);
      return false;
    }
    
    return count !== null && count > 0;
  }
};

// Define the service for managing tasks
const taskService = {
  async getAll(): Promise<Task[]> {
    const { data, error } = await supabase.from('tasks').select('*');
    
    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
    
    return snakeToCamel<Task[]>(data || []);
  },
  
  async getById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching task with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<Task>(data) : null;
  },
  
  async getByPetId(petId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('pet_id', petId);
    
    if (error) {
      console.error(`Error fetching tasks for pet ${petId}:`, error);
      throw error;
    }
    
    return snakeToCamel<Task[]>(data || []);
  },
  
  async getByPetIdAndDate(petId: string, date: Date): Promise<Task[]> {
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('pet_id', petId)
      .eq('schedule_date', dateString);
    
    if (error) {
      console.error(`Error fetching tasks for pet ${petId} on date ${dateString}:`, error);
      throw error;
    }
    
    return snakeToCamel<Task[]>(data || []);
  },
  
  async create(task: Omit<Task, 'id'>): Promise<Task> {
    const taskData = camelToSnake(task);
    
    // Convert date objects to ISO strings
    if (task.scheduleInfo?.date instanceof Date) {
      taskData.schedule_date = task.scheduleInfo.date.toISOString().split('T')[0];
    }
    if (task.scheduleInfo?.time instanceof Date) {
      taskData.schedule_time = task.scheduleInfo.time.toISOString().split('T')[1].substring(0, 8);
    }
    
    const newTask = {
      ...taskData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }
    
    return snakeToCamel<Task>(data);
  },
  
  async update(id: string, task: Partial<Task>): Promise<Task> {
    const taskData = camelToSnake(task);
    
    // Convert date objects to ISO strings if they exist
    if (task.scheduleInfo?.date instanceof Date) {
      taskData.schedule_date = task.scheduleInfo.date.toISOString().split('T')[0];
    }
    if (task.scheduleInfo?.time instanceof Date) {
      taskData.schedule_time = task.scheduleInfo.time.toISOString().split('T')[1].substring(0, 8);
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating task with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<Task>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting task with ID ${id}:`, error);
      throw error;
    }
  },
  
  async markAsCompleted(id: string): Promise<Task> {
    const completionDetails = {
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .update(completionDetails)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error marking task ${id} as completed:`, error);
      throw error;
    }
    
    return snakeToCamel<Task>(data);
  }
};

// Define the service for managing meals
const mealService = {
  async getAll(): Promise<Meal[]> {
    const { data, error } = await supabase.from('meals').select('*');
    
    if (error) {
      console.error('Error fetching meals:', error);
      throw error;
    }
    
    return snakeToCamel<Meal[]>(data || []);
  },
  
  async getById(id: string): Promise<Meal | null> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching meal with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<Meal>(data) : null;
  },
  
  async getByPetId(petId: string): Promise<Meal[]> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('pet_id', petId);
    
    if (error) {
      console.error(`Error fetching meals for pet ${petId}:`, error);
      throw error;
    }
    
    return snakeToCamel<Meal[]>(data || []);
  },
  
  async getByPetIdAndDate(petId: string, date: Date): Promise<Meal[]> {
    const dateString = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('pet_id', petId)
      .eq('date', dateString);
    
    if (error) {
      console.error(`Error fetching meals for pet ${petId} on date ${dateString}:`, error);
      throw error;
    }
    
    return snakeToCamel<Meal[]>(data || []);
  },
  
  async create(meal: Omit<Meal, 'id'>): Promise<Meal> {
    const mealData = camelToSnake(meal);
    
    // Convert date objects to ISO strings
    if (meal.date instanceof Date) {
      mealData.date = meal.date.toISOString().split('T')[0];
    }
    if (meal.time instanceof Date) {
      mealData.time = meal.time.toISOString().split('T')[1].substring(0, 8);
    }
    
    const newMeal = {
      ...mealData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('meals')
      .insert([newMeal])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating meal:', error);
      throw error;
    }
    
    return snakeToCamel<Meal>(data);
  },
  
  async update(id: string, meal: Partial<Meal>): Promise<Meal> {
    const mealData = camelToSnake(meal);
    
    // Convert date objects to ISO strings if they exist
    if (meal.date instanceof Date) {
      mealData.date = meal.date.toISOString().split('T')[0];
    }
    if (meal.time instanceof Date) {
      mealData.time = meal.time.toISOString().split('T')[1].substring(0, 8);
    }
    
    const { data, error } = await supabase
      .from('meals')
      .update(mealData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating meal with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<Meal>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting meal with ID ${id}:`, error);
      throw error;
    }
  },
  
  async markAsCompleted(id: string): Promise<Meal> {
    const { data, error } = await supabase
      .from('meals')
      .update({ completed: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error marking meal ${id} as completed:`, error);
      throw error;
    }
    
    return snakeToCamel<Meal>(data);
  }
};

// Define the service for managing food items
const foodItemService = {
  async getAll(): Promise<FoodItem[]> {
    const { data, error } = await supabase.from('food_items').select('*');
    
    if (error) {
      console.error('Error fetching food items:', error);
      throw error;
    }
    
    return snakeToCamel<FoodItem[]>(data || []);
  },
  
  async getById(id: string): Promise<FoodItem | null> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching food item with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<FoodItem>(data) : null;
  },
  
  async getByPetId(petId: string): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('pet_id', petId);
    
    if (error) {
      console.error(`Error fetching food items for pet ${petId}:`, error);
      throw error;
    }
    
    return snakeToCamel<FoodItem[]>(data || []);
  },
  
  async create(foodItem: Omit<FoodItem, 'id'>): Promise<FoodItem> {
    const foodItemData = camelToSnake(foodItem);
    
    // Convert date objects to ISO strings
    if (foodItem.purchaseDetails?.date instanceof Date) {
      foodItemData.purchase_date = foodItem.purchaseDetails.date.toISOString().split('T')[0];
    }
    if (foodItem.purchaseDetails?.expiryDate instanceof Date) {
      foodItemData.expiry_date = foodItem.purchaseDetails.expiryDate.toISOString().split('T')[0];
    }
    
    const newFoodItem = {
      ...foodItemData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('food_items')
      .insert([newFoodItem])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating food item:', error);
      throw error;
    }
    
    return snakeToCamel<FoodItem>(data);
  },
  
  async update(id: string, foodItem: Partial<FoodItem>): Promise<FoodItem> {
    const foodItemData = camelToSnake(foodItem);
    
    // Convert date objects to ISO strings if they exist
    if (foodItem.purchaseDetails?.date instanceof Date) {
      foodItemData.purchase_date = foodItem.purchaseDetails.date.toISOString().split('T')[0];
    }
    if (foodItem.purchaseDetails?.expiryDate instanceof Date) {
      foodItemData.expiry_date = foodItem.purchaseDetails.expiryDate.toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .from('food_items')
      .update(foodItemData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating food item with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<FoodItem>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting food item with ID ${id}:`, error);
      throw error;
    }
  }
};

// Define the service for managing health records
const healthRecordService = {
  async getAll(): Promise<HealthRecord[]> {
    const { data, error } = await supabase.from('health_records').select('*');
    
    if (error) {
      console.error('Error fetching health records:', error);
      throw error;
    }
    
    return snakeToCamel<HealthRecord[]>(data || []);
  },
  
  async getById(id: string): Promise<HealthRecord | null> {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching health record with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<HealthRecord>(data) : null;
  },
  
  async getByPetId(petId: string): Promise<HealthRecord[]> {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('pet_id', petId);
    
    if (error) {
      console.error(`Error fetching health records for pet ${petId}:`, error);
      throw error;
    }
    
    return snakeToCamel<HealthRecord[]>(data || []);
  },
  
  async create(healthRecord: Omit<HealthRecord, 'id'>): Promise<HealthRecord> {
    const healthRecordData = camelToSnake(healthRecord);
    
    // Convert date objects to ISO strings
    if (healthRecord.date instanceof Date) {
      healthRecordData.date = healthRecord.date.toISOString().split('T')[0];
    }
    if (healthRecord.followUpDate instanceof Date) {
      healthRecordData.follow_up_date = healthRecord.followUpDate.toISOString().split('T')[0];
    }
    
    const newHealthRecord = {
      ...healthRecordData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('health_records')
      .insert([newHealthRecord])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating health record:', error);
      throw error;
    }
    
    return snakeToCamel<HealthRecord>(data);
  },
  
  async update(id: string, healthRecord: Partial<HealthRecord>): Promise<HealthRecord> {
    const healthRecordData = camelToSnake(healthRecord);
    
    // Convert date objects to ISO strings if they exist
    if (healthRecord.date instanceof Date) {
      healthRecordData.date = healthRecord.date.toISOString().split('T')[0];
    }
    if (healthRecord.followUpDate instanceof Date) {
      healthRecordData.follow_up_date = healthRecord.followUpDate.toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .from('health_records')
      .update(healthRecordData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating health record with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<HealthRecord>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('health_records')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting health record with ID ${id}:`, error);
      throw error;
    }
  }
};

// Define the service for managing weight records
const weightRecordService = {
  async getAll(): Promise<WeightRecord[]> {
    const { data, error } = await supabase.from('weight_records').select('*');
    
    if (error) {
      console.error('Error fetching weight records:', error);
      throw error;
    }
    
    return snakeToCamel<WeightRecord[]>(data || []);
  },
  
  async getById(id: string): Promise<WeightRecord | null> {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching weight record with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<WeightRecord>(data) : null;
  },
  
  async getByPetId(petId: string): Promise<WeightRecord[]> {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error(`Error fetching weight records for pet ${petId}:`, error);
      throw error;
    }
    
    return snakeToCamel<WeightRecord[]>(data || []);
  },
  
  async create(weightRecord: Omit<WeightRecord, 'id'>): Promise<WeightRecord> {
    const weightRecordData = camelToSnake(weightRecord);
    
    // Convert date objects to ISO strings
    if (weightRecord.date instanceof Date) {
      weightRecordData.date = weightRecord.date.toISOString().split('T')[0];
    }
    
    const newWeightRecord = {
      ...weightRecordData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('weight_records')
      .insert([newWeightRecord])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating weight record:', error);
      throw error;
    }
    
    return snakeToCamel<WeightRecord>(data);
  },
  
  async update(id: string, weightRecord: Partial<WeightRecord>): Promise<WeightRecord> {
    const weightRecordData = camelToSnake(weightRecord);
    
    // Convert date objects to ISO strings if they exist
    if (weightRecord.date instanceof Date) {
      weightRecordData.date = weightRecord.date.toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .from('weight_records')
      .update(weightRecordData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating weight record with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<WeightRecord>(data);
  },
  
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('weight_records')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting weight record with ID ${id}:`, error);
      throw error;
    }
  }
};

// Define the service for managing users
const userService = {
  async getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    
    if (!data.user) {
      return null;
    }
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (error) {
      console.error(`Error fetching current user data:`, error);
      return null;
    }
    
    return userData ? snakeToCamel<User>(userData) : null;
  },
  
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching user with ID ${id}:`, error);
      return null;
    }
    
    return data ? snakeToCamel<User>(data) : null;
  },
  
  async update(id: string, user: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(camelToSnake(user))
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating user with ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<User>(data);
  },
  
  async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User> {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching user preferences for ID ${id}:`, fetchError);
      throw fetchError;
    }
    
    const updatedPreferences = {
      ...(userData?.preferences || {}),
      ...preferences,
    };
    
    const { data, error } = await supabase
      .from('users')
      .update({ preferences: updatedPreferences })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating user preferences for ID ${id}:`, error);
      throw error;
    }
    
    return snakeToCamel<User>(data);
  },
};

// Export the database manager
export const supabaseManager = {
  pets: petService,
  tasks: taskService,
  meals: mealService,
  foodItems: foodItemService,
  healthRecords: healthRecordService,
  weightRecords: weightRecordService,
  users: userService,
}; 