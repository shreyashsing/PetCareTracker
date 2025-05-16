import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { 
  Input, 
  Select, 
  FormRow,
  Switch,
  DatePicker
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { generateUUID } from '../utils/helpers';
import { notificationService } from '../services/notifications';

type AddTaskScreenProps = NativeStackScreenProps<RootStackParamList, 'AddTask'>;

// Task Category enum
type TaskCategory = 'feeding' | 'exercise' | 'medication' | 'grooming' | 'other';

// Priority type
type PriorityType = 'low' | 'medium' | 'high';

// Recurrence type
type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

// Form state interface
interface FormState {
  title: string;
  category: TaskCategory;
  description: string;
  dueDate: Date;
  dueTime: Date;
  priority: PriorityType;
  recurrence: RecurrenceType;
  isCompleted: boolean;
  reminderEnabled: boolean;
}

const AddTask: React.FC<AddTaskScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors  } = useAppColors();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Initialize form state
  const [formState, setFormState] = useState<FormState>({
    title: '',
    category: 'feeding',
    description: '',
    dueDate: new Date(),
    dueTime: new Date(),
    priority: 'medium',
    recurrence: 'once',
    isCompleted: false,
    reminderEnabled: true,
  });

  // Check if navigated from Exercise screen
  useEffect(() => {
    // If navigated from the Exercise screen, pre-select 'exercise' category
    if (navigation.getState().routes.find(r => r.name === 'Exercise')) {
      setFormState(prev => ({
        ...prev,
        category: 'exercise'
      }));
    }
  }, [navigation]);

  // Load task data if editing an existing task
  useEffect(() => {
    const loadTaskData = async () => {
      const taskId = route.params?.taskId;
      if (taskId) {
        setIsEditMode(true);
        setTaskId(taskId);
        setIsLoading(true);
        
        try {
          const task = await unifiedDatabaseManager.tasks.getById(taskId);
          if (task) {
            // Convert the task data to our form format
            setFormState({
              title: task.title,
              category: task.category as TaskCategory,
              description: task.description || '',
              dueDate: new Date(task.scheduleInfo.date),
              dueTime: new Date(task.scheduleInfo.time),
              priority: task.priority as PriorityType,
              recurrence: (task.scheduleInfo.recurringPattern as RecurrenceType) || 'once',
              isCompleted: task.status === 'completed',
              reminderEnabled: task.reminderSettings.enabled,
            });
          }
        } catch (error) {
          console.error('Error loading task:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadTaskData();
  }, [route.params]);

  // Options for category dropdown
  const categoryOptions = [
    { label: 'Feeding', value: 'feeding' },
    { label: 'Exercise', value: 'exercise' },
    { label: 'Medication', value: 'medication' },
    { label: 'Grooming', value: 'grooming' },
    { label: 'Other', value: 'other' },
  ];

  // Options for priority dropdown
  const priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ];

  // Options for recurrence dropdown
  const recurrenceOptions = [
    { label: 'Once', value: 'once' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  // Handle form field changes
  const handleChange = (name: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [name]: value }));
    
    // Mark field as touched
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }));
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Required fields
    if (!formState.title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    }

    if (!formState.category) {
      newErrors.category = 'Category is required';
      isValid = false;
    }

    if (!formState.dueDate) {
      newErrors.dueDate = 'Due date is required';
      isValid = false;
    }

    if (!formState.priority) {
      newErrors.priority = 'Priority is required';
      isValid = false;
    }

    if (!formState.recurrence) {
      newErrors.recurrence = 'Recurrence is required';
      isValid = false;
    }

    setErrors(newErrors);
    // Mark all fields as touched on submit attempt
    const allTouched = Object.keys(formState).reduce((acc, key) => {
      return { ...acc, [key]: true };
    }, {});
    setTouched(allTouched as Record<string, boolean>);

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Ensure dates are properly formatted
      const dueDate = new Date(formState.dueDate);
      const dueTime = new Date(formState.dueTime);
      
      // Create a consistent date format
      const combinedDateTime = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate(),
        dueTime.getHours(),
        dueTime.getMinutes(),
        0,
        0
      );
      
      // Create a task object to save - make sure it matches the Task interface
      const taskData = {
        id: isEditMode ? taskId as string : generateUUID(),
        petId: activePetId as string,
        title: formState.title,
        description: formState.description,
        category: formState.category,
        priority: formState.priority,
        scheduleInfo: {
          date: dueDate,
          time: dueTime,
          recurringPattern: formState.recurrence === 'once' ? undefined : formState.recurrence
        },
        reminderSettings: {
          enabled: formState.reminderEnabled,
          times: [15], // Default 15 minutes before
          notificationType: 'push' as 'push' | 'sound' | 'both'
        },
        status: formState.isCompleted ? 'completed' : 'pending' as 'pending' | 'in-progress' | 'completed' | 'skipped' | 'rescheduled',
        location: {
          name: 'Home'
        },
        assignedTo: [],
        completionDetails: formState.isCompleted ? {
          completedAt: new Date(),
          completedBy: 'User',
          notes: ''
        } : undefined
      };
      
      console.log('Saving task data:', JSON.stringify(taskData, null, 2));

      if (isEditMode) {
        // Update existing task
        await unifiedDatabaseManager.tasks.update(taskId as string, taskData);
        
        // Schedule notifications if reminders are enabled and task is not completed
        if (formState.reminderEnabled && !formState.isCompleted) {
          await notificationService.scheduleTaskNotifications(taskData);
        } else {
          // Cancel any notifications for this task if reminders are disabled or task is completed
          await notificationService.cancelTaskNotifications(taskData.id);
        }
        
        Alert.alert('Success', 'Task updated successfully!');
      } else {
        // Create new task
        await unifiedDatabaseManager.tasks.create(taskData);
        
        // Schedule notifications if reminders are enabled and task is not completed
        if (formState.reminderEnabled && !formState.isCompleted) {
          await notificationService.scheduleTaskNotifications(taskData);
          console.log('Notifications scheduled for task:', taskData.id);
        }
        
        Alert.alert('Success', 'Task created successfully!');
      }
      
      // Instead of navigating directly to Schedule, go back to previous screen
      navigation.goBack();
    } catch (error) {
      console.error('Error saving task:', error);
      // Handle error (show alert, etc.)
      Alert.alert('Error', `Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get icon for category
  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case 'feeding': return 'fast-food-outline';
      case 'exercise': return 'fitness-outline';
      case 'medication': return 'medical-outline';
      case 'grooming': return 'cut-outline';
      case 'other': return 'ellipsis-horizontal-outline';
      default: return 'help-outline';
    }
  };

  // If no active pet is selected
  if (!activePetId) {
    return (
      <View style={[styles.noSelectionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noSelectionText, { color: colors.text }]}>
          Please select a pet first to add a task.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: '#fff' }]}>{isEditMode ? 'Edit Task' : 'Add New Task'}</Text>
          <Text style={[styles.subtitle, { color: '#fff' }]}>
            {isEditMode ? 'Update the scheduled task for your pet' : 'Create a scheduled task for your pet'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
          <Input
            label="Task Title"
            value={formState.title}
            onChangeText={(value) => handleChange('title', value)}
            error={errors.title}
            touched={touched.title}
            placeholder="Enter task title"
            containerStyle={styles.inputContainer}
          />
          
          <Select
            label="Category"
            options={categoryOptions}
            selectedValue={formState.category}
            onValueChange={(value) => handleChange('category', value)}
            error={errors.category}
            touched={touched.category}
            containerStyle={styles.inputContainer}
          />
          
          <Input
            label="Description"
            value={formState.description}
            onChangeText={(value) => handleChange('description', value)}
            error={errors.description}
            touched={touched.description}
            placeholder="Enter task description (optional)"
            containerStyle={styles.inputContainer}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.textArea}
          />
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Due Date"
                value={formState.dueDate}
                onChange={(date) => handleChange('dueDate', date)}
                mode="date"
                error={errors.dueDate}
                containerStyle={styles.inputContainer}
                allowMonthYearSelection={true}
              />
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Due Time"
                value={formState.dueTime}
                onChange={(date) => handleChange('dueTime', date)}
                mode="time"
                error={errors.dueTime}
                containerStyle={styles.inputContainer}
              />
            </View>
          </FormRow>
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Select
                label="Priority"
                options={priorityOptions}
                selectedValue={formState.priority}
                onValueChange={(value) => handleChange('priority', value)}
                error={errors.priority}
                touched={touched.priority}
                containerStyle={styles.inputContainer}
              />
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Select
                label="Recurrence"
                options={recurrenceOptions}
                selectedValue={formState.recurrence}
                onValueChange={(value) => handleChange('recurrence', value)}
                error={errors.recurrence}
                touched={touched.recurrence}
                containerStyle={styles.inputContainer}
              />
            </View>
          </FormRow>
          
          <View style={styles.switchesContainer}>
            <Switch
              label="Mark as Completed"
              value={formState.isCompleted}
              onValueChange={(value) => handleChange('isCompleted', value)}
              containerStyle={styles.switchContainer}
            />
            
            <Switch
              label="Enable Reminders"
              value={formState.reminderEnabled}
              onValueChange={(value) => handleChange('reminderEnabled', value)}
              containerStyle={styles.switchContainer}
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={[styles.buttonContainer, { backgroundColor: colors.card, shadowColor: colors.text }]}>
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>{isEditMode ? 'Update Task' : 'Save Task'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  formRowItem: {
    marginHorizontal: 4,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 12,
    padding: 12,
  },
  switchesContainer: {
    marginTop: 8,
  },
  switchContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    flexDirection: 'row',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveIcon: {
    marginRight: 8,
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSelectionText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AddTask; 