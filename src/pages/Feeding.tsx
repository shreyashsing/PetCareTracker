import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  FlatList,
  Image,
  Alert,
  Dimensions,
  TextInput,
  Switch,
  Animated,
  Easing
} from 'react-native';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
import { useActivePet } from '../hooks/useActivePet';
import { TopNavBar } from '../components';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Meal, FoodItem, Pet } from '../types/components';
import {unifiedDatabaseManager, STORAGE_KEYS } from "../services/db";
import { AsyncStorageService } from '../services/db/asyncStorage';
import { formatDate } from '../utils/helpers';
import { useFocusEffect } from '@react-navigation/native';
import Footer from '../components/layout/Footer';
import { notificationService } from '../services/notifications';
import { useToast } from '../hooks/use-toast';
import { ResponsiveText, ButtonText } from '../components/ResponsiveText';
import { createResponsiveButtonStyle } from '../utils/responsiveLayout';

type FeedingScreenProps = NativeStackScreenProps<MainStackParamList, 'Feeding'>;

// Simple meal type for display purposes
interface SimpleMeal {
  id: string;
  title: string;
  time: string;
  amount: string;
  calories: number;
  completed: boolean;
  notes?: string;
  foodName?: string; // Add foodName field
}

type TabType = 'today' | 'inventory';

