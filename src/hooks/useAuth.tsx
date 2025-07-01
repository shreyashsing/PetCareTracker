import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth/authService';
import { User } from '../types/components';
import { useToast } from './use-toast';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: async () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const loggedInUser = await authService.login(email, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        toast({
          title: 'Success',
          description: 'Logged in successfully',
          type: 'success'
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: 'Invalid email or password',
          type: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast({
        title: 'Error',
        description: 'Failed to login',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(email, password, name);
      if (newUser) {
        setUser(newUser);
        toast({
          title: 'Success',
          description: 'Account created successfully',
          type: 'success'
        });
        return true;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create account. Email may already be in use.',
          type: 'error'
        });
        return false;
      }
    } catch (error) {
      console.error('Error registering:', error);
      toast({
        title: 'Error',
        description: 'Failed to create account',
        type: 'error'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Notification clearing is handled by AuthProvider to avoid circular dependency
      await authService.logout();
      setUser(null);
      toast({
        title: 'Successfully Logged Out',
        description: 'You have been securely logged out of your account',
        type: 'success',
        duration: 4000
      });
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to logout',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 