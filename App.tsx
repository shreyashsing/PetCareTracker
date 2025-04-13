import React, { useEffect, useState } from 'react';
import { LogBox, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';

// Import providers directly with correct exports
import { ToastProvider } from './src/hooks/use-toast';
import { AuthProvider } from './src/contexts/AuthContext';
import { ActivePetProvider } from './src/hooks/useActivePet';
import AppNavigator from './src/navigation/AppNavigator';

// Disable screens - prevents the "tried to register two views with the same name" error
enableScreens(false);

// Disable warning messages
LogBox.ignoreLogs([
  'Invariant Violation: Tried to register two views with the same name',
  'ViewPropTypes will be removed from React Native',
  'AsyncStorage has been extracted from react-native',
  'Possible Unhandled Promise Rejection',
  'Warning: componentWillReceiveProps', // React Navigation warning
  'Warning: componentWillMount'
]);

// Import database services 
import { AsyncStorageService } from './src/services/db/asyncStorage';
import { databaseManager, STORAGE_KEYS } from './src/services/db';

// Create query client with defaultOptions to silence the 'no queryFn' warnings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // Adding a placeholder queryFn to silence warnings when queryFn is missing
      queryFn: async () => {
        return [] as any;
      }
    },
  },
});

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: 'red', marginBottom: 20 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <View style={{ padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5, width: '100%' }}>
            <Text style={{ fontSize: 12 }}>{this.state.error?.stack}</Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Create the App component
export default function App() {
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Check if the database is already initialized
        const isInitialized = await AsyncStorageService.getItem<boolean>('dbInitialized');
        
        if (!isInitialized) {
          console.log('First run, initializing database...');
          await databaseManager.initialize();
          
          // Set the database as initialized
          await AsyncStorageService.setItem('dbInitialized', true);
        } else {
          console.log('Database already initialized');
          
          // Debug: print out pets in the database
          try {
            const pets = await databaseManager.pets.getAll();
            console.log('Pets in database:', pets.length);
            if (pets.length > 0) {
              pets.forEach(pet => console.log(`- Pet: ${pet.name} (${pet.id})`));
            }
            
            // Check active pet
            const activePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
            console.log('Active pet ID:', activePetId);
          } catch (e) {
            console.error('Error checking pets:', e);
          }
        }
        
        setDbInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize database');
        setIsLoading(false);
      }
    };
    
    initializeDatabase();
  }, []);

  // Handle loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <AuthProvider>
              <ActivePetProvider>
                <AppNavigator />
              </ActivePetProvider>
            </AuthProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
