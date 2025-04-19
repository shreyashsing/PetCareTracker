/**
 * Empty shim for react-native-keyboard-controller
 * This is used to prevent errors when the module is imported but not available
 */
import React from 'react';
import { View } from 'react-native';

// Export empty component as KeyboardControllerView
export const KeyboardControllerView = (props) => {
  return <View {...props} />;
};

// Export dummy hook functions
export const useKeyboardController = () => ({
  height: 0,
  state: 'CLOSED',
  toggle: () => {},
  dismiss: () => {},
  getState: () => 'CLOSED',
  getHeight: () => 0,
  isVisible: false,
});

export const useKeyboardHandler = () => {};

// Other exports that might be used
export const KeyboardState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  OPENING: 'OPENING',
  CLOSING: 'CLOSING',
};

// Default export
export default {
  KeyboardControllerView,
  useKeyboardController,
  useKeyboardHandler,
  KeyboardState,
}; 