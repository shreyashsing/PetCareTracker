import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
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
  DatePicker,
  FormRow,
  Switch
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import {unifiedDatabaseManager} from "../services/db";
import { generateUUID } from '../utils/helpers';
import { notificationService } from '../services/notifications';
import { useToast } from '../hooks/use-toast';
import { Meal, FoodItem } from '../types/components';
import { useAuth } from '../hooks/useAuth';

// Unit conversion constants
const UNIT_CONVERSIONS = {
  // Weight conversions
  'kg_to_g': 1000,
  'g_to_kg': 0.001,
  'lb_to_oz': 16,
  'oz_to_lb': 0.0625,
  'lb_to_kg': 0.453592,
  'kg_to_lb': 2.20462,
  'g_to_oz': 0.035274,
  'oz_to_g': 28.3495,
  // Volume approximations (rough estimates)
  'cups_to_oz': 8,
  'oz_to_cups': 0.125,
  // Others kept as 1:1 since they're different units (like packages or cans)
};

type AddMealScreenProps = NativeStackScreenProps<MainStackParamList, 'AddMeal'>;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FormState {
  type: MealType;
  foodItemId: string;
  amount: string;
  unit: string;
  date: Date;
  time: Date;
  notes: string;
  isCompleted: boolean;
  reminderEnabled: boolean;
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
    foodItemId: '',
    amount: '',
    unit: 'g',
    date: new Date(),
    time: new Date(),
    notes: '',
    isCompleted: false,
    reminderEnabled: true,
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loadingFoodItems, setLoadingFoodItems] = useState(false);
  
  // Form state persistence hook - only for new meals (not edit mode)
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'AddMeal',
    formState,
    setFormState,
    enabled: !isEditMode, // Disable for edit mode
    debounceMs: 2000
  });
  
  // Load food items for the active pet
  useEffect(() => {
    const loadFoodItems = async () => {
      if (!activePetId) return;
      
      setLoadingFoodItems(true);
      try {
        const allFoodItems = await unifiedDatabaseManager.foodItems.getAll();
        const petFoodItems = allFoodItems.filter(item => item.petId === activePetId);
        setFoodItems(petFoodItems);
      } catch (error) {
        console.error('Error loading food items:', error);
      } finally {
        setLoadingFoodItems(false);
      }
    };
    
    loadFoodItems();
  }, [activePetId]);

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
              foodItemId: meal.foods?.[0]?.foodItemId || '',
              amount: meal.foods?.[0]?.amount?.toString() || '',
              unit: meal.foods?.[0]?.unit || 'g',
              date: new Date(meal.date),
              time: new Date(meal.time),
              notes: meal.specialInstructions || '',
              isCompleted: meal.completed,
              reminderEnabled: meal.reminderSettings?.enabled || false,
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

  // Create food item options for the dropdown
  const foodItemOptions = foodItems.length > 0 
    ? foodItems.map(item => {
        const currentAmount = item.inventory?.currentAmount ?? item.current_amount ?? 0;
        const unit = item.inventory?.unit ?? item.unit ?? 'g';
        return {
          label: `${item.name || 'Unnamed Food'} (${item.brand || 'No Brand'}) - ${currentAmount}${unit} available`,
          value: item.id,
        };
      })
    : [{ label: 'No food items in inventory', value: '' }];
    
  // Define unit options for dropdown
  const unitOptions = [
    { label: 'Grams (g)', value: 'g' },
    { label: 'Kilograms (kg)', value: 'kg' },
    { label: 'Pounds (lb)', value: 'lb' },
    { label: 'Ounces (oz)', value: 'oz' },
    { label: 'Cups', value: 'cups' },
    { label: 'Cans', value: 'cans' },
    { label: 'Packages', value: 'packages' },
  ];
  
  // Convert quantity when changing between units
  const convertQuantity = (value: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return value;
    
    const conversionKey = `${fromUnit}_to_${toUnit}`;
    const conversionRate = UNIT_CONVERSIONS[conversionKey as keyof typeof UNIT_CONVERSIONS];
    
    if (conversionRate) {
      return value * conversionRate;
    }
    
    // If direct conversion not found, try to convert through a common unit (g)
    if (fromUnit !== 'g' && toUnit !== 'g') {
      const toGKey = `${fromUnit}_to_g`;
      const fromGKey = `g_to_${toUnit}`;
      
      const toGRate = UNIT_CONVERSIONS[toGKey as keyof typeof UNIT_CONVERSIONS];
      const fromGRate = UNIT_CONVERSIONS[fromGKey as keyof typeof UNIT_CONVERSIONS];
      
      if (toGRate && fromGRate) {
        const toG = value * toGRate;
        return toG * fromGRate;
      }
    }
    
    // If no conversion available, return the original value
    return value;
  };
  
  // Calculate calories based on amount and unit
  const calculateCalories = (amount: number, unit: string): number => {
    // Convert to grams for calorie calculation (approx 4 kcal per 10g)
    const amountInGrams = convertQuantity(amount, unit, 'g');
    return amountInGrams * 0.4; // ~4 kcal per 10g
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.foodItemId.trim()) {
      newErrors.foodItemId = 'Food item is required';
    }
    
    if (!formState.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formState.amount))) {
      newErrors.amount = 'Amount must be a number';
    } else if (parseFloat(formState.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (formState.foodItemId) {
      // Check if amount exceeds available inventory
      const selectedFood = foodItems.find(item => item.id === formState.foodItemId);
      if (selectedFood) {
        const currentAmount = selectedFood.inventory?.currentAmount ?? selectedFood.current_amount ?? 0;
        const foodUnit = selectedFood.inventory?.unit ?? selectedFood.unit ?? 'g';
        
        // Convert the entered amount to the food's unit for comparison
        const amountInFoodUnit = convertQuantity(parseFloat(formState.amount), formState.unit, foodUnit);
        
        if (amountInFoodUnit > currentAmount) {
          newErrors.amount = `Amount exceeds available inventory (${currentAmount}${foodUnit} available)`;
        }
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
  };

  // Function to deduct amount from inventory when meal is completed
  const deductFromInventory = async (foodItemId: string, amountUsed: number, unitUsed: string) => {
    try {
      const foodItem = await unifiedDatabaseManager.foodItems.getById(foodItemId);
      if (!foodItem) {
        console.error('Food item not found for inventory deduction');
        return;
      }

      const currentAmount = foodItem.inventory?.currentAmount ?? foodItem.current_amount ?? 0;
      const foodUnit = foodItem.inventory?.unit ?? foodItem.unit ?? 'g';
      
      // Convert amount used to the same unit as the food item's inventory
      const convertedAmountUsed = convertQuantity(amountUsed, unitUsed, foodUnit);
      const newAmount = Math.max(0, currentAmount - convertedAmountUsed); // Ensure amount doesn't go below 0

      console.log(`Deducted ${amountUsed}${unitUsed} (${convertedAmountUsed.toFixed(2)}${foodUnit}) from ${foodItem.name}. New amount: ${newAmount}${foodUnit}`);
      
      // Get daily feeding amount and unit
      const dailyFeedingAmount = foodItem.inventory?.dailyFeedingAmount ?? foodItem.daily_feeding_amount ?? 1;
      const dailyFeedingUnit = foodItem.inventory?.dailyFeedingUnit ?? foodItem.daily_feeding_unit ?? 'g';
      
      // Convert daily feeding amount to the same unit as the inventory if they differ
      let normalizedDailyAmount = dailyFeedingAmount;
      if (foodUnit !== dailyFeedingUnit) {
        normalizedDailyAmount = convertQuantity(dailyFeedingAmount, dailyFeedingUnit, foodUnit);
        console.log(`Converting daily feeding: ${dailyFeedingAmount}${dailyFeedingUnit} = ${normalizedDailyAmount.toFixed(2)}${foodUnit}`);
      }
      
      // Calculate days remaining with normalized units
      const daysRemaining = normalizedDailyAmount > 0 
        ? Math.floor(newAmount / normalizedDailyAmount) 
        : 9999; // Prevent division by zero
      
      console.log(`Days remaining calculation: ${newAmount}${foodUnit} / ${normalizedDailyAmount}${foodUnit} = ${daysRemaining} days`);
      
      // Update inventory with the new amount
      await unifiedDatabaseManager.foodItems.updateInventory(foodItemId, newAmount);
      
      // If days remaining is low, show a warning and trigger a notification
      const lowStockThreshold = foodItem.inventory?.lowStockThreshold ?? foodItem.low_stock_threshold ?? 10;
      if (daysRemaining <= lowStockThreshold) {
        toast({
          title: 'Low Stock Warning',
          description: `${foodItem.name} is running low (${daysRemaining} days remaining)`
        });
        
        // Also send a toast notification to ensure user is alerted
        try {
          // For now, we'll rely on the toast message as the immediate notification
          // The proper notification will be triggered by UnifiedDatabaseManager when inventory is updated
                     toast({
             title: 'Action Required',
             description: `Please remember to restock ${foodItem.name} soon. Only ${daysRemaining} days remaining.`
           });
          console.log(`Showed extended toast alert for ${foodItem.name}`);
        } catch (err) {
          console.error('Failed to show extended toast:', err);
        }
      }
    } catch (error) {
      console.error('Error deducting from inventory:', error);
      toast({
        title: 'Warning',
        description: 'Could not update inventory automatically'
      });
    }
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
        foodItemId: formState.foodItemId,
        amount: parseFloat(formState.amount) || 0,
        unit: formState.unit,
        calories: calculateCalories(parseFloat(formState.amount) || 0, formState.unit)
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
        totalCalories: calculateCalories(parseFloat(formState.amount) || 0, formState.unit), // Store calories in DB-recognized field
        specialInstructions: formState.notes + (formState.amount ? `\nAmount: ${formState.amount} ${formState.unit}` : ''), // Add amount to notes
        completed: formState.isCompleted,
        skipped: false,
        recurring: false,
        reminderSettings: {
          enabled: formState.reminderEnabled,
          reminderTime: 15
        }
      };
      
      if (isEditMode && mealId) {
        // If editing, first cancel existing notifications
        await notificationService.cancelMealNotifications(mealId as string);
        
        // Get the original meal to check if completion status changed
        const originalMeal = await unifiedDatabaseManager.meals.getById(mealId as string);
        const wasCompleted = originalMeal?.completed || false;
        const isNowCompleted = formState.isCompleted;
        
        // Update the meal
        await unifiedDatabaseManager.meals.update(mealId as string, mealData);
        
        // Handle inventory deduction if meal was just marked as completed
        if (!wasCompleted && isNowCompleted && formState.foodItemId && formState.amount) {
          await deductFromInventory(formState.foodItemId, parseFloat(formState.amount), formState.unit);
        }
      } else {
        // Create a new meal
        await unifiedDatabaseManager.meals.create(mealData);
        
        // Handle inventory deduction if meal is created as completed
        if (formState.isCompleted && formState.foodItemId && formState.amount) {
          await deductFromInventory(formState.foodItemId, parseFloat(formState.amount), formState.unit);
        }
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
    if (!validate()) {
      return;
    }
    
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Clear saved form state on successful submission
      clearSavedState();

      const result = await saveMeal();
      
      if (result) {
        // Show success toast instead of Alert
        toast({
          title: isEditMode ? 'Meal updated' : 'Meal added',
          description: isEditMode ? 'Meal has been updated successfully!' : 'Meal has been added successfully!'
        });
        
        // Navigate back
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error submitting meal:', error);
      toast({
        title: 'Error',
        description: 'Failed to save meal. Please try again.'
      });
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
              toast({
                title: 'Error',
                description: 'Failed to delete meal'
              });
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
      {/* Form State Restoration Notification */}
      <FormStateNotification 
        visible={wasRestored}
        onDismiss={dismissRestoreNotification}
        formName="meal"
      />
      
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
          
          <Select
            label="Food Item"
            selectedValue={formState.foodItemId}
            onValueChange={(value) => handleChange('foodItemId', value)}
            error={errors.foodItemId}
            touched={touched.foodItemId}
            options={foodItemOptions}
            containerStyle={styles.inputContainer}
          />

          {/* Show message when no food items available */}
          {foodItems.length === 0 && !loadingFoodItems && (
            <View style={[styles.noInventoryMessage, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={[styles.noInventoryText, { color: colors.warning }]}>
                No food items in inventory. 
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('AddFoodItem', { petId: activePetId || undefined })}
                style={styles.addFoodLink}
              >
                <Text style={[styles.addFoodLinkText, { color: colors.primary }]}>Add food item</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Show current stock for selected food item */}
          {formState.foodItemId && (() => {
            const selectedFood = foodItems.find(item => item.id === formState.foodItemId);
            if (selectedFood) {
              const currentAmount = selectedFood.inventory?.currentAmount ?? selectedFood.current_amount ?? 0;
              const unit = selectedFood.inventory?.unit ?? selectedFood.unit ?? 'g';
              const daysRemaining = selectedFood.inventory?.daysRemaining ?? selectedFood.days_remaining ?? 0;
              const lowStockThreshold = selectedFood.inventory?.lowStockThreshold ?? selectedFood.low_stock_threshold ?? 10;
              
              // Use days remaining for low stock determination rather than raw quantity
              const isLowStock = daysRemaining <= lowStockThreshold;
              
              return (
                <View style={[styles.stockInfo, { backgroundColor: isLowStock ? colors.warning + '15' : colors.success + '15' }]}>
                  <Ionicons 
                    name={isLowStock ? "alert-circle" : "checkmark-circle"} 
                    size={16} 
                    color={isLowStock ? colors.warning : colors.success} 
                  />
                  <Text style={[styles.stockText, { color: isLowStock ? colors.warning : colors.success }]}>
                    Current stock: {currentAmount}{unit} available ({daysRemaining} days remaining)
                    {isLowStock && ' (Low stock!)'}
                  </Text>
                </View>
              );
            }
            return null;
          })()}
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
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
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Select
                label="Unit"
                options={unitOptions}
                selectedValue={formState.unit}
                onValueChange={(value) => handleChange('unit', value)}
                error={errors.unit}
                touched={touched.unit}
                containerStyle={styles.inputContainer}
              />
            </View>
          </FormRow>
          
          {/* Show unit equivalent for the selected food item if units differ */}
          {formState.foodItemId && formState.amount && formState.unit && (() => {
            const selectedFood = foodItems.find(item => item.id === formState.foodItemId);
            if (selectedFood && !isNaN(parseFloat(formState.amount))) {
              const foodUnit = selectedFood.inventory?.unit ?? selectedFood.unit ?? 'g';
              if (formState.unit !== foodUnit) {
                const convertedAmount = convertQuantity(
                  parseFloat(formState.amount), 
                  formState.unit, 
                  foodUnit
                );
                return (
                  <View style={styles.unitConversionInfo}>
                    <Text style={[styles.unitConversionText, {color: colors.text + '80'}]}>
                      {parseFloat(formState.amount)} {formState.unit} = 
                      {' '}{convertedAmount.toFixed(2)} {foodUnit}
                    </Text>
                  </View>
                );
              }
            }
            return null;
          })()}
          
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
  switchesContainer: {
    marginTop: 8,
  },
  switchContainer: {
    marginBottom: 16,
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
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  noInventoryMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noInventoryText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  addFoodLink: {
    marginLeft: 4,
  },
  addFoodLinkText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  unitConversionInfo: {
    marginTop: -10,
    marginBottom: 16,
    paddingHorizontal: 5,
  },
  unitConversionText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default AddMeal; 