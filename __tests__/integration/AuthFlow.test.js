import { jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock components for testing
const TestLoginComponent = () => {
  const { login, user, isLoading } = useAuth();
  
  if (isLoading) return <Text>Loading...</Text>;
  
  return (
    <>
      {user ? (
        <Text>Logged in as {user.email}</Text>
      ) : (
        <View>
          <Text>Please login</Text>
          <Button 
            title="Login" 
            onPress={() => login({ email: 'test@example.com', password: 'password' })} 
          />
        </View>
      )}
    </>
  );
};

// Mock navigation container for testing
const renderWithProviders = (ui) => {
  return render(
    <NavigationContainer>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </NavigationContainer>
  );
};

// Mock supabase client for auth operations
jest.mock('../../src/services/supabase', () => ({
  supabaseClient: {
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { 
          user: { 
            id: '123', 
            email: 'test@example.com'
          },
          session: {
            access_token: 'test-token',
            refresh_token: 'refresh-token'
          }
        },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    }
  }
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show login screen when user is not authenticated', async () => {
    // Ensure there's no stored user
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    
    const { getByText } = renderWithProviders(<TestLoginComponent />);
    
    // Initially shows loading
    expect(getByText('Loading...')).toBeDefined();
    
    // After loading, shows login screen
    await waitFor(() => {
      expect(getByText('Please login')).toBeDefined();
    });
  });

  it('should authenticate user on login', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    
    const { getByText, getByTitle } = renderWithProviders(<TestLoginComponent />);
    
    // Wait for login screen to appear
    await waitFor(() => {
      expect(getByText('Please login')).toBeDefined();
    });
    
    // Trigger login
    fireEvent.press(getByTitle('Login'));
    
    // After login, show logged in status
    await waitFor(() => {
      expect(getByText('Logged in as test@example.com')).toBeDefined();
    });
    
    // Check if session was stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'user-session',
      expect.any(String)
    );
  });
}); 