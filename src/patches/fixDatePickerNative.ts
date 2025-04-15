/**
 * This file provides safer fixes for DateTimePicker native modules
 * It creates dummy objects that can be used if the native modules are missing
 */
import { Platform } from 'react-native';

// Create dummy objects to avoid errors
const dummyDatePickerAndroid = {
  open: async (options: any) => {
    console.log('Mock DatePickerAndroid.open called with:', options);
    return {
      action: 'dismissedAction',
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
      day: new Date().getDate()
    };
  },
  dismiss: () => {
    console.log('Mock DatePickerAndroid.dismiss called');
  }
};

const dummyTimePickerAndroid = {
  open: async (options: any) => {
    console.log('Mock TimePickerAndroid.open called with:', options);
    return {
      action: 'dismissedAction',
      hour: new Date().getHours(),
      minute: new Date().getMinutes()
    };
  },
  dismiss: () => {
    console.log('Mock TimePickerAndroid.dismiss called');
  }
};

const dummyRNCDateTimePicker = {
  getDefaultDisplayValue: () => null
};

// Safely make the dummy objects available globally without modifying NativeModules
if (Platform.OS === 'android') {
  try {
    // @ts-ignore - we're adding to the global object
    if (typeof global.DatePickerAndroid === 'undefined') {
      // @ts-ignore
      global.DatePickerAndroid = dummyDatePickerAndroid;
      console.log('Set global.DatePickerAndroid to mock implementation');
    }
    
    // @ts-ignore
    if (typeof global.TimePickerAndroid === 'undefined') {
      // @ts-ignore
      global.TimePickerAndroid = dummyTimePickerAndroid;
      console.log('Set global.TimePickerAndroid to mock implementation');
    }
    
    // @ts-ignore
    if (typeof global.DateTimePickerAndroid === 'undefined') {
      // @ts-ignore
      global.DateTimePickerAndroid = {
        open: async (options: any) => {
          console.log('Mock DateTimePickerAndroid.open called with:', options);
          return { type: 'dismissed' };
        },
        dismiss: () => {
          console.log('Mock DateTimePickerAndroid.dismiss called');
        }
      };
      console.log('Set global.DateTimePickerAndroid to mock implementation');
    }
  } catch (error) {
    console.error('Error patching DateTimePicker global objects:', error);
  }
}

// Export the dummy implementations so they can be used directly in components
export const DatePickerAndroid = dummyDatePickerAndroid;
export const TimePickerAndroid = dummyTimePickerAndroid;
export const RNCDateTimePicker = dummyRNCDateTimePicker;

console.log('DateTimePicker safer patch applied');

// Export a dummy function so this module can be imported
export const datePickerPatchApplied = true; 