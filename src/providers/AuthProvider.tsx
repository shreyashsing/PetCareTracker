import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, getCurrentUser, refreshSessionSafe } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { notificationService } from '../services/notifications';
import { clearNavigationStateOnLogout } from '../utils/navigationUtils';
import { useToast } from '../hooks/use-toast';
import NetInfo from '@react-native-community/netinfo';

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

// Add this debug function after the imports but before existing code
// Debug function to check AsyncStorage auth state
const debugStoredAuthState = async () => {
  try {
    const authStateExists = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (authStateExists) {
      const authState = JSON.parse(authStateExists);
      const hasSession = !!authState.session && !!authState.session.access_token;
      const hasUser = !!authState.user && !!authState.user.email;
      const expiryTime = authState.session?.expires_at ? new Date(authState.session.expires_at * 1000) : null;
      const nowTime = new Date();
      const isExpired = expiryTime ? expiryTime < nowTime : true;
      
      console.log('===== AUTH STORAGE DEBUG =====');
      console.log('Auth state exists in AsyncStorage:', true);
      console.log('Has valid session:', hasSession);
      console.log('Has valid user:', hasUser);
      console.log('Session expiry:', expiryTime ? expiryTime.toISOString() : 'unknown');
      console.log('Is expired:', isExpired);
      if (hasUser) {
        console.log('User email:', authState.user.email);
        console.log('User ID:', authState.user.id);
      }
      console.log('============================');
    } else {
      console.log('===== AUTH STORAGE DEBUG =====');
      console.log('No auth state found in AsyncStorage');
      console.log('============================');
    }
  } catch (error) {
    console.error('Error checking stored auth state:', error);
  }
};

// Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState<boolean | undefined>(undefined);
  const { toast } = useToast();
  
  // First check network connectivity before anything else
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Debug the stored auth state when the app starts
        await debugStoredAuthState();
        
        console.log('Auth: Checking network connectivity...');
        const netInfo = await NetInfo.fetch();
        const offline = !(netInfo.isConnected && netInfo.isInternetReachable);
        console.log(`Auth: Network status - ${offline ? 'OFFLINE' : 'ONLINE'}`);
        setIsOffline(offline);
      } catch (error) {
        console.warn('Auth: Error checking network connectivity:', error);
        // Assume offline in case of error to be safe
        setIsOffline(true);
      }
    };
    
    checkConnectivity();

    // Set up network state change listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected && state.isInternetReachable);
      console.log(`Auth: Network status changed - ${offline ? 'OFFLINE' : 'ONLINE'}`);
      setIsOffline(offline);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Load auth state from storage
  const loadStoredAuthState = async () => {
    try {
      console.log('Auth: Loading stored auth state from local storage');
      const storedAuthState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      
      if (storedAuthState) {
        const authState = JSON.parse(storedAuthState);
        
        if (authState.session && authState.session.access_token) {
          // Set session from storage
          console.log("Auth: Restoring session from storage");
          setSession(authState.session);
          setUser(authState.user);
          
          // Try to verify the session with Supabase
          // This can fail when offline but that's okay, we'll still use stored session
          try {
            // Only attempt to update Supabase client session if we're online
            if (!isOffline) {
              supabase.auth.setSession({
                access_token: authState.session.access_token,
                refresh_token: authState.session.refresh_token,
              });
              
              // Check if we're online before attempting to refresh
              const now = Date.now();
              const storedRefreshTime = authState.lastRefreshed || 0;
              
              if (now - storedRefreshTime > REFRESH_INTERVAL) {
                console.log('Auth: Stored session needs refreshing');
                refreshSession();
              } else {
                console.log('Auth: Stored session is recent enough');
              }
            } else {
              console.log('Auth: Offline mode - using cached session without Supabase client update');
            }
          } catch (sessionError) {
            console.warn('Auth: Error setting session, continuing with stored credentials:', sessionError);
            // Even if setting session with Supabase fails, we still have valid stored credentials
            // so the user should remain logged in
          }
        } else {
          console.log('Auth: No valid session found in stored auth state');
        }
      } else {
        console.log('Auth: No stored auth state found');
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
        console.log('Auth: Attempting to save auth state to storage');
        
        const authState = {
          session,
          user,
          lastRefreshed: Date.now()
        };
        
        // Stringify with proper error handling
        let jsonValue;
        try {
          jsonValue = JSON.stringify(authState);
          if (!jsonValue) {
            throw new Error('Failed to stringify auth state');
          }
        } catch (stringifyError) {
          console.error('Auth: Error stringifying auth state:', stringifyError);
          // Try a simplified version without circular references 
          try {
            const simplifiedAuthState = {
              session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in
              },
              user: {
                id: user.id,
                email: user.email,
                app_metadata: user.app_metadata,
                user_metadata: user.user_metadata,
                aud: user.aud,
                created_at: user.created_at
              },
              lastRefreshed: Date.now()
            };
            jsonValue = JSON.stringify(simplifiedAuthState);
            console.log('Auth: Using simplified auth state due to stringify error');
          } catch (fallbackError) {
            console.error('Auth: Failed to stringify simplified auth state:', fallbackError);
            throw fallbackError;
          }
        }
        
        // Ensure the JSONified value is valid
        if (!jsonValue || jsonValue === '{}' || jsonValue === 'null') {
          console.error('Auth: Invalid JSON value for auth state:', jsonValue);
          throw new Error('Invalid JSON value for auth state');
        }

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, jsonValue);
        
        // Verify that the save was successful
        const savedValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!savedValue) {
          console.error('Auth: Verification failed - could not read saved auth state');
        } else {
          console.log('Auth: Successfully saved and verified auth state to storage, length:', savedValue.length);
        }
        
        setLastRefreshed(Date.now());
      } else {
        console.warn('Auth: Not saving auth state because session or user is missing');
        if (!user) console.warn('Auth: User is null');
        if (!session) console.warn('Auth: Session is null');
        
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('Auth: Cleared auth state from storage');
      }
    } catch (error) {
      console.error('Auth: Error saving auth state:', error);
      // Try one more time with a minimalist approach
      try {
        if (session?.access_token && user?.id) {
          const minimalState = {
            session: { access_token: session.access_token, refresh_token: session.refresh_token },
            user: { id: user.id, email: user.email },
            lastRefreshed: Date.now()
          };
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(minimalState));
          console.log('Auth: Saved minimal auth state as fallback');
        }
      } catch (retryError) {
        console.error('Auth: Failed even with minimal state save:', retryError);
      }
    }
  };
  
  // Refresh session
  const refreshSession = async (): Promise<boolean> => {
    try {
      console.log('Auth: Refreshing session...');
      
      // Check if we're offline - if so, keep current session and report success
      const netInfo = await NetInfo.fetch();
      const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
      
      if (currentlyOffline) {
        console.log('Auth: Device is offline, skipping session refresh and maintaining current session');
        // Update the lastRefreshed timestamp even when offline to prevent refresh spam
        setLastRefreshed(Date.now());
        // Even when offline and session is expired based on timestamps, we keep user logged in
        return true;
      }
      
      if (!session?.refresh_token) {
        console.warn('Auth: No refresh token available');
        // Do NOT log out when offline even if refresh token is missing
        if (currentlyOffline && user) {
          console.log('Auth: No refresh token but device is offline, maintaining session');
          return true;
        }
        return false;
      }
      
      // Use our safe refresh function to prevent lock contention
      const { data, error } = await refreshSessionSafe();
      
      if (error) {
        console.error('Auth: Session refresh error:', error);
        
        // Important: If refresh fails but we're offline, keep current session
        if (currentlyOffline) {
          console.log('Auth: Refresh failed but device is offline, maintaining current session');
          return true;
        }
        
        return false;
      }
      
      if (!data.session) {
        console.warn('Auth: No session returned after refresh');
        
        // Important: If refresh returns no session but we're offline, keep current session
        if (currentlyOffline) {
          console.log('Auth: No session returned but device is offline, maintaining current session');
          return true;
        }
        
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
      
      // Important: If refresh encounters error but we're offline, keep current session
      const netInfo = await NetInfo.fetch();
      const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
      
      if (currentlyOffline && user && session) {
        console.log('Auth: Refresh error but device is offline, maintaining current session');
        return true;
      }
      
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Only initialize auth once we know connectivity status
    if (isOffline === undefined) return;
    
    console.log(`Auth: Initializing auth provider (${isOffline ? 'OFFLINE' : 'ONLINE'} mode)`);
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth: Auth state changed', event, 'Session exists:', !!newSession);
      
      // Only process signed out events if we're online
      // This prevents unexpected logouts due to token expiry when offline
      if (event === 'SIGNED_OUT') {
        const netInfo = await NetInfo.fetch();
        const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
        
        if (currentlyOffline) {
          console.log('Auth: Ignoring SIGNED_OUT event while offline to maintain session');
          return; // Don't process the sign out event when offline
        }
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('Auth: User signed in or token refreshed, updating session');
        setSession(newSession);
        setUser(newSession?.user || null);
        
        // The original code calls this but let's ensure it properly completes
        try {
          await saveAuthState();
          console.log('Auth: Successfully saved auth state after', event);
        } catch (error) {
          console.error('Auth: Failed to save auth state after', event, error);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('Auth: User signed out, clearing session');
        setSession(null);
        setUser(null);
        try {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          console.log('Auth: Successfully cleared auth state after sign out');
        } catch (error) {
          console.error('Auth: Failed to clear auth state after sign out', error);
        }
      }
    });
    
    // Initialize auth state using offline-first approach
    const initializeAuth = async () => {
      try {
        // If offline, immediately load from storage without trying online operations
        if (isOffline) {
          console.log('Auth: Device is offline, loading directly from storage');
          await loadStoredAuthState();
          return;
        }
        
        // If online, try to get current user from Supabase
        try {
          const { data, error } = await Promise.race([
            getCurrentUser(),
            new Promise<any>((_, reject) => 
              setTimeout(() => reject(new Error('Get user timed out')), 2000)
            )
          ]);
          
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
          console.log('Auth: Error or timeout getting current user, falling back to storage');
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
  }, [isOffline]);
  
  // Setup periodic token refresh with a more reliable approach
  useEffect(() => {
    if (!session) return;
    
    // Calculate time until refresh (25 minutes)
    const refreshTime = 1000 * 60 * 25;
    
    console.log('Auth: Setting up refresh timer');
    const refreshTimer = setInterval(async () => {
      console.log('Auth: Automatic refresh triggered');
      
      // Before refreshing, check if we're offline
      const netInfo = await NetInfo.fetch();
      const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
      
      if (currentlyOffline) {
        console.log('Auth: Device is offline during automatic refresh, maintaining current session');
        // Update lastRefreshed to prevent continuous refresh attempts
        setLastRefreshed(Date.now());
      } else {
        refreshSession();
      }
    }, refreshTime);
    
    return () => clearInterval(refreshTimer);
  }, [session?.access_token]);
  
  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<{ error: any | null }> => {
    try {
      console.log('Auth: Attempting sign in');
      setIsLoading(true);
      
      // Ensure we have current network status
      let offline = isOffline;
      if (offline === undefined) {
        try {
          const netInfo = await NetInfo.fetch();
          offline = !(netInfo.isConnected && netInfo.isInternetReachable);
          console.log(`Auth: Network status during sign in - ${offline ? 'OFFLINE' : 'ONLINE'}`);
        } catch (e) {
          console.warn('Auth: Error checking connectivity during sign in:', e);
          offline = true; // Assume offline if we can't determine status
        }
      }
      
      // If offline, try to use stored credentials
      if (offline) {
        console.log('Auth: Device is offline, attempting to use stored credentials');
        
        try {
          const storedAuthState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          if (storedAuthState) {
            const authState = JSON.parse(storedAuthState);
            
            // If stored email matches what user entered, we can compare passwords
            if (authState.user && authState.user.email && 
                email.toLowerCase() === authState.user.email.toLowerCase()) {
              
              console.log('Auth: Found matching stored credentials for this email');
              
              // We don't store the password hash locally for security reasons,
              // but we can set the user as authenticated based on stored session
              if (authState.session && authState.session.access_token) {
                setSession(authState.session);
                setUser(authState.user);
                console.log('Auth: Successfully logged in using stored session in offline mode');
                
                try {
                  // Still try to set the session in Supabase client so that
                  // other parts of the app using Supabase client directly will work
                  supabase.auth.setSession({
                    access_token: authState.session.access_token,
                    refresh_token: authState.session.refresh_token,
                  });
                } catch (e) {
                  // Ignore this error when offline
                  console.warn('Auth: Error setting session in offline mode:', e);
                }
                
                return { error: null };
              }
            }
            
            // If we get here, either the email didn't match or we don't have a valid session
            console.warn('Auth: Offline login failed - email mismatch with stored credentials');
            return { error: { message: 'Cannot verify credentials while offline' } };
          } else {
            console.warn('Auth: Offline login failed - no stored credentials found');
            return { error: { message: 'No stored credentials found' } };
          }
        } catch (e) {
          console.error('Auth: Error accessing stored credentials:', e);
          return { error: { message: 'Error accessing stored credentials' } };
        }
        finally {
          setIsLoading(false);
        }
      }
      
      // Online login flow with timeout protection
      console.log('Auth: Online login - attempting Supabase authentication');
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<{data: null, error: Error}>((_, reject) => {
        setTimeout(() => reject(new Error('Sign in timed out')), 10000);
      });
      
      const result = await Promise.race([
        signInPromise,
        timeoutPromise
      ]).catch(error => {
        console.warn('Auth: Sign in timed out or failed:', error.message);
        return { data: null, error: new Error('Login failed: Network request timed out. Please try again.') };
      });
      
      // Handle result
      if (result.error) {
        console.error('Auth: Sign in error:', result.error);
        
        // Handle specific email confirmation errors
        if (result.error.message?.includes('Email not confirmed')) {
          console.log('Auth: Email not confirmed, try again with default credentials');
          
          // Just return the error since we don't have access to tryConfirmEmail here
          return { error: result.error };
        }
        
        return { error: result.error };
      }
      
      // Process successful sign in
      if (result.data?.user && result.data?.session) {
        console.log('Auth: Successfully signed in, saving session data');
        setUser(result.data.user);
        setSession(result.data.session);
        
        // CRITICAL: Save auth state to AsyncStorage for offline use
        try {
          await saveAuthState();
          console.log('Auth: Auth state saved successfully after sign in');
        } catch (saveError) {
          console.error('Auth: Failed to save auth state after sign in:', saveError);
        }
      } else {
        console.warn('Auth: Sign in succeeded but no user/session data returned');
      }
      
      console.log('Auth: Successfully signed in');
      return { error: null };
    } catch (error: any) {
      console.error('Auth: Unexpected sign in error:', error);
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
        toast({
          title: 'Sign Up Error',
          description: typedResult.error.message,
          type: 'error'
        });
        return { error: typedResult.error, data: null };
      }
      
      return { error: null, data: typedResult.data };
    } catch (error: any) {
      console.error('Auth: Sign up exception:', error);
      toast({
        title: 'Sign Up Error',
        description: error.message || 'An unexpected error occurred',
        type: 'error'
      });
      return { error, data: null };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sign out
  const signOut = async () => {
    try {
      // Check if we're offline before signing out
      const netInfo = await NetInfo.fetch();
      const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
      
      // If offline, just clear the local state without attempting server signout
      if (currentlyOffline) {
        console.log('Auth: Device is offline during sign out, clearing local state only');
        setSession(null);
        setUser(null);
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        await clearNavigationStateOnLogout();
        
        // Show success toast even when offline
        console.log('Auth: Showing offline logout success toast');
        toast({
          title: 'Successfully Logged Out',
          description: 'You have been securely logged out of your account',
          type: 'success',
          duration: 4000
        });
        return;
      }
      
      setIsLoading(true);
      
      // Clear notifications before logout - we'll skip this for now
      // since the exact notification service API needs to be checked
      
      // Clear navigation state to prevent restoration to authenticated routes
      await clearNavigationStateOnLogout();
      
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
        toast({
          title: 'Sign Out Error',
          description: typedResult.error.message,
          type: 'error'
        });
      } else {
        // Show success toast notification
        console.log('Auth: Showing online logout success toast');
        toast({
          title: 'Successfully Logged Out',
          description: 'You have been securely logged out of your account',
          type: 'success',
          duration: 4000
        });
      }
      
      // Clear state regardless of API success - force cleanup locally
      setSession(null);
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error: any) {
      console.error('Auth: Sign out exception:', error);
      toast({
        title: 'Sign Out Error',
        description: error.message || 'An unexpected error occurred',
        type: 'error'
      });
      
      // Force cleanup locally even if there's an error
      setSession(null);
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await clearNavigationStateOnLogout(); // Clear navigation state even on error
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
      
      // Check if device is offline
      const netInfo = await NetInfo.fetch();
      const currentlyOffline = !(netInfo.isConnected && netInfo.isInternetReachable);
      
      if (currentlyOffline) {
        console.log('Auth: Device is offline during onboarding completion, storing locally only');
        // If offline, we'll update local storage only and sync later when online
        // Clone the current user and update metadata locally
        const updatedUser = { ...user };
        if (!updatedUser.user_metadata) {
          updatedUser.user_metadata = {};
        }
        updatedUser.user_metadata.onboarding_complete = true;
        updatedUser.user_metadata.is_new_user = false;
        
        setUser(updatedUser);
        
        // Save updated user to storage
        if (session) {
          await saveAuthState();
        }
        
        return;
      }
      
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
    login: async (email: string, password: string) => {
      try {
        return await signIn(email, password);
      } catch (error: any) {
        return { error };
      }
    },
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
          toast({
            title: 'Password Reset Error',
            description: typedResult.error.message,
            type: 'error'
          });
          throw typedResult.error;
        }
      } catch (error: any) {
        console.error('Auth: Password reset exception:', error);
        toast({
          title: 'Password Reset Error',
          description: error.message || 'An unexpected error occurred',
          type: 'error'
        });
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