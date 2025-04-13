import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/auth/authService';
import { migratePetsToUser } from '../services/db';
import * as SecureStore from 'expo-secure-store';

// Define the User type
export interface User {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
  isNewUser?: boolean; // Flag to track if user needs to add their first pet
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  completeOnboarding: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing user session
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // Get current user from auth service
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          // Format user data to match User interface
          const userData: User = {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.name,
            displayName: currentUser.name
          };
          
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use auth service to login
      const loggedInUser = await authService.login(email, password);
      
      if (loggedInUser) {
        // Format user data to match User interface
        const userData: User = {
          id: loggedInUser.id,
          email: loggedInUser.email,
          name: loggedInUser.name,
          displayName: loggedInUser.name
        };
        
        setUser(userData);
        
        // Migrate any existing pets to this user
        await migratePetsToUser(userData.id);
        
        setIsLoading(false);
        return true;
      } else {
        setError('Invalid email or password');
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login failed', error);
      setError('Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  // Register function
  const register = async (email: string, password: string, displayName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use auth service to register
      const newUser = await authService.register(email, password, displayName);
      
      if (newUser) {
        // Format user data to match User interface
        const userData: User = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          displayName: newUser.name,
          isNewUser: true // Flag for first pet onboarding
        };
        
        setUser(userData);
        
        // Migrate any existing pets to this user (unlikely for new users but for safety)
        await migratePetsToUser(userData.id);
        
        setIsLoading(false);
        return true;
      } else {
        setError('Registration failed. Email may already be in use.');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Registration failed', error);
      setError('Registration failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  // Mark onboarding as complete (after adding first pet)
  const completeOnboarding = async (): Promise<void> => {
    if (!user) return;
    
    try {
      const updatedUser: User = {
        ...user,
        isNewUser: false
      };
      
      setUser(updatedUser);
      
      // In a real app, you would update this in your database
      // For this demo app, we'll just update the state
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Use auth service to logout
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use auth service to request password reset
      await authService.requestPasswordReset(email);
      // Don't provide feedback on whether email exists for security
    } catch (error) {
      console.error('Forgot password failed', error);
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        clearError,
        completeOnboarding
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 