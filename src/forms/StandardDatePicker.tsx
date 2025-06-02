import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppColors } from '../hooks/useAppColors';

interface StandardDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  error?: string;
  placeholder?: string;
  containerStyle?: any;
  disabled?: boolean;
}

const StandardDatePicker: React.FC<StandardDatePickerProps> = ({
  value,
  onChange,
  mode = 'date',
  label,
  error,
  placeholder,
  containerStyle,
  disabled = false,
}) => {
  const { colors } = useAppColors();
  const [showPicker, setShowPicker] = useState(false);
  
  const formatDisplayValue = (date: Date): string => {
    if (mode === 'date') {
      return date.toLocaleDateString();
    } else if (mode === 'time') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };
  
  const getIcon = () => {
    switch (mode) {
      case 'time':
        return 'time-outline';
      case 'datetime':
        return 'calendar-outline';
      default:
        return 'calendar-outline';
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onChange(selectedDate);
    }
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
      )}
      
      <TouchableOpacity 
        style={[
          styles.datePickerButton, 
          { 
            backgroundColor: colors.card, 
            borderColor: error ? '#F44336' : colors.border,
            opacity: disabled ? 0.6 : 1,
          }
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Ionicons 
          name={getIcon()} 
          size={20} 
          color={colors.primary} 
          style={styles.icon} 
        />
        <Text 
          style={[
            styles.dateText, 
            { 
              color: value ? colors.text : colors.text + '60' 
            }
          ]}
        >
          {value ? formatDisplayValue(value) : placeholder || `Select ${mode}`}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={colors.text + '60'} 
        />
      </TouchableOpacity>
      
      {error && (
        <Text style={[styles.errorText, { color: '#F44336' }]}>
          {error}
        </Text>
      )}
      
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  icon: {
    marginRight: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default StandardDatePicker; 