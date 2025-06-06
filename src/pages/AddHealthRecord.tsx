import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { useFormStatePersistence } from '../hooks/useFormStatePersistence';
import { FormStateNotification } from '../components/FormStateNotification';
import { 
  Input, 
  Select, 
  Switch,
  DatePicker
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { HealthRecord } from '../types/components';
import { generateUUID } from '../utils/helpers';
import { notificationService } from '../services/notifications';

type AddHealthRecordScreenProps = NativeStackScreenProps<MainStackParamList, 'AddHealthRecord'>;

type RecordType = 'vaccination' | 'checkup' | 'surgery' | 'dental' | 'other';
type SeverityType = 'low' | 'medium' | 'high';

interface FormState {
  type: RecordType;
  title: string;
  date: Date;
  veterinarian: string;
  clinic: string;
  weight: string;
  temperature: string;
  notes: string;
  followUpDate?: Date;
  followUpNeeded: boolean;
  severity: SeverityType;
  isCompleted: boolean;
  // Vaccination specific fields
  vaccineName: string;
  nextDueDate?: Date;
  nextDueDateNeeded: boolean;
}

const AddHealthRecord: React.FC<AddHealthRecordScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors  } = useAppColors();
  const [isLoading, setIsLoading] = useState(false);
  const [realPetId, setRealPetId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  
  // Initialize form state with default values
  const [formState, setFormState] = useState<FormState>({
    type: 'checkup',
    title: '',
    date: new Date(),
    veterinarian: '',
    clinic: '',
    weight: '',
    temperature: '',
    notes: '',
    followUpDate: undefined,
    followUpNeeded: false,
    severity: 'low',
    isCompleted: true,
    // Vaccination specific fields
    vaccineName: '',
    nextDueDate: undefined,
    nextDueDateNeeded: false,
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state persistence hook - only for new records (not edit mode)
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'AddHealthRecord',
    formState,
    setFormState,
    enabled: !isEditMode, // Disable for edit mode
    debounceMs: 2000
  });
  
  // Initialize from record data if in edit mode
  useEffect(() => {
    if (route.params?.recordToEdit) {
      const record = route.params.recordToEdit;
      setIsEditMode(true);
      setRecordId(record.id);
      
      // Get pet ID from the record
      if (record.petId) {
        setRealPetId(record.petId);
      }
      
      // Map record data to form state
      const newFormState: FormState = {
        type: record.type as RecordType,
        title: record.title || '',
        date: new Date(record.date),
        veterinarian: record.veterinarian || record.provider?.name || '',
        clinic: record.clinic || record.provider?.clinic || '',
        weight: record.weight ? record.weight.toString() : '',
        temperature: '',
        notes: record.description || '',
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : undefined,
        followUpNeeded: record.followUpNeeded,
        severity: (record.severity as SeverityType) || 'low',
        isCompleted: record.status === 'completed',
        vaccineName: record.type === 'vaccination' ? record.title : '',
        nextDueDate: record.followUpDate && record.type === 'vaccination' ? new Date(record.followUpDate) : undefined,
        nextDueDateNeeded: record.followUpNeeded && record.type === 'vaccination',
      };
      
      console.log('Provider info in edit mode:', {
        fromProvider: record.provider,
        directVet: record.veterinarian,
        directClinic: record.clinic,
        formVet: newFormState.veterinarian,
        formClinic: newFormState.clinic
      });
      
      // Extract weight if available (for checkups)
      if (record.weight) {
        newFormState.weight = record.weight.toString();
      }
      
      setFormState(newFormState);
      console.log('Initialized form for editing record:', record.id);
    }
  }, [route.params]);
  
  // Fetch the real pet ID from AsyncStorage when component mounts
  useEffect(() => {
    const fetchRealPetId = async () => {
      try {
        // Only fetch if we don't already have a pet ID from an edited record
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
  
  const recordTypeOptions = [
    { label: 'Vaccination', value: 'vaccination' },
    { label: 'Checkup', value: 'checkup' },
    { label: 'Surgery', value: 'surgery' },
    { label: 'Dental', value: 'dental' },
    { label: 'Other', value: 'other' },
  ];
  
  const severityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ];
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of current day for comparison
    
    // For vaccination type, vaccineName is required, otherwise title is required
    if (formState.type === 'vaccination') {
      if (!formState.vaccineName.trim()) {
        newErrors.vaccineName = 'Vaccine name is required';
      }
    } else {
    if (!formState.title.trim()) {
      newErrors.title = 'Title is required';
      }
    }
    
    // Check if date is in the future
    if (formState.date > today) {
      newErrors.date = 'Health record date cannot be in the future';
    }
    
    if (formState.weight && isNaN(parseFloat(formState.weight))) {
      newErrors.weight = 'Weight must be a number';
    }
    
    if (formState.temperature && isNaN(parseFloat(formState.temperature))) {
      newErrors.temperature = 'Temperature must be a number';
    }
    
    if (formState.followUpDate && formState.date > formState.followUpDate) {
      newErrors.followUpDate = 'Follow-up date must be after the record date';
    }
    
    if (formState.nextDueDate && formState.date > formState.nextDueDate) {
      newErrors.nextDueDate = 'Next due date must be after the administration date';
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
    setFormState((prev) => {
      const newState = { ...prev, [name]: value };
      
      // Auto-set follow-up date when follow-up is enabled
      if (name === 'followUpNeeded' && value === true && !prev.followUpDate) {
        newState.followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      }
      
      // Auto-set next due date when vaccination follow-up is enabled
      if (name === 'nextDueDateNeeded' && value === true && !prev.nextDueDate) {
        newState.nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      }
      
      return newState;
    });
    
    setTouched((prev) => ({ ...prev, [name]: true }));
  };
  
  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Clear saved form state on successful submission
      clearSavedState();

      // Get the effective pet ID - prefer the real one from AsyncStorage
      const effectivePetId = realPetId || activePetId;
      
      if (!effectivePetId) {
        console.log('Missing effective pet ID');
        alert('No pet selected');
        return;
      }
      
      console.log('Using effective pet ID:', effectivePetId);
      
      // Define isVaccination early to use in baseRecord
      const isVaccination = formState.type === 'vaccination';
      
      // Create base health record with common fields
      const baseRecord: Partial<HealthRecord> = {
        id: isEditMode && recordId ? recordId : generateUUID(),
        petId: effectivePetId,
        date: formState.date,
        // Set the provider object for local storage
        provider: {
          name: formState.veterinarian || 'Unknown',
          specialty: '',
          clinic: formState.clinic || 'Unknown',
          phone: '',
          email: ''
        },
        // Set direct fields for UI display (these won't be stored in Supabase)
        veterinarian: formState.veterinarian || 'Unknown',
        clinic: formState.clinic || 'Unknown',
        // IMPORTANT: These snake_case versions are what actually get stored in Supabase
        provider_name: formState.veterinarian || 'Unknown',
        provider_clinic: formState.clinic || 'Unknown',
        // These camelCase versions will get removed before storing in Supabase
        providerName: formState.veterinarian || 'Unknown',
        providerClinic: formState.clinic || 'Unknown',
        insuranceCovered: false,
        followUpNeeded: isVaccination ? formState.nextDueDateNeeded : formState.followUpNeeded,
        status: formState.isCompleted ? 'completed' : 'scheduled' as const,
        severity: formState.severity, // Add severity field
        // Store weight directly as a field for proper saving
        weight: formState.weight ? parseFloat(formState.weight) : undefined 
      };
      
      // Handle different record types
      if (formState.type === 'vaccination') {
        // Vaccination record
        const vaccinationRecord: HealthRecord = {
          ...baseRecord,
          type: 'vaccination',
          title: formState.vaccineName,
          description: formState.notes || `${formState.vaccineName} vaccination`,
          symptoms: [],
          diagnosis: '',
          treatment: '',
          followUpNeeded: formState.nextDueDateNeeded,
          followUpDate: formState.nextDueDateNeeded 
            ? (formState.nextDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // Default to 30 days from now if no date set
            : undefined,
        } as HealthRecord;
        
        if (isEditMode && recordId) {
          await unifiedDatabaseManager.healthRecords.update(recordId, vaccinationRecord);
        } else {
          await unifiedDatabaseManager.healthRecords.create(vaccinationRecord);
        }
        
      } else {
        // Other record types
        const newRecord: HealthRecord = {
          ...baseRecord,
          type: formState.type,
          title: formState.title || 'Untitled Record',
          description: formState.notes || '',
          symptoms: [],
          diagnosis: '',
          treatment: '',
          followUpNeeded: formState.followUpNeeded,
          followUpDate: formState.followUpNeeded 
            ? (formState.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) // Default to 7 days from now if no date set
            : undefined,
        } as HealthRecord;
        
        // Add weight and temperature to lab results for checkups
        // For checkups, store weight directly in the weight field
        if (formState.type === 'checkup' && formState.weight) {
          newRecord.weight = parseFloat(formState.weight);
        }
        
        if (isEditMode && recordId) {
          await unifiedDatabaseManager.healthRecords.update(recordId, newRecord as HealthRecord);
        } else {
          await unifiedDatabaseManager.healthRecords.create(newRecord as HealthRecord);
        }
      }
      
      console.log('Health record saved successfully!');
      
      // Schedule follow-up notifications if needed
      try {
        // Get the created/updated record to pass to notification service
        const savedRecord = {
          id: isEditMode ? recordId! : generateUUID(), // For new records, we'd need the actual ID from the database
          petId: effectivePetId,
          type: formState.type,
          title: formState.type === 'vaccination' ? formState.vaccineName : formState.title,
          followUpNeeded: formState.type === 'vaccination' ? formState.nextDueDateNeeded : formState.followUpNeeded,
          followUpDate: formState.type === 'vaccination' ? formState.nextDueDate : formState.followUpDate,
        };
        
        // Only schedule notifications if follow-up is needed and date is set
        if (savedRecord.followUpNeeded && savedRecord.followUpDate) {
          await notificationService.scheduleHealthRecordNotifications(savedRecord);
          console.log('✅ Health record follow-up notifications scheduled successfully');
        }
      } catch (notificationError) {
        console.error('Error scheduling health record notifications:', notificationError);
        // Don't fail the entire operation for notification errors
      }
      
      alert(isEditMode ? 'Health record updated successfully!' : 'Health record added successfully!');
      
      // Navigate back with refresh parameter
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Health');
      }
    } catch (error) {
      console.error('Error submitting health record:', error);
      Alert.alert('Error', 'Failed to save health record. Please try again.');
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
      {/* Form State Restoration Notification */}
      <FormStateNotification 
        visible={wasRestored}
        onDismiss={dismissRestoreNotification}
        formName="health record"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="heart-half" size={32} color="white" />
            </View>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Add'} Health Record</Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode ? 'Update your pet\'s health information' : 'Record your pet\'s health information'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formContainer}>
          {/* Record Type Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="medical" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Record Type & Date</Text>
            </View>

            <Select
              label="Record Type"
              options={recordTypeOptions}
              selectedValue={formState.type}
              onValueChange={(value) => handleChange('type', value)}
              containerStyle={styles.inputContainer}
              error={errors.type}
              touched={touched.type}
            />
            
            <DatePicker
              label="Date"
              value={formState.date}
              onChange={(date) => handleChange('date', date)}
              mode="date"
              error={errors.date}
              containerStyle={styles.inputContainer}
            />
          </View>

          {formState.type === 'vaccination' ? (
            // Vaccination specific fields
            <>
              {/* Vaccination Information Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#4ECDC420' }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Vaccination Details</Text>
                </View>

                <Input
                  label="Vaccine Name"
                  placeholder="Enter vaccine name"
                  value={formState.vaccineName}
                  onChangeText={(value) => handleChange('vaccineName', value)}
                  error={errors.vaccineName}
                  touched={touched.vaccineName}
                  containerStyle={styles.inputContainer}
                />
                
                <View style={[styles.switchCard, { backgroundColor: colors.background }]}>
                  <View style={styles.switchContent}>
                    <View style={styles.switchLabelContainer}>
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.switchIcon} />
                      <Text style={[styles.switchLabel, { color: colors.text }]}>
                        Next Due Date Required
                      </Text>
                    </View>
                    <Switch
                      value={formState.nextDueDateNeeded}
                      onValueChange={(value) => handleChange('nextDueDateNeeded', value)}
                    />
                  </View>
                </View>
                
                {formState.nextDueDateNeeded && (
                  <DatePicker
                    label="Next Due Date"
                    value={formState.nextDueDate || new Date()}
                    onChange={(date) => handleChange('nextDueDate', date)}
                    mode="date"
                    error={errors.nextDueDate}
                    containerStyle={styles.inputContainer}
                  />
                )}
              </View>

              {/* Healthcare Provider Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#9B59B620' }]}>
                    <Ionicons name="business" size={20} color="#9B59B6" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Healthcare Provider</Text>
                </View>

                <Input
                  label="Veterinarian"
                  placeholder="Enter veterinarian name"
                  value={formState.veterinarian}
                  onChangeText={(value) => handleChange('veterinarian', value)}
                  error={errors.veterinarian}
                  touched={touched.veterinarian}
                  containerStyle={styles.inputContainer}
                />
                
                <Input
                  label="Clinic"
                  placeholder="Enter clinic name"
                  value={formState.clinic}
                  onChangeText={(value) => handleChange('clinic', value)}
                  error={errors.clinic}
                  touched={touched.clinic}
                  containerStyle={styles.inputContainer}
                />
              </View>

              {/* Additional Notes Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#95A5A620' }]}>
                    <Ionicons name="create" size={20} color="#95A5A6" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
                </View>

                <Input
                  label="Notes"
                  placeholder="Additional details or observations"
                  value={formState.notes}
                  onChangeText={(value) => handleChange('notes', value)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.textArea, { backgroundColor: colors.background }]}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </>
          ) : (
            // Other record types fields
            <>
              {/* Record Information Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.secondary + '20' }]}>
                    <Ionicons name="document-text" size={20} color={colors.secondary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Record Information</Text>
                </View>

                <Input
                  label="Title"
                  placeholder="Enter record title"
                  value={formState.title}
                  onChangeText={(value) => handleChange('title', value)}
                  error={errors.title}
                  touched={touched.title}
                  containerStyle={styles.inputContainer}
                />

                <Select
                  label="Severity"
                  options={severityOptions}
                  selectedValue={formState.severity}
                  onValueChange={(value) => handleChange('severity', value as SeverityType)}
                  containerStyle={styles.inputContainer}
                />
                
                <View style={[styles.switchCard, { backgroundColor: colors.background }]}>
                  <View style={styles.switchContent}>
                    <View style={styles.switchLabelContainer}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.switchIcon} />
                      <Text style={[styles.switchLabel, { color: colors.text }]}>
                        Completed
                      </Text>
                    </View>
                    <Switch
                      value={formState.isCompleted}
                      onValueChange={(value) => handleChange('isCompleted', value)}
                    />
                  </View>
                </View>
              </View>

              {/* Healthcare Provider Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#9B59B620' }]}>
                    <Ionicons name="business" size={20} color="#9B59B6" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Healthcare Provider</Text>
                </View>

                <Input
                  label="Veterinarian"
                  placeholder="Enter veterinarian name"
                  value={formState.veterinarian}
                  onChangeText={(value) => handleChange('veterinarian', value)}
                  error={errors.veterinarian}
                  touched={touched.veterinarian}
                  containerStyle={styles.inputContainer}
                />
                
                <Input
                  label="Clinic"
                  placeholder="Enter clinic name"
                  value={formState.clinic}
                  onChangeText={(value) => handleChange('clinic', value)}
                  error={errors.clinic}
                  touched={touched.clinic}
                  containerStyle={styles.inputContainer}
                />
              </View>

              {formState.type === 'checkup' && (
                /* Physical Measurements Section */
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: '#FF6B6B20' }]}>
                      <Ionicons name="fitness" size={20} color="#FF6B6B" />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Physical Measurements</Text>
                  </View>

                  <View style={styles.rowContainer}>
                    <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                      <Input
                        label="Weight (kg)"
                        placeholder="Enter weight"
                        value={formState.weight}
                        onChangeText={(value) => handleChange('weight', value)}
                        keyboardType="numeric"
                        error={errors.weight}
                        touched={touched.weight}
                      />
                    </View>
                    
                    <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                      <Input
                        label="Temperature (°C)"
                        placeholder="Enter temperature"
                        value={formState.temperature}
                        onChangeText={(value) => handleChange('temperature', value)}
                        keyboardType="numeric"
                        error={errors.temperature}
                        touched={touched.temperature}
                      />
                    </View>
                  </View>
                </View>
              )}
              
              {/* Follow-up Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#FFA50020' }]}>
                    <Ionicons name="time" size={20} color="#FFA500" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Follow-up</Text>
                </View>

                <View style={[styles.switchCard, { backgroundColor: colors.background }]}>
                  <View style={styles.switchContent}>
                    <View style={styles.switchLabelContainer}>
                      <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.switchIcon} />
                      <Text style={[styles.switchLabel, { color: colors.text }]}>
                        Follow-up Required
                      </Text>
                    </View>
                    <Switch
                      value={formState.followUpNeeded}
                      onValueChange={(value) => handleChange('followUpNeeded', value)}
                    />
                  </View>
                </View>
                
                {formState.followUpNeeded && (
                  <DatePicker
                    label="Follow-up Date"
                    value={formState.followUpDate || new Date()}
                    onChange={(date) => handleChange('followUpDate', date)}
                    mode="date"
                    error={errors.followUpDate}
                    containerStyle={styles.inputContainer}
                  />
                )}
              </View>

              {/* Additional Notes Section */}
              <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#95A5A620' }]}>
                    <Ionicons name="create" size={20} color="#95A5A6" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Notes</Text>
                </View>

                <Input
                  label="Notes"
                  placeholder="Additional details or observations"
                  value={formState.notes}
                  onChangeText={(value) => handleChange('notes', value)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[styles.textArea, { backgroundColor: colors.background }]}
                  containerStyle={styles.inputContainer}
                />
              </View>
            </>
          )}
        
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={20} color={colors.text} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingIndicator}>
                  <Ionicons name="sync" size={20} color="white" style={styles.spinner} />
                  <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                    {isEditMode ? 'Updating...' : 'Saving...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>
                    {isEditMode ? 'Update' : 'Save'}
                  </Text>
                </>
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
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  switchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    padding: 12,
    borderRadius: 8,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  buttonIcon: {
    marginRight: 8,
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
    marginRight: 8,
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

export default AddHealthRecord; 