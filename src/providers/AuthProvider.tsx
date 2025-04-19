import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

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
  completeOnboarding: async () => {}
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
      
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      
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
    
    // Initialize auth state
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error('Auth: Error getting session:', error);
      }
      
      if (initialSession) {
        console.log('Auth: Got active session from Supabase');
        setSession(initialSession);
        setUser(initialSession.user);
        await saveAuthState();
      } else {
        console.log('Auth: No active session, loading from storage');
        await loadStoredAuthState();
      }
      
      setIsLoading(false);
    });
    
    // Cleanup subscription
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  // Setup periodic token refresh
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
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Auth: Sign in error:', error);
        Alert.alert('Sign In Error', error.message);
        return { error };
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
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        console.error('Auth: Sign up error:', error);
        Alert.alert('Sign Up Error', error.message);
        return { error, data: null };
      }
      
      return { error: null, data };
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
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Auth: Sign out error:', error);
        Alert.alert('Sign Out Error', error.message);
      }
      
      // Clear state regardless of API success - force cleanup locally
      setSession(null);
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error: any) {
      console.error('Auth: Sign out exception:', error);
      Alert.alert('Sign Out Error', error.message || 'An unexpected error occurred');
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
      
      // Update user metadata to mark onboarding as complete
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_complete: true,
          is_new_user: false
        }
      });
      
      if (error) {
        console.error('Auth: Error updating user metadata:', error);
        return;
      }
      
      // Save updated session to storage
      await saveAuthState();
      
      console.log('Auth: Onboarding marked as complete');
    } catch (error) {
      console.error('Auth: Error completing onboarding:', error);
    }
  };
  
  // Combine values for the context
  const contextValue = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshSession,
    isAuthenticated: !!user && !!session,
    lastRefreshed,
    completeOnboarding
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 