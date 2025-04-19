import { supabase } from '../supabase';
import { getUserId } from './authUtils';

/**
 * Gets the current authenticated user from Supabase
 */
export const getUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data?.user || null;
  } catch (error) {
    console.error('Exception getting user:', error);
    return null;
  }
};

/**
 * Gets the current user ID from secure storage
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  return getUserId();
};

// Re-export auth utilities
export * from './authUtils'; 