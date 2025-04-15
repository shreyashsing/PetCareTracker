import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '../hooks/useAppColors';

interface SimpleDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  label?: string;
  error?: string;
  placeholder?: string;
  containerStyle?: any;
  allowMonthYearSelection?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

// Days of the week for the calendar header
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Month names for the month selector
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  value,
  onChange,
  mode = 'date',
  label,
  error,
  placeholder = 'Select date',
  containerStyle,
  allowMonthYearSelection = false,
  minDate,
  maxDate,
}) => {
  const { colors } = useAppColors();
  const [showPicker, setShowPicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(value);
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());
  const [showMonthYearSelector, setShowMonthYearSelector] = useState(false);
  
  // Create a lighter version of the primary color for selections
  const primaryLight = `${colors.primary}33`; // Adding 33 for 20% opacity
  
  // Format the date for display in DD-MM-YYYY format
  const formatDate = (date: Date): string => {
    if (mode === 'date') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } else if (mode === 'time') {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
  };
  
  // Handler for saving the date and time
  const handleSave = () => {
    const newDate = new Date(selectedDate);
    
    // Set time if in datetime or time mode
    if (mode === 'time' || mode === 'datetime') {
      newDate.setHours(selectedHour);
      newDate.setMinutes(selectedMinute);
    }
    
    onChange(newDate);
    setShowPicker(false);
  };
  
  // Go to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );
    setCurrentMonth(newMonth);
  };
  
  // Go to next month
  const goToNextMonth = () => {
    const newMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    setCurrentMonth(newMonth);
  };
  
  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get days array for the calendar
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Number of days in the month
    const daysInMonth = getDaysInMonth(year, month);
    
    // Number of days in previous month
    const daysInPrevMonth = getDaysInMonth(
      month === 0 ? year - 1 : year,
      month === 0 ? 11 : month - 1
    );
    
    const days = [];
    
    // Add days from previous month to fill the first row
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({
        day: daysInPrevMonth - firstDayOfMonth + i + 1,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }
    
    // Add days from next month to complete the last row
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - (firstDayOfMonth + daysInMonth);
    
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }
    
    return days;
  };
  
  // Check if a date is selected
  const isDateSelected = (day: number, month: number, year: number): boolean => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };
  
  // Check if a date is today
  const isToday = (day: number, month: number, year: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  // Check if a date is before minDate
  const isBeforeMinDate = (day: number, month: number, year: number): boolean => {
    if (!minDate) return false;
    
    const date = new Date(year, month, day);
    return date < minDate;
  };
  
  // Check if a date is after maxDate
  const isAfterMaxDate = (day: number, month: number, year: number): boolean => {
    if (!maxDate) return false;
    
    const date = new Date(year, month, day);
    return date > maxDate;
  };
  
  // Check if a date is disabled (either before minDate or after maxDate)
  const isDateDisabled = (day: number, month: number, year: number): boolean => {
    return isBeforeMinDate(day, month, year) || isAfterMaxDate(day, month, year);
  };
  
  // Generate years array for year selection (20 years in past, 20 years in future)
  const getYearsArray = () => {
    const currentYear = new Date().getFullYear();
    const minYear = minDate ? minDate.getFullYear() : currentYear - 20;
    const years = [];
    
    // Start from the minDate year or 20 years in the past, whichever is more recent
    const startYear = Math.max(minYear, currentYear - 20);
    for (let i = startYear; i <= currentYear + 20; i++) {
      years.push(i);
    }
    return years;
  };
  
  // Update the monthDisabled check to also consider maxDate
  const isMonthDisabled = (monthIndex: number): boolean => {
    // Check minDate constraint
    if (minDate && currentMonth.getFullYear() === minDate.getFullYear() && monthIndex < minDate.getMonth()) {
      return true;
    }
    
    // Check maxDate constraint
    if (maxDate && currentMonth.getFullYear() === maxDate.getFullYear() && monthIndex > maxDate.getMonth()) {
      return true;
    }
    
    return false;
  };
  
  // Update the yearDisabled check to also consider maxDate
  const isYearDisabled = (year: number): boolean => {
    if (minDate && year < minDate.getFullYear()) {
      return true;
    }
    
    if (maxDate && year > maxDate.getFullYear()) {
      return true;
    }
    
    return false;
  };
  
  // Render month and year selector
  const renderMonthYearSelector = () => {
    return (
      <View style={styles.monthYearSelectorContainer}>
        <Text style={[styles.monthYearSelectorTitle, { color: colors.text }]}>
          Select Month & Year
        </Text>
        
        <View style={styles.monthGrid}>
          {MONTHS.map((month, index) => {
            const isSelected = currentMonth.getMonth() === index;
            const isDisabled = isMonthDisabled(index);
            
            return (
              <TouchableOpacity
                key={`month-${index}`}
                style={[
                  styles.monthItem,
                  isSelected && { backgroundColor: colors.primary },
                  isDisabled && styles.monthItemDisabled
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(index);
                    setCurrentMonth(newMonth);
                  }
                }}
                disabled={isDisabled}
              >
                <Text style={[
                  styles.monthItemText,
                  { color: isSelected ? '#fff' : colors.text },
                  isDisabled && { color: colors.border }
                ]}>
                  {month.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <ScrollView style={styles.yearScroller} horizontal showsHorizontalScrollIndicator={false}>
          {getYearsArray().map(year => {
            const isSelected = currentMonth.getFullYear() === year;
            const isDisabled = isYearDisabled(year);
            
            return (
              <TouchableOpacity
                key={`year-${year}`}
                style={[
                  styles.yearItem,
                  isSelected && { backgroundColor: colors.primary },
                  isDisabled && styles.yearItemDisabled
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    const newMonth = new Date(currentMonth);
                    newMonth.setFullYear(year);
                    
                    // If the new year is the minDate year, and current month is before minDate month,
                    // adjust to the minDate month
                    if (minDate && year === minDate.getFullYear() && 
                        currentMonth.getMonth() < minDate.getMonth()) {
                      newMonth.setMonth(minDate.getMonth());
                    }
                    
                    setCurrentMonth(newMonth);
                  }
                }}
                disabled={isDisabled}
              >
                <Text style={[
                  styles.yearItemText,
                  { color: isSelected ? '#fff' : colors.text },
                  isDisabled && { color: colors.border }
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <TouchableOpacity
          style={[styles.doneButton, { marginTop: 15 }]}
          onPress={() => setShowMonthYearSelector(false)}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render the calendar part of the picker
  const renderCalendar = () => {
    const days = getCalendarDays();
    
    return (
      <View style={styles.calendarContainer}>
        {/* Calendar header with month and navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            style={styles.calendarNavButton} 
            onPress={goToPreviousMonth}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          {allowMonthYearSelection ? (
            <TouchableOpacity 
              onPress={() => setShowMonthYearSelector(true)}
              style={styles.monthYearButton}
            >
              <Text style={[styles.calendarTitle, { color: colors.text }]}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <Ionicons name="caret-down" size={14} color={colors.text} style={{ marginLeft: 5 }} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.calendarTitle, { color: colors.text }]}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
          )}
          
          <TouchableOpacity 
            style={styles.calendarNavButton} 
            onPress={goToNextMonth}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Weekday headers */}
        <View style={styles.weekdayHeader}>
          {WEEKDAYS.map(weekday => (
            <Text 
              key={weekday} 
              style={[styles.weekdayText, { color: colors.text }]}
            >
              {weekday}
            </Text>
          ))}
        </View>
        
        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days.map((item, index) => {
            const isSelected = isDateSelected(item.day, item.month, item.year);
            const isTodayDate = isToday(item.day, item.month, item.year);
            const isDisabled = isDateDisabled(item.day, item.month, item.year);
            
            return (
              <TouchableOpacity
                key={`${item.year}-${item.month}-${item.day}-${index}`}
                style={[
                  styles.calendarDay,
                  !item.isCurrentMonth && styles.calendarDayInactive,
                  isSelected && { backgroundColor: colors.primary },
                  isTodayDate && !isSelected && { borderColor: colors.primary, borderWidth: 1 },
                  isDisabled && styles.calendarDayDisabled
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    setSelectedDate(new Date(item.year, item.month, item.day));
                  }
                }}
                disabled={isDisabled}
              >
                <Text style={[
                  styles.calendarDayText,
                  { color: isSelected ? '#fff' : !item.isCurrentMonth ? colors.border : colors.text },
                  isDisabled && { color: colors.border }
                ]}>
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };
  
  // Render the time picker part
  const renderTimePicker = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    
    return (
      <View style={styles.timePickerContainer}>
        <Text style={[styles.timePickerTitle, { color: colors.text }]}>
          Select Time
        </Text>
        
        <View style={styles.timePickerContent}>
          <View style={styles.timePickerColumn}>
            <Text style={[styles.timeColumnLabel, { color: colors.text }]}>Hour</Text>
            <ScrollView 
              style={styles.timeScroller} 
              showsVerticalScrollIndicator={false}
            >
              {hours.map(hour => (
                <TouchableOpacity
                  key={`hour-${hour}`}
                  style={[
                    styles.timeItem,
                    selectedHour === hour && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedHour(hour)}
                >
                  <Text style={[
                    styles.timeItemText, 
                    { color: selectedHour === hour ? '#fff' : colors.text }
                  ]}>
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.timePickerColumn}>
            <Text style={[styles.timeColumnLabel, { color: colors.text }]}>Minute</Text>
            <ScrollView 
              style={styles.timeScroller} 
              showsVerticalScrollIndicator={false}
            >
              {minutes.map(minute => (
                <TouchableOpacity
                  key={`minute-${minute}`}
                  style={[
                    styles.timeItem,
                    selectedMinute === minute && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedMinute(minute)}
                >
                  <Text style={[
                    styles.timeItemText, 
                    { color: selectedMinute === minute ? '#fff' : colors.text }
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };
  
  // Render the date time picker
  const renderDateTimePicker = () => {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={[styles.headerText, { color: colors.text }]}>
            {mode === 'date' ? 'Select Date' : mode === 'time' ? 'Select Time' : 'Select Date & Time'}
          </Text>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleSave}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.dateFormatGuide}>
          <Text style={[styles.dateFormatText, { color: colors.text }]}>
            Format: {mode === 'date' ? 'DD-MM-YYYY' : mode === 'time' ? 'HH:MM' : 'DD-MM-YYYY HH:MM'}
          </Text>
        </View>
        
        {/* Show month-year selector if enabled and active */}
        {(mode === 'date' || mode === 'datetime') && showMonthYearSelector && allowMonthYearSelection && 
          renderMonthYearSelector()
        }
        
        {/* Show calendar for date and datetime modes */}
        {(mode === 'date' || mode === 'datetime') && !showMonthYearSelector && renderCalendar()}
        
        {/* Show time picker for time and datetime modes */}
        {(mode === 'time' || mode === 'datetime') && !showMonthYearSelector && (
          <>
            {mode === 'datetime' && <View style={styles.divider} />}
            {renderTimePicker()}
          </>
        )}
      </View>
    );
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.input,
          { borderColor: error ? colors.error : colors.border },
          { backgroundColor: colors.card }
        ]}
        onPress={() => {
          setSelectedDate(new Date(value));
          setSelectedHour(value.getHours());
          setSelectedMinute(value.getMinutes());
          setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
          setShowPicker(true);
        }}
      >
        <Text style={[styles.inputText, { color: colors.text }]}>
          {formatDate(value)}
        </Text>
        <Ionicons 
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'} 
          size={20} 
          color={colors.text} 
        />
      </TouchableOpacity>
      
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
      
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {renderDateTimePicker()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  pickerContainer: {
    width: '100%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    padding: 8,
  },
  dateFormatGuide: {
    marginBottom: 15,
  },
  dateFormatText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  
  // Calendar styles
  calendarContainer: {
    marginBottom: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarNavButton: {
    padding: 5,
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 7 days per row
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayInactive: {
    opacity: 0.5,
  },
  calendarDayText: {
    fontSize: 14,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  
  // Time picker styles
  timePickerContainer: {
    marginBottom: 15,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  timePickerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timePickerColumn: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  timeColumnLabel: {
    fontWeight: '600',
    marginBottom: 10,
  },
  timeScroller: {
    height: 150,
    width: 60,
  },
  timeItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginVertical: 2,
    alignItems: 'center',
  },
  timeItemText: {
    fontSize: 16,
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  monthYearSelectorContainer: {
    padding: 10,
  },
  monthYearSelectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  monthItem: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  monthItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  yearScroller: {
    flexDirection: 'row',
  },
  yearItem: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  yearItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  monthItemDisabled: {
    opacity: 0.3,
  },
  yearItemDisabled: {
    opacity: 0.3,
  },
});

export default SimpleDatePicker; 