import React, { createContext, useContext } from 'react';

// Default theme colors
const defaultColors = {
  primary: '#4caf50',
  background: '#f5f5f5', 
  card: '#ffffff',
  text: '#000000',
  border: '#e0e0e0',
  notification: '#ff6b6b',
  error: '#ff6b6b',
  success: '#4caf50',
  warning: '#ffa726',
  info: '#2196f3',
  assistantText: '#000000',
  userBubble: '#4caf50',
  assistantBubble: '#e0e0e0',
  userText: '#ffffff',
  inputBackground: '#ffffff',
  inputText: '#000000',
  placeholderText: '#888888',
  sendButton: '#4caf50',
};

// Theme context type
export interface ThemeContextType {
  colors: typeof defaultColors;
  isDark: boolean;
  toggleTheme?: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  colors: defaultColors,
  isDark: false,
});

// Hook to use theme context
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 