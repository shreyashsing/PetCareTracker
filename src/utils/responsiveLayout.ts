import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { spacing, responsiveDimension, responsiveBorderRadius, getDeviceSize } from './responsiveText';

/**
 * Responsive card style that adapts to text scaling
 */
export const createResponsiveCardStyle = (customStyle?: ViewStyle): ViewStyle => {
  const deviceSize = getDeviceSize();
  
  const basePadding = deviceSize === 'small' ? spacing.md : spacing.lg;
  const baseMargin = deviceSize === 'small' ? spacing.sm : spacing.md;
  
  return {
    padding: basePadding,
    margin: baseMargin,
    borderRadius: responsiveBorderRadius(12),
    minHeight: 'auto', // Allow height to grow with content
    flexShrink: 0, // Prevent shrinking
    ...customStyle,
  };
};

/**
 * Responsive flex layouts that handle text overflow
 */
export const responsiveLayouts = StyleSheet.create({
  // Container that grows with content
  flexContainer: {
    flexDirection: 'column',
    minHeight: 'auto',
  },
  
  // Row that wraps when text gets too large
  flexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start', // Align to top instead of center for text wrapping
  },
  
  // Row that doesn't wrap but allows overflow
  flexRowNoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0, // Allow shrinking
  },
  
  // Flexible text container
  flexTextContainer: {
    flex: 1,
    minWidth: 0, // Important: allows text to wrap properly
  },
  
  // Card layout that adapts to content
  adaptiveCard: {
    flexDirection: 'column',
    minHeight: 'auto',
    padding: spacing.lg,
    borderRadius: responsiveBorderRadius(12),
  },
  
  // Grid that stacks on small screens or large text
  adaptiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  // Grid item that takes full width when needed
  gridItem: {
    minWidth: responsiveDimension.width(45), // Minimum 45% width
    maxWidth: '100%',
    marginBottom: spacing.md,
  },
});

/**
 * Create responsive button styles
 */
export const createResponsiveButtonStyle = (
  variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary',
  size: 'small' | 'medium' | 'large' = 'medium'
): ViewStyle => {
  const deviceSize = getDeviceSize();
  
  let baseHeight: number;
  let basePadding: number;
  
  switch (size) {
    case 'small':
      baseHeight = deviceSize === 'small' ? 36 : 40;
      basePadding = spacing.sm;
      break;
    case 'large':
      baseHeight = deviceSize === 'small' ? 52 : 56;
      basePadding = spacing.xl;
      break;
    default: // medium
      baseHeight = deviceSize === 'small' ? 44 : 48;
      basePadding = spacing.lg;
  }
  
  return {
    minHeight: baseHeight,
    paddingHorizontal: basePadding,
    paddingVertical: spacing.sm,
    borderRadius: responsiveBorderRadius(8),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  };
};

/**
 * Responsive text styles that prevent layout breaks
 */
export const responsiveTextStyles = StyleSheet.create({
  // Text that ellipsizes instead of wrapping
  ellipsisText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  } as TextStyle,
  
  // Text that wraps gracefully
  wrappingText: {
    flexWrap: 'wrap',
    lineHeight: 1.4,
  } as TextStyle,
  
  // Text in cards that adapts to container
  cardText: {
    lineHeight: 1.3,
    flexShrink: 1,
    flexGrow: 0,
  } as TextStyle,
  
  // Text in buttons that doesn't break layout
  buttonText: {
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 1.2,
  } as TextStyle,
});

/**
 * Responsive spacing helper
 */
export const getResponsiveSpacing = (
  baseSpacing: keyof typeof spacing,
  multiplier: number = 1
): number => {
  return spacing[baseSpacing] * multiplier;
};

/**
 * Create responsive margin/padding styles
 */
export const createSpacingStyle = (
  margin?: number | 'auto',
  padding?: number,
  marginHorizontal?: number,
  marginVertical?: number,
  paddingHorizontal?: number,
  paddingVertical?: number
): ViewStyle => {
  return {
    ...(margin !== undefined && { margin }),
    ...(padding !== undefined && { padding }),
    ...(marginHorizontal !== undefined && { marginHorizontal }),
    ...(marginVertical !== undefined && { marginVertical }),
    ...(paddingHorizontal !== undefined && { paddingHorizontal }),
    ...(paddingVertical !== undefined && { paddingVertical }),
  };
}; 