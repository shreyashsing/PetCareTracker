import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Pressable, 
  StyleProp, 
  ViewStyle, 
  TextStyle 
} from 'react-native';

interface SwitchProps {
  label?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  error?: string;
  helper?: string;
  size?: 'small' | 'medium' | 'large';
  activeColor?: string;
  inactiveColor?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
  containerStyle,
  labelStyle,
  error,
  helper,
  size = 'medium',
  activeColor = '#4F46E5',
  inactiveColor = '#E5E7EB',
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  
  const getSwitchWidth = () => {
    switch (size) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 46;
    }
  };
  
  const getThumbSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 24;
      default: return 18;
    }
  };
  
  const getTrackHeight = () => {
    switch (size) {
      case 'small': return 18;
      case 'large': return 30;
      default: return 24;
    }
  };
  
  const switchWidth = getSwitchWidth();
  const thumbSize = getThumbSize();
  const trackHeight = getTrackHeight();
  
  const thumbPosition = switchWidth - thumbSize - 4;
  
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? thumbPosition : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, thumbPosition, translateX]);
  
  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>{label}</Text>
        </View>
      )}
      
      <View style={styles.switchRow}>
        <Pressable 
          onPress={handleToggle}
          disabled={disabled}
          style={({ pressed }) => [
            {
              opacity: (pressed || disabled) ? 0.7 : 1,
            }
          ]}
        >
          <View 
            style={[
              styles.track, 
              { 
                backgroundColor: value ? activeColor : inactiveColor,
                width: switchWidth,
                height: trackHeight,
                opacity: disabled ? 0.5 : 1,
              }
            ]}
          >
            <Animated.View 
              style={[
                styles.thumb, 
                { 
                  width: thumbSize, 
                  height: thumbSize,
                  transform: [{ translateX }],
                }
              ]}
            />
          </View>
        </Pressable>
        
        {helper && !error && (
          <Text style={styles.helper}>{helper}</Text>
        )}
      </View>
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  helper: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 12,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

export default Switch; 