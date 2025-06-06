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
const SplashScreen: React.FC<{ 
  initializationStage: string
}> = ({ initializationStage }) => {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.splashContent}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🐾</Text>
          <Text style={styles.appName}>Pet Care Tracker</Text>
        </View>
        
        {/* Loading indicator - clean, no text */}
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.9)" />
        </View>
      </View>
      
      {/* Footer */}
      <View style={styles.splashFooter}>
        <Text style={styles.footerText}>Caring for your pets, one step at a time</Text>
      </View>
    </View>
  );
};

// Main app content component
const AppContent: React.FC = () => {
  const auth = useAuth();
  const { skipAuth } = auth;
  const [coreInitialized, setCoreInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundInitialized, setBackgroundInitialized] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [initializationStage, setInitializationStage] = useState<string>("Starting up...");

  // Optimized: Initialize core and background services in parallel
  useEffect(() => {
    const initializeCoreServices = async () => {
      try {
        setInitializationStage("Initializing core services...");
        console.log('App: Starting optimized parallel initialization...');
        
        // Initialize all core services in parallel (essential for app startup)
        const coreInitPromises = [
          // Authentication check
          (async () => {
            try {
              console.log('App: Checking authentication...');
              const userResult = await Promise.race([
                getCurrentUser(),
                timeout(2000) // Reduced timeout for faster failover
              ]).catch(error => {
                console.warn('App: Authentication check timed out:', error.message);
                return { data: { user: null }, error: null };
              });
              
              const typedUserResult = userResult as { 
                data: { user: any | null }, 
                error: any | null 
              };
              
              if (typedUserResult.data?.user) {
                console.log('App: User is authenticated');
                setCurrentUser(typedUserResult.data.user);
              } else {
                console.log('App: No authenticated user, attempting session refresh');
                
                const refreshResult = await Promise.race([
                  refreshSessionSafe(),
                  timeout(2000)
                ]).catch(error => {
                  console.warn('App: Session refresh timed out:', error.message);
                  return { data: { session: null, user: null }, error: null };
                });
                
                const typedRefreshResult = refreshResult as {
                  data: { session: any | null, user: any | null },
                  error: any | null
                };
                
                if (typedRefreshResult.data?.session) {
                  console.log('App: Session refreshed successfully');
                  setCurrentUser(typedRefreshResult.data.user);
                }
              }
            } catch (error) {
              console.error('App: Error in authentication check:', error);
            }
          })(),
          
          // Security service initialization
          (async () => {
            try {
              console.log('App: Initializing security service...');
              await Promise.race([
                securityService.initialize(),
                timeout(2000)
              ]).catch(error => {
                console.warn('App: Security initialization timed out:', error.message);
              });
              
              console.log('Security mode:', securityService.getSecurityMode());
            } catch (error) {
              console.error('Security initialization error:', error);
            }
          })(),
          
          // Database initialization (essential)
          (async () => {
            try {
              console.log('App: Initializing database...');
              
              // Initialize the unified database manager
              await Promise.race([
                unifiedDatabaseManager.initialize(),
                timeout(3000)
              ]).catch(error => {
                console.warn('App: Database initialization timed out:', error.message);
              });
              
              // Run essential migrations
              await Promise.race([
                runMigrationsToEnsureTablesExist(),
                timeout(2000)
              ]).catch(error => {
                console.warn('App: Migrations timed out:', error.message);
              });
              
              console.log('App: Database initialized successfully');
            } catch (error) {
              console.error('App: Database initialization error:', error);
              setError('Database initialization failed');
            }
          })()
        ];
        
        // Wait for all core services to complete
        await Promise.all(coreInitPromises);
        
        console.log('App: Core services initialized successfully');
        setCoreInitialized(true);
        
      } catch (error) {
        console.error('App: Core initialization error:', error);
        setCoreInitialized(true); // Continue anyway
      }
    };

    // Start core initialization immediately
    initializeCoreServices();
  }, []);

  // Background initialization (non-critical services)
  useEffect(() => {
    if (coreInitialized) {
      const initializeBackground = async () => {
        try {
          setInitializationStage("Finalizing setup...");
          console.log('App: Starting background initialization...');
          
          // Initialize background services in parallel
          const backgroundPromises = [
            // Notifications (can be deferred)
            (async () => {
              try {
                console.log('App: Initializing notifications...');
                await Promise.race([
                  notificationService.initialize(),
                  timeout(3000)
                ]).catch(error => {
                  console.warn('App: Notifications initialization timed out:', error.message);
                });
              } catch (error) {
                console.error('Error initializing notifications:', error);
              }
            })(),
            
            // Pet images bucket (can be deferred)
            (async () => {
              try {
                console.log('App: Ensuring pet-images storage bucket exists');
                const bucketName = await Promise.race([
                  ensurePetImagesBucketExists(),
                  timeout(2000)
                ]).catch(error => {
                  console.warn('App: Bucket initialization timed out:', error.message);
                  return null;
                });
                
                if (bucketName) {
                  console.log(`App: Using storage bucket: ${bucketName}`);
                } else {
                  console.warn('App: Could not ensure pet-images bucket exists');
                }
              } catch (bucketError) {
                console.error('App: Error initializing pet-images bucket:', bucketError);
              }
            })()
          ];
          
          // Wait for background services (with shorter timeout)
          await Promise.race([
            Promise.all(backgroundPromises),
            timeout(5000) // Don't wait too long for background services
          ]).catch(error => {
            console.warn('App: Background initialization timed out:', error.message);
          });
          
          console.log('App: Background services initialized');
          setBackgroundInitialized(true);
          
        } catch (error) {
          console.error('App: Background initialization error:', error);
          setBackgroundInitialized(true); // Continue anyway
        }
      };

      // Start background initialization
      initializeBackground();
    }
  }, [coreInitialized]);

  // Update loading state when core initialization is complete
  useEffect(() => {
    if (coreInitialized) {
      console.log('App: Core initialization complete, app ready to load');
      setIsLoading(false);
    }
  }, [coreInitialized]);

  // Show splash screen during initialization
  if (!coreInitialized) {
    return (
      <SplashScreen 
        initializationStage={initializationStage}
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
  // Splash screen styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#2E8B57', // Sea Green
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    // Subtle gradient effect using shadow
    shadowColor: '#1F5F3F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    // Subtle glow effect
    shadowColor: 'rgba(255, 255, 255, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 20,
    // Add subtle shadow to emoji
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F0FFF0', // Honeydew - very light green
    textAlign: 'center',
    letterSpacing: 1,
    // Text shadow for depth
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loadingSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: 'rgba(240, 255, 240, 0.9)', // Light green tint
    textAlign: 'center',
  },
  splashFooter: {
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(240, 255, 240, 0.85)', // Light green tint
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  // Error screen styles
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
