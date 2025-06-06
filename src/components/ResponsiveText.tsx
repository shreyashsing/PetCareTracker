import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { typography } from '../utils/responsiveText';

interface ResponsiveTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'buttonLarge' | 'buttonMedium' | 'buttonSmall' | 'label' | 'caption' | 'overline';
  maxFontSizeMultiplier?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  allowFontScaling?: boolean;
}

/**
 * ResponsiveText component that handles accessibility text scaling properly
 * and prevents text from breaking layouts
 */
export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  variant = 'bodyMedium',
  maxFontSizeMultiplier = 1.3, // Limit font scaling to 130% to prevent layout breaks
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.85,
  allowFontScaling = true,
  style,
  children,
  ...props
}) => {
  // Get the base font size from typography
  const baseFontSize = typography[variant];
  
  // Create the base text style with responsive font size
  const baseTextStyle: TextStyle = {
    fontSize: baseFontSize,
  };

  return (
    <Text
      {...props}
      style={[baseTextStyle, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      allowFontScaling={allowFontScaling}
    >
      {children}
    </Text>
  );
};

/**
 * Preset text components for common use cases
 */
export const Heading1 = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="h1" />
);

export const Heading2 = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="h2" />
);

export const Heading3 = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="h3" />
);

export const Heading4 = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="h4" />
);

export const BodyText = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="bodyMedium" />
);

export const SmallText = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="bodySmall" />
);

export const ButtonText = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="buttonMedium" />
);

export const Label = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="label" />
);

export const Caption = (props: Omit<ResponsiveTextProps, 'variant'>) => (
  <ResponsiveText {...props} variant="caption" />
);

export default ResponsiveText; 