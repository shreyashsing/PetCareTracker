import { useColorScheme } from 'react-native';

// Color definitions
const lightColors = {
  primary: '#4CAF50',
  secondary: '#03dac6',
  background: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  border: '#e0e0e0',
  notification: '#f50057',
  accent: '#FCD34D',
  surface: '#ffffff',
  error: '#B00020',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  onPrimary: '#ffffff',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#ffffff',
  elevation: {
    level0: '#ffffff',
    level1: '#f5f5f5',
    level2: '#eeeeee',
    level3: '#e0e0e0',
    level4: '#bdbdbd',
    level5: '#9e9e9e',
  },
};

const darkColors = {
  primary: '#81C784',
  secondary: '#03dac6',
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  border: '#2e2e2e',
  notification: '#ff6090',
  accent: '#FCD34D',
  surface: '#1e1e1e',
  error: '#cf6679',
  success: '#81C784',
  warning: '#FFD54F',
  info: '#64B5F6',
  disabled: '#757575',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  onPrimary: '#000000',
  onSecondary: '#000000',
  onBackground: '#ffffff',
  onSurface: '#ffffff',
  onError: '#000000',
  elevation: {
    level0: '#121212',
    level1: '#1e1e1e',
    level2: '#222222',
    level3: '#272727',
    level4: '#2c2c2c',
    level5: '#323232',
  },
};

// Type for colors
export type AppColors = typeof lightColors;

// Simple hook that returns colors based on system theme
export const useAppColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  
  return {
    colors,
    isDark,
    colorScheme,
  };
}; 