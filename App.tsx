// Import our app initialization first to apply all patches
import './src/App.init';

// Import error handler early to catch any initialization errors
import { setupErrorHandling, setupLogBoxIgnores } from './src/utils/errorHandler';
setupErrorHandling();

import React, { useEffect, useState } from 'react';
import { LogBox, View, Text, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';

// Import the ErrorBoundary component
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { notificationService } from './src/services/notifications';

// Setup LogBox ignores
setupLogBoxIgnores(LogBox);

// Import providers directly with correct exports
import { ToastProvider } from './src/hooks/use-toast';
import { AuthProvider } from './src/providers/AuthProvider';
import { ActivePetProvider } from './src/hooks/useActivePet';
import AppNavigator from './src/navigation/AppNavigator';

// Disable screens - prevents the "tried to register two views with the same name" error
enableScreens(false);

// Import database services 
import { AsyncStorageService } from './src/services/db/asyncStorage';
import { databaseManager, STORAGE_KEYS } from './src/services/db';
import { securityService, SecurityMode } from './src/services/security';
import { runMigrationsToEnsureTablesExist } from './src/services/db/migrations';
import { supabase, checkSession } from './src/services/supabase';

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

// Create the App component
export default function App() {
  const colorScheme = useColorScheme();
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [securityInitialized, setSecurityInitialized] = useState<boolean>(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Initialize and check authentication
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('App: Checking authentication on startup...');
        // First check if we have a valid session, if not, attempt to refresh
        const hasValidSession = await checkSession();
        
        if (!hasValidSession) {
          console.log('App: No valid session detected, attempting refresh...');
          // Try to get the current session and refresh it
          const { data } = await supabase.auth.refreshSession();
          
          if (data.session) {
            console.log('App: Session successfully refreshed on startup');
          } else {
            console.log('App: No session available, user needs to log in');
          }
        } else {
          console.log('App: Valid authentication session confirmed');
        }
      } catch (error) {
        console.error('App: Error checking authentication:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    
    checkAuthentication();
  }, []);

  // Initialize security service
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Initialize the security service
        const securityEnabled = await securityService.initialize();
        setSecurityInitialized(true);
        
        // Log security mode for debugging
        console.log('Security mode:', securityService.getSecurityMode());
        
        // If security is completely disabled, inform the user
        if (securityService.getSecurityMode() === SecurityMode.DISABLED) {
          Alert.alert(
            "Security Warning",
            "Your device does not support secure data storage. Sensitive information may not be fully protected.",
            [{ text: "Continue Anyway" }]
          );
        }
      } catch (error) {
        console.error('Security initialization error:', error);
        // Continue anyway but with a warning
        setSecurityInitialized(true);
        Alert.alert(
          "Security Error",
          "Failed to initialize security features. Your data may not be properly protected.",
          [{ text: "Continue Anyway" }]
        );
      }
    };
    
    initializeSecurity();
  }, []);

  // Wait for all initialization steps to complete
  const isInitialized = securityInitialized && dbInitialized && notificationsInitialized && authChecked;

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Wait for security check to complete
        if (!securityInitialized) {
          return;
        }
        
        // Check if the database is already initialized
        const isInitialized = await AsyncStorageService.getItem<boolean>('dbInitialized');
        
        if (!isInitialized) {
          console.log('First run, initializing database...');
          await databaseManager.initialize();
          
          // Set the database as initialized
          await AsyncStorageService.setItem('dbInitialized', true);
          
          // Import here to avoid circular imports
          const { createDemoUserIfNeeded } = require('./src/utils/demoUsers');
          await createDemoUserIfNeeded();
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
            
            // Debug Supabase connection and tables
            try {
              const { checkSupabaseTables } = require('./src/utils/debugUtils');
              await checkSupabaseTables();
              
              // If user is authenticated, also check permissions
              const { data: { user } } = await supabase.auth.getUser();
              
              if (user) {
                const { checkPetsInsertPermission } = require('./src/utils/debugUtils');
                await checkPetsInsertPermission(user.id);
              }
            } catch (debugError) {
              console.error('Error running debug checks:', debugError);
            }
          } catch (e) {
            console.error('Error checking pets:', e);
          }
        }
        
        // Run migrations to ensure all necessary Supabase tables exist
        try {
          await runMigrationsToEnsureTablesExist();
        } catch (migrationError) {
          console.error('Error running migrations:', migrationError);
          // Non-critical, continue app startup
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
  }, [securityInitialized]);

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Initialize notification service
        const initialized = await notificationService.initialize();
        
        if (initialized) {
          // Reschedule all pending notifications
          await notificationService.rescheduleAllNotifications();
          
          // The rescheduleAllNotifications method now includes meal and inventory alerts
          console.log('Notifications rescheduled successfully');
          
          // Setup a periodic check for inventory alerts (every 24 hours)
          const checkPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          setInterval(async () => {
            await notificationService.checkAndScheduleInventoryAlerts();
          }, checkPeriod);
        } else {
          console.warn('Notification service initialization failed or permissions not granted');
        }
        
        setNotificationsInitialized(true);
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setNotificationsInitialized(true); // Set to true anyway to let the app load
      }
    };
    
    initializeNotifications();
  }, []);

  // Show loading screen until everything is initialized
  if (!dbInitialized || !securityInitialized || !notificationsInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>Initializing app...</Text>
      </View>
    );
  }

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

  // Handler for error boundary errors
  const handleError = (error: Error, errorInfo: React.ErrorInfo): void => {
    // Log to console for debugging
    console.error('Error caught by root ErrorBoundary:', error, errorInfo);
    
    // In a production app, you would send this to a monitoring service like Sentry
    // Example: Sentry.captureException(error);
  };

  return (
    <ErrorBoundary onError={handleError} resetOnPropsChange={false}>
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
