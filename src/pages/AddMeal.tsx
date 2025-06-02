import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { 
  Input, 
  Select, 
  DatePicker,
  FormRow,
  Switch
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import {unifiedDatabaseManager} from "../services/db";
import { generateUUID } from '../utils/helpers';
import { notificationService } from '../services/notifications';
import { useToast } from '../hooks/use-toast';
import { Meal } from '../types/components';
import { useAuth } from '../hooks/useAuth';

type AddMealScreenProps = NativeStackScreenProps<MainStackParamList, 'AddMeal'>;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FormState {
  type: MealType;
  foodName: string;
  amount: string;
  date: Date;
  time: Date;
  notes: string;
  isCompleted: boolean;
}

const AddMeal: React.FC<AddMealScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors  } = useAppColors();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mealId, setMealId] = useState<string | null>(null);
  
  const [formState, setFormState] = useState<FormState>({
    type: 'breakfast',
    foodName: '',
    amount: '',
    date: new Date(),
    time: new Date(),
    notes: '',
    isCompleted: false,
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load meal data if editing an existing meal
  useEffect(() => {
    const loadMealData = async () => {
      const mealId = route.params?.mealId;
      if (mealId) {
        setIsEditMode(true);
        setMealId(mealId);
        setIsLoading(true);
        
        try {
          const meal = await unifiedDatabaseManager.meals.getById(mealId);
          if (meal) {
            // Convert the meal data to our form format
            setFormState({
              type: meal.type as MealType,
              foodName: meal.foods?.[0]?.foodItemId || '',
              amount: meal.foods?.[0]?.amount?.toString() || '',
              date: new Date(meal.date),
              time: new Date(meal.time),
              notes: meal.specialInstructions || '',
              isCompleted: meal.completed,
            });
          }
        } catch (error) {
          console.error('Error loading meal:', error);
          Alert.alert('Error', 'Could not load meal data');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadMealData();
  }, [route.params]);
  
  const mealTypeOptions = [
    { label: 'Breakfast', value: 'breakfast' },
    { label: 'Lunch', value: 'lunch' },
    { label: 'Dinner', value: 'dinner' },
    { label: 'Snack', value: 'snack' },
  ];
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.foodName.trim()) {
      newErrors.foodName = 'Food name is required';
    }
    
    if (!formState.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formState.amount))) {
      newErrors.amount = 'Amount must be a number';
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
  
  const saveMeal = async () => {
    try {
      // Debug: Log active pet ID to ensure it's not null
      console.log(`Creating meal with activePetId: ${activePetId}`);
      if (!activePetId) {
        console.error('No active pet ID available when creating meal');
        return false;
      }
      
      // Also log current user info
      console.log(`Current user: ${user?.id || 'Not logged in'}`);
      
      // Combine date and time into a single date object
      const combinedDateTime = new Date(formState.date);
      combinedDateTime.setHours(
        formState.time.getHours(),
        formState.time.getMinutes(),
        0,
        0
      );
      
      // Create a proper food item
      const foodItem = {
        foodItemId: formState.foodName, // This would ideally be an ID reference to a food item
        amount: parseFloat(formState.amount) || 0,
        unit: 'cups', // Default unit
        calories: (parseFloat(formState.amount) || 0) * 50 // Simplified calorie calculation
      };
      
      // Prepare the meal data
      const mealData: Meal = {
        id: mealId || generateUUID(),
        petId: activePetId as string,
        userId: user?.id,
        date: formState.date,
        time: formState.time,
        type: formState.type,
        foods: [foodItem],
        totalCalories: (parseFloat(formState.amount) || 0) * 50, // Store calories in DB-recognized field
        specialInstructions: formState.notes + (formState.amount ? `\nAmount: ${formState.amount} cups` : ''), // Add amount to notes
        completed: formState.isCompleted,
        skipped: false,
        recurring: false,
        reminderSettings: {
          enabled: false,
          reminderTime: 15
        }
      };
      
      if (isEditMode && mealId) {
        // If editing, first cancel existing notifications
        await notificationService.cancelMealNotifications(mealId as string);
        
        // Update the meal
        await unifiedDatabaseManager.meals.update(mealId as string, mealData);
      } else {
        // Create a new meal
        await unifiedDatabaseManager.meals.create(mealData);
      }
      
      // Schedule notifications for the meal if it's not already completed
      // and the meal time is in the future
      if (!formState.isCompleted && combinedDateTime > new Date()) {
        try {
          await notificationService.scheduleMealNotifications(mealData);
          console.log('Meal notifications scheduled successfully');
        } catch (notificationError) {
          console.error('Error scheduling meal notifications:', notificationError);
          // Don't fail the whole operation if notifications fail
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving meal:', error);
      return false;
    }
  };
  
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const success = await saveMeal();
      
      if (success) {
        // Show success toast
        toast({
          title: isEditMode ? 'Meal updated' : 'Meal added',
          description: isEditMode ? 
            'Your pet\'s meal has been updated successfully' : 
            'Your pet\'s meal has been added successfully'
        });
        
        // Navigate back with refresh flag
        navigation.navigate({
          name: 'Feeding',
          params: { refresh: true }
        });
      } else {
        Alert.alert('Error', 'Failed to save meal. Please try again.');
      }
    } catch (error) {
      console.error('Error in meal submission:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle meal deletion
  const handleDelete = async () => {
    if (!isEditMode || !mealId) return;
    
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Cancel notifications for this meal
              await notificationService.cancelMealNotifications(mealId);
              
              // Delete from database
              await unifiedDatabaseManager.meals.delete(mealId);
              
              toast({
                title: 'Meal deleted',
                description: 'The meal has been deleted successfully'
              });
              
              // Navigate back
              navigation.navigate({
                name: 'Feeding',
                params: { refresh: true }
              });
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  if (!activePetId) {
    return (
      <View style={[styles.noSelectionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noSelectionText, { color: colors.text }]}>Please select a pet first to add meals</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.secondary + '20', 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? 'Edit Meal' : 'Add Meal'}</Text>
          <Text style={[styles.subtitle, { color: colors.text + '80' }]}>
            {isEditMode ? 'Update your pet\'s meal' : 'Record your pet\'s meal'}
          </Text>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <Select
            label="Meal Type"
            options={mealTypeOptions}
            selectedValue={formState.type}
            onValueChange={(value) => handleChange('type', value)}
            error={errors.type}
            touched={touched.type}
            containerStyle={styles.inputContainer}
          />
          
          <Input
            label="Food Name"
            placeholder="Enter food name"
            value={formState.foodName}
            onChangeText={(value) => handleChange('foodName', value)}
            error={errors.foodName}
            touched={touched.foodName}
            icon={<Ionicons name="fast-food-outline" size={20} color={colors.primary} />}
            iconPosition="left"
            containerStyle={styles.inputContainer}
          />
          
          <Input
            label="Amount"
            placeholder="Enter amount"
            value={formState.amount}
            onChangeText={(value) => handleChange('amount', value)}
            error={errors.amount}
            touched={touched.amount}
            keyboardType="numeric"
            containerStyle={styles.inputContainer}
          />
          
          <DatePicker
            label="Time"
            value={formState.time}
            onChange={(time) => handleChange('time', time || new Date())}
            mode="time"
            containerStyle={styles.inputContainer}
          />
          
          <Input
            label="Notes"
            placeholder="Additional details or instructions"
            value={formState.notes}
            onChangeText={(value) => handleChange('notes', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.textArea, { backgroundColor: colors.background }]}
            containerStyle={styles.inputContainer}
          />
          
          <Switch
            label="Mark as Completed"
            value={formState.isCompleted}
            onValueChange={(value) => handleChange('isCompleted', value)}
            containerStyle={styles.switchContainer}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          {isEditMode && (
            <TouchableOpacity 
              style={[styles.button, styles.deleteButton, { backgroundColor: colors.error || '#ff3b30' }]}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>Delete</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : (
              <Text style={[styles.buttonText, { color: 'white' }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  formRowItem: {
    marginHorizontal: 5,
  },
  textArea: {
    height: 100,
    borderRadius: 8,
    padding: 12,
  },
  switchContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
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

export default AddMeal; 