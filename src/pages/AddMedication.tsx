import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { 
  Input, 
  Select, 
  Switch,
  DatePicker
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { Medication } from '../types/components';
import { generateUUID } from '../utils/helpers';
import { notificationService } from '../services/notifications';

type AddMedicationScreenProps = NativeStackScreenProps<MainStackParamList, 'AddMedication'>;

type DosageUnit = 'tablet(s)' | 'ml' | 'mg' | 'g' | 'drop(s)' | 'application(s)';
type FrequencyPeriod = 'day' | 'week' | 'month';

interface FormState {
  name: string;
  type: 'pill' | 'liquid' | 'injection' | 'topical' | 'chewable' | 'other';
  dosageAmount: string;
  dosageUnit: DosageUnit;
  frequencyTimes: string;
  frequencyPeriod: FrequencyPeriod;
  startDate: Date;
  endDate?: Date;
  isOngoing: boolean;
  notes: string;
  reminderEnabled: boolean;
  reminderTimes: string[];
}

const AddMedication: React.FC<AddMedicationScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors  } = useAppColors();
  const [isLoading, setIsLoading] = useState(false);
  const [realPetId, setRealPetId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [medicationId, setMedicationId] = useState<string | null>(null);

  // Initialize form state with default values
  const [formState, setFormState] = useState<FormState>({
    name: '',
    type: 'pill',
    dosageAmount: '',
    dosageUnit: 'tablet(s)',
    frequencyTimes: '1',
    frequencyPeriod: 'day',
    startDate: new Date(),
    endDate: undefined,
    isOngoing: true,
    notes: '',
    reminderEnabled: true,
    reminderTimes: ['08:00'],
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Initialize from medication data if in edit mode
  useEffect(() => {
    if (route.params?.medicationToEdit) {
      const medication = route.params.medicationToEdit;
      setIsEditMode(true);
      setMedicationId(medication.id);
      
      // Get pet ID from the medication
      if (medication.petId) {
        setRealPetId(medication.petId);
      }
      
      // Map medication data to form state
      const newFormState: FormState = {
        name: medication.name || '',
        type: medication.type || 'pill',
        dosageAmount: medication.dosage?.amount?.toString() || '',
        dosageUnit: medication.dosage?.unit || 'tablet(s)',
        frequencyTimes: medication.frequency?.times?.toString() || '1',
        frequencyPeriod: medication.frequency?.period || 'day',
        startDate: new Date(medication.duration?.startDate || new Date()),
        endDate: medication.duration?.endDate ? new Date(medication.duration.endDate) : undefined,
        isOngoing: !medication.duration?.endDate,
        notes: medication.notes || '',
        reminderEnabled: true,
        reminderTimes: medication.reminders?.map((r: { time: string }) => r.time) || ['08:00'],
      };
      
      setFormState(newFormState);
      console.log('Initialized form for editing medication:', medication.id);
    }
  }, [route.params]);
  
  // Fetch the real pet ID from AsyncStorage when component mounts
  useEffect(() => {
    const fetchRealPetId = async () => {
      try {
        // Only fetch if we don't already have a pet ID from an edited medication
        if (!realPetId) {
          const storedPetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
          console.log('Real active pet ID from storage:', storedPetId);
          setRealPetId(storedPetId);
        }
      } catch (error) {
        console.error('Error fetching real pet ID:', error);
      }
    };
    
    fetchRealPetId();
  }, [realPetId]);
  
  const medicationTypeOptions = [
    { label: 'Pill', value: 'pill' },
    { label: 'Liquid', value: 'liquid' },
    { label: 'Injection', value: 'injection' },
    { label: 'Topical', value: 'topical' },
    { label: 'Chewable', value: 'chewable' },
    { label: 'Other', value: 'other' },
  ];
  
  const dosageUnitOptions = [
    { label: 'Tablet(s)', value: 'tablet(s)' },
    { label: 'ml', value: 'ml' },
    { label: 'mg', value: 'mg' },
    { label: 'g', value: 'g' },
    { label: 'Drop(s)', value: 'drop(s)' },
    { label: 'Application(s)', value: 'application(s)' },
  ];
  
  const frequencyPeriodOptions = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ];
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      newErrors.name = 'Medication name is required';
    }
    
    if (!formState.dosageAmount.trim()) {
      newErrors.dosageAmount = 'Dosage amount is required';
    } else if (isNaN(parseFloat(formState.dosageAmount))) {
      newErrors.dosageAmount = 'Dosage amount must be a number';
    }
    
    if (!formState.frequencyTimes.trim()) {
      newErrors.frequencyTimes = 'Frequency is required';
    } else if (isNaN(parseInt(formState.frequencyTimes, 10))) {
      newErrors.frequencyTimes = 'Frequency must be a number';
    }
    
    if (!formState.isOngoing && formState.endDate) {
      if (formState.endDate < formState.startDate) {
      newErrors.endDate = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    
    // Create a touched state for all fields
    const newTouched: Record<string, boolean> = {};
    Object.keys(formState).forEach(key => {
      newTouched[key] = true;
    });
    setTouched(newTouched);
    
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (name: keyof FormState, value: any) => {
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    // Special case for isOngoing toggle
    if (name === 'isOngoing' && value === true) {
      setFormState(prev => ({
        ...prev,
        endDate: undefined,
      }));
    }
  };
  
  // Validation function for medication times
  const validateMedicationTimes = () => {
    const warnings = [];
    
    if (formState.frequencyPeriod === 'day' && parseInt(formState.frequencyTimes, 10) > 1) {
      const timesPerDay = parseInt(formState.frequencyTimes, 10);
      const specificTimesCount = formState.reminderTimes?.length || 0;
      
      if (specificTimesCount === 1 && timesPerDay > 1) {
        warnings.push(
          `You've set the frequency to ${timesPerDay}x per day but only specified 1 time. ` +
          `The app will automatically generate ${timesPerDay - 1} additional reminder times.`
        );
      } else if (specificTimesCount > 0 && specificTimesCount < timesPerDay) {
        warnings.push(
          `You've set the frequency to ${timesPerDay}x per day but only specified ${specificTimesCount} time(s). ` +
          `The app will automatically generate ${timesPerDay - specificTimesCount} additional reminder times.`
        );
      }
    }
    
    return warnings;
  };
  
  const handleSubmit = async () => {
    if (!validate()) {
      // Return early if validation fails
      return;
    }
    
    // Check for time configuration warnings
    if (formState.reminderEnabled && formState.frequencyPeriod === 'day' && parseInt(formState.frequencyTimes, 10) > 1) {
      const timesPerDay = parseInt(formState.frequencyTimes, 10);
      const specificTimesCount = formState.reminderTimes?.length || 0;
      
      if (specificTimesCount === 1 && timesPerDay > 1) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Time Configuration Notice',
            `You've set the frequency to ${timesPerDay}x per day but only specified 1 reminder time. The app will automatically generate ${timesPerDay - 1} additional reminder times between 8:00 AM and 10:00 PM.\n\nDo you want to continue?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Continue', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!confirmed) return;
      } else if (specificTimesCount > 0 && specificTimesCount < timesPerDay) {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Time Configuration Notice',
            `You've set the frequency to ${timesPerDay}x per day but only specified ${specificTimesCount} reminder time(s). The app will automatically generate ${timesPerDay - specificTimesCount} additional reminder times.\n\nDo you want to continue?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Continue', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!confirmed) return;
      }
    }
    
    // Prevent multiple submissions
    if (isLoading) {
      return;
    }
    
    // Get effective pet ID - either from editMode or from AsyncStorage
    const effectivePetId = realPetId || activePetId;
    
    if (!effectivePetId) {
      Alert.alert('Error', 'No active pet selected. Please select a pet first.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Using effective pet ID:', effectivePetId);
      
      // Create medication record
      const medicationRecord: Partial<Medication> = {
        id: isEditMode && medicationId ? medicationId : generateUUID(),
        petId: effectivePetId,
        name: formState.name,
        type: formState.type,
        dosage: {
          amount: parseFloat(formState.dosageAmount),
          unit: formState.dosageUnit
        },
        frequency: {
          times: parseInt(formState.frequencyTimes, 10),
          period: formState.frequencyPeriod,
          specificTimes: formState.reminderEnabled ? formState.reminderTimes : undefined
        },
        duration: {
          startDate: formState.startDate,
          endDate: formState.isOngoing ? undefined : formState.endDate,
          indefinite: formState.isOngoing
        },
        administrationMethod: 'oral',
        prescribedBy: '',
        refillable: false,
        refillsRemaining: undefined,
        purpose: '',
        status: 'active',
        history: [],
        reminderSettings: {
          enabled: formState.reminderEnabled,
          reminderTime: 30
        },
        inventory: {
          currentAmount: 0,
          totalAmount: 0,
          unit: formState.dosageUnit,
          lowStockThreshold: 0,
          reorderAlert: false
        },
        specialInstructions: formState.notes
      };
      
      if (isEditMode && medicationId) {
        console.log('Updating medication:', JSON.stringify(medicationRecord, null, 2));
        await unifiedDatabaseManager.medications.update(medicationId, medicationRecord as Medication);
        
        // Handle notification scheduling for updated medication
        if (formState.reminderEnabled) {
          try {
          // Schedule notifications for this medication
          await notificationService.scheduleMedicationNotifications(medicationRecord as Medication);
          console.log('Medication notifications scheduled successfully');
          } catch (notificationError: any) {
            console.error('[ERROR TRACKING] REGULAR:', notificationError);
            
            // Check if this is a notification limit error
            const errorMessage = notificationError.message || '';
            if (errorMessage.includes('maximum limit') || errorMessage.includes('limit reached')) {
              Alert.alert(
                'Notification Limit Reached',
                'Your device has reached the maximum number of scheduled notifications. Only the most recent medications will receive notifications. Your medication has been saved.',
                [{ text: 'OK' }]
              );
            } else {
              // For other notification errors, just log them but don't block the medication from being saved
              console.error('Error scheduling medication notifications:', notificationError);
            }
          }
        } else {
          // Cancel any existing notifications for this medication
          await notificationService.cancelMedicationNotifications(medicationId);
          console.log('Medication notifications canceled');
        }
      } else {
        console.log('Creating new medication:', JSON.stringify(medicationRecord, null, 2));
        await unifiedDatabaseManager.medications.create(medicationRecord as Medication);
        
        // Schedule notifications if reminders are enabled
        if (formState.reminderEnabled) {
          try {
          await notificationService.scheduleMedicationNotifications(medicationRecord as Medication);
          console.log('Medication notifications scheduled successfully');
          } catch (notificationError: any) {
            console.error('[ERROR TRACKING] REGULAR:', notificationError);
            
            // Check if this is a notification limit error
            const errorMessage = notificationError.message || '';
            if (errorMessage.includes('maximum limit') || errorMessage.includes('limit reached')) {
              Alert.alert(
                'Notification Limit Reached',
                'Your device has reached the maximum number of scheduled notifications. Only the most recent medications will receive notifications. Your medication has been saved.',
                [{ text: 'OK' }]
              );
            } else {
              // For other notification errors, just log them but don't block the medication from being saved
              console.error('Error scheduling medication notifications:', notificationError);
            }
          }
        }
      }
      
      console.log('Medication saved successfully!');
      Alert.alert(
        'Success', 
        isEditMode ? 'Medication updated successfully!' : 'Medication added successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', `Failed to save medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show a loading screen if we don't have active pet ID info yet
  if (!activePetId && !realPetId) {
    return (
      <View style={[styles.noSelectionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noSelectionText, { color: colors.text }]}>Loading pet information...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
      <LinearGradient
          colors={[colors.primary, colors.primary + '80']}
          style={styles.header}
      >
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Add'} Medication</Text>
          <Text style={styles.headerSubtitle}>
            {isEditMode ? 'Update your pet\'s medication' : 'Track your pet\'s medication schedule'}
          </Text>
      </LinearGradient>
      
        <View style={[styles.form, { backgroundColor: colors.background }]}>
          <Input
            label="Medication Name"
            placeholder="Enter medication name"
            value={formState.name}
            onChangeText={(value) => handleChange('name', value)}
            error={errors.name}
            touched={touched.name}
            containerStyle={styles.inputContainer}
          />
          
          <Select
            label="Medication Type"
            options={medicationTypeOptions}
            selectedValue={formState.type}
            onValueChange={(value) => handleChange('type', value)}
            error={errors.type}
            touched={touched.type}
            containerStyle={styles.inputContainer}
          />
          
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <Input
                label="Dosage Amount"
                placeholder="Enter amount"
                value={formState.dosageAmount}
                onChangeText={(value) => handleChange('dosageAmount', value)}
                keyboardType="numeric"
                error={errors.dosageAmount}
                touched={touched.dosageAmount}
              />
            </View>
            
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Select
                label="Unit"
                options={dosageUnitOptions}
                selectedValue={formState.dosageUnit}
                onValueChange={(value) => handleChange('dosageUnit', value)}
                error={errors.dosageUnit}
                touched={touched.dosageUnit}
              />
            </View>
          </View>
          
          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Input
                label="Times Per"
                placeholder="Enter frequency"
                value={formState.frequencyTimes}
                onChangeText={(value) => handleChange('frequencyTimes', value)}
                keyboardType="numeric"
                error={errors.frequencyTimes}
                touched={touched.frequencyTimes}
          />
            </View>
            
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
          <Select
                label="Period"
                options={frequencyPeriodOptions}
                selectedValue={formState.frequencyPeriod}
                onValueChange={(value) => handleChange('frequencyPeriod', value)}
                error={errors.frequencyPeriod}
                touched={touched.frequencyPeriod}
          />
            </View>
          </View>
          
          <DatePicker
            label="Start Date"
            value={formState.startDate}
            onChange={(date) => handleChange('startDate', date)}
            mode="date"
            error={errors.startDate}
            containerStyle={styles.inputContainer}
          />
          
          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              Ongoing Treatment
            </Text>
            <Switch
              value={formState.isOngoing}
              onValueChange={(value) => handleChange('isOngoing', value)}
              />
            </View>
            
          {!formState.isOngoing && (
            <DatePicker
              label="End Date"
              value={formState.endDate || new Date()}
              onChange={(date) => handleChange('endDate', date)}
              mode="date"
              error={errors.endDate}
              containerStyle={styles.inputContainer}
            />
          )}
          
          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              Enable Reminders
            </Text>
            <Switch
              value={formState.reminderEnabled}
              onValueChange={(value) => handleChange('reminderEnabled', value)}
            />
            </View>
          
          <Input
            label="Notes"
            placeholder="Additional instructions or notes"
            value={formState.notes}
            onChangeText={(value) => handleChange('notes', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.background }]}
            containerStyle={styles.inputContainer}
          />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <Ionicons name="sync" size={20} color="white" style={styles.spinner} />
                  <Text style={styles.buttonText}>
                    {isEditMode ? 'Updating...' : 'Saving...'}
                  </Text>
              </View>
            ) : (
                <Text style={styles.buttonText}>
                  {isEditMode ? 'Update' : 'Save'}
                </Text>
            )}
          </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderRadius: 10,
    margin: 15,
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  form: {
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    padding: 10,
    borderRadius: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 10,
    transform: [{ rotate: '0deg' }],
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSelectionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AddMedication; 