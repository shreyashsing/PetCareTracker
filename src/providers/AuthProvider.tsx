import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getCurrentUser, refreshSessionSafe } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Helper function to create a timeout promise
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
);

// Define response types for Supabase auth operations
interface SignInResponse {
  data: {
    session: Session | null;
    user: User | null;
  } | null;
  error: Error | null;
}

interface SignUpResponse {
  data: {
    session: Session | null;
    user: User | null;
  } | null;
  error: Error | null;
}

interface SignOutResponse {
  error: Error | null;
}

interface UpdateUserResponse {
  data: {
    user: User | null;
  } | null;
  error: Error | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isAuthenticated: boolean;
  lastRefreshed: number | null;
  completeOnboarding: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: any | null }>;
  register: (email: string, password: string) => Promise<{ error: any | null; data: any | null }>;
  forgotPassword: (email: string) => Promise<void>;
  skipAuth: () => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  refreshSession: async () => false,
  isAuthenticated: false,
  lastRefreshed: null,
  completeOnboarding: async () => {},
  login: async () => ({ error: null }),
  register: async () => ({ error: null, data: null }),
  forgotPassword: async () => {},
  skipAuth: () => {}
});

// Custom hook to easily use auth context
export const useAuth = () => useContext(AuthContext);

// Auth state storage keys
const AUTH_STORAGE_KEY = 'pet_care_auth_state';
const REFRESH_INTERVAL = 1000 * 60 * 30; // 30 minutes

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  
  // Load auth state from storage
  const loadStoredAuthState = async () => {
    try {
      const storedAuthState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      
      if (storedAuthState) {
        const authState = JSON.parse(storedAuthState);
        
        if (authState.session && authState.session.access_token) {
          // Set session from storage
          console.log("Auth: Restoring session from storage");
          setSession(authState.session);
          setUser(authState.user);
          
          // Try to verify the session with Supabase
          supabase.auth.setSession({
            access_token: authState.session.access_token,
            refresh_token: authState.session.refresh_token,
          });
          
          // Schedule a refresh
          const now = Date.now();
          const storedRefreshTime = authState.lastRefreshed || 0;
          
          if (now - storedRefreshTime > REFRESH_INTERVAL) {
            console.log('Auth: Stored session needs refreshing');
            refreshSession();
          } else {
            console.log('Auth: Stored session is recent enough');
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save auth state to storage
  const saveAuthState = async () => {
    try {
      if (session && user) {
        const authState = {
          session,
          user,
          lastRefreshed: Date.now()
        };
        
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
        setLastRefreshed(Date.now());
        console.log('Auth: Saved auth state to storage');
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('Auth: Cleared auth state from storage');
      }
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  };
  
  // Refresh session
  const refreshSession = async (): Promise<boolean> => {
    try {
      console.log('Auth: Refreshing session...');
      
      if (!session?.refresh_token) {
        console.warn('Auth: No refresh token available');
        return false;
      }
      
      // Use our safe refresh function to prevent lock contention
      const { data, error } = await refreshSessionSafe();
      
      if (error) {
        console.error('Auth: Session refresh error:', error);
        return false;
      }
      
      if (!data.session) {
        console.warn('Auth: No session returned after refresh');
        return false;
      }
      
      // Update state
      setSession(data.session);
      setUser(data.user);
      console.log('Auth: Session refreshed successfully');
      
      // Save to storage
      await saveAuthState();
      return true;
    } catch (error) {
      console.error('Auth: Error refreshing session:', error);
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('Auth: Initializing auth provider');
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth: Auth state changed', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user || null);
        await saveAuthState();
      }
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    });
    
    // Initialize auth state using our safe function
    const initializeAuth = async () => {
      try {
        // Use our safe getCurrentUser function to prevent lock contention
        const { data, error } = await getCurrentUser();
        
        if (error) {
          console.error('Auth: Error getting user:', error);
          await loadStoredAuthState();
          return;
        }
        
        if (data.user) {
          console.log('Auth: Got active user from Supabase');
          
          // Get the session
          const sessionResult = await supabase.auth.getSession();
          if (sessionResult.data.session) {
            setSession(sessionResult.data.session);
            setUser(data.user);
            await saveAuthState();
          } else {
            console.log('Auth: No active session, loading from storage');
            await loadStoredAuthState();
          }
        } else {
          console.log('Auth: No active user, loading from storage');
          await loadStoredAuthState();
        }
      } catch (error) {
        console.error('Auth: Error initializing auth:', error);
        await loadStoredAuthState();
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();
    
    // Cleanup subscription
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Setup periodic token refresh with a more reliable approach
  useEffect(() => {
    if (!session) return;
    
    // Calculate time until refresh (25 minutes)
    const refreshTime = 1000 * 60 * 25;
    
    console.log('Auth: Setting up refresh timer');
    const refreshTimer = setInterval(() => {
      console.log('Auth: Automatic refresh triggered');
      refreshSession();
    }, refreshTime);
    
    return () => clearInterval(refreshTimer);
  }, [session?.access_token]);
  
  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Add timeout to prevent getting stuck
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const result = await Promise.race([
        signInPromise,
        timeout(10000) // 10 second timeout
      ]).catch(error => {
        console.warn('Auth: Sign in timed out:', error.message);
        return { error: new Error('Sign in timed out. Please try again.') } as SignInResponse;
      });
      
      // Type assertion for result
      const typedResult = result as SignInResponse;
      
      if (typedResult.error) {
        console.error('Auth: Sign in error:', typedResult.error);
        Alert.alert('Sign In Error', typedResult.error.message);
        return { error: typedResult.error };
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Auth: Sign in exception:', error);
      Alert.alert('Sign In Error', error.message || 'An unexpected error occurred');
      return { error };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sign up
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Add timeout to prevent getting stuck
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
      });
      
      const result = await Promise.race([
        signUpPromise,
        timeout(10000) // 10 second timeout
      ]).catch(error => {
        console.warn('Auth: Sign up timed out:', error.message);
        return { data: null, error: new Error('Sign up timed out. Please try again.') } as SignUpResponse;
      });
      
      // Type assertion for result
      const typedResult = result as SignUpResponse;
      
      if (typedResult.error) {
        console.error('Auth: Sign up error:', typedResult.error);
        Alert.alert('Sign Up Error', typedResult.error.message);
        return { error: typedResult.error, data: null };
      }
      
      return { error: null, data: typedResult.data };
    } catch (error: any) {
      console.error('Auth: Sign up exception:', error);
      Alert.alert('Sign Up Error', error.message || 'An unexpected error occurred');
      return { error, data: null };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Add timeout to prevent getting stuck
      const signOutPromise = supabase.auth.signOut();
      
      const result = await Promise.race([
        signOutPromise,
        timeout(5000) // 5 second timeout
      ]).catch(error => {
        console.warn('Auth: Sign out timed out:', error.message);
        // Continue with local sign out even if the API call times out
        return { error: null } as SignOutResponse;
      });
      
      // Type assertion for result
      const typedResult = result as SignOutResponse;
      
      if (typedResult.error) {
        console.error('Auth: Sign out error:', typedResult.error);
        Alert.alert('Sign Out Error', typedResult.error.message);
      }
      
      // Clear state regardless of API success - force cleanup locally
      setSession(null);
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error: any) {
      console.error('Auth: Sign out exception:', error);
      Alert.alert('Sign Out Error', error.message || 'An unexpected error occurred');
      
      // Force cleanup locally even if there's an error
      setSession(null);
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Complete onboarding
  const completeOnboarding = async (): Promise<void> => {
    try {
      if (!user) {
        console.warn('Auth: Cannot complete onboarding - no user logged in');
        return;
      }
      
      console.log('Auth: Marking onboarding as complete for user');
      
      // Update user metadata to mark onboarding as complete with timeout
      const updatePromise = supabase.auth.updateUser({
        data: {
          onboarding_complete: true,
          is_new_user: false
        }
      });
      
      const result = await Promise.race([
        updatePromise,
        timeout(5000) // 5 second timeout
      ]).catch(error => {
        console.warn('Auth: Update user metadata timed out:', error.message);
        return { error: new Error('Update user metadata timed out') } as UpdateUserResponse;
      });
      
      // Type assertion for result
      const typedResult = result as UpdateUserResponse;
      
      if (typedResult.error) {
        console.error('Auth: Error updating user metadata:', typedResult.error);
        return;
      }
      
      // Save updated session to storage
      await saveAuthState();
      
      console.log('Auth: Onboarding marked as complete');
    } catch (error) {
      console.error('Auth: Error completing onboarding:', error);
    }
  };
  
  // Determine if the user is authenticated
  const isAuthenticated = !!user && !!session;

  // Skip authentication for debugging or testing
  const skipAuth = () => {
    // Create a mock user
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User;
    
    // Update auth state
    setUser(mockUser);
    setIsLoading(false);
    
    console.log('Auth: Authentication skipped with mock user');
  };

  // Create the auth context value
  const contextValue: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshSession,
    isAuthenticated,
    lastRefreshed,
    completeOnboarding,
    // Add implementations for new methods that map to existing functionality
    login: signIn,
    register: signUp,
    skipAuth,
    forgotPassword: async (email: string) => {
      try {
        setIsLoading(true);
        
        // Add timeout to prevent getting stuck
        const resetPromise = supabase.auth.resetPasswordForEmail(email, {
          redirectTo: Platform.OS === 'web' ? 
            window.location.origin + '/reset-password' : 
            'yourapp://reset-password',
        });
        
        const result = await Promise.race([
          resetPromise,
          timeout(5000) // 5 second timeout
        ]).catch(error => {
          console.warn('Auth: Password reset timed out:', error.message);
          return { error: new Error('Password reset timed out. Please try again.') };
        });
        
        // Type assertion for result
        const typedResult = result as { error: Error | null };
        
        if (typedResult.error) {
          console.error('Auth: Password reset error:', typedResult.error);
          Alert.alert('Password Reset Error', typedResult.error.message);
          throw typedResult.error;
        }
      } catch (error: any) {
        console.error('Auth: Password reset exception:', error);
        Alert.alert('Password Reset Error', error.message || 'An unexpected error occurred');
        throw error;
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 