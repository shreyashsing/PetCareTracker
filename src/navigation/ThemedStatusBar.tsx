import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

// Simple StatusBar that adapts to system light/dark mode
export const ThemedStatusBar: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return <StatusBar style={isDark ? "light" : "dark"} />;
}; 