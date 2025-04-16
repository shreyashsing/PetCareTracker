/**
 * PetCareTracker App Initialization
 * 
 * This file contains initialization code that runs before the app starts
 * It applies various patches and fixes needed for the app to run correctly
 */

import './patches/fixDatePickerNative';
import { initMemoryLeakDetection } from './utils/memoryLeakDetection';
import { Platform } from 'react-native';

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

// Log the initialization
console.log('PetCareTracker app initialized with all patches applied');

// Export a dummy object so this file can be imported
export const appInitialized = true; 