const Feeding: React.FC<FeedingScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors } = useAppColors();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayMeals, setTodayMeals] = useState<SimpleMeal[]>([]);
  const [recentMeals, setRecentMeals] = useState<SimpleMeal[]>([]);
  const [totalCaloriesToday, setTotalCaloriesToday] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [foodInventory, setFoodInventory] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation dialog states
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'meal' | 'food'>('meal');
  const [itemToDelete, setItemToDelete] = useState<string>('');
  
  // Create animated values for chart bars
  const barAnimations = useMemo(() => {
    return Array(7).fill(0).map(() => new Animated.Value(0));
  }, []);

  // Show mock meal while waiting
  const addMockMeal = useCallback(() => {
    const now = new Date();
    const formattedTime = format(now, 'h:mm a');
    
    const mockMeal: SimpleMeal = {
      id: 'mock-meal',
      title: 'Sample Meal',
      time: formattedTime,
      amount: '1 cup',
      calories: 300,
      completed: false,
      notes: 'This is a sample meal. Tap the + button to add a real meal.',
      foodName: undefined,
    };
    
    setTodayMeals([mockMeal]);
  }, []);

  // Function to format meal data for display
  const formatMealForDisplay = useCallback(async (meal: Meal): Promise<SimpleMeal> => {
    if (!meal) {
      console.log('Error: Meal object is null or undefined');
      return {
        id: 'unknown',
        title: 'Unknown',
        time: 'No time',
        amount: 'Not specified',
        calories: 0,
        completed: false,
        notes: undefined,
        foodName: undefined,
      };
    }

    // Handle time display with proper null checks
    let timeDisplay = 'No time';
    if (meal.time) {
      try {
        const timeObj = new Date(meal.time);
        if (!isNaN(timeObj.getTime())) {
          timeDisplay = format(timeObj, 'h:mm a');
        } else {
          console.log('Error: Invalid time value:', meal.time);
        }
      } catch (e) {
        console.error('Error formatting time:', e, 'Value was:', meal.time);
      }
    }
    
    // Handle amount display with proper null checks
    let amountDisplay = 'Not specified';
    let foodName = undefined;
    
    if (meal.amount) {
      amountDisplay = String(meal.amount);
    } else if (meal.foods && Array.isArray(meal.foods) && meal.foods.length > 0 && meal.foods[0]) {
      const firstFood = meal.foods[0];
      amountDisplay = `${firstFood.amount || 0} ${firstFood.unit || 'cups'}`;
      
      // Get actual food name from the database instead of just using the ID
      if (firstFood.foodItemId) {
        try {
          const foodItem = await unifiedDatabaseManager.foodItems.getById(firstFood.foodItemId);
          if (foodItem && foodItem.name) {
            foodName = foodItem.name;
          } else {
            // Fallback to ID if name can't be retrieved
            foodName = firstFood.foodItemId;
          }
        } catch (error) {
          console.error('Error fetching food name:', error);
          foodName = firstFood.foodItemId;
        }
      }
    }
    
    return {
      id: meal.id || 'unknown',
      title: meal.type ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : 'Unknown',
      time: timeDisplay,
      amount: amountDisplay,
      calories: meal.totalCalories || meal.calories || 0,
      completed: meal.completed || false,
      notes: meal.notes || undefined,
      foodName,
    };
  }, []);

  // Fetch meals for today
  const loadMeals = useCallback(async () => {
    if (!activePetId) return;
    
    try {
      setLoading(true);
      
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Fetch all meals and filter for active pet
      const allMealsData = await unifiedDatabaseManager.meals.getAll();
      const allMeals = allMealsData.filter(meal => meal.petId === activePetId);
      
      // Filter for today's meals
      const mealsToday = allMeals.filter(meal => {
        if (!meal.date) return false;
        
        const mealDate = new Date(meal.date);
        mealDate.setHours(0, 0, 0, 0);
        
        const isSameDay = 
          mealDate.getFullYear() === today.getFullYear() &&
          mealDate.getMonth() === today.getMonth() &&
          mealDate.getDate() === today.getDate();
        
        return isSameDay;
      });
      
      // Format meals for display - await Promise.all since formatMealForDisplay is now async
      const formattedMeals = await Promise.all(mealsToday.map(meal => formatMealForDisplay(meal)));
      
      // Sort by time
      formattedMeals.sort((a, b) => {
        return a.time.localeCompare(b.time);
      });
      
      // Calculate total calories
      const totalCal = mealsToday.reduce((sum, meal) => sum + (meal.totalCalories || meal.calories || 0), 0);
      
      // Update state
      setTodayMeals(formattedMeals);
      setTotalCaloriesToday(totalCal);
      
      // Get recent meals (last 3 days, excluding today)
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const recentMealsData = allMeals.filter(meal => {
        if (!meal.date) return false;
        
        const mealDate = new Date(meal.date);
        mealDate.setHours(0, 0, 0, 0);
        
        // Not today but within last 3 days
        return mealDate < today && mealDate >= threeDaysAgo;
      });
      
      // Format recent meals - await Promise.all since formatMealForDisplay is now async
      const formattedRecentMeals = await Promise.all(
        recentMealsData.map(meal => formatMealForDisplay(meal))
      );
      
      // Sort by time
      formattedRecentMeals.sort((a, b) => b.time.localeCompare(a.time)); // Most recent first
      
      setRecentMeals(formattedRecentMeals);
      
      // Show mock meal if no meals for today
      if (formattedMeals.length === 0) {
        addMockMeal();
      }
      
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePetId, formatMealForDisplay, addMockMeal]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMeals();
  }, [loadMeals]);

  // Function to deduct amount from inventory when meal is completed
  const deductFromInventory = useCallback(async (foodItemId: string, amountUsed: number, unitUsed: string = 'g') => {
    try {
      const foodItem = await unifiedDatabaseManager.foodItems.getById(foodItemId);
      if (!foodItem) {
        console.error('Food item not found for inventory deduction');
        return;
      }

      const currentAmount = foodItem.inventory?.currentAmount ?? foodItem.current_amount ?? 0;
      const foodUnit = foodItem.inventory?.unit ?? foodItem.unit ?? 'g';
      
      // Convert meal amount to inventory unit
      let convertedAmountUsed = amountUsed;
      
      // Convert between units
      const convertBetweenUnits = (value: number, fromUnit: string, toUnit: string): number => {
        // Early return if units are the same
        if (fromUnit === toUnit) return value;
        
        // Conversion factors
        const UNIT_TO_G: Record<string, number> = {
          'kg': 1000,
          'lb': 453.592,
          'oz': 28.3495,
          'cups': 226.796, // Approximate for dry dog food
          'g': 1,
          'packages': 500, // Approximate default
          'cans': 400, // Approximate default
        };
        
        const G_TO_UNIT: Record<string, number> = {
          'kg': 0.001,
          'lb': 0.00220462,
          'oz': 0.035274,
          'cups': 0.00440925, // Approximate for dry dog food
          'g': 1,
          'packages': 0.002, // Approximate default
          'cans': 0.0025, // Approximate default
        };
        
        // First convert to grams, then to target unit
        const inGrams = value * (UNIT_TO_G[fromUnit] || 1);
        return inGrams * (G_TO_UNIT[toUnit] || 1);
      };
      
      // Convert meal amount to inventory unit
      convertedAmountUsed = convertBetweenUnits(amountUsed, unitUsed, foodUnit);
      
      console.log(`Converting meal amount: ${amountUsed}${unitUsed} = ${convertedAmountUsed.toFixed(2)}${foodUnit}`);
      
      
      const newAmount = Math.max(0, currentAmount - convertedAmountUsed);
      
      console.log(`Deducted ${amountUsed}g (${convertedAmountUsed.toFixed(2)}${foodUnit}) from ${foodItem.name}. New amount: ${newAmount}${foodUnit}`);
      
      // Get daily feeding amount and unit for proper days remaining calculation
      const dailyFeedingAmount = foodItem.inventory?.dailyFeedingAmount ?? foodItem.daily_feeding_amount ?? 1;
      const dailyFeedingUnit = foodItem.inventory?.dailyFeedingUnit ?? foodItem.daily_feeding_unit ?? 'g';
      
      // Convert daily feeding amount to the same unit as the inventory if needed
      let normalizedDailyAmount = dailyFeedingAmount;
      
      // If units differ, try to convert
      if (foodUnit !== dailyFeedingUnit) {
        // Convert to grams first (common unit) then to inventory unit
        const UNIT_TO_G: Record<string, number> = {
          'kg': 1000,
          'lb': 453.592,
          'oz': 28.3495,
          'cups': 226.796, // Approximate for dry dog food
          'g': 1,
          'packages': 500, // Approximate default
          'cans': 400, // Approximate default
        };
        
        const G_TO_UNIT: Record<string, number> = {
          'kg': 0.001,
          'lb': 0.00220462,
          'oz': 0.035274,
          'cups': 0.00440925, // Approximate for dry dog food
          'g': 1,
          'packages': 0.002, // Approximate default
          'cans': 0.0025, // Approximate default
        };
        
        // Convert daily amount to grams, then to inventory unit
        const inGrams = dailyFeedingAmount * (UNIT_TO_G[dailyFeedingUnit] || 1);
        normalizedDailyAmount = inGrams * (G_TO_UNIT[foodUnit] || 1);
        
        console.log(`Converting daily feeding: ${dailyFeedingAmount}${dailyFeedingUnit} = ${normalizedDailyAmount.toFixed(2)}${foodUnit}`);
      }
      
      // Calculate days remaining with normalized units
      const daysRemaining = normalizedDailyAmount > 0 
        ? Math.floor(newAmount / normalizedDailyAmount) 
        : 9999;
      
      console.log(`Days remaining for ${foodItem.name}: ${daysRemaining} (using ${normalizedDailyAmount}${foodUnit}/day)`);
      
      // Check if we need to create a low stock alert
      const shouldAlert = daysRemaining <= 7;
      console.log(`Should alert for ${foodItem.name}? ${shouldAlert}`);
      
      // Update inventory in database
      await unifiedDatabaseManager.foodItems.update(foodItemId, {
        inventory: {
          ...foodItem.inventory,
          currentAmount: newAmount,
          daysRemaining,
          reorderAlert: shouldAlert
        } as any
      });
      
      // If there's a low stock alert, schedule a notification
      if (shouldAlert) {
        await notificationService.scheduleInventoryAlert({
          ...foodItem,
          inventory: {
            ...foodItem.inventory,
            currentAmount: newAmount,
            daysRemaining,
            reorderAlert: true
          } as any
        });
        }
      
    } catch (error) {
      console.error('Error deducting from inventory:', error);
      toast({
        title: 'Warning',
        description: 'Could not update inventory automatically',
        type: 'error'
      });
    }
  }, [toast]);

  // Toggle meal completion status
  const toggleMealCompletion = useCallback(async (mealId: string, isCompleted: boolean) => {
    try {
      if (mealId === 'mock-meal') return; // Don't process mock meal
      
      // Get the meal first
      const meal = await unifiedDatabaseManager.meals.getById(mealId);
      if (!meal) {
        console.error(`Meal with ID ${mealId} not found`);
        return;
      }
      
      if (isCompleted) {
        // Update the meal with completed status
        await unifiedDatabaseManager.meals.update(mealId, { ...meal, completed: true });
        
        // If the meal is completed, cancel its notifications
        await notificationService.cancelMealNotifications(mealId);
        
        // If the meal has a linked food item, deduct from inventory
      if (meal.foods && meal.foods.length > 0) {
          for (const food of meal.foods) {
            if (food.foodItemId) {
              await deductFromInventory(food.foodItemId, food.amount || 0, food.unit || 'g');
            }
        }
      }
      } else {
        // Update the meal without completed status
        await unifiedDatabaseManager.meals.update(mealId, { ...meal, completed: false });
        
        // If completion is toggled off, reschedule notifications
            await notificationService.scheduleMealNotifications(meal);
      }
      
      // Show toast
      toast({
        title: isCompleted ? '✅ Meal Completed' : '🔄 Meal Restored',
        description: isCompleted ? 'Meal marked as completed' : 'Meal marked as incomplete',
        type: 'success',
      });
      
      // Refresh the data
      loadMeals();
      
      // Use navigation to refresh the screen, which will trigger useFocusEffect
      // The timestamp ensures the parameter is always different
      navigation.setParams({ mealCompleted: Date.now() });
      
    } catch (error) {
      console.error('Error toggling meal completion:', error);
      
      toast({
        title: '❌ Error',
        description: 'Failed to update meal status',
        type: 'error',
      });
    }
  }, [loadMeals, deductFromInventory, toast, navigation]);

  // Show confirmation dialog for meal deletion
  const handleDeleteMeal = useCallback((mealId: string) => {
      if (mealId === 'mock-meal') return; // Don't process mock meal
      
    // Set up confirmation dialog
    setItemToDelete(mealId);
    setConfirmDialogType('meal');
    setConfirmDialogVisible(true);
  }, []);
  
  // Actual meal deletion function
  const confirmDeleteMeal = useCallback(async () => {
              try {
      if (!itemToDelete) return;
      
                // Cancel notifications for this meal first
      await notificationService.cancelMealNotifications(itemToDelete);
                
                // Delete the meal from database
      await unifiedDatabaseManager.meals.delete(itemToDelete);
                
                // Show success toast
                toast({
                  title: 'Meal deleted',
                  description: 'The meal has been removed from the schedule'
                });
                
                // Refresh meal data
                await loadMeals();
              } catch (error) {
                console.error('Error deleting meal:', error);
                toast({
                  title: 'Error',
        description: 'Failed to delete the meal'
      });
    } finally {
      // Reset state
      setConfirmDialogVisible(false);
      setItemToDelete('');
    }
  }, [itemToDelete, loadMeals, toast]);

  // Load inventory data
  const loadInventoryData = useCallback(async () => {
    if (!activePetId) return;
        
        try {
      const inventoryData = await unifiedDatabaseManager.foodItems.getAll();
      const petInventory = inventoryData.filter(item => item.petId === activePetId);
      setFoodInventory(petInventory);
    } catch (error) {
      console.error('Error loading food inventory:', error);
    }
  }, [activePetId]);

  // Reload meals data when screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      loadMeals();
      if (activeTab === 'inventory') {
        loadInventoryData();
      }
    }, [loadMeals, loadInventoryData, activeTab, route.params?.refresh, route.params?.mealCompleted])
  );
      
  // Animate chart bars when data changes for today's view
  useEffect(() => {
    // Reset animations
    barAnimations.forEach(anim => anim.setValue(0));
      
    // Animate each bar with a staggered delay
    const animations = barAnimations.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false // Height animations need JS driver
            });
    });
    
    Animated.parallel(animations).start();
  }, [barAnimations]);
  
  // Effects to load data when screen gains focus
  useEffect(() => {
        loadInventoryData();
  }, [loadInventoryData]);

  // Function to get icon for food category
  const getFoodCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'dry':
        return 'nutrition-outline';
      case 'wet':
        return 'water-outline';
      case 'treats':
        return 'ribbon-outline';
      case 'supplements':
        return 'fitness-outline';
      default:
        return 'restaurant-outline';
    }
  };

  // Function to get color for food category
  const getFoodCategoryColor = (category: string): string => {
    switch (category) {
      case 'dry':
        return colors.primary;
      case 'wet':
        return colors.info || '#3498db';
      case 'treats':
        return colors.warning || '#f39c12';
      case 'supplements':
        return colors.success || '#2ecc71';
      default:
        return colors.primary;
    }
  };

  // Empty state component
  const EmptyState = React.memo(() => (
    <View style={[styles.emptyStateContainer, {backgroundColor: colors.card}]}>
      <Ionicons
        name="restaurant-outline"
        size={80}
        color={colors.text + '40'}
        style={styles.emptyStateIcon}
      />
      <Text style={[styles.emptyStateTitle, {color: colors.text}]}>No Meals Today</Text>
      <Text style={[styles.emptyStateSubtitle, {color: colors.text + '80'}]}>
        Track your pet's meals to ensure they're getting proper nutrition
      </Text>
      <TouchableOpacity
        style={[styles.button, {backgroundColor: colors.primary}]}
        onPress={() => navigation.navigate('AddMeal', { petId: activePetId || undefined })}
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text style={styles.buttonText}>Add First Meal</Text>
      </TouchableOpacity>
    </View>
  ));
  
  // Animated chart bar component
  const ChartBar = React.memo(({ 
    value, 
    index, 
    maxValue,
    animValue,
    isSelected,
    onPress
  }: { 
    value: number; 
    index: number; 
    maxValue: number;
    animValue: Animated.Value;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const barHeight = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', `${(value / (maxValue || 1)) * 80}%`]
    });
    
    const barWidth = isSelected ? '75%' : '60%';
    const barScale = isSelected ? 1.05 : 1;
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.chartColumn}
        onPress={onPress}
      >
        {isSelected && (
          <View style={[styles.chartTooltip, {backgroundColor: colors.card}]}>
            <Text style={[styles.chartTooltipText, {color: colors.text}]}>
              {value} cal
            </Text>
          </View>
        )}
        
        <Animated.View 
          style={[
            styles.chartBarContainer,
            {
              transform: [{ scale: barScale }],
              height: barHeight,
              width: barWidth,
            }
          ]}
        >
          <LinearGradient
            colors={[colors.primary + '80', colors.primary]}
            style={styles.chartBar}
            start={[0, 0]}
            end={[0, 1]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  // Meal card component
  const MealCard = React.memo(({ meal }: { meal: SimpleMeal }) => (
    <View style={[styles.mealCard, {backgroundColor: colors.card}]}>
      <View style={[styles.mealStatusIndicator, { 
        backgroundColor: meal.completed ? colors.success : colors.warning 
      }]} />
      
      <TouchableOpacity 
        style={styles.mealCardContent}
        onPress={() => navigation.navigate('AddMeal', { 
            petId: activePetId || undefined,
            mealId: meal.id !== 'mock-meal' ? meal.id : undefined 
        })}
      >
        <View style={styles.mealTimeColumn}>
          <Text style={[styles.mealTime, {color: colors.text}]}>{meal.time}</Text>
          <View style={[styles.mealTypeTag, {backgroundColor: colors.primary + '20'}]}>
            <Text style={[styles.mealTypeText, {color: colors.primary}]}>{meal.title}</Text>
          </View>
        </View>
        
        <View style={styles.mealDetailsColumn}>
          {meal.foodName && (
            <Text style={[styles.mealFoodName, {color: colors.text}]}>
              {meal.foodName}
            </Text>
          )}
          <Text style={[styles.mealAmount, {color: colors.text}]}>{meal.amount}</Text>
          <Text style={[styles.mealCalories, {color: colors.text + '80'}]}>
            {meal.calories} calories
          </Text>
          {meal.notes && (
            <Text 
              style={[styles.mealNotes, {color: colors.text + '60'}]} 
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {meal.notes}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.mealActions}>
        <TouchableOpacity
          style={[styles.mealActionButton, {
            backgroundColor: meal.completed ? colors.success + '20' : colors.warning + '20'
          }]}
          onPress={() => toggleMealCompletion(meal.id, !meal.completed)}
        >
          <Ionicons 
            name={meal.completed ? "checkmark-circle" : "restaurant-outline"} 
            size={22} 
            color={meal.completed ? colors.success : colors.warning} 
          />
        </TouchableOpacity>
        
        {meal.id !== 'mock-meal' && (
          <TouchableOpacity
            style={[styles.mealActionButton, {
              backgroundColor: colors.error + '15',
              marginTop: 8
            }]}
            onPress={() => handleDeleteMeal(meal.id)}
          >
            <Ionicons 
              name="trash-outline" 
              size={22} 
              color={colors.error || '#ff3b30'} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ));

  // Update tab selection and load appropriate data
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    
    if (tab === 'inventory') {
      loadInventoryData();
    }
  }, [loadInventoryData]);

  // Function to check inventory and trigger alerts for low stock
  const checkInventoryAlerts = useCallback(async () => {
    try {
      if (!activePetId) return;
      
      // Get all food items and filter for low stock
      const allFoodItems = await unifiedDatabaseManager.foodItems.getAll();
      const lowStockItems = allFoodItems.filter(item => 
        item.petId === activePetId && 
        item.inventory && 
        item.inventory.daysRemaining <= 7
      );
      
      if (lowStockItems.length === 0) {
        // Show toast that no items are low in stock
        toast({
          title: 'No low stock items',
          description: 'All food items have adequate inventory levels'
        });
        return;
      }
      
      // Schedule alerts for each low stock item
      for (const item of lowStockItems) {
        await notificationService.scheduleInventoryAlert(item);
      }
      
      // Show toast with count of low stock items
      toast({
        title: `${lowStockItems.length} items low in stock`,
        description: 'Alerts have been scheduled for these items'
      });
    } catch (error) {
      console.error('Error checking inventory alerts:', error);
      toast({
        title: 'Error checking inventory',
        description: 'Failed to check inventory and schedule alerts',
        type: 'error'
      });
    }
  }, [activePetId, toast]);

  // Show confirmation dialog for food item deletion
  const handleDeleteFoodItem = useCallback((itemId: string) => {
    // Set up confirmation dialog
    setItemToDelete(itemId);
    setConfirmDialogType('food');
    setConfirmDialogVisible(true);
  }, []);
  
  // Actual food item deletion function
  const confirmDeleteFoodItem = useCallback(async () => {
    try {
      if (!itemToDelete) return;
      
      // Delete from database
      await unifiedDatabaseManager.foodItems.delete(itemToDelete);
      
                // Refresh the inventory list
                loadInventoryData();
      
                // Show success toast
                toast({
                  title: "Food item deleted",
                  description: "The food item has been removed from inventory"
                });
              } catch (error) {
                console.error('Error deleting food item:', error);
                toast({
                  title: "Error",
        description: "Failed to delete food item"
      });
    } finally {
      // Reset state
      setConfirmDialogVisible(false);
      setItemToDelete('');
    }
  }, [itemToDelete, loadInventoryData, toast]);

  // Return UI
  if (!activePetId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopNavBar title="Feeding" />
        <View style={styles.centerMessage}>
          <Text style={[styles.messageText, { color: colors.text }]}>
            Please select a pet to view feeding information
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar title="Feeding" />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'today' && [styles.activeTab, {borderBottomColor: colors.primary}]
          ]}
          onPress={() => handleTabChange('today')}
        >
          <Ionicons 
            name="today-outline" 
            size={20} 
            color={activeTab === 'today' ? colors.primary : colors.text + '80'} 
          />
          <Text 
            style={[
              styles.tabText, 
              {color: activeTab === 'today' ? colors.primary : colors.text + '80'}
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'inventory' && [styles.activeTab, {borderBottomColor: colors.primary}]
          ]}
          onPress={() => handleTabChange('inventory')}
        >
          <Ionicons 
            name="nutrition-outline" 
            size={20} 
            color={activeTab === 'inventory' ? colors.primary : colors.text + '80'} 
          />
          <Text 
            style={[
              styles.tabText, 
              {color: activeTab === 'inventory' ? colors.primary : colors.text + '80'}
            ]}
          >
            Inventory
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Main content based on active tab */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.text}]}>Loading data...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'today' && (
            <>
              {/* Summary card  */}
              <LinearGradient
                colors={[colors.primary + '20', colors.background]}
                style={styles.summaryCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              >
                <View style={styles.summaryContent}>
                  <View style={styles.summaryLeft}>
                    <Text style={[styles.todayText, {color: colors.text}]}>
                      {format(new Date(), 'EEEE, MMMM d')}
                    </Text>
                    <Text style={[styles.caloriesText, {color: colors.text}]}>
                      {totalCaloriesToday} <Text style={{fontSize: 16, color: colors.text + '80'}}>calories today</Text>
                    </Text>
                    <Text style={[styles.remainingText, {color: colors.text + '80'}]}>
                      {todayMeals.filter(m => !m.completed).length} meals remaining
                    </Text>
                  </View>
                  
                  <View style={styles.summaryRight}>
                    <TouchableOpacity 
                      style={[
                        createResponsiveButtonStyle('primary', 'medium'),
                        { backgroundColor: colors.primary }
                      ]}
                      onPress={() => navigation.navigate('AddMeal', { petId: activePetId || undefined })}
                    >
                      <Ionicons name="add" size={24} color="white" />
                      <ButtonText style={{ color: 'white', marginLeft: 8 }}>Log Meal</ButtonText>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
              
              {/* Today's meals section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, {color: colors.text}]}>Today's Meals</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('AddMeal', { petId: activePetId || undefined })}>
                    <Text style={[styles.sectionLink, {color: colors.primary}]}>Add Meal</Text>
                  </TouchableOpacity>
                </View>
                
                {todayMeals.length > 0 ? (
                  todayMeals.map(meal => <MealCard key={meal.id} meal={meal} />)
                ) : (
                  <EmptyState />
                )}
              </View>
              
              {/* Nutrition tips section */}
              <View style={[styles.tipsContainer, {backgroundColor: colors.card}]}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb-outline" size={24} color={colors.primary} />
                  <Text style={[styles.tipsTitle, {color: colors.text}]}>Feeding Tips</Text>
                </View>
                
                <Text style={[styles.tipText, {color: colors.text + '80'}]}>
                  • Feed your pet at the same time each day to establish routine
                </Text>
                <Text style={[styles.tipText, {color: colors.text + '80'}]}>
                  • Measure portions to prevent overfeeding
                </Text>
                <Text style={[styles.tipText, {color: colors.text + '80'}]}>
                  • Ensure fresh water is always available
                </Text>
                
                <TouchableOpacity style={[styles.learnMoreButton, {borderColor: colors.border}]}>
                  <Text style={[styles.learnMoreText, {color: colors.primary}]}>Learn More</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              {/* Inventory Header */}
              <View style={styles.inventoryHeader}>
                <Text style={[styles.inventoryTitle, {color: colors.text}]}>
                  Food Inventory
                </Text>
                <View style={styles.tabActions}>
                  <TouchableOpacity 
                    style={[styles.iconButton, {backgroundColor: colors.card}]}
                    onPress={() => navigation.navigate('AddFoodItem', { petId: activePetId })}
                  >
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  
                  {/* Debug button for Supabase verification */}
                  <TouchableOpacity 
                    style={[styles.iconButton, {backgroundColor: colors.card, marginLeft: 8}]}
                    onPress={async () => {
                      try {
                        // Call the debug method to check Supabase directly
                        const result = await unifiedDatabaseManager.foodItems.debugSupabaseTable();
                        toast({
                          title: 'Supabase Data Check',
                          description: `Found ${result.data?.length || 0} items. Check console for details.`
                        });
                      } catch (error) {
                        console.error('Debug button error:', error);
                        toast({
                          title: 'Debug Error',
                          description: 'Failed to check Supabase data',
                          type: 'error'
                        });
                      }
                    }}
                  >
                    <Ionicons name="bug" size={22} color={colors.warning} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Search Bar */}
              <View style={[styles.searchContainer, {backgroundColor: colors.background}]}>
                <Ionicons name="search" size={20} color={colors.text + '60'} />
                <TextInput
                  style={[styles.searchInput, {color: colors.text}]}
                  placeholder="Search inventory..."
                  placeholderTextColor={colors.text + '60'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              
              {/* Inventory Items */}
              {foodInventory.length > 0 ? (
                foodInventory.map((item) => (
                  <View key={item.id} style={[styles.inventoryItem, {backgroundColor: colors.card}]}>
                    <TouchableOpacity 
                      style={styles.inventoryItemMainContent}
                      onPress={() => navigation.navigate('AddFoodItem', { 
                          petId: activePetId || undefined,
                          itemId: item.id 
                      })}
                    >
                      <View style={styles.inventoryItemHeader}>
                        <Text style={[styles.inventoryItemName, {color: colors.text}]}>{item.name}</Text>
                        <Text style={[styles.inventoryItemBrand, {color: colors.text + '80'}]}>
                          {item.brand}
                        </Text>
                      </View>
                    
                      <View style={styles.inventoryItemGrid}>
                        <View style={styles.inventoryItemGridColumn}>
                          <Text style={[styles.inventoryItemLabel, {color: colors.text + '80'}]}>Current Amount</Text>
                          <Text style={[styles.inventoryItemValue, {color: colors.text}]}>
                            {item.inventory?.currentAmount ?? item.current_amount ?? 0} {item.inventory?.unit ?? item.unit ?? 'kg'}
                          </Text>
                        </View>
                        
                        <View style={styles.inventoryItemGridColumn}>
                          <Text style={[styles.inventoryItemLabel, {color: colors.text + '80'}]}>Daily Feeding</Text>
                          <Text style={[styles.inventoryItemValue, {color: colors.text}]}>
                            {item.inventory?.dailyFeedingAmount ?? item.daily_feeding_amount ?? 0} {item.inventory?.dailyFeedingUnit ?? item.daily_feeding_unit ?? 'g'}
                          </Text>
                        </View>
                        
                        <View style={styles.inventoryItemGridColumn}>
                          <Text style={[styles.inventoryItemLabel, {color: colors.text + '80'}]}>Days Left</Text>
                          <Text style={[
                            styles.inventoryItemValue, 
                            {
                              color: (item.inventory?.daysRemaining ?? item.days_remaining ?? 0) <= 7 
                                ? colors.warning 
                                : colors.success,
                              fontWeight: '600'
                            }
                          ]}>
                            {item.inventory?.daysRemaining ?? item.days_remaining ?? 0}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.inventoryItemActions}>
                      <TouchableOpacity
                        style={[styles.inventoryItemActionButton, {backgroundColor: colors.error + '15'}]}
                        onPress={() => handleDeleteFoodItem(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.inventoryItemActionButton, {backgroundColor: colors.primary + '15'}]}
                        onPress={() => navigation.navigate('AddFoodItem', { 
                            petId: activePetId || undefined,
                            itemId: item.id 
                        })}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    {(item.inventory?.daysRemaining ?? item.days_remaining ?? 0) <= 7 && (
                      <View style={[styles.lowStockAlert, {backgroundColor: colors.warning + '15'}]}>
                        <Ionicons name="alert-circle" size={16} color={colors.warning} />
                        <Text style={[styles.lowStockText, {color: colors.warning, flex: 1}]}>
                          Low Stock - Consider Reordering Soon
                        </Text>
                        <TouchableOpacity
                          style={[styles.reorderButton, {backgroundColor: colors.warning}]}
                        >
                          <Text style={styles.reorderButtonText}>Reorder</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyInventoryContainer}>
                  <Ionicons name="basket-outline" size={60} color={colors.text + '40'} />
                  <Text style={[styles.emptyInventoryText, {color: colors.text}]}>
                    No food items in inventory
                  </Text>
                  <TouchableOpacity 
                    style={[styles.addFirstItemButton, {backgroundColor: colors.primary}]}
                    onPress={() => navigation.navigate('AddFoodItem', { petId: activePetId || undefined })}
                  >
                    <Text style={styles.addFirstItemText}>Add First Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
      
      {/* Add Footer component */}
      <Footer />
      
      {/* Custom Confirmation Dialog */}
      <ConfirmationDialog
        visible={confirmDialogVisible}
        title={confirmDialogType === 'meal' ? 'Delete Meal' : 'Delete Food Item'}
        message={confirmDialogType === 'meal' 
          ? 'Are you sure you want to delete this meal? This action cannot be undone.'
          : 'Are you sure you want to delete this food item? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmType="danger"
        icon={confirmDialogType === 'meal' ? 'restaurant-outline' : 'nutrition-outline'}
        onConfirm={confirmDialogType === 'meal' ? confirmDeleteMeal : confirmDeleteFoodItem}
        onCancel={() => {
          setConfirmDialogVisible(false);
          setItemToDelete('');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    marginBottom: 20,
    padding: 16,
    overflow: 'hidden',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  todayText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  caloriesText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 14,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addMealText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  mealCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealStatusIndicator: {
    width: 6,
    height: '100%',
  },
  mealCardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  mealTimeColumn: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealTime: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealTypeTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealDetailsColumn: {
    flex: 1,
    padding: 12,
  },
  mealFoodName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  mealCalories: {
    fontSize: 14,
    marginBottom: 2,
  },
  mealNotes: {
    fontSize: 13,
  },
  mealActions: {
    padding: 8,
    justifyContent: 'center',
  },
  mealActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  tabContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  placeholderText: {
    fontSize: 16,
  },
  historyFilters: {
    marginBottom: 16,
  },
  historyFilterLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  periodButtonsContainer: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    height: 250,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  chartContent: {
    flex: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    position: 'relative',
  },
  chartGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingTop: '18%',
  },
  chartGridLine: {
    width: '100%',
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  chartYAxis: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chartYLabel: {
    fontSize: 12,
    transform: [{ rotate: '-90deg' }],
    width: 80,
    textAlign: 'center',
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    height: '90%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  chartBarContainer: {
    width: '60%',
    minHeight: 4,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartBar: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  chartTooltip: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  chartTooltipText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  historyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  historyFilterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  historyItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyMealDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyMealType: {
    fontSize: 14,
  },
  historyMealTime: {
    fontSize: 12,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyCalories: {
    fontSize: 14,
    marginBottom: 8,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  historyBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  noHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noHistoryText: {
    fontSize: 16,
    marginTop: 16,
  },
  createHistoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createHistoryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 30,
  },
  analyticsButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inventoryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tabActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  inventoryItem: {
    flexDirection: 'column',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  inventoryItemMainContent: {
    flexDirection: 'column',
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inventoryItemBrand: {
    fontSize: 14,
  },
  inventoryItemGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryItemGridColumn: {
    flexDirection: 'column',
  },
  inventoryItemLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  inventoryItemValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  lowStockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  lowStockText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  reorderButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reorderButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyInventoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyInventoryText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  addFirstItemButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addFirstItemText: {
    color: 'white',
    fontWeight: '600',
  },
  metricsSummary: {
    flexDirection: 'row',
    borderRadius: 12,
    marginVertical: 8,
    paddingVertical: 12,
  },
  metricSummaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  inventoryItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  inventoryItemActionButton: {
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 4
  },
  metricSummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSummaryLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  metricSummarySubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default React.memo(Feeding); 