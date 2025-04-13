import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Input, Select, Button, Form, FormRow } from './index';
import { FoodItem } from '../types/components';

interface AddFoodFormProps {
  onSubmit: (foodItem: Omit<FoodItem, 'id'>) => void;
  onCancel: () => void;
}

const AddFoodForm: React.FC<AddFoodFormProps> = ({ onSubmit, onCancel }) => {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<Omit<FoodItem, 'id'>>({
    name: '',
    brand: '',
    category: 'dry',
    petId: '', // This will be set by the parent component
    nutritionalInfo: {
      calories: 0,
      protein: 0,
      fat: 0,
      fiber: 0,
      ingredients: [],
      allergens: []
    },
    inventory: {
      currentAmount: 0,
      totalAmount: 0,
      unit: 'kg',
      dailyFeedingAmount: 0,
      dailyFeedingUnit: 'g',
      daysRemaining: 0,
      lowStockThreshold: 0,
      reorderAlert: false
    },
    purchaseDetails: {
      date: new Date(),
      price: 0,
      supplier: ''
    },
    servingSize: {
      amount: 0,
      unit: 'g',
      caloriesPerServing: 0
    },
    rating: 0,
    petPreference: 'neutral',
    veterinarianApproved: false,
    specialNotes: '',
    // UI-specific properties
    amount: '0 kg',
    lowStock: false,
    nextPurchase: 'Not scheduled'
  });

  const handleSubmit = () => {
    // Calculate days remaining based on current amount and daily feeding amount
    const daysRemaining = formData.inventory.dailyFeedingAmount > 0 
      ? Math.floor(formData.inventory.currentAmount / formData.inventory.dailyFeedingAmount)
      : 0;
    
    // Update UI-specific properties
    const updatedFormData = {
      ...formData,
      inventory: {
        ...formData.inventory,
        daysRemaining,
        reorderAlert: daysRemaining <= formData.inventory.lowStockThreshold
      },
      amount: `${formData.inventory.currentAmount} ${formData.inventory.unit}`,
      lowStock: daysRemaining <= formData.inventory.lowStockThreshold
    };
    
    onSubmit(updatedFormData);
  };

  const handleChange = (field: string, value: string | number | string[] | boolean | Date) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as Record<string, any>),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Form>
        <FormRow>
          <Input
            label="Food Name"
            value={formData.name}
            onChangeText={(value) => handleChange('name', value)}
            placeholder="Enter food name"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Brand"
            value={formData.brand}
            onChangeText={(value) => handleChange('brand', value)}
            placeholder="Enter brand name"
          />
        </FormRow>

        <FormRow>
          <Select
            label="Category"
            selectedValue={formData.category}
            onValueChange={(value) => handleChange('category', value)}
            options={[
              { label: 'Dry Food', value: 'dry' },
              { label: 'Wet Food', value: 'wet' },
              { label: 'Treats', value: 'treats' },
              { label: 'Supplements', value: 'supplements' },
              { label: 'Prescription', value: 'prescription' },
              { label: 'Raw', value: 'raw' },
              { label: 'Homemade', value: 'homemade' }
            ]}
          />
        </FormRow>

        <FormRow>
          <Input
            label="Calories (per 100g)"
            value={formData.nutritionalInfo.calories.toString()}
            onChangeText={(value) => handleChange('nutritionalInfo.calories', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter calories"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Protein (%)"
            value={formData.nutritionalInfo.protein.toString()}
            onChangeText={(value) => handleChange('nutritionalInfo.protein', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter protein percentage"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Fat (%)"
            value={formData.nutritionalInfo.fat.toString()}
            onChangeText={(value) => handleChange('nutritionalInfo.fat', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter fat percentage"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Fiber (%)"
            value={formData.nutritionalInfo.fiber.toString()}
            onChangeText={(value) => handleChange('nutritionalInfo.fiber', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter fiber percentage"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Ingredients (comma separated)"
            value={formData.nutritionalInfo.ingredients.join(', ')}
            onChangeText={(value) => handleChange('nutritionalInfo.ingredients', value.split(',').map(item => item.trim()))}
            placeholder="Enter ingredients"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Allergens (comma separated)"
            value={formData.nutritionalInfo.allergens?.join(', ') || ''}
            onChangeText={(value) => handleChange('nutritionalInfo.allergens', value.split(',').map(item => item.trim()))}
            placeholder="Enter allergens"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Current Amount"
            value={formData.inventory.currentAmount.toString()}
            onChangeText={(value) => handleChange('inventory.currentAmount', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter current amount"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Total Amount"
            value={formData.inventory.totalAmount.toString()}
            onChangeText={(value) => handleChange('inventory.totalAmount', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter total amount"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Daily Feeding Amount"
            value={formData.inventory.dailyFeedingAmount.toString()}
            onChangeText={(value) => handleChange('inventory.dailyFeedingAmount', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter daily feeding amount"
          />
        </FormRow>

        <FormRow>
          <Select
            label="Daily Feeding Unit"
            selectedValue={formData.inventory.dailyFeedingUnit}
            onValueChange={(value) => handleChange('inventory.dailyFeedingUnit', value)}
            options={[
              { label: 'Kilograms (kg)', value: 'kg' },
              { label: 'Grams (g)', value: 'g' },
              { label: 'Pounds (lb)', value: 'lb' },
              { label: 'Ounces (oz)', value: 'oz' },
              { label: 'Cups', value: 'cups' },
              { label: 'Cans', value: 'cans' },
              { label: 'Packages', value: 'packages' }
            ]}
          />
        </FormRow>

        <FormRow>
          <Select
            label="Unit"
            selectedValue={formData.inventory.unit}
            onValueChange={(value) => handleChange('inventory.unit', value)}
            options={[
              { label: 'Kilograms (kg)', value: 'kg' },
              { label: 'Grams (g)', value: 'g' },
              { label: 'Pounds (lb)', value: 'lb' },
              { label: 'Ounces (oz)', value: 'oz' },
              { label: 'Cups', value: 'cups' },
              { label: 'Cans', value: 'cans' },
              { label: 'Packages', value: 'packages' }
            ]}
          />
        </FormRow>

        <FormRow>
          <Input
            label="Low Stock Threshold"
            value={formData.inventory.lowStockThreshold.toString()}
            onChangeText={(value) => handleChange('inventory.lowStockThreshold', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter low stock threshold"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Price"
            value={formData.purchaseDetails.price?.toString() || '0'}
            onChangeText={(value) => handleChange('purchaseDetails.price', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter price"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Supplier"
            value={formData.purchaseDetails.supplier || ''}
            onChangeText={(value) => handleChange('purchaseDetails.supplier', value)}
            placeholder="Enter supplier name"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Serving Size Amount"
            value={formData.servingSize.amount.toString()}
            onChangeText={(value) => handleChange('servingSize.amount', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter serving size amount"
          />
        </FormRow>

        <FormRow>
          <Input
            label="Calories per Serving"
            value={formData.servingSize.caloriesPerServing.toString()}
            onChangeText={(value) => handleChange('servingSize.caloriesPerServing', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter calories per serving"
          />
        </FormRow>

        <FormRow>
          <Select
            label="Pet Preference"
            selectedValue={formData.petPreference}
            onValueChange={(value) => handleChange('petPreference', value)}
            options={[
              { label: 'Favorite', value: 'favorite' },
              { label: 'Neutral', value: 'neutral' },
              { label: 'Disliked', value: 'disliked' }
            ]}
          />
        </FormRow>

        <FormRow>
          <Input
            label="Special Notes"
            value={formData.specialNotes || ''}
            onChangeText={(value) => handleChange('specialNotes', value)}
            placeholder="Enter special notes"
            multiline
          />
        </FormRow>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={onCancel}
            style={[styles.button, { backgroundColor: colors.border }]}
          />
          <Button
            title="Add Food"
            onPress={handleSubmit}
            style={[styles.button, { backgroundColor: colors.primary }]}
          />
        </View>
      </Form>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default AddFoodForm; 