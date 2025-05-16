/**
 * PetCareTracker App Initialization
 * 
 * This file contains initialization code that runs before the app starts
 * It applies various patches and fixes needed for the app to run correctly
 */

import './patches/fixDatePickerNative';
import { initMemoryLeakDetection } from './utils/memoryLeakDetection';
import { Platform } from 'react-native';
import { securityService } from './services/security';
import { createDemoUserIfNeeded } from './utils/demoUsers';
import { setupErrorHandling } from './utils/errorHandler';
import { unifiedDatabaseManager } from "./services/db";
import { notificationService } from './services/notifications';

// Initialize memory leak detection in development mode
if (__DEV__) {
  const stopMemoryLeakDetection = initMemoryLeakDetection(60000); // Check every minute
  console.log('Memory leak detection initialized in development mode');
  
  // For debugging in development, expose some globals
  if (global) {
    // @ts-ignore - This is for debugging purposes
    global.stopMemoryLeakDetection = stopMemoryLeakDetection;
  }
}

// Optimize image handling based on platform
if (Platform.OS === 'android') {
  // Android-specific optimizations
  console.log('Applying Android-specific image optimizations');
  
  // Increase the size of the image cache on Android
  // @ts-ignore - Accessing private API
  if (global.Image && global.Image.cacheSize) {
    // @ts-ignore - Accessing private API
    global.Image.cacheSize = 1024 * 1024 * 50; // 50MB
  }
} else if (Platform.OS === 'ios') {
  // iOS-specific optimizations
  console.log('Applying iOS-specific image optimizations');
}

// Track initialization
let appInitialized = false;
let initializationTimer: NodeJS.Timeout | null = null;

/**
 * Helper function to create a timeout promise
 * @param ms Timeout in milliseconds
 */
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
);

/**
 * Force initialization to complete after a timeout
 * This prevents the app from getting stuck during initialization
 */
function forceInitializationComplete() {
  if (!appInitialized) {
    console.warn('App initialization taking too long, forcing completion');
    appInitialized = true;
    
    // Clear the timer to prevent multiple calls
    if (initializationTimer) {
      clearTimeout(initializationTimer);
      initializationTimer = null;
    }
  }
}

/**
 * Initialize the application
 * This should be called as early as possible in the app lifecycle
 */
async function initialize(): Promise<boolean> {
  if (appInitialized) {
    console.log('App already initialized, skipping initialization');
    return true;
  }
  
  console.log('Initializing app...');
  
  try {
    // Set up error handling first
    setupErrorHandling();
    
    // Initialize security service with timeout
    try {
      await Promise.race([
        securityService.initialize(),
        timeout(3000) // 3 second timeout (reduced from 5)
      ]).catch(error => {
        console.warn('Security service initialization timed out or failed:', error.message);
        console.warn('Continuing with initialization to prevent app from getting stuck');
      });
    } catch (error) {
      console.error('Error initializing security service:', error);
    }
    
    // Initialize database with timeout
    try {
      await Promise.race([
        unifiedDatabaseManager.initialize(),
        timeout(5000) // 5 second timeout (reduced from 10)
      ]).catch(error => {
        console.warn('Database initialization timed out or failed:', error.message);
        console.warn('Continuing with initialization to prevent app from getting stuck');
      });
    } catch (error) {
      console.error('Error initializing database:', error);
    }
    
    // Initialize notifications system with timeout
    try {
      await Promise.race([
        notificationService.initialize(),
        timeout(3000) // 3 second timeout (reduced from 5)
      ]).catch(error => {
        console.warn('Notification service initialization timed out or failed:', error.message);
        console.warn('Continuing with initialization to prevent app from getting stuck');
      });
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
    
    // Create demo user if needed for development/testing
    if (__DEV__) {
      try {
        await Promise.race([
          createDemoUserIfNeeded(),
          timeout(5000) // 5 second timeout (increased from 2)
        ]).catch(error => {
          console.warn('Demo user creation timed out or failed:', error.message);
        });
      } catch (error) {
        console.error('Error creating demo user:', error);
      }
    }
    
    // App initialization complete
    appInitialized = true;
    console.log('App initialization complete');
    
    // Clear the initialization timer if it's still active
    if (initializationTimer) {
      clearTimeout(initializationTimer);
      initializationTimer = null;
    }
    
    return true;
  } catch (error) {
    console.error('App initialization failed:', error);
    // Set initialized to true anyway to prevent the app from getting stuck
    appInitialized = true;
    return false;
  }
}

// Initialize app immediately with a timeout to prevent getting stuck
Promise.race([
  initialize(),
  timeout(10000) // 10 second overall timeout (reduced from 20)
]).catch(error => {
  console.error('App initialization timed out:', error);
  appInitialized = true; // Mark as initialized to allow the app to continue
});

// Set a backup timer to force initialization to complete after 12 seconds
initializationTimer = setTimeout(forceInitializationComplete, 12000);

// Export initialization status and functions
export { appInitialized, initialize, forceInitializationComplete };

/**
 * Handle authentication errors gracefully
 * @param error The error to handle
 */
export function handleAuthError(error: any): void {
  if (!error) return;
  
  console.warn('Authentication error handled:', error.message || error);
  
  // If the error is related to missing session, we can ignore it
  // The app will continue as if the user is not authenticated
  if (error.message && error.message.includes('Auth session missing')) {
    console.log('Auth session missing error handled gracefully');
    return;
  }
  
  // For other errors, log them but don't crash the app
  console.error('Unhandled authentication error:', error);
}

// Log the initialization
console.log('PetCareTracker app initialized with all patches applied'); 