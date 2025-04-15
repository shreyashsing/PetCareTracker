/**
 * This module patches the @react-native-community/datetimepicker
 * module to prevent NativeModule registration conflicts.
 */
import { NativeModules } from 'react-native';

// Create a proper shim with all necessary methods
const DatePickerShim = {
  // Android methods
  open: () => Promise.resolve({ action: 'dismissed' }),
  dismiss: () => {},
  register: () => {},

  // iOS methods
  getDefaultDisplayValue: () => null,
};

// Only patch if needed
function applyPatch() {
  try {
    // Check if the module is already available
    if (!NativeModules.RNCDateTimePicker) {
      console.log('Applying DateTimePicker patch (module not found)');
      
      // Create our shim
      NativeModules.RNCDateTimePicker = DatePickerShim;
    } else {
      console.log('DateTimePicker module already exists, no need to patch');
    }
  } catch (error) {
    console.warn('Failed to patch DateTimePicker:', error);
  }
}

// Apply the patch immediately
applyPatch();

export default DatePickerShim; 