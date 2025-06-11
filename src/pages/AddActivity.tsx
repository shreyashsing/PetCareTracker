import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useAppColors } from '../hooks/useAppColors';
import { useActivePet } from '../hooks/useActivePet';
import { Button, DatePicker } from '../forms';
import { generateUUID } from '../utils/helpers';
import { unifiedDatabaseManager } from '../services/db';
import { useFormStatePersistence } from '../hooks/useFormStatePersistence';
import { FormStateNotification } from '../components/FormStateNotification';

type AddActivityScreenProps = NativeStackScreenProps<MainStackParamList, 'AddActivity'>;

interface FormState {
  activityType: string;
  duration: string;
  distance: string;
  notes: string;
  date: Date;
}

const AddActivity: React.FC<AddActivityScreenProps> = ({ navigation, route }) => {
  const { colors } = useAppColors();
  const { activePetId } = useActivePet();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activityId, setActivityId] = useState<string | undefined>(undefined);
  const isMountedRef = useRef(true);
  
  const [formState, setFormState] = useState<FormState>({
    activityType: 'Walk',
    duration: '',
    distance: '',
    notes: '',
    date: new Date(),
  });
  
  // Form state persistence hook - only for new activities (not edit mode)
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'AddActivity',
    formState,
    setFormState: (state) => {
      if (isMountedRef.current) {
        setFormState(state);
      }
    },
    enabled: !isEditMode, // Disable for edit mode
    debounceMs: 2000
  });
  
  // Map internal activity types to system activity types
  const activityTypeMap = {
    'Walk': 'walk',
    'Play': 'play', 
    'Training': 'training',
    'Grooming': 'other',
    'Vet Visit': 'other',
    'Other': 'other'
  };
  
  // Reverse map for loading data
  const reverseActivityTypeMap: Record<string, string> = {
    'walk': 'Walk',
    'play': 'Play',
    'training': 'Training',
    'run': 'Walk', // Map 'run' to 'Walk' for UI purposes
    'swim': 'Other',
    'other': 'Other'
  };
  
  const activityTypes = [
    'Walk',
    'Play',
    'Training',
    'Grooming',
    'Vet Visit',
    'Other'
  ];
  
  // Update individual form fields
  const updateFormField = (field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };
  
  // Load activity data if in edit mode
  useEffect(() => {
    const loadActivity = async () => {
      // Check if we're editing an existing activity
      const editActivityId = route.params?.activityId;
      if (editActivityId) {
        setIsLoading(true);
        setIsEditMode(true);
        setActivityId(editActivityId);
        
        try {
          // Fetch activity data
          const activity = await unifiedDatabaseManager.activitySessions.getById(editActivityId);
          if (activity) {
            // Set form values from activity data
            setFormState({
              activityType: reverseActivityTypeMap[activity.type] || 'Other',
              duration: activity.duration.toString(),
              distance: activity.distance ? activity.distance.toString() : '',
              notes: activity.notes || '',
              date: new Date(activity.date),
            });
          }
        } catch (error) {
          console.error('Error loading activity for editing:', error);
          Alert.alert('Error', 'Failed to load activity data. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadActivity();
  }, [route.params?.activityId]);
  
  const handleSave = async () => {
    if (!activePetId) {
      Alert.alert('Error', 'No active pet selected');
      return;
    }
    
    if (!formState.activityType) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }
    
    if (!formState.duration || isNaN(Number(formState.duration))) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const mappedType = activityTypeMap[formState.activityType as keyof typeof activityTypeMap] || 'other';
      
      // Create base activity session object
      const activitySession = {
        petId: activePetId,
        date: formState.date,
        startTime: new Date(formState.date.getTime()), // Use the selected date as start time
        endTime: new Date(formState.date.getTime() + (Number(formState.duration) * 60000)), // Add duration in milliseconds
        type: mappedType as 'walk' | 'run' | 'play' | 'swim' | 'training' | 'other',
        duration: Number(formState.duration),
        distance: formState.distance ? Number(formState.distance) : undefined,
        distanceUnit: 'km' as 'km' | 'mi',
        intensity: 'moderate' as 'low' | 'moderate' | 'high',
        location: {
          name: 'Home'
        },
        mood: 'happy' as 'energetic' | 'happy' | 'tired' | 'reluctant',
        notes: formState.notes || undefined
      };
      
      if (isEditMode && activityId) {
        // Update existing activity
        await unifiedDatabaseManager.activitySessions.update(activityId, activitySession);
        
        Alert.alert(
          'Success',
          'Activity updated successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                clearSavedState(); // Clear saved state on successful update
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        // Create new activity
        const newActivitySession = {
          id: generateUUID(),
          ...activitySession
        };
        
      await unifiedDatabaseManager.activitySessions.create(newActivitySession);
      
      Alert.alert(
        'Success',
        'Activity saved successfully!',
        [
          { 
            text: 'OK', 
              onPress: () => {
                clearSavedState(); // Clear saved state on successful save
                navigation.goBack();
              }
          }
        ]
      );
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!isEditMode || !activityId) return;
    
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await unifiedDatabaseManager.activitySessions.delete(activityId);
              clearSavedState(); // Clear saved state on successful delete
              Alert.alert(
                'Success',
                'Activity deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert('Error', 'Failed to delete activity. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Force save state when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        forceSave();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [forceSave]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditMode ? 'Edit Activity' : 'Add Activity'}
          </Text>
          {isEditMode ? (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error || '#ff3b30'} />
            </TouchableOpacity>
          ) : (
          <View style={styles.rightPlaceholder} />
          )}
        </View>
        
        {/* Form state restoration notification */}
        <FormStateNotification 
          visible={wasRestored}
          onDismiss={dismissRestoreNotification}
          formName="activity"
        />
        
        <ScrollView style={styles.content}>
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Type</Text>
            <View style={styles.activityTypesContainer}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.activityTypeButton,
                    { 
                      backgroundColor: type === formState.activityType ? colors.primary : colors.card,
                      borderColor: type === formState.activityType ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => updateFormField('activityType', type)}
                >
                  <Text 
                    style={[
                      styles.activityTypeText, 
                      { color: type === formState.activityType ? 'white' : colors.text }
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Details</Text>
            
            <DatePicker
              label="Date"
              value={formState.date}
              onChange={(selectedDate) => updateFormField('date', selectedDate)}
              mode="date"
              containerStyle={styles.datePickerContainer}
            />
            
            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Duration (minutes)</Text>
                <View style={[styles.textInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formState.duration}
                    onChangeText={(value) => updateFormField('duration', value)}
                    placeholder="Duration"
                    placeholderTextColor={colors.text + '60'}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Distance (km)</Text>
                <View style={[styles.textInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="navigate-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formState.distance}
                    onChangeText={(value) => updateFormField('distance', value)}
                    placeholder="Optional"
                    placeholderTextColor={colors.text + '60'}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                value={formState.notes}
                onChangeText={(value) => updateFormField('notes', value)}
                placeholder="Add notes about the activity"
                placeholderTextColor={colors.text + '60'}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { backgroundColor: colors.primary },
              isLoading && styles.disabledButton
            ]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>{isEditMode ? 'Update Activity' : 'Save Activity'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rightPlaceholder: {
    width: 40,
  },
  deleteButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activityTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  activityTypeButton: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
  },
  activityTypeText: {
    fontWeight: '500',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  notesContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  notesInput: {
    height: 100,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default AddActivity; 