import { formatDateForSupabase, parseSupabaseDate } from './dateUtils';
import { supabase } from '../services/supabase';

/**
 * Utility functions for Supabase data handling 
 */

/**
 * Convert JavaScript object properties to Supabase-friendly format
 * This includes:
 * - Converting Date objects to ISO strings
 * - Converting camelCase to snake_case
 * - Handling arrays and nested objects
 * 
 * @param obj The JavaScript object to convert
 * @returns A Supabase-friendly version of the object
 */
export function prepareForSupabase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return formatDateForSupabase(obj);
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => prepareForSupabase(item));
  }
  
  // Handle objects (but not Date objects which are also typeof 'object')
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = prepareForSupabase(value);
    }
    
    return result;
  }
  
  // For primitive types, return as is
  return obj;
}

/**
 * Convert Supabase data to JavaScript-friendly format
 * This includes:
 * - Converting ISO strings to Date objects for date fields
 * - Converting snake_case to camelCase
 * - Handling arrays and nested objects
 * 
 * @param obj The Supabase data object to convert
 * @param dateFields Optional array of field names that should be converted to Date objects
 * @returns A JavaScript-friendly version of the object
 */
export function processFromSupabase(obj: any, dateFields: string[] = []): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => processFromSupabase(item, dateFields));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      // Check if this is a date field
      if (typeof value === 'string' && 
          (dateFields.includes(key) || 
           key.endsWith('_date') || 
           key.endsWith('_at') || 
           key === 'date')) {
        result[camelKey] = parseSupabaseDate(value);
      } else {
        result[camelKey] = processFromSupabase(value, dateFields);
      }
    }
    
    return result;
  }
  
  // For primitive types, return as is
  return obj;
}

/**
 * Handle Supabase errors with detailed logging
 * 
 * @param error The Supabase error object
 * @param context Additional context about where the error occurred
 * @returns A user-friendly error message
 */
export function handleSupabaseError(error: any, context: string): string {
  console.error(`Supabase error in ${context}:`, error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error.code) {
    console.error(`Error code: ${error.code}`);
    
    // Handle common Supabase error codes
    switch (error.code) {
      case '23505':
        errorMessage = 'This record already exists';
        break;
      case '23503':
        errorMessage = 'Referenced record does not exist';
        break;
      case '42501':
        errorMessage = 'Permission denied. Please log in again.';
        break;
      case 'PGRST116':
        errorMessage = 'Record not found';
        break;
      default:
        errorMessage = `Database error: ${error.message || 'Unknown error'}`;
    }
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  if (error.details) {
    console.error('Error details:', error.details);
  }
  
  return errorMessage;
}

/**
 * Checks Supabase storage configuration and returns information about available buckets
 * @returns Object containing status of storage and available buckets
 */
export async function checkSupabaseStorage(): Promise<{
  isAvailable: boolean;
  buckets: string[];
  defaultBucket: string | null;
  error?: string;
}> {
  try {
    // Attempt to list buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking Supabase storage:', error);
      return {
        isAvailable: false,
        buckets: [],
        defaultBucket: null,
        error: error.message
      };
    }
    
    if (!buckets || buckets.length === 0) {
      console.log('No storage buckets found in Supabase');
      return {
        isAvailable: false,
        buckets: [],
        defaultBucket: null,
        error: 'No storage buckets available'
      };
    }
    
    // Log all found buckets
    const bucketNames = buckets.map(bucket => bucket.name);
    console.log('Available storage buckets:', bucketNames.join(', '));
    
    // Default to using the first bucket
    const defaultBucket = bucketNames[0];
    
    return {
      isAvailable: true,
      buckets: bucketNames,
      defaultBucket
    };
  } catch (error) {
    console.error('Exception checking Supabase storage:', error);
    return {
      isAvailable: false,
      buckets: [],
      defaultBucket: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 