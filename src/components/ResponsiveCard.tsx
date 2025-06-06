import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { createResponsiveCardStyle, responsiveLayouts } from '../utils/responsiveLayout';
import { useTheme } from '../contexts/ThemeContext';

interface ResponsiveCardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'small' | 'medium' | 'large';
  elevation?: boolean;
  customStyle?: ViewStyle;
}

/**
 * ResponsiveCard component that handles text scaling gracefully
 * Use this instead of regular View for card components
 */
export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  padding = 'medium',
  elevation = true,
  customStyle,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  
  // Create responsive card style
  const cardStyle = createResponsiveCardStyle({
    backgroundColor: colors.card,
    ...(elevation && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
    ...customStyle,
  });

  return (
    <View
      {...props}
      style={[
        responsiveLayouts.adaptiveCard,
        cardStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * ResponsiveRow component for horizontal layouts that wrap gracefully
 */
export const ResponsiveRow: React.FC<{
  children: React.ReactNode;
  wrap?: boolean;
  style?: ViewStyle;
}> = ({ children, wrap = true, style }) => {
  return (
    <View style={[
      wrap ? responsiveLayouts.flexRow : responsiveLayouts.flexRowNoWrap,
      style
    ]}>
      {children}
    </View>
  );
};

/**
 * ResponsiveTextContainer for text that needs to wrap properly
 */
export const ResponsiveTextContainer: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  return (
    <View style={[responsiveLayouts.flexTextContainer, style]}>
      {children}
    </View>
  );
};

export default ResponsiveCard; 