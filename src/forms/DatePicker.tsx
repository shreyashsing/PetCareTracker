import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  pickerStyle?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  disabled?: boolean;
  touched?: boolean;
  mode?: 'date' | 'time' | 'datetime';
  format?: string; // date-fns format string
  minDate?: Date;
  maxDate?: Date;
}

const { width } = Dimensions.get('window');

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  helper,
  containerStyle,
  labelStyle,
  pickerStyle,
  fullWidth = true,
  disabled = false,
  touched = false,
  mode = 'date',
  format: dateFormat = 'PPP',
  minDate,
  maxDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(value);
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error && touched) return '#EF4444';
    if (isFocused) return '#4F46E5';
    return '#D1D5DB';
  };

  const handleOpen = () => {
    if (disabled) return;
    setShowPicker(true);
    setIsFocused(true);
    if (!tempDate) {
      setTempDate(new Date());
    }
  };

  const handleClose = () => {
    setShowPicker(false);
    setIsFocused(false);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    handleClose();
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'set') {
        setTempDate(selectedDate);
        onChange(selectedDate);
      }
      handleClose();
    } else {
      setTempDate(selectedDate);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setTempDate(undefined);
    handleClose();
  };

  const formattedDate = value ? format(value, dateFormat) : '';

  // Create picker based on platform
  const renderPicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleClose}>
                  <Text style={styles.actionText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {mode === 'date' ? 'Select Date' : mode === 'time' ? 'Select Time' : 'Select Date & Time'}
                </Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={[styles.actionText, styles.confirmText]}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode={mode}
                  display="spinner"
                  onChange={handleChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  style={styles.iosPicker}
                />
              </View>
              {value && (
                <TouchableOpacity 
                  style={styles.clearButton} 
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      );
    }

    if (showPicker) {
      return (
        <DateTimePicker
          value={tempDate || new Date()}
          mode={mode}
          display="default"
          onChange={handleChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      );
    }

    return null;
  };

  return (
    <View style={[
      styles.container,
      fullWidth && styles.fullWidth,
      containerStyle
    ]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleOpen}
        style={[
          styles.pickerContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.focused,
          disabled && styles.disabled,
          pickerStyle,
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.pickerText,
            !value && styles.placeholderText,
            disabled && styles.disabledText,
          ]}
        >
          {value ? formattedDate : placeholder}
        </Text>
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={20}
          color={disabled ? '#9CA3AF' : '#6B7280'}
          style={styles.icon}
        />
      </TouchableOpacity>

      {(helper && !error) && (
        <Text style={styles.helper}>{helper}</Text>
      )}
      {(error && touched) && (
        <Text style={styles.error}>{error}</Text>
      )}

      {renderPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#374151',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  icon: {
    marginLeft: 8,
  },
  focused: {
    borderWidth: 2,
  },
  disabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  helper: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  // iOS Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionText: {
    fontSize: 16,
    color: '#4F46E5',
  },
  confirmText: {
    fontWeight: '600',
  },
  iosPicker: {
    width: width,
    height: 200,
  },
  clearButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  clearButtonText: {
    color: '#EF4444',
    fontWeight: '500',
  },
});

export default DatePicker; 