import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

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

// Session lock mechanism to prevent concurrent operations
let sessionLock = false;
let sessionLockPromise: Promise<void> | null = null;
let sessionLockResolve: (() => void) | null = null;
let sessionLockTimer: NodeJS.Timeout | null = null;
const SESSION_LOCK_TIMEOUT = 5000; // 5 seconds max lock time

/**
 * Acquire a lock for session operations
 * @returns A promise that resolves when the lock is acquired
 */
const acquireSessionLock = async (): Promise<void> => {
  if (!sessionLock) {
    sessionLock = true;
    console.log('Supabase: Session lock acquired');
    
    // Set a safety timeout to release the lock if it's held too long
    sessionLockTimer = setTimeout(() => {
      console.warn('Supabase: Session lock held too long, forcing release');
      releaseSessionLock();
    }, SESSION_LOCK_TIMEOUT);
    
    return Promise.resolve();
  }
  
  console.log('Supabase: Waiting for session lock');
  
  if (!sessionLockPromise) {
    sessionLockPromise = new Promise<void>((resolve) => {
      sessionLockResolve = resolve;
    });
  }
  
  // Set a timeout for waiting for the lock
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Timed out waiting for session lock'));
    }, 3000); // 3 second timeout for waiting
  });
  
  try {
    // Race between getting the lock and timing out
    await Promise.race([sessionLockPromise, timeoutPromise]);
    console.log('Supabase: Session lock acquired after waiting');
    return;
  } catch (error) {
    console.warn('Supabase: Failed to acquire session lock, proceeding anyway');
    // Force release the lock to prevent deadlock
    releaseSessionLock();
    return Promise.resolve();
  }
};

/**
 * Release the session lock
 */
const releaseSessionLock = (): void => {
  // Clear the safety timeout
  if (sessionLockTimer) {
    clearTimeout(sessionLockTimer);
    sessionLockTimer = null;
  }
  
  if (sessionLockResolve) {
    sessionLockResolve();
    sessionLockPromise = null;
    sessionLockResolve = null;
  }
  
  sessionLock = false;
  console.log('Supabase: Session lock released');
};

// Create a custom storage implementation using AsyncStorage with enhanced error handling
const AsyncStorageWrapper = {
  getItem: async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(`Supabase Storage: Retrieved key ${key.substring(0, 15)}...`);
      return value;
    } catch (error) {
      console.error('Supabase Storage: Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
      console.log(`Supabase Storage: Stored key ${key.substring(0, 15)}...`);
    } catch (error) {
      console.error('Supabase Storage: Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`Supabase Storage: Removed key ${key.substring(0, 15)}...`);
    } catch (error) {
      console.error('Supabase Storage: Error removing item from AsyncStorage:', error);
    }
  },
};

// Initialize the Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageWrapper,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: __DEV__, // Enable debug mode in development
  },
  global: {
    headers: {
      'X-Client-Info': `pet-care-tracker-mobile/${Platform.OS}`,
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced session checking utility with lock mechanism
export const checkSession = async (): Promise<boolean> => {
  try {
    console.log('Supabase: Checking session status...');
    
    // Acquire lock before accessing the session
    await acquireSessionLock();
    
    try {
      // Check network connectivity first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.warn('Supabase: Network appears to be offline, session check may fail');
      }
      
      // Set a timeout for the session check
      const sessionCheckPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Session check timed out'));
        }, 3000); // 3 second timeout
      });
      
      const { data: { session }, error } = await Promise.race([
        sessionCheckPromise,
        timeoutPromise
      ]).catch(error => {
        console.warn('Supabase: Session check timed out:', error.message);
        return { data: { session: null }, error: null };
      });
      
      if (error) {
        console.error('Supabase: Session check error:', error);
        return false;
      }
      
      if (!session) {
        console.warn('Supabase: No active session found');
        return false;
      }
      
      // Verify token has not expired
      const tokenExpiry = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      
      if (tokenExpiry && tokenExpiry < now) {
        console.warn('Supabase: Session has expired, needs refresh');
        
        // Try to refresh with timeout
        const refreshPromise = supabase.auth.refreshSession();
        const refreshTimeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Session refresh timed out'));
          }, 3000); // 3 second timeout
        });
        
        const { data: refresh, error: refreshError } = await Promise.race([
          refreshPromise,
          refreshTimeoutPromise
        ]).catch(error => {
          console.warn('Supabase: Session refresh timed out:', error.message);
          return { data: { session: null }, error: null };
        });
        
        if (refreshError || !refresh.session) {
          console.error('Supabase: Failed to refresh expired session:', refreshError);
          return false;
        }
        
        console.log('Supabase: Successfully refreshed expired session');
        return true;
      }
      
      console.log('Supabase: Valid session confirmed');
      return true;
    } finally {
      // Always release the lock when done
      releaseSessionLock();
    }
  } catch (error) {
    console.error('Supabase: Unexpected error checking session:', error);
    // Make sure to release the lock even if there's an error
    releaseSessionLock();
    return false;
  }
};

