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
import { databaseManager } from './services/db';
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
    
    // Initialize security service
    await securityService.initialize();
    
    // Initialize database
    await databaseManager.initialize();
    
    // Initialize notifications system and reschedule all notifications
    // This will handle both task and medication notifications
    await notificationService.initialize();
    
    // Create demo user if needed for development/testing
    if (__DEV__) {
      await createDemoUserIfNeeded();
    }
    
    // App initialization complete
    appInitialized = true;
    console.log('App initialization complete');
    
    return true;
  } catch (error) {
    console.error('App initialization failed:', error);
    return false;
  }
}

// Initialize app immediately
initialize().catch(error => console.error('Failed to initialize app:', error));

// Export initialization status
export { appInitialized, initialize };

// Log the initialization
console.log('PetCareTracker app initialized with all patches applied'); 