import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { Alert } from 'react-native';

// Use the imported environment variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Log Supabase connection info for debugging (redacting sensitive parts)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (first 10 chars):', supabaseAnonKey?.substring(0, 10) + '...');

// Check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  Alert.alert('Configuration Error', 'Missing Supabase credentials. Please check your .env file.');
}

// Create a custom storage implementation using AsyncStorage
const AsyncStorageWrapper = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  },
};

// Initialize the Supabase client with debug mode
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageWrapper,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    debug: __DEV__, // Enable debug mode in development
  },
});

// Define type safe database interfaces based on your structure
export type Tables = {
  pets: PetTable;
  tasks: TaskTable;
  meals: MealTable;
  food_items: FoodItemTable;
  health_records: HealthRecordTable;
  weight_records: WeightRecordTable;
  users: UserTable;
};

// Define table interfaces matching your database schema
export interface PetTable {
  id: string;
  user_id: string;
  name: string;
  type: string;
  breed: string;
  birth_date: string;
  gender: string;
  weight: number;
  weight_unit: string;
  microchipped: boolean;
  microchip_id?: string;
  neutered: boolean;
  adoption_date?: string;
  color: string;
  image?: string;
  medical_conditions: string[];
  allergies: string[];
  status: string;
  created_at: string;
}

export interface TaskTable {
  id: string;
  pet_id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  schedule_date: string;
  schedule_time: string;
  duration?: number;
  recurring_pattern?: string;
  recurring_days?: number[];
  end_recurrence?: string;
  status: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
}

export interface MealTable {
  id: string;
  pet_id: string;
  date: string;
  time: string;
  type: string;
  total_calories: number;
  amount?: string;
  special_instructions?: string;
  fed_by?: string;
  completed: boolean;
  skipped: boolean;
  skip_reason?: string;
  notes?: string;
  created_at: string;
}

export interface FoodItemTable {
  id: string;
  pet_id: string;
  name: string;
  brand: string;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  fiber: number;
  current_amount: number;
  total_amount: number;
  unit: string;
  daily_feeding_amount: number;
  daily_feeding_unit: string;
  days_remaining: number;
  purchase_date: string;
  expiry_date?: string;
  rating: number;
  pet_preference: string;
  special_notes?: string;
  created_at: string;
}

export interface HealthRecordTable {
  id: string;
  pet_id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  symptoms?: string[];
  diagnosis?: string;
  treatment?: string;
  provider_name: string;
  provider_clinic: string;
  cost: number;
  insurance_covered: boolean;
  follow_up_needed: boolean;
  follow_up_date?: string;
  status: string;
  created_at: string;
}

export interface WeightRecordTable {
  id: string;
  pet_id: string;
  date: string;
  weight: number;
  unit: string;
  notes?: string;
  measured_by?: string;
  body_condition_score?: number;
  created_at: string;
}

export interface UserTable {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  created_at: string;
  last_login?: string;
  is_verified?: boolean;
  role?: string;
  preferences?: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    theme?: string;
  };
  is_new_user?: boolean;
}

// Helper function to convert snake_case to camelCase 
export function snakeToCamel<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel) as unknown as T;
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any) as T;
  }
  return obj as T;
}

// Helper function to convert camelCase to snake_case
export function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
} 