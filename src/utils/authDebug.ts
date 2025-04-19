import { supabase } from '../services/supabase';

/**
 * Debug authentication status and test database connection
 * Call this before attempting chat operations to verify auth is working
 */
export const debugAuth = async (): Promise<{ 
  isAuthenticated: boolean; 
  userId: string | null;
  message: string;
}> => {
  try {
    console.log('Checking authentication status...');
    
    // Check if we have a user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth error:', userError);
      return { 
        isAuthenticated: false, 
        userId: null, 
        message: `Auth error: ${userError.message}` 
      };
    }
    
    if (!user) {
      console.warn('No user found in auth state');
      return { 
        isAuthenticated: false, 
        userId: null, 
        message: 'No user authenticated' 
      };
    }
    
    console.log('User authenticated:', user.id);
    
    // Test a simple query to verify RLS is working
    const { data: pets, error: queryError } = await supabase
      .from('pets')
      .select('id, name')
      .limit(1);
    
    if (queryError) {
      console.error('Test query error:', queryError);
      return { 
        isAuthenticated: true, 
        userId: user.id, 
        message: `Authenticated but query failed: ${queryError.message}` 
      };
    }
    
    console.log('Test query successful. Pets found:', pets?.length || 0);
    return { 
      isAuthenticated: true, 
      userId: user.id, 
      message: `Authenticated as ${user.id}. Found ${pets?.length || 0} pets.` 
    };
    
  } catch (error) {
    console.error('Unexpected error in auth debug:', error);
    return { 
      isAuthenticated: false, 
      userId: null, 
      message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Fix potential authentication issues by refreshing the session
 */
export const refreshAuth = async (): Promise<boolean> => {
  try {
    console.log('Attempting to refresh authentication...');
    
    // Force a session refresh
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh error:', error);
      return false;
    }
    
    if (!data.session) {
      console.warn('No session after refresh');
      return false;
    }
    
    console.log('Session refreshed successfully. User:', data.user?.id);
    return true;
    
  } catch (error) {
    console.error('Error refreshing auth:', error);
    return false;
  }
}; 