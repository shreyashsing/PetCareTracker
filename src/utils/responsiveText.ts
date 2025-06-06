import { PixelRatio, Dimensions } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 12/13/14)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Responsive font size based on screen width
 * @param size - The base font size
 * @returns Responsive font size
 */
export const responsiveFontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  // Apply PixelRatio to ensure crisp text on all densities
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive spacing based on screen dimensions
 * @param size - The base spacing size
 * @returns Responsive spacing
 */
export const responsiveSpacing = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Typography scale that adapts to screen size and accessibility settings
 */
export const typography = {
  // Headings
  h1: responsiveFontSize(32),
  h2: responsiveFontSize(28),
  h3: responsiveFontSize(24),
  h4: responsiveFontSize(20),
  h5: responsiveFontSize(18),
  h6: responsiveFontSize(16),
  
  // Body text
  bodyLarge: responsiveFontSize(16),
  bodyMedium: responsiveFontSize(14),
  bodySmall: responsiveFontSize(12),
  
  // Button text
  buttonLarge: responsiveFontSize(16),
  buttonMedium: responsiveFontSize(14),
  buttonSmall: responsiveFontSize(12),
  
  // Labels and captions
  label: responsiveFontSize(14),
  caption: responsiveFontSize(12),
  overline: responsiveFontSize(10),
};

/**
 * Spacing scale that adapts to screen size
 */
export const spacing = {
  xs: responsiveSpacing(4),
  sm: responsiveSpacing(8),
  md: responsiveSpacing(12),
  lg: responsiveSpacing(16),
  xl: responsiveSpacing(20),
  xxl: responsiveSpacing(24),
  xxxl: responsiveSpacing(32),
};

/**
 * Get responsive width/height
 */
export const responsiveDimension = {
  width: (percentage: number) => (SCREEN_WIDTH * percentage) / 100,
  height: (percentage: number) => (SCREEN_HEIGHT * percentage) / 100,
};

/**
 * Responsive border radius
 */
export const responsiveBorderRadius = (size: number): number => {
  return responsiveSpacing(size);
};

/**
 * Check if device is a tablet
 */
export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
  
  return Math.min(adjustedWidth, adjustedHeight) >= 1000;
};

/**
 * Get device size category
 */
export const getDeviceSize = (): 'small' | 'medium' | 'large' => {
  if (SCREEN_WIDTH <= 320) return 'small';
  if (SCREEN_WIDTH <= 375) return 'medium';
  return 'large';
}; 