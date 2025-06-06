import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';
import { ResponsiveText } from '../components/ResponsiveText';
import { createResponsiveButtonStyle, responsiveTextStyles } from '../utils/responsiveLayout';
import { typography, spacing, responsiveBorderRadius } from '../utils/responsiveText';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  // Get responsive button style
  const responsiveButtonStyle = createResponsiveButtonStyle(variant, size);
  
  // Determine which style to use based on variant prop
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.primaryButton;
    }
  };
  
  // Determine which text style to use based on variant prop
  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      default:
        return styles.primaryText;
    }
  };
  
  // Get text variant based on button size
  const getTextVariant = () => {
    switch (size) {
      case 'small':
        return 'buttonSmall' as const;
      case 'large':
        return 'buttonLarge' as const;
      default:
        return 'buttonMedium' as const;
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        responsiveButtonStyle,
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? '#4F46E5' : '#ffffff'} 
        />
      ) : (
        <ResponsiveText 
          variant={getTextVariant()}
          style={[
            responsiveTextStyles.buttonText,
            styles.text, 
            getTextStyle(), 
            disabled && styles.disabledText,
            textStyle
          ]}
          maxFontSizeMultiplier={1.2} // Limit scaling for buttons
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.9}
        >
          {title}
        </ResponsiveText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#4F46E5',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button; 