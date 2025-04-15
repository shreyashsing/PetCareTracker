import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker,
  FormRow,
  Switch
} from '../forms';
import { LinearGradient } from 'expo-linear-gradient';
import { FoodItem } from '../types/components';
import { databaseManager } from '../services/db';

// Helper function to generate a UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type AddFoodItemScreenProps = NativeStackScreenProps<RootStackParamList, 'AddFoodItem'>;

type FoodCategory = 'dry' | 'wet' | 'treats' | 'supplements' | 'prescription' | 'other';

interface FormState {
  name: string;
  brand: string;
  category: FoodCategory;
  quantity: string;
  unit: string;
  dailyFeedingQuantity: string;
  dailyFeedingUnit: string;
  purchaseDate: Date;
  expiryDate: Date | undefined;
  notes: string;
  isPreferred: boolean;
}

const AddFoodItem: React.FC<AddFoodItemScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors  } = useAppColors();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [itemId, setItemId] = useState<string | undefined>(undefined);
  const [formState, setFormState] = useState<FormState>({
    name: '',
    brand: '',
    category: 'dry',
    quantity: '',
    unit: 'kg',
    dailyFeedingQuantity: '',
    dailyFeedingUnit: 'g',
    purchaseDate: new Date(),
    expiryDate: undefined,
    notes: '',
    isPreferred: false,
  });
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Use useMemo for static arrays to prevent recreating them on each render
  const foodCategoryOptions = useMemo(() => [
    { label: 'Dry Food', value: 'dry' },
    { label: 'Wet Food', value: 'wet' },
    { label: 'Treats', value: 'treats' },
    { label: 'Supplements', value: 'supplements' },
    { label: 'Prescription Food', value: 'prescription' },
    { label: 'Other', value: 'other' },
  ], []);
  
  const unitOptions = useMemo(() => [
    { label: 'kg', value: 'kg' },
    { label: 'g', value: 'g' },
    { label: 'lb', value: 'lb' },
    { label: 'oz', value: 'oz' },
    { label: 'cups', value: 'cups' },
    { label: 'packages', value: 'packages' },
    { label: 'cans', value: 'cans' },
  ], []);
  
  // Load existing food item if in edit mode
  useEffect(() => {
    const loadFoodItem = async () => {
      if (route.params?.itemId) {
        setIsEditMode(true);
        setItemId(route.params.itemId);
        
        try {
          setIsLoading(true);
          const item = await databaseManager.foodItems.getById(route.params.itemId);
          
          if (item) {
            setFormState({
              name: item.name,
              brand: item.brand,
              category: item.category as FoodCategory,
              quantity: item.inventory.currentAmount.toString(),
              unit: item.inventory.unit,
              dailyFeedingQuantity: item.inventory.dailyFeedingAmount.toString(),
              dailyFeedingUnit: item.inventory.dailyFeedingUnit,
              purchaseDate: new Date(item.purchaseDetails.date),
              expiryDate: item.purchaseDetails.expiryDate ? new Date(item.purchaseDetails.expiryDate) : undefined,
              notes: item.specialNotes || '',
              isPreferred: item.petPreference === 'favorite',
            });
          }
        } catch (error) {
          console.error('Error loading food item:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadFoodItem();
  }, [route.params?.itemId]);
  
  // Use useCallback for event handlers to prevent recreating them on each render
  const handleChange = useCallback((name: keyof FormState, value: string | Date | boolean) => {
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);
  
  const handleDateChange = useCallback((name: 'purchaseDate' | 'expiryDate', date: Date | undefined) => {
    setFormState(prev => ({
      ...prev,
      [name]: date,
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  }, []);
  
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      newErrors.name = 'Food name is required';
    }
    
    if (!formState.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(parseFloat(formState.quantity))) {
      newErrors.quantity = 'Quantity must be a number';
    } else if (parseFloat(formState.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (!formState.dailyFeedingQuantity.trim()) {
      newErrors.dailyFeedingQuantity = 'Daily feeding quantity is required';
    } else if (isNaN(parseFloat(formState.dailyFeedingQuantity))) {
      newErrors.dailyFeedingQuantity = 'Daily feeding quantity must be a number';
    } else if (parseFloat(formState.dailyFeedingQuantity) <= 0) {
      newErrors.dailyFeedingQuantity = 'Daily feeding quantity must be greater than 0';
    }
    
    if (formState.expiryDate && formState.purchaseDate > formState.expiryDate) {
      newErrors.expiryDate = 'Expiry date must be after purchase date';
    }
    
    setErrors(newErrors);
    
    // Create a touched state for all fields
    const newTouched: Record<string, boolean> = {};
    Object.keys(formState).forEach(key => {
      newTouched[key] = true;
    });
    setTouched(newTouched);
    
    return Object.keys(newErrors).length === 0;
  }, [formState]);
  
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Get quantities from form
      const totalQuantity = parseFloat(formState.quantity);
      const dailyQuantity = parseFloat(formState.dailyFeedingQuantity);
      
      // Calculate days remaining
      const daysRemaining = totalQuantity / dailyQuantity;
      
      // Build the food item object
      const foodItemData: Omit<FoodItem, 'id'> = {
        petId: activePetId as string,
        name: formState.name,
        brand: formState.brand,
        category: formState.category,
        nutritionalInfo: {
          calories: 0, // These should be input by the user
          protein: 0,
          fat: 0,
          fiber: 0,
          ingredients: [],
          allergens: []
        },
        inventory: {
          currentAmount: totalQuantity,
          totalAmount: totalQuantity,
          unit: formState.unit as 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans',
          dailyFeedingAmount: dailyQuantity,
          dailyFeedingUnit: formState.dailyFeedingUnit as 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans',
          daysRemaining: Math.floor(daysRemaining),
          lowStockThreshold: Math.max(7, Math.floor(daysRemaining * 0.2)), // 20% of total days or 7 days, whichever is higher
          reorderAlert: false
        },
        purchaseDetails: {
          date: formState.purchaseDate,
          expiryDate: formState.expiryDate,
          price: 0,
          supplier: ''
        },
        servingSize: {
          amount: 100,
          unit: 'g',
          caloriesPerServing: 0
        },
        rating: formState.isPreferred ? 5 : 3,
        petPreference: formState.isPreferred ? 'favorite' : 'neutral',
        veterinarianApproved: false,
        specialNotes: formState.notes,
        // UI-specific properties
        amount: `${totalQuantity} ${formState.unit}`,
        lowStock: false,
        nextPurchase: 'Not scheduled'
      };
      
      if (isEditMode && itemId) {
        // Update existing food item
        await databaseManager.foodItems.update(itemId, foodItemData);
      } else {
        // Create new food item
        const newFoodItem: FoodItem = {
          id: generateUUID(),
          ...foodItemData
        };
        await databaseManager.foodItems.create(newFoodItem);
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving food item:', error);
      // Show error to user
      Alert.alert('Error', 'Failed to save food item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [activePetId, formState, isEditMode, itemId, navigation, validate]);
  
  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    
    setIsLoading(true);
    try {
      await databaseManager.foodItems.delete(itemId);
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting food item:', error);
    } finally {
      setIsLoading(false);
    }
  }, [itemId, navigation]);
  
  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  
  // Memoize header text based on edit mode
  const headerTitle = useMemo(() => isEditMode ? 'Edit Food Item' : 'Add Food Item', [isEditMode]);
  const buttonText = useMemo(() => isEditMode ? 'Update' : 'Save', [isEditMode]);
  
  if (!activePetId) {
    return (
      <View style={[styles.noSelectionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.noSelectionText, { color: colors.text }]}>Please select a pet first to add food items</Text>
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
          <Text style={[styles.title, { color: colors.text }]}>{headerTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.text + '80' }]}>Keep track of your pet's food inventory</Text>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <Input
            label="Food Name"
            placeholder="Enter food name"
            value={formState.name}
            onChangeText={(value) => handleChange('name', value)}
            error={errors.name}
            touched={touched.name}
            icon={<Ionicons name="fast-food-outline" size={20} color={colors.primary} />}
            iconPosition="left"
            containerStyle={styles.inputContainer}
          />
          
          <Input
            label="Brand"
            placeholder="Enter brand name"
            value={formState.brand}
            onChangeText={(value) => handleChange('brand', value)}
            error={errors.brand}
            touched={touched.brand}
            containerStyle={styles.inputContainer}
          />
          
          <Select
            label="Category"
            options={foodCategoryOptions}
            selectedValue={formState.category}
            onValueChange={(value) => handleChange('category', value)}
            error={errors.category}
            touched={touched.category}
            containerStyle={styles.inputContainer}
          />
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Input
                label="Total Quantity"
                placeholder="Enter total quantity"
                value={formState.quantity}
                onChangeText={(value) => handleChange('quantity', value)}
                error={errors.quantity}
                touched={touched.quantity}
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
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Input
                label="Daily Feeding Quantity"
                placeholder="Enter daily amount"
                value={formState.dailyFeedingQuantity}
                onChangeText={(value) => handleChange('dailyFeedingQuantity', value)}
                error={errors.dailyFeedingQuantity}
                touched={touched.dailyFeedingQuantity}
                keyboardType="numeric"
                containerStyle={styles.inputContainer}
              />
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <Select
                label="Unit"
                options={unitOptions}
                selectedValue={formState.dailyFeedingUnit}
                onValueChange={(value) => handleChange('dailyFeedingUnit', value)}
                error={errors.dailyFeedingUnit}
                touched={touched.dailyFeedingUnit}
                containerStyle={styles.inputContainer}
              />
            </View>
          </FormRow>
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Purchase Date"
                value={formState.purchaseDate}
                onChange={(date) => handleDateChange('purchaseDate', date || new Date())}
                error={errors.purchaseDate}
                containerStyle={styles.inputContainer}
                allowMonthYearSelection={true}
              />
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Expiry Date"
                value={formState.expiryDate || new Date()}
                onChange={(date) => handleDateChange('expiryDate', date)}
                placeholder="Select expiry date"
                error={errors.expiryDate}
                containerStyle={styles.inputContainer}
                allowMonthYearSelection={true}
                minDate={formState.purchaseDate}
              />
            </View>
          </FormRow>
          
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
            label="Mark as Preferred Food"
            value={formState.isPreferred}
            onValueChange={(value) => handleChange('isPreferred', value)}
            containerStyle={styles.switchContainer}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleCancel}
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
              </View>
            ) : (
              <Text style={styles.buttonText}>{buttonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Export as a memoized component to prevent unnecessary re-renders
export default React.memo(AddFoodItem);

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
    marginHorizontal: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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