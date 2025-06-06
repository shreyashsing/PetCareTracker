import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { useAppColors } from '../hooks/useAppColors';
import { useFormStatePersistence } from '../hooks/useFormStatePersistence';
import { FormStateNotification } from '../components/FormStateNotification';
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
import {unifiedDatabaseManager} from "../services/db";
import { notificationService } from '../services/notifications';

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

// Helper function to generate a UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

type AddFoodItemScreenProps = NativeStackScreenProps<MainStackParamList, 'AddFoodItem'>;

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
  
  // Form state persistence hook - only for new food items (not edit mode)
  const { clearSavedState, forceSave, wasRestored, dismissRestoreNotification } = useFormStatePersistence({
    routeName: 'AddFoodItem',
    formState,
    setFormState,
    enabled: !isEditMode, // Disable for edit mode
    debounceMs: 2000
  });
  
  // Convert quantity when changing between units
  const convertQuantity = (value: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return value;
    
    const conversionKey = `${fromUnit}_to_${toUnit}`;
    const conversionRate = UNIT_CONVERSIONS[conversionKey as keyof typeof UNIT_CONVERSIONS];
    
    if (conversionRate) {
      const converted = value * conversionRate;
      console.log(`Converting ${value} ${fromUnit} to ${toUnit}: ${converted}`);
      return converted;
    }
    
    // If direct conversion not found, try to convert through a common unit (kg)
    if (fromUnit !== 'kg' && toUnit !== 'kg') {
      const toKgKey = `${fromUnit}_to_kg`;
      const fromKgKey = `kg_to_${toUnit}`;
      
      const toKgRate = UNIT_CONVERSIONS[toKgKey as keyof typeof UNIT_CONVERSIONS];
      const fromKgRate = UNIT_CONVERSIONS[fromKgKey as keyof typeof UNIT_CONVERSIONS];
      
      if (toKgRate && fromKgRate) {
        const toKg = value * toKgRate;
        const converted = toKg * fromKgRate;
        console.log(`Converting ${value} ${fromUnit} to ${toUnit} via kg: ${converted}`);
        return converted;
      }
    }
    
    // If no conversion available, return the original value
    console.log(`No conversion available from ${fromUnit} to ${toUnit}. Keeping value as is.`);
    return value;
  };
  
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
          const item = await unifiedDatabaseManager.foodItems.getById(route.params.itemId);
          
          if (item) {
            // Handle both nested structure and flattened structure from database
            const currentAmount = item.inventory?.currentAmount ?? item.current_amount ?? 0;
            const dailyAmount = item.inventory?.dailyFeedingAmount ?? item.daily_feeding_amount ?? 0;
            const unit = item.inventory?.unit ?? item.unit ?? 'kg';
            const dailyUnit = item.inventory?.dailyFeedingUnit ?? item.daily_feeding_unit ?? 'g';
            const purchaseDate = new Date(item.purchaseDetails?.date ?? item.purchase_date ?? new Date());
            const expiryDate = item.purchaseDetails?.expiryDate ?? item.expiry_date;
            
            setFormState({
              name: item.name,
              brand: item.brand,
              category: item.category as FoodCategory,
              quantity: currentAmount.toString(),
              unit: unit,
              dailyFeedingQuantity: dailyAmount.toString(),
              dailyFeedingUnit: dailyUnit,
              purchaseDate: purchaseDate,
              expiryDate: expiryDate ? new Date(expiryDate) : undefined,
              notes: item.specialNotes || item.special_notes || '',
              isPreferred: item.is_preferred === true,
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
    setFormState(prev => {
      // Special handling for unit changes
      if (name === 'unit' && typeof value === 'string' && value !== prev.unit) {
        // Convert quantity when changing units
        const numericQuantity = parseFloat(prev.quantity);
        if (!isNaN(numericQuantity)) {
          const convertedQuantity = convertQuantity(numericQuantity, prev.unit, value);
          return {
            ...prev,
            [name]: value,
            quantity: convertedQuantity.toFixed(2).replace(/\.00$/, '')
          };
        }
      }
      
      // Special handling for dailyFeedingUnit changes
      if (name === 'dailyFeedingUnit' && typeof value === 'string' && value !== prev.dailyFeedingUnit) {
        // Convert daily feeding quantity when changing units
        const numericQuantity = parseFloat(prev.dailyFeedingQuantity);
        if (!isNaN(numericQuantity)) {
          const convertedQuantity = convertQuantity(numericQuantity, prev.dailyFeedingUnit, value);
          return {
            ...prev,
            [name]: value,
            dailyFeedingQuantity: convertedQuantity.toFixed(2).replace(/\.00$/, '')
          };
        }
      }
      
      // Default handling for other field changes
      return {
        ...prev,
        [name]: value,
      };
    });
    
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
    
    // Check if the daily feeding amount is reasonable compared to the total
    if (!isNaN(parseFloat(formState.quantity)) && !isNaN(parseFloat(formState.dailyFeedingQuantity))) {
      const totalQuantity = parseFloat(formState.quantity);
      const dailyQuantity = parseFloat(formState.dailyFeedingQuantity);
      
      let daysRemainingEstimate = 0;
      if (formState.unit === formState.dailyFeedingUnit) {
        daysRemainingEstimate = totalQuantity / dailyQuantity;
      } else {
        const totalInDailyUnit = convertQuantity(totalQuantity, formState.unit, formState.dailyFeedingUnit);
        daysRemainingEstimate = totalInDailyUnit / dailyQuantity;
      }
      
      // If conversion resulted in a very small number, warn the user
      if (daysRemainingEstimate < 1) {
        newErrors.dailyFeedingQuantity = `Daily amount too large. Would only last ${daysRemainingEstimate.toFixed(2)} days.`;
      } else if (daysRemainingEstimate > 1000) {
        newErrors.dailyFeedingQuantity = `Daily amount too small compared to total. Would last ${Math.floor(daysRemainingEstimate)} days.`;
      }
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
    
    if (isLoading) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Clear saved form state on successful submission
      clearSavedState();

      // Get quantities from form
      const totalQuantity = parseFloat(formState.quantity);
      const dailyQuantity = parseFloat(formState.dailyFeedingQuantity);
      
      // Calculate days remaining, converting to common unit if necessary
      let daysRemaining = 0;
      if (dailyQuantity > 0) {
        if (formState.unit === formState.dailyFeedingUnit) {
          // Same units, simple division
          daysRemaining = Math.floor(totalQuantity / dailyQuantity);
        } else {
          // Different units, need conversion
          const totalInDailyUnit = convertQuantity(totalQuantity, formState.unit, formState.dailyFeedingUnit);
          daysRemaining = Math.floor(totalInDailyUnit / dailyQuantity);
          console.log(`Converted ${totalQuantity} ${formState.unit} to ${totalInDailyUnit} ${formState.dailyFeedingUnit} for days calculation`);
        }
      }
      
      console.log(`Days remaining calculation: ${totalQuantity} ${formState.unit} / ${dailyQuantity} ${formState.dailyFeedingUnit} = ${daysRemaining} days`);
      
      // Calculate low stock threshold
      const lowStockThreshold = Math.max(7, Math.floor(daysRemaining * 0.2)); // 20% of total days or 7 days, whichever is higher
      
      // Check if item will be low stock at creation time
      const isLowStock = Math.floor(daysRemaining) <= lowStockThreshold;

      console.log('Form data for food item:', {
        totalQuantity,
        unit: formState.unit,
        dailyQuantity,
        dailyUnit: formState.dailyFeedingUnit,
        daysRemaining
      });
      
      // Build the food item object
      const foodItemData: Omit<FoodItem, 'id'> = {
        petId: activePetId as string,
        name: formState.name,
        brand: formState.brand,
        category: formState.category,
        
        // Include both nested structure for the app and flattened fields for the database
        inventory: {
          currentAmount: totalQuantity,
          totalAmount: totalQuantity,
          unit: formState.unit as 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans',
          dailyFeedingAmount: dailyQuantity,
          dailyFeedingUnit: formState.dailyFeedingUnit as 'g' | 'kg' | 'lb' | 'oz' | 'cups' | 'packages' | 'cans',
          daysRemaining: daysRemaining,
          lowStockThreshold: lowStockThreshold,
          reorderAlert: isLowStock
        },
        
        // IMPORTANT: Include flattened fields for database compatibility
        // These are the fields that will be directly used by Supabase
        total_amount: totalQuantity,
        current_amount: totalQuantity,
        unit: formState.unit,
        daily_feeding_amount: dailyQuantity,
        daily_feeding_unit: formState.dailyFeedingUnit,
        days_remaining: daysRemaining,
        low_stock_threshold: lowStockThreshold,
        reorder_alert: isLowStock,
        
        purchaseDetails: {
          date: formState.purchaseDate,
          expiryDate: formState.expiryDate,
          price: 0,
          supplier: ''
        },
        
        // Flattened date fields
        purchase_date: formState.purchaseDate,
        expiry_date: formState.expiryDate,
        
        is_preferred: formState.isPreferred,
        petPreference: formState.isPreferred ? 'favorite' : 'neutral',
        specialNotes: formState.notes,
        special_notes: formState.notes,
        lowStock: isLowStock,
      };
      
      // Use appropriate method based on whether we're creating or updating
      let savedFoodItem: FoodItem;
      
      if (isEditMode && itemId) {
        // Update existing food item
        const updated = await unifiedDatabaseManager.foodItems.update(itemId, foodItemData);
        if (!updated) {
          throw new Error('Failed to update food item');
        }
        savedFoodItem = updated;
      } else {
        // Create new food item
        const newFoodItem: FoodItem = {
          id: generateUUID(),
          ...foodItemData
        };
        savedFoodItem = await unifiedDatabaseManager.foodItems.create(newFoodItem);
      }
      
      // Check if item needs a low stock alert
      if (isLowStock) {
        await notificationService.scheduleInventoryAlert(savedFoodItem);
      }
      
      // Navigate back to the Feeding screen with refresh parameter
      navigation.navigate('Feeding', { refresh: true });
      
    } catch (error) {
      console.error('Error saving food item:', error);
      Alert.alert('Error', 'Failed to save food item');
    } finally {
      setIsLoading(false);
    }
  }, [formState, navigation, validate, activePetId, isEditMode, itemId]);
  
  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    
    setIsLoading(true);
    try {
      await unifiedDatabaseManager.foodItems.delete(itemId);
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
      {/* Form State Restoration Notification */}
      <FormStateNotification 
        visible={wasRestored}
        onDismiss={dismissRestoreNotification}
        formName="food item"
      />
      
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
          
          {/* Show unit equivalent if total and daily units differ */}
          {formState.unit !== formState.dailyFeedingUnit && 
           formState.quantity && 
           !isNaN(parseFloat(formState.quantity)) && (
            <View style={styles.unitConversionInfo}>
              <Text style={[styles.unitConversionText, {color: colors.text + '80'}]}>
                {parseFloat(formState.quantity)} {formState.unit} = 
                {' '}{convertQuantity(parseFloat(formState.quantity), formState.unit, formState.dailyFeedingUnit).toFixed(2)} {formState.dailyFeedingUnit}
              </Text>
            </View>
          )}
          
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
          
          {/* Days calculation preview */}
          {formState.quantity && 
           formState.dailyFeedingQuantity && 
           !isNaN(parseFloat(formState.quantity)) &&
           !isNaN(parseFloat(formState.dailyFeedingQuantity)) && (
            <View style={styles.daysCalculationPreview}>
              <Text style={[styles.calculationExplanation, {color: colors.text + '80'}]}>
                {(() => {
                  const totalQuantity = parseFloat(formState.quantity);
                  const dailyQuantity = parseFloat(formState.dailyFeedingQuantity);
                  let days = 0;
                  
                  if (formState.unit === formState.dailyFeedingUnit) {
                    days = totalQuantity / dailyQuantity;
                  } else {
                    const totalInDailyUnit = convertQuantity(totalQuantity, formState.unit, formState.dailyFeedingUnit);
                    days = totalInDailyUnit / dailyQuantity;
                  }
                  
                  return `At ${dailyQuantity} ${formState.dailyFeedingUnit}/day, this food will last approximately ${Math.floor(days)} days`;
                })()}
              </Text>
            </View>
          )}
          
          <FormRow>
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Purchase Date"
                value={formState.purchaseDate}
                onChange={(date) => handleChange('purchaseDate', date)}
                mode="date"
                error={errors.purchaseDate}
                containerStyle={styles.inputContainer}
              />
            </View>
            
            <View style={[styles.formRowItem, { flex: 1 }]}>
              <DatePicker
                label="Expiry Date"
                value={formState.expiryDate || new Date()}
                onChange={(date) => handleChange('expiryDate', date)}
                mode="date"
                error={errors.expiryDate}
                containerStyle={styles.inputContainer}
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
  unitConversionInfo: {
    marginHorizontal: 8,
    marginTop: -8,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  unitConversionText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  daysCalculationPreview: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 8,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calculationExplanation: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 