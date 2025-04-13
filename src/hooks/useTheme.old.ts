import { useColorScheme } from 'react-native';

// Define theme colors
const lightColors = {
  primary: '#4e9ee4',
  secondary: '#7bbdf5',
  background: '#ffffff',
  card: '#f5f5f5',
  text: '#333333',
  border: '#e0e0e0',
  notification: '#ff4136',
  error: '#ff4136',
  success: '#2ecc40',
  warning: '#ffdc00',
};

const darkColors = {
  primary: '#4e9ee4',
  secondary: '#7bbdf5',
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  border: '#2c2c2c',
  notification: '#ff4136',
  error: '#ff4136',
  success: '#2ecc40',
  warning: '#ffdc00',
};

export type ThemeColors = typeof lightColors;

export const useTheme = () => {
  const colorScheme = useColorScheme();
  
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  
  return {
    colors,
    colorScheme,
  };
}; 