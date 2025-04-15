import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { 
  Input, 
  Select, 
  Switch,
  DatePicker
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import { databaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { HealthRecord } from '../types/components';
import { generateUUID } from '../utils/helpers';

type AddHealthRecordScreenProps = NativeStackScreenProps<RootStackParamList, 'AddHealthRecord'>;

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
  severity: SeverityType;
  isCompleted: boolean;
  attachments: string[];
  // Vaccination specific fields
  vaccineName: string;
  nextDueDate?: Date;
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
    severity: 'low',
    isCompleted: true,
    attachments: [],
    // Vaccination specific fields
    vaccineName: '',
    nextDueDate: undefined,
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
        veterinarian: record.provider?.name || '',
        clinic: record.provider?.clinic || '',
        weight: '',
        temperature: '',
        notes: record.description || '',
        followUpDate: record.followUpDate ? new Date(record.followUpDate) : undefined,
        severity: 'low', // Default
        isCompleted: record.status === 'completed',
        attachments: [],
        vaccineName: record.type === 'vaccination' ? record.title : '',
        nextDueDate: record.followUpDate && record.type === 'vaccination' ? new Date(record.followUpDate) : undefined,
      };
      
      // Extract lab results if available (for checkups)
      if (record.labResults && record.labResults.length > 0) {
        const weightResult = record.labResults.find((r: any) => r.name === 'Weight');
        if (weightResult) {
          newFormState.weight = weightResult.value;
        }
        
        const tempResult = record.labResults.find((r: any) => r.name === 'Temperature');
        if (tempResult) {
          newFormState.temperature = tempResult.value;
        }
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
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  };
  
  const handleSubmit = async () => {
    const validationResult = validate();
    // Get the effective pet ID - prefer the real one from AsyncStorage
    const effectivePetId = realPetId || activePetId;
    
    if (!validationResult || !effectivePetId) {
      console.log('Validation failed or no effective pet ID');
      if (!validationResult) {
        console.log('Validation errors:', errors);
      }
      if (!effectivePetId) {
        console.log('Missing effective pet ID');
      }
      
      // Show error to user
      alert(`Cannot save record: ${!validationResult ? 'Please fix the form errors' : 'No pet selected'}`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Using effective pet ID:', effectivePetId);
      console.log('Form state type:', formState.type);
      
      // Create base health record with common fields
      const baseRecord: Partial<HealthRecord> = {
        id: isEditMode && recordId ? recordId : generateUUID(),
        petId: effectivePetId,
        date: formState.date,
        provider: {
          name: formState.veterinarian || 'Unknown',
          specialty: '',
          clinic: formState.clinic || 'Unknown',
          phone: '',
          email: ''
        },
        cost: 0,
        insuranceCovered: false,
        followUpNeeded: false,
        attachments: [],
        status: formState.isCompleted ? 'completed' : 'scheduled' as const
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
          followUpNeeded: !!formState.nextDueDate,
          followUpDate: formState.nextDueDate,
        } as HealthRecord;
        
        if (isEditMode && recordId) {
          console.log('Updating vaccination record:', JSON.stringify(vaccinationRecord, null, 2));
          await databaseManager.healthRecords.update(recordId, vaccinationRecord);
        } else {
          console.log('Creating new vaccination record:', JSON.stringify(vaccinationRecord, null, 2));
          await databaseManager.healthRecords.create(vaccinationRecord);
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
          followUpNeeded: !!formState.followUpDate,
          followUpDate: formState.followUpDate,
        } as HealthRecord;
        
        // Add weight and temperature to lab results for checkups
        if (formState.type === 'checkup') {
          newRecord.labResults = [];
          
          if (formState.weight) {
            newRecord.labResults.push({
            name: 'Weight',
            value: formState.weight,
            unit: 'kg',
            normalRange: ''
            });
          }
        
        if (formState.temperature) {
          newRecord.labResults.push({
            name: 'Temperature',
            value: formState.temperature,
            unit: '°C',
            normalRange: '37.5-39.2'
          });
        }
      }
      
        if (isEditMode && recordId) {
          console.log('Updating non-vaccination record:', JSON.stringify(newRecord, null, 2));
          await databaseManager.healthRecords.update(recordId, newRecord as HealthRecord);
        } else {
          console.log('Creating new non-vaccination record:', JSON.stringify(newRecord, null, 2));
      await databaseManager.healthRecords.create(newRecord as HealthRecord);
        }
      }
      
      console.log('Health record saved successfully!');
      alert(isEditMode ? 'Health record updated successfully!' : 'Health record added successfully!');
      
      // Navigate back with refresh parameter
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main', { screen: 'Health', params: { refresh: Date.now().toString() } } as any);
      }
    } catch (error) {
      console.error('Error saving health record:', error);
      alert(`Failed to save health record: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  
  // Once we have pet info (either from hook or AsyncStorage)
  const isVaccination = formState.type === 'vaccination';
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
      <LinearGradient
          colors={[colors.primary, colors.primary + '80']}
          style={styles.header}
      >
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Add'} Health Record</Text>
          <Text style={styles.headerSubtitle}>
            {isEditMode ? 'Update your pet\'s health information' : 'Record your pet\'s health information'}
          </Text>
      </LinearGradient>
      
        <View style={[styles.form, { backgroundColor: colors.background }]}>
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
          
          {isVaccination ? (
            // Vaccination specific fields
            <>
              <Input
                label="Vaccine Name"
                placeholder="Enter vaccine name"
                value={formState.vaccineName}
                onChangeText={(value) => handleChange('vaccineName', value)}
                error={errors.vaccineName}
                touched={touched.vaccineName}
                containerStyle={styles.inputContainer}
              />
              
              <DatePicker
                label="Next Due Date"
                value={formState.nextDueDate || new Date()}
                onChange={(date) => handleChange('nextDueDate', date)}
                mode="date"
                error={errors.nextDueDate}
                containerStyle={styles.inputContainer}
              />
              
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
            </>
          ) : (
            // Other record types fields
            <>
              <Input
                label="Title"
                placeholder="Enter record title"
                value={formState.title}
                onChangeText={(value) => handleChange('title', value)}
                error={errors.title}
                touched={touched.title}
                containerStyle={styles.inputContainer}
              />
              
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
              
              {formState.type === 'checkup' && (
                <>
                  <Input
                    label="Weight (kg)"
                    placeholder="Enter weight"
                    value={formState.weight}
                    onChangeText={(value) => handleChange('weight', value)}
                    keyboardType="numeric"
                    error={errors.weight}
                    touched={touched.weight}
                    containerStyle={styles.inputContainer}
                  />
                
                  <Input
                    label="Temperature (°C)"
                    placeholder="Enter temperature"
                    value={formState.temperature}
                    onChangeText={(value) => handleChange('temperature', value)}
                    keyboardType="numeric"
                    error={errors.temperature}
                    touched={touched.temperature}
                    containerStyle={styles.inputContainer}
                  />
                </>
              )}
              
              <DatePicker
                label="Follow-up Date"
                value={formState.followUpDate || new Date()}
                onChange={(date) => handleChange('followUpDate', date)}
                mode="date"
                error={errors.followUpDate}
                containerStyle={styles.inputContainer}
              />
              
              <Select
                label="Severity"
                options={severityOptions}
                selectedValue={formState.severity}
                onValueChange={(value) => handleChange('severity', value as SeverityType)}
                containerStyle={styles.inputContainer}
              />
              
              <View style={styles.switchContainer}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Completed
                </Text>
                <Switch
                  value={formState.isCompleted}
                  onValueChange={(value) => handleChange('isCompleted', value)}
                />
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
            </>
          )}
        
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

export default AddHealthRecord; 