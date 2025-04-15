/**
 * DatePicker Shim to prevent errors when the native module isn't available
 */
import { NativeModules, Platform } from 'react-native';

// Define the global augmentation
declare global {
  var RNCDateTimePicker: any;
  var DateTimePickerAndroid: any;
}

// Create a simple mock implementation
const RNCDateTimePickerMock = {
  // Event names used by the native module
  DateTimePickerAndroid: {
    dismiss: () => {},
    open: (options: any) => {
      console.log('Mock DateTimePickerAndroid.open called with options:', options);
      return Promise.resolve({ 
        action: 'dismissed',
        timestamp: new Date().getTime()
      });
    },
    register: () => {},
    onChange: (event: any) => {}
  },
  // iOS specific props
  RNCDateTimePicker: {
    getDefaultDisplayValue: () => null
  }
};

// Use a safer approach that works in bridgeless mode
const applyShim = () => {
  try {
    // Check if the module exists by trying to use it
    const moduleExists = !!NativeModules.RNCDateTimePicker;
    
    if (!moduleExists) {
      console.log('Applying DateTimePicker patch (module not found)');
      
      // Use global object as a safer alternative in bridgeless mode
      global.RNCDateTimePicker = global.RNCDateTimePicker || RNCDateTimePickerMock;
      
      // For Android platform
      if (Platform.OS === 'android') {
        global.DateTimePickerAndroid = global.DateTimePickerAndroid || RNCDateTimePickerMock.DateTimePickerAndroid;
      }
      
      // Attempt to patch the NativeModules object as well
      if (NativeModules && typeof NativeModules === 'object') {
        try {
          // @ts-ignore - we're dynamically adding a property
          NativeModules.RNCDateTimePicker = NativeModules.RNCDateTimePicker || RNCDateTimePickerMock.RNCDateTimePicker;
        } catch (error) {
          console.warn('Failed to patch NativeModules.RNCDateTimePicker:', error);
        }
      }
      
      console.log('DatePicker shim applied successfully');
    } else {
      console.log('DateTimePicker module found, skipping shim application');
    }
  } catch (error) {
    console.warn('Error in DatePicker shim application:', error);
    
    // Apply the shim anyway as a fallback
    try {
      global.RNCDateTimePicker = global.RNCDateTimePicker || RNCDateTimePickerMock;
      
      if (Platform.OS === 'android') {
        global.DateTimePickerAndroid = global.DateTimePickerAndroid || RNCDateTimePickerMock.DateTimePickerAndroid;
      }
      
      console.log('DatePicker shim applied as fallback');
    } catch (fallbackError) {
      console.error('Failed to apply DatePicker shim fallback:', fallbackError);
    }
  }
};

// Apply the shim
applyShim();

export default RNCDateTimePickerMock; 