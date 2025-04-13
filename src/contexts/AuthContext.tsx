import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migratePetsToUser } from '../services/db';

// Storage keys
const AUTH_USER_KEY = 'auth_user';
const AUTH_USERS_KEY = 'auth_users';

// Define the User type
export interface User {
  id: string;
  email: string;
  displayName?: string;
  isNewUser?: boolean; // Flag to track if user needs to add their first pet
}

// For storing user credentials
interface UserCredential {
  id: string;
  email: string;
  password: string;
  displayName?: string;
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

// Generate a unique ID (simple implementation)
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Provider component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize mock user database if needed
  const initializeUsers = async () => {
    try {
      const existingUsers = await AsyncStorage.getItem(AUTH_USERS_KEY);
      
      if (!existingUsers) {
        // Create initial demo user
        const initialUsers: UserCredential[] = [
          {
            id: '123',
            email: 'user@example.com',
            password: 'password123',
            displayName: 'Demo User'
          }
        ];
        
        await AsyncStorage.setItem(AUTH_USERS_KEY, JSON.stringify(initialUsers));
      }
    } catch (error) {
      console.error('Failed to initialize users:', error);
    }
  };

  // Check for existing user session
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // Initialize user database if needed
        await initializeUsers();
        
        // Check if user is logged in
        const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
        
        if (userData) {
          const parsedUser = JSON.parse(userData) as User;
          setUser(parsedUser);
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
      // Get users from storage
      const usersData = await AsyncStorage.getItem(AUTH_USERS_KEY);
      
      if (!usersData) {
        setError('Authentication system not initialized');
        setIsLoading(false);
        return false;
      }
      
      const users: UserCredential[] = JSON.parse(usersData);
      
      // Find user by email and password
      const foundUser = users.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
      );
      
      if (foundUser) {
        // Create user object (without password)
        const loggedInUser: User = {
          id: foundUser.id,
          email: foundUser.email,
          displayName: foundUser.displayName
        };
        
        // Save to state and AsyncStorage
        setUser(loggedInUser);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(loggedInUser));
        
        // Migrate any existing pets to this user
        await migratePetsToUser(loggedInUser.id);
        
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
      // Get existing users
      const usersData = await AsyncStorage.getItem(AUTH_USERS_KEY);
      const users: UserCredential[] = usersData ? JSON.parse(usersData) : [];
      
      // Check if email already exists
      const userExists = users.some(u => 
        u.email.toLowerCase() === email.toLowerCase()
      );
      
      if (userExists) {
        setError('Email is already registered');
        setIsLoading(false);
        return false;
      } else {
        // Create new user
        const userId = generateId();
        const newUserCredential: UserCredential = {
          id: userId,
          email,
          password,
          displayName
        };
        
        // Add to users array and save
        users.push(newUserCredential);
        await AsyncStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
        
        // Create user object for session (without password)
        const newUser: User = {
          id: userId,
          email,
          displayName,
          isNewUser: true // Flag for first pet onboarding
        };
        
        // Save to state and AsyncStorage
        setUser(newUser);
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
        
        // Migrate any existing pets to this user (unlikely for new users but for safety)
        await migratePetsToUser(userId);
        
        setIsLoading(false);
        return true;
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
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Remove user from AsyncStorage
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      setUser(null);
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      // Get users from storage
      const usersData = await AsyncStorage.getItem(AUTH_USERS_KEY);
      
      if (!usersData) {
        setError('Authentication system not initialized');
        return;
      }
      
      const users: UserCredential[] = JSON.parse(usersData);
      
      // Check if user exists
      const userExists = users.some(u => 
        u.email.toLowerCase() === email.toLowerCase()
      );
      
      if (!userExists) {
        setError('No account found with this email address');
      } else {
        console.log(`Password reset email would be sent to ${email}`);
        // In a real app, send a password reset email here
      }
    } catch (error) {
      console.error('Forgot password failed', error);
      setError('Password reset failed. Please try again.');
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    clearError,
    completeOnboarding
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 