// Enhanced function to ensure queries have authentication
export const ensureAuthQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  try {
    // Acquire lock before accessing the session
    await acquireSessionLock();
    
    try {
      // First check if we have a valid session with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Get session timed out'));
        }, 3000); // 3 second timeout
      });
      
      const sessionResult = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]).catch(error => {
        console.warn('Supabase: Get session timed out:', error.message);
        return { data: { session: null }, error: null };
      });
      
      // Type assertion for sessionResult to include error property
      const typedSessionResult = sessionResult as { 
        data: { session: any | null }, 
        error?: { message: string } | null 
      };
      
      // Handle auth session missing errors gracefully
      if (typedSessionResult.error && typedSessionResult.error.message === 'Auth session missing!') {
        console.log('Supabase: Auth session missing in ensureAuthQuery, continuing with query');
        // Continue with the query even without a session
        return await queryFn();
      }
    
      const { data: { session } } = typedSessionResult;
    
      if (!session) {
        console.warn('Supabase: No valid session before query, attempting refresh');
        
        // Try to refresh with timeout
        const refreshPromise = supabase.auth.refreshSession();
        const refreshTimeoutPromise = new Promise<{data: {session: null}, error: Error}>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Session refresh timed out'));
          }, 3000); // 3 second timeout
        });
        
        const refreshResult = await Promise.race([
          refreshPromise,
          refreshTimeoutPromise
        ]).catch(error => {
          console.warn('Supabase: Session refresh timed out:', error.message);
          return { data: { session: null }, error: null };
        });
        
        // Type assertion for refreshResult to include error property
        const typedRefreshResult = refreshResult as { 
          data: { session: any | null }, 
          error?: { message: string } | null 
        };
        
        // Handle auth session missing errors gracefully during refresh
        if (typedRefreshResult.error && typedRefreshResult.error.message === 'Auth session missing!') {
          console.log('Supabase: Auth session missing during refresh in ensureAuthQuery');
          // Continue with the query even without a session
          return await queryFn();
        }
      
        const { data } = typedRefreshResult;
      
        if (!data.session) {
          return { 
            data: null, 
            error: new Error('Authentication required. Please log in again.') 
          };
        }
      }
    
      // Execute the query with the refreshed session
      return await queryFn();
    } finally {
      // Always release the lock when done
      releaseSessionLock();
    }
  } catch (error) {
    console.error('Supabase: Error in ensureAuthQuery:', error);
    // Make sure to release the lock even if there's an error
    releaseSessionLock();
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error in auth query') 
    };
  }
};

// Function to safely get the current user with lock mechanism
export const getCurrentUser = async () => {
  try {
    await acquireSessionLock();
    
    try {
      // Set a timeout for getting the current user
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise<{data: {user: null}, error: Error}>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Get user timed out'));
        }, 3000); // 3 second timeout
      });
      
      const result = await Promise.race([
        userPromise,
        timeoutPromise
      ]).catch(error => {
        console.warn('Supabase: Get user timed out:', error.message);
        return { data: { user: null }, error: null };
      });
      
      // If we got an AuthSessionMissingError, try to recover by checking local storage
      if (result.error && result.error.message === 'Auth session missing!') {
        console.log('Supabase: Auth session missing, trying to recover from local storage');
        // Return empty user without throwing error to allow app to continue
        return { data: { user: null }, error: null };
      }
      
      return result;
    } finally {
      releaseSessionLock();
    }
  } catch (error) {
    releaseSessionLock();
    console.error('Error getting current user:', error);
    return { data: { user: null }, error };
  }
};

// Function to safely refresh the session with lock mechanism
export const refreshSessionSafe = async () => {
  try {
    await acquireSessionLock();
    
    try {
      // Set a timeout for refreshing the session
      const refreshPromise = supabase.auth.refreshSession();
      const timeoutPromise = new Promise<{data: {session: null, user: null}, error: Error}>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Session refresh timed out'));
        }, 3000); // 3 second timeout
      });
      
      const result = await Promise.race([
        refreshPromise,
        timeoutPromise
      ]).catch(error => {
        console.warn('Supabase: Session refresh timed out:', error.message);
        return { data: { session: null, user: null }, error: null };
      });
      
      // If we got an AuthSessionMissingError, handle it gracefully
      if (result.error && result.error.message === 'Auth session missing!') {
        console.log('Supabase: Auth session missing during refresh, returning empty session');
        return { data: { session: null, user: null }, error: null };
      }
      
      return result;
    } finally {
      releaseSessionLock();
    }
  } catch (error) {
    releaseSessionLock();
    console.error('Error refreshing session:', error);
    return { data: { session: null, user: null }, error };
  }
};

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