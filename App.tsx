// Import our app initialization first to apply all patches
import './src/App.init';

// Import error handler early to catch any initialization errors
import { setupErrorHandling, setupLogBoxIgnores } from './src/utils/errorHandler';
setupErrorHandling();

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  LogBox, 
  View, 
  Text, 
  ActivityIndicator, 
  Alert, 
  useColorScheme,
  TouchableOpacity,
  Button,
  StyleSheet
} from 'react-native';
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
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { ActivePetProvider } from './src/hooks/useActivePet';
import AppNavigator from './src/navigation/AppNavigator';

// Import pet synchronization utility - ensure we're importing from the .ts file
import { syncPetsWithSupabase, loadPetsForUser } from './src/utils/petSync';

// Import storage bucket initialization
import { ensurePetImagesBucketExists } from './src/utils/imageBucketHelper';

// Disable screens - prevents the "tried to register two views with the same name" error
enableScreens(false);

// Import database services 
import { AsyncStorageService } from './src/services/db/asyncStorage';
import { STORAGE_KEYS, unifiedDatabaseManager } from './src/services/db';
import { securityService, SecurityMode } from './src/services/security';
import { runMigrationsToEnsureTablesExist } from './src/services/db/migrations';
import { supabase, getCurrentUser, refreshSessionSafe } from './src/services/supabase';

// Import the migration utility
import { MigrationUtility } from './src/utils/migrateToUnified';
import { forceInitializationComplete } from './src/App.init';

// Define types for auth responses
interface AuthUserResponse {
  data: { 
    user: any | null;
  };
  error: any | null;
}

interface AuthSessionResponse {
  data: { 
    session: any | null;
    user: any | null;
  };
  error: any | null;
}

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

// Create a component to handle pet synchronization
const PetSynchronizer: React.FC<{ userId: string }> = ({ userId }) => {
  useEffect(() => {
    const syncPetsData = async () => {
      console.log('App: Synchronizing pets for user:', userId);
      try {
        // Use the unified database manager for synchronization
        await unifiedDatabaseManager.loadAllData(userId);
        console.log('App: Pet synchronization complete');
      } catch (error) {
        console.error('App: Error synchronizing pets:', error);
        
        // Try to provide more detailed error information
        if (error instanceof Error) {
          console.error(`App: Error details: ${error.message}`);
          if (error.stack) {
            console.error(`App: Stack trace: ${error.stack}`);
          }
        }
      }
    };
    
    syncPetsData();
  }, [userId]);
  
  return null; // This component doesn't render anything
};

// Helper function to create a timeout promise
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
);

// Loading screen component with skip button
const LoadingScreen: React.FC<{ 
  initializationStage: string, 
  showSkipButton: boolean, 
  onSkip: () => void 
}> = ({ initializationStage, showSkipButton, onSkip }) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.loadingText}>{initializationStage}</Text>
      
      {showSkipButton && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip and Continue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Main app content component
const AppContent: React.FC = () => {
  const auth = useAuth();
  const { skipAuth } = auth;
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [securityInitialized, setSecurityInitialized] = useState<boolean>(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showSkipButton, setShowSkipButton] = useState<boolean>(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [initializationStage, setInitializationStage] = useState<string>("Starting up...");

  // Skip authentication and continue to the app
  const skipAuthentication = useCallback(() => {
    console.log('App: Skipping authentication and continuing to app');
    setAuthChecked(true);
    setDbInitialized(true);
    setSecurityInitialized(true);
    setNotificationsInitialized(true);
    setIsLoading(false);
    
    // Also call the skipAuth function from AuthProvider
    skipAuth();
    
    // Force initialization to complete
    forceInitializationComplete();
    
    // Clear any pending timeouts
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }
  }, [skipAuth]);

  // Force continue after a certain time regardless of initialization state
  useEffect(() => {
    // Show skip button after 5 seconds
    const skipButtonTimer = setTimeout(() => {
      if (isLoading) {
        console.log('App: Initialization taking too long, showing skip button');
        setShowSkipButton(true);
      }
    }, 5000); // Show skip button after 5 seconds
    
    // Force continue after 15 seconds total
    initTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.log('App: Initialization taking too long, forcing continue');
        skipAuthentication();
      }
    }, 15000); // Force continue after 15 seconds
    
    return () => {
      clearTimeout(skipButtonTimer);
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isLoading, skipAuthentication]);

  // Initialize and check authentication
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setInitializationStage("Checking authentication...");
        console.log('App: Checking authentication on startup...');
        
        // Use our safe getCurrentUser function with timeout
        try {
          const userResult = await Promise.race([
            getCurrentUser(),
            timeout(3000) // 3 second timeout (reduced from 5)
          ]).catch(error => {
            console.warn('App: Authentication check timed out:', error.message);
            return { data: { user: null }, error: null };
          });
          
          // Type assertion for userResult
          const typedUserResult = userResult as { 
            data: { user: any | null }, 
            error: any | null 
          };
          
          if (typedUserResult.error) {
            console.error('App: Error getting current user:', typedUserResult.error);
          } else if (typedUserResult.data?.user) {
            console.log('App: User is authenticated');
            setCurrentUser(typedUserResult.data.user);
          } else {
            console.log('App: No authenticated user, attempting session refresh');
            
            // Try to refresh the session with timeout
            try {
              const refreshResult = await Promise.race([
                refreshSessionSafe(),
                timeout(3000) // 3 second timeout (reduced from 5)
              ]).catch(error => {
                console.warn('App: Session refresh timed out:', error.message);
                return { data: { session: null, user: null }, error: null };
              });
              
              // Type assertion for refreshResult
              const typedRefreshResult = refreshResult as {
                data: { session: any | null, user: any | null },
                error: any | null
              };
              
              if (typedRefreshResult.data?.session) {
                console.log('App: Session refreshed successfully');
                setCurrentUser(typedRefreshResult.data.user);
              } else {
                console.log('App: No session available, user needs to log in');
              }
            } catch (refreshError) {
              console.error('App: Error refreshing session:', refreshError);
            }
          }
        } catch (error) {
          console.error('App: Error in authentication check:', error);
        }
      } finally {
        // Always set authChecked to true to prevent getting stuck
        setAuthChecked(true);
      }
    };
    
    // Set a timeout for the entire authentication check
    Promise.race([
      checkAuthentication(),
      timeout(8000) // 8 second timeout for the entire auth check (reduced from 15)
    ]).catch(error => {
      console.error('App: Authentication check timed out completely:', error);
      setAuthChecked(true); // Ensure we don't get stuck
    });
  }, []);

  // Initialize security service
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        setInitializationStage("Initializing security...");
        // Initialize the security service with timeout
        await Promise.race([
          securityService.initialize(),
          timeout(3000) // 3 second timeout (reduced from 5)
        ]).catch(error => {
          console.warn('App: Security initialization timed out:', error.message);
        });
        
        // Log security mode for debugging
        console.log('Security mode:', securityService.getSecurityMode());
      } catch (error) {
        console.error('Security initialization error:', error);
      } finally {
        // Always set securityInitialized to true to prevent getting stuck
        setSecurityInitialized(true);
      }
    };
    
    if (authChecked && !securityInitialized) {
    initializeSecurity();
    }
  }, [authChecked, securityInitialized]);

  // Initialize database and ensure all required tables exist
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setInitializationStage("Initializing database...");
        console.log('App: Initializing database...');
        
        // Ensure the pet-images bucket exists for storing pet images
        try {
          console.log('App: Ensuring pet-images storage bucket exists');
          const bucketName = await ensurePetImagesBucketExists();
          if (bucketName) {
            console.log(`App: Using storage bucket: ${bucketName}`);
          } else {
            console.warn('App: Could not ensure pet-images bucket exists');
          }
        } catch (bucketError) {
          console.error('App: Error initializing pet-images bucket:', bucketError);
          // Continue anyway, as this is not a critical error
        }

        // Initialize the unified database manager with timeout
        await Promise.race([
          unifiedDatabaseManager.initialize(),
          timeout(5000) // 5 second timeout (reduced from 10)
        ]).catch(error => {
          console.warn('App: Database initialization timed out:', error.message);
        });
        
        // Run migrations with timeout
        try {
          await Promise.race([
            runMigrationsToEnsureTablesExist(),
            timeout(3000) // 3 second timeout (reduced from 5)
          ]).catch(error => {
            console.warn('App: Migrations timed out:', error.message);
          });
        } catch (migrationError) {
          console.error('Error running migrations:', migrationError);
        }
      } catch (dbError) {
        console.error('Error initializing database:', dbError);
      } finally {
        // Always set dbInitialized to true to prevent getting stuck
        setDbInitialized(true);
      }
    };
    
    if (authChecked && !dbInitialized) {
    initializeDatabase();
    }
  }, [authChecked, securityInitialized, dbInitialized, currentUser]);

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setInitializationStage("Setting up notifications...");
        // Initialize notification service with timeout
        await Promise.race([
          notificationService.initialize(),
          timeout(3000) // 3 second timeout (reduced from 5)
        ]).catch(error => {
          console.warn('App: Notifications initialization timed out:', error.message);
        });
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        // Always set notificationsInitialized to true to prevent getting stuck
        setNotificationsInitialized(true);
      }
    };
    
    initializeNotifications();
  }, []);

  // Update loading state when all initialization is complete
  useEffect(() => {
    if (dbInitialized && securityInitialized && notificationsInitialized && authChecked) {
      console.log('App: All initialization complete, setting loading to false');
      setIsLoading(false);
      
      // Clear any pending timeouts
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    }
  }, [dbInitialized, securityInitialized, notificationsInitialized, authChecked]);

  // Show loading screen with skip button if initialization is taking too long
  if (!dbInitialized || !securityInitialized || !notificationsInitialized || !authChecked) {
    return (
      <LoadingScreen 
        initializationStage={initializationStage}
        showSkipButton={showSkipButton}
        onSkip={skipAuthentication}
      />
    );
  }

  // Handle error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Return the app navigator with pet synchronizer if user is authenticated
  return (
    <>
      {currentUser && currentUser.id && <PetSynchronizer userId={currentUser.id} />}
      <AppNavigator />
    </>
  );
};

// Create the App component
export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <ActivePetProvider>
                <AppContent />
              </ActivePetProvider>
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Styles
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  skipButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    width: 200,
    alignItems: 'center',
  },
  skipButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
