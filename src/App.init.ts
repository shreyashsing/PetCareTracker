/**
 * PetCareTracker App Initialization
 * 
 * This file contains initialization code that runs before the app starts
 * It applies various patches and fixes needed for the app to run correctly
 */

import './patches/fixDatePickerNative';

// Log the initialization
console.log('PetCareTracker app initialized with all patches applied');

// Export a dummy object so this file can be imported
export const appInitialized = true; 