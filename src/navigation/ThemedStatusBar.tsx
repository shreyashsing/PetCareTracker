import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

// Simple StatusBar that adapts to system light/dark mode
export const ThemedStatusBar: React.FC = () => {
  const colorScheme = useColorScheme();
  // Always use light theme - force dark status bar (dark text on light background)
  const isDark = false; // Changed from: colorScheme === 'dark'
  return <StatusBar style={isDark ? "light" : "dark"} />;
}; 