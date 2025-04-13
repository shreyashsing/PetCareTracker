import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  TextInput,
  Switch
} from 'react-native';
import { useActivePet } from '../hooks/useActivePet';
import { format } from 'date-fns';
import { TopNavBar } from '../components';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Meal, FoodItem, Pet } from '../types/components';
import { databaseManager } from '../services/db';
import { useFocusEffect } from '@react-navigation/native';
import Footer from '../components/layout/Footer';

type FeedingScreenProps = NativeStackScreenProps<RootStackParamList, 'Feeding'>;

// Simple meal type for display purposes
interface SimpleMeal {
  id: string;
  title: string;
  time: string;
  amount: string;
  calories: number;
  completed: boolean;
  notes?: string;
}

type TabType = 'today' | 'history' | 'inventory';

const Feeding: React.FC<FeedingScreenProps> = ({ navigation, route }) => {
  const { activePetId } = useActivePet();
  const { colors } = useAppColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayMeals, setTodayMeals] = useState<SimpleMeal[]>([]);
  const [recentMeals, setRecentMeals] = useState<SimpleMeal[]>([]);
  const [totalCaloriesToday, setTotalCaloriesToday] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [historyPeriod, setHistoryPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [chartData, setChartData] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [historyMeals, setHistoryMeals] = useState<SimpleMeal[]>([]);
  const [foodInventory, setFoodInventory] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    avgCalories: 0,
    maxCalories: 0,
    trendPercentage: 0,
    mealsCount: 0,
    completedMealsCount: 0,
    completionRate: 0
  });

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
    };
    
    setTodayMeals([mockMeal]);
  }, []);

  // Function to format meal data for display
  const formatMealForDisplay = useCallback((meal: Meal): SimpleMeal => {
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
    if (meal.amount) {
      amountDisplay = String(meal.amount);
    } else if (meal.foods && Array.isArray(meal.foods) && meal.foods.length > 0 && meal.foods[0]) {
      const firstFood = meal.foods[0];
      amountDisplay = `${firstFood.amount || 0} ${firstFood.unit || 'cups'}`;
    }
    
    return {
      id: meal.id || 'unknown',
      title: meal.type ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : 'Unknown',
      time: timeDisplay,
      amount: amountDisplay,
      calories: meal.totalCalories || meal.calories || 0,
      completed: meal.completed || false,
      notes: meal.notes || undefined,
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
      
      // Fetch all meals for active pet
      const allMeals = await databaseManager.meals.getByPetId(activePetId);
      
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
      
      // Format meals for display
      const formattedMeals = mealsToday.map(formatMealForDisplay);
      
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
      
      // Format recent meals
      const formattedRecentMeals = recentMealsData
        .map(formatMealForDisplay)
        .sort((a, b) => b.time.localeCompare(a.time)); // Most recent first
      
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

  // Toggle meal completion status
  const toggleMealCompletion = useCallback(async (mealId: string, isCompleted: boolean) => {
    try {
      if (mealId === 'mock-meal') return; // Don't process mock meal
      
      if (isCompleted) {
        await databaseManager.meals.markAsCompleted(mealId);
      } else {
        const meal = await databaseManager.meals.getById(mealId);
        if (meal) {
          await databaseManager.meals.update(mealId, { ...meal, completed: false });
        }
      }
      
      // Refresh meals
      loadMeals();
    } catch (error) {
      console.error('Error toggling meal completion:', error);
    }
  }, [loadMeals]);

  // Reload meals data when screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals, route.params?.refresh])
  );

  // Calculate metrics based on meal data
  const calculateMetrics = useCallback(
    (dataPoints: number[], meals: Meal[], period: 'week' | 'month' | 'year') => {
      // Average calories per day/week/month
      const avgCalories = Math.round(dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.filter(val => val > 0).length || 1);
      
      // Maximum calories in a day/week/month
      const maxCalories = Math.max(...dataPoints);
      
      // Calculate trend percentage
      let trendPercentage = 0;
      
      if (dataPoints.length > 1) {
        // For simplicity, compare first half to second half
        const halfIndex = Math.floor(dataPoints.length / 2);
        const firstHalfSum = dataPoints.slice(0, halfIndex).reduce((sum, val) => sum + val, 0) || 1;
        const secondHalfSum = dataPoints.slice(halfIndex).reduce((sum, val) => sum + val, 0);
        
        trendPercentage = Math.round((secondHalfSum - firstHalfSum) / firstHalfSum * 100);
      }
      
      // Total meals in period
      let mealsCount = 0;
      let completedMealsCount = 0;
      
      // Get time period boundaries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let periodStartDate: Date;
      
      if (period === 'week') {
        periodStartDate = new Date(today);
        periodStartDate.setDate(today.getDate() - 6);
      } else if (period === 'month') {
        periodStartDate = new Date(today);
        periodStartDate.setMonth(today.getMonth() - 1);
      } else {
        periodStartDate = new Date(today);
        periodStartDate.setFullYear(today.getFullYear() - 1);
      }
      
      meals.forEach(meal => {
        if (!meal.date) return;
        
        try {
          const mealDate = new Date(meal.date);
          
          // Skip invalid dates
          if (isNaN(mealDate.getTime())) {
            console.log('Skip invalid date in metrics calculation:', meal.date);
            return;
          }
          
          mealDate.setHours(0, 0, 0, 0);
          
          if (mealDate >= periodStartDate && mealDate <= today) {
            mealsCount++;
            if (meal.completed) {
              completedMealsCount++;
            }
          }
        } catch (e) {
          console.error('Error processing meal date for metrics:', e, 'Meal date was:', meal.date);
        }
      });
      
      const completionRate = mealsCount > 0 ? Math.round((completedMealsCount / mealsCount) * 100) : 0;
      
      setMetrics({
        avgCalories,
        maxCalories,
        trendPercentage,
        mealsCount,
        completedMealsCount,
        completionRate
      });
    },
    []
  );
  
  // Generate chart data based on meals and selected period
  const generateChartData = useCallback((meals: Meal[], period: 'week' | 'month' | 'year') => {
    console.log('Generating chart data for period:', period, 'with meals count:', meals.length);
    
    // If no meals, set empty data and return
    if (!meals.length) {
      setChartLabels([]);
      setChartData([]);
      setMetrics({
        avgCalories: 0,
        maxCalories: 0,
        trendPercentage: 0,
        mealsCount: 0,
        completedMealsCount: 0,
        completionRate: 0
      });
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let labels: string[] = [];
    let datasets: number[] = [];
    
    if (period === 'week') {
      // Daily data for the past week
      labels = Array(7).fill(0).map((_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return format(date, 'EEE');
      });
      
      datasets = Array(7).fill(0);
      
      // Check if meal date is within the past 7 days
      meals.forEach(meal => {
        if (!meal.date) return;
        
        try {
          const mealDate = new Date(meal.date);
          
          // Skip invalid dates
          if (isNaN(mealDate.getTime())) {
            console.log('Skip invalid date in chart data:', meal.date);
            return;
          }
          
          mealDate.setHours(0, 0, 0, 0);
          
          // Check if meal date is within the past 7 days
          if (mealDate >= new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) && mealDate <= today) {
            // Calculate day index (0-6) relative to today
            const dayDiff = Math.floor((today.getTime() - mealDate.getTime()) / (24 * 60 * 60 * 1000));
            const reverseIndex = 6 - dayDiff;
            
            console.log('Adding meal for day:', labels[reverseIndex], 'calories:', meal.totalCalories || meal.calories || 0);
            
            // Add meal calories to the appropriate day
            if (reverseIndex >= 0 && reverseIndex < 7) {
              datasets[reverseIndex] += meal.totalCalories || meal.calories || 0;
            }
          }
        } catch (e) {
          console.error('Error processing meal date for chart:', e, 'Meal date was:', meal.date);
        }
      });
      
    } else if (period === 'month') {
      // Weekly data for the past month
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      datasets = [0, 0, 0, 0];
      
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      meals.forEach(meal => {
        if (!meal.date) return;
        
        try {
          const mealDate = new Date(meal.date);
          
          // Skip invalid dates
          if (isNaN(mealDate.getTime())) {
            console.log('Skip invalid date in month chart:', meal.date);
            return;
          }
          
          mealDate.setHours(0, 0, 0, 0);
          
          // Check if meal date is within the past month
          if (mealDate >= oneMonthAgo && mealDate <= today) {
            // Calculate which week the meal belongs to (0-3)
            const daysSinceMonthStart = Math.floor((today.getTime() - mealDate.getTime()) / (24 * 60 * 60 * 1000));
            const weekIndex = Math.min(3, Math.floor(daysSinceMonthStart / 7));
            
            console.log('Adding meal for week:', labels[3 - weekIndex], 'calories:', meal.totalCalories || meal.calories || 0);
            
            // Add meal calories to the appropriate week (reversed for display)
            datasets[3 - weekIndex] += meal.totalCalories || meal.calories || 0;
          }
        } catch (e) {
          console.error('Error processing meal date for month chart:', e, 'Meal date was:', meal.date);
        }
      });
      
    } else if (period === 'year') {
      // Monthly data for the past year
      labels = Array(6).fill(0).map((_, index) => {
        const date = new Date(today);
        date.setMonth(today.getMonth() - (5 - index));
        return format(date, 'MMM');
      });
      
      datasets = Array(6).fill(0);
      
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      
      meals.forEach(meal => {
        if (!meal.date) return;
        
        try {
          const mealDate = new Date(meal.date);
          
          // Skip invalid dates
          if (isNaN(mealDate.getTime())) {
            console.log('Skip invalid date in year chart:', meal.date);
            return;
          }
          
          mealDate.setHours(0, 0, 0, 0);
          
          // Only consider the last 6 months for the chart
          const sixMonthsAgo = new Date(today);
          sixMonthsAgo.setMonth(today.getMonth() - 5);
          
          // Check if meal date is within the past 6 months
          if (mealDate >= sixMonthsAgo && mealDate <= today) {
            // Calculate month difference
            const monthDiff = (today.getMonth() - mealDate.getMonth() + 12) % 12;
            
            // Only consider the last 6 months
            if (monthDiff < 6) {
              // Add meal calories to the appropriate month (reversed for display)
              const reverseIndex = 5 - monthDiff;
              console.log('Adding meal for month:', labels[reverseIndex], 'calories:', meal.totalCalories || meal.calories || 0);
              datasets[reverseIndex] += meal.totalCalories || meal.calories || 0;
            }
          }
        } catch (e) {
          console.error('Error processing meal date for year chart:', e, 'Meal date was:', meal.date);
        }
      });
    }
    
    console.log('Chart data:', datasets);
    setChartLabels(labels);
    setChartData(datasets);
    
    // Calculate metrics
    calculateMetrics(datasets, meals, period);
    
  }, [calculateMetrics]);

  // Function to convert date string to relative description
  const getRelativeDateString = (dateString: string): string => {
    if (!dateString) return 'Unknown date';
    
    try {
      // Check if dateString is in a valid format before parsing
      if (!/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        console.log('Invalid date format in ID:', dateString);
        return 'Unknown date';
      }
      
      const mealDate = new Date(dateString);
      
      // Validate that the parsed date is valid
      if (isNaN(mealDate.getTime())) {
        console.log('Invalid date value after parsing:', dateString);
        return 'Unknown date';
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Store the time before setting hours to 0
      const mealDateTime = new Date(mealDate).setHours(0, 0, 0, 0);
      
      if (mealDateTime === today.getTime()) {
        return 'Today';
      } else if (mealDateTime === yesterday.getTime()) {
        return 'Yesterday';
      } else if (mealDateTime === twoDaysAgo.getTime()) {
        return '2 days ago';
      } else if (mealDateTime === threeDaysAgo.getTime()) {
        return '3 days ago';
      } else {
        return format(new Date(mealDateTime), 'MMM d, yyyy');
      }
    } catch (e) {
      console.error('Error parsing date:', e, 'Value was:', dateString);
      return 'Unknown date';
    }
  };

  // Function to get meal date from various possible sources
  const getMealDate = useCallback((meal: Meal | SimpleMeal): string => {
    try {
      // First try to extract from meal notes (might contain date info)
      if (meal.notes) {
        // Look for date in format YYYY-MM-DD
        const dateMatch = meal.notes.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1]) {
          return getRelativeDateString(dateMatch[1]);
        }
      }
      
      // Then try to extract from ID (format: YYYY-MM-DD-UUID or similar)
      if (meal.id && meal.id.includes('-')) {
        const parts = meal.id.split('-');
        if (parts.length >= 3) {
          // Check if first part looks like a year (4 digits)
          if (/^\d{4}$/.test(parts[0])) {
            // Try to form a date string YYYY-MM-DD
            const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return getRelativeDateString(dateStr);
            }
          }
          
          // Special format: First 10 chars might be the date (YYYY-MM-DD)
          const possibleDate = meal.id.substring(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(possibleDate)) {
            return getRelativeDateString(possibleDate);
          }
        }
      }
      
      // Fallback - use created date if available
      return "Recent meal";
    } catch (e) {
      console.error('Error extracting meal date:', e, 'Meal:', meal.id);
      return "Recent meal";
    }
  }, [getRelativeDateString]);

  // Load history data
  const loadHistoryData = useCallback(async () => {
    if (!activePetId) {
      console.log('No active pet ID available for loadHistoryData');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading history data for period:', historyPeriod, 'and pet ID:', activePetId);
      
      // Fetch all meals for the active pet
      const allMeals = await databaseManager.meals.getByPetId(activePetId);
      console.log('Fetched meals count:', allMeals.length);
      
      // Debug meal data
      if (allMeals.length > 0) {
        console.log('First meal sample:', JSON.stringify({
          id: allMeals[0].id,
          date: allMeals[0].date,
          time: allMeals[0].time,
          type: allMeals[0].type
        }));
      }
      
      // Get current date and calculate date ranges based on selected period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate start date based on selected period
      let startDate = new Date(today);
      if (historyPeriod === 'week') {
        startDate.setDate(today.getDate() - 7);
      } else if (historyPeriod === 'month') {
        startDate.setMonth(today.getMonth() - 1);
      } else if (historyPeriod === 'year') {
        startDate.setFullYear(today.getFullYear() - 1);
      }
      
      // Filter meals within the selected period
      const mealsInPeriod = allMeals.filter(meal => {
        if (!meal.date) return false;
        
        try {
          const mealDate = new Date(meal.date);
          
          // Skip invalid dates
          if (isNaN(mealDate.getTime())) {
            console.log('Skip invalid date in meal filtering:', meal.date);
            return false;
          }
          
          return mealDate >= startDate && mealDate <= today;
        } catch (e) {
          console.error('Error filtering meal date:', e, 'Meal date was:', meal.date);
          return false;
        }
      });
      
      console.log('Meals in selected period:', mealsInPeriod.length);
      
      // Format the meals for display
      const formattedMeals = mealsInPeriod
        .map(formatMealForDisplay)
        .sort((a, b) => {
          // Sort by date, most recent first
          try {
            // Try to extract date parts from ID (assuming format: YYYY-MM-DD-something)
            let dateA = new Date();
            let dateB = new Date();
            
            if (a.id && a.id.includes('-')) {
              const dateStringA = a.id.split('-')[0];
              if (/^\d{4}-\d{2}-\d{2}/.test(dateStringA)) {
                dateA = new Date(dateStringA);
                if (isNaN(dateA.getTime())) {
                  dateA = new Date(); // Fallback to current date
                }
              }
            }
            
            if (b.id && b.id.includes('-')) {
              const dateStringB = b.id.split('-')[0];
              if (/^\d{4}-\d{2}-\d{2}/.test(dateStringB)) {
                dateB = new Date(dateStringB);
                if (isNaN(dateB.getTime())) {
                  dateB = new Date(); // Fallback to current date
                }
              }
            }
            
            return dateB.getTime() - dateA.getTime();
          } catch (e) {
            console.error('Error sorting meals by date:', e);
            return 0; // Preserve original order if there's an error
          }
        });
      
      setHistoryMeals(formattedMeals);
      
      // Calculate chart data based on period
      generateChartData(allMeals, historyPeriod);
      
    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setLoading(false);
    }
  }, [activePetId, historyPeriod, formatMealForDisplay, generateChartData]);

  // Reload meals data when screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals, route.params?.refresh])
  );

  // Load inventory data
  const loadInventoryData = useCallback(async () => {
    if (!activePetId) return;
    
    try {
      // Fetch food items from database
      const inventory = await databaseManager.foodItems.getByPetId(activePetId);
      setFoodInventory(inventory);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    }
  }, [activePetId]);
  
  // Reload inventory data when screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'inventory') {
        loadInventoryData();
      }
    }, [loadInventoryData, route.params?.refresh, activeTab])
  );

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
  const EmptyState = () => (
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
        onPress={() => navigation.navigate({
          name: 'AddMeal',
          params: { petId: activePetId || undefined }
        })}
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text style={styles.buttonText}>Add First Meal</Text>
      </TouchableOpacity>
    </View>
  );

  // Meal card component
  const MealCard = ({ meal }: { meal: SimpleMeal }) => (
    <TouchableOpacity 
      style={[styles.mealCard, {backgroundColor: colors.card}]}
      onPress={() => navigation.navigate({
        name: 'AddMeal',
        params: { 
          petId: activePetId || undefined,
          mealId: meal.id !== 'mock-meal' ? meal.id : undefined 
        }
      })}
    >
      <View style={[styles.mealStatusIndicator, { 
        backgroundColor: meal.completed ? colors.success : colors.warning 
      }]} />
      
      <View style={styles.mealTimeColumn}>
        <Text style={[styles.mealTime, {color: colors.text}]}>{meal.time}</Text>
        <View style={[styles.mealTypeTag, {backgroundColor: colors.primary + '20'}]}>
          <Text style={[styles.mealTypeText, {color: colors.primary}]}>{meal.title}</Text>
        </View>
      </View>
      
      <View style={styles.mealDetailsColumn}>
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
      
      <TouchableOpacity
        style={[styles.mealStatusButton, {
          backgroundColor: meal.completed ? colors.success + '20' : colors.warning + '20'
        }]}
        onPress={() => toggleMealCompletion(meal.id, !meal.completed)}
      >
        <Ionicons 
          name={meal.completed ? "checkmark-circle" : "restaurant-outline"} 
          size={24} 
          color={meal.completed ? colors.success : colors.warning} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Recent meal row component
  const RecentMealRow = ({ meal }: { meal: SimpleMeal }) => (
    <TouchableOpacity 
      style={[styles.recentMealRow, {backgroundColor: colors.card}]}
      onPress={() => navigation.navigate({
        name: 'AddMeal',
        params: { 
          petId: activePetId || undefined,
          mealId: meal.id 
        }
      })}
    >
      <View style={styles.recentMealContent}>
        <View style={styles.recentMealHeader}>
          <Text style={[styles.recentMealTitle, {color: colors.text}]}>{meal.title}</Text>
          <Text style={[styles.recentMealTime, {color: colors.text + '80'}]}>{meal.time}</Text>
        </View>
        <Text style={[styles.recentMealDetail, {color: colors.text + '60'}]}>
          {meal.amount} • {meal.calories} calories
        </Text>
      </View>
      {meal.completed ? (
        <View style={[styles.completedBadge, {backgroundColor: colors.success + '20'}]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.completedText, {color: colors.success}]}>Fed</Text>
        </View>
      ) : (
        <View style={[styles.incompleteBadge, {backgroundColor: colors.warning + '20'}]}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={[styles.incompletedText, {color: colors.warning}]}>Missed</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Update tab selection and load appropriate data
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    
    if (tab === 'history') {
      loadHistoryData();
    } else if (tab === 'inventory') {
      loadInventoryData();
    }
  }, [loadHistoryData, loadInventoryData]);

  // Effect to reload data when history period changes
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [historyPeriod, loadHistoryData]);

  // Reload meals data when screen comes into focus or refresh param changes
  useFocusEffect(
    useCallback(() => {
      loadMeals();
      if (activeTab === 'history') {
        loadHistoryData();
      } else if (activeTab === 'inventory') {
        loadInventoryData();
      }
    }, [loadMeals, loadHistoryData, loadInventoryData, activeTab, route.params?.refresh])
  );

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
            activeTab === 'history' && [styles.activeTab, {borderBottomColor: colors.primary}]
          ]}
          onPress={() => handleTabChange('history')}
        >
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={activeTab === 'history' ? colors.primary : colors.text + '80'} 
          />
          <Text 
            style={[
              styles.tabText, 
              {color: activeTab === 'history' ? colors.primary : colors.text + '80'}
            ]}
          >
            History
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
                      style={[styles.addMealButton, {backgroundColor: colors.primary}]}
                      onPress={() => navigation.navigate({
                        name: 'AddMeal',
                        params: { petId: activePetId || undefined }
                      })}
                    >
                      <Ionicons name="add" size={24} color="white" />
                      <Text style={styles.addMealText}>Log Meal</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
              
              {/* Today's meals section */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, {color: colors.text}]}>Today's Meals</Text>
                  <TouchableOpacity onPress={() => navigation.navigate({
                    name: 'AddMeal',
                    params: { petId: activePetId || undefined }
                  })}>
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

          {activeTab === 'history' && (
            <>
              <View style={styles.historyFilters}>
                <Text style={[styles.historyFilterLabel, {color: colors.text}]}>Time period:</Text>
                <View style={styles.periodButtonsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      historyPeriod === 'week' && {backgroundColor: colors.primary},
                      historyPeriod !== 'week' && {backgroundColor: colors.card}
                    ]}
                    onPress={() => setHistoryPeriod('week')}
                  >
                    <Text style={[
                      styles.periodButtonText, 
                      {color: historyPeriod === 'week' ? 'white' : colors.text}
                    ]}>Week</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      historyPeriod === 'month' && {backgroundColor: colors.primary},
                      historyPeriod !== 'month' && {backgroundColor: colors.card}
                    ]}
                    onPress={() => setHistoryPeriod('month')}
                  >
                    <Text style={[
                      styles.periodButtonText, 
                      {color: historyPeriod === 'month' ? 'white' : colors.text}
                    ]}>Month</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.periodButton, 
                      historyPeriod === 'year' && {backgroundColor: colors.primary},
                      historyPeriod !== 'year' && {backgroundColor: colors.card}
                    ]}
                    onPress={() => setHistoryPeriod('year')}
                  >
                    <Text style={[
                      styles.periodButtonText, 
                      {color: historyPeriod === 'year' ? 'white' : colors.text}
                    ]}>Year</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Analytics Card */}
              <View style={[styles.analyticsCard, {backgroundColor: colors.card}]}>
                <Text style={[styles.analyticsTitle, {color: colors.text}]}>
                  {historyPeriod === 'week' ? 'Weekly' : 
                   historyPeriod === 'month' ? 'Monthly' : 'Yearly'} Feeding Summary
                </Text>
                
                {/* Calorie Metrics */}
                <View style={styles.metricsSummary}>
                  <View style={[styles.metricSummaryItem, {borderRightWidth: 1, borderRightColor: colors.border}]}>
                    <Text style={[styles.metricSummaryValue, {color: colors.primary}]}>
                      {metrics.avgCalories}
                    </Text>
                    <Text style={[styles.metricSummaryLabel, {color: colors.text}]}>
                      Avg. Calories
                    </Text>
                    <Text style={[styles.metricSummarySubtext, {color: colors.text + '60'}]}>
                      {historyPeriod === 'week' ? 'per day' : 
                      historyPeriod === 'month' ? 'per week' : 'per month'}
                    </Text>
                  </View>
                  
                  <View style={styles.metricSummaryItem}>
                    <Text style={[styles.metricSummaryValue, {color: colors.primary}]}>
                      {metrics.completionRate}%
                    </Text>
                    <Text style={[styles.metricSummaryLabel, {color: colors.text}]}>
                      Completion Rate
                    </Text>
                    <Text style={[styles.metricSummarySubtext, {color: colors.text + '60'}]}>
                      {metrics.completedMealsCount}/{metrics.mealsCount} meals completed
                    </Text>
                  </View>
                </View>
                
                {/* Simple Chart Visualization */}
                <View style={styles.chartContainer}>
                  <View style={styles.chartYAxis}>
                    <Text style={[styles.chartYLabel, {color: colors.text + '60'}]}>Calories</Text>
                  </View>
                  <View style={styles.chartContent}>
                    {chartData.map((value, index) => (
                      <View key={index} style={styles.chartColumn}>
                        <View 
                          style={[
                            styles.chartBar, 
                            {
                              height: `${(value / (Math.max(...chartData) || 1)) * 80}%`,
                              backgroundColor: colors.primary
                            }
                          ]} 
                        />
                        <Text style={[styles.chartLabel, {color: colors.text + '80'}]}>
                          {chartLabels[index]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={styles.metricsContainer}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, {color: colors.text}]}>
                      {metrics.maxCalories}
                    </Text>
                    <Text style={[styles.metricLabel, {color: colors.text + '80'}]}>
                      Max Calories
                    </Text>
                  </View>
                  
                  <View style={styles.metricItem}>
                    <Text style={[
                      styles.metricValue, 
                      {color: metrics.trendPercentage >= 0 ? colors.success : colors.warning}
                    ]}>
                      {metrics.trendPercentage > 0 ? '+' : ''}{metrics.trendPercentage}%
                    </Text>
                    <Text style={[styles.metricLabel, {color: colors.text + '80'}]}>
                      Trend
                    </Text>
                  </View>
                  
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, {color: colors.text}]}>
                      {metrics.mealsCount}
                    </Text>
                    <Text style={[styles.metricLabel, {color: colors.text + '80'}]}>
                      Total Meals
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* History Records */}
              <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyTitle, {color: colors.text}]}>
                    Feeding History
                  </Text>
                  
                  <TouchableOpacity style={styles.historyFilterButton}>
                    <Ionicons name="options-outline" size={18} color={colors.primary} />
                    <Text style={[styles.historyFilterButtonText, {color: colors.primary}]}>Filter</Text>
                  </TouchableOpacity>
                </View>
                
                {historyMeals.length > 0 ? (
                  historyMeals.map((meal, index) => {
                    // Safely extract date from meal ID
                    let dateString = 'Unknown date';
                    try {
                      if (meal.id && meal.id.includes('-')) {
                        dateString = getMealDate(meal);
                      } else {
                        dateString = `Meal ${index + 1}`;
                      }
                    } catch (e) {
                      console.error('Error processing meal ID:', e);
                      dateString = `Meal ${index + 1}`;
                    }
                    
                    return (
                      <View key={meal.id || index} style={[styles.historyItem, {backgroundColor: colors.card}]}>
                        <View style={styles.historyItemLeft}>
                          <Text style={[styles.historyDate, {color: colors.text}]}>
                            {dateString}
                          </Text>
                          <View style={styles.historyMealDetails}>
                            <Text style={[styles.historyMealType, {color: colors.text + '80'}]}>
                              {meal.title}
                            </Text>
                            <Text style={[styles.historyMealTime, {color: colors.text + '60'}]}>
                              {meal.time}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.historyItemRight}>
                          <Text style={[styles.historyAmount, {color: colors.text}]}>
                            {meal.amount}
                          </Text>
                          <Text style={[styles.historyCalories, {color: colors.text + '80'}]}>
                            {meal.calories} calories
                          </Text>
                          {meal.completed ? (
                            <View style={[styles.historyBadge, {backgroundColor: colors.success + '20'}]}>
                              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                              <Text style={[styles.historyBadgeText, {color: colors.success}]}>
                                Completed
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.historyBadge, {backgroundColor: colors.warning + '20'}]}>
                              <Ionicons name="close-circle" size={12} color={colors.warning} />
                              <Text style={[styles.historyBadgeText, {color: colors.warning}]}>
                                Missed
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.noHistoryContainer}>
                    <Ionicons name="time-outline" size={60} color={colors.text + '40'} />
                    <Text style={[styles.noHistoryText, {color: colors.text}]}>
                      No feeding history for this period
                    </Text>
                    <TouchableOpacity 
                      style={[styles.createHistoryButton, {backgroundColor: colors.primary}]}
                      onPress={() => navigation.navigate({
                        name: 'AddMeal',
                        params: { petId: activePetId || undefined }
                      })}
                    >
                      <Text style={styles.createHistoryButtonText}>Add Meal</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              {/* Analytics Button */}
              {historyMeals.length > 0 && (
                <TouchableOpacity 
                  style={[styles.analyticsButton, {backgroundColor: colors.primary}]}
                  onPress={() => navigation.navigate({
                    name: 'FullAnalytics',
                    params: { petId: activePetId || undefined }
                  })}
                >
                  <Ionicons name="analytics-outline" size={20} color="white" />
                  <Text style={styles.analyticsButtonText}>
                    View Detailed Analytics
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {activeTab === 'inventory' && (
            <>
              {/* Inventory Header */}
              <View style={styles.inventoryHeader}>
                <Text style={[styles.inventoryTitle, {color: colors.text}]}>
                  Food Inventory
                </Text>
                <TouchableOpacity
                  style={[styles.addInventoryButton, {backgroundColor: colors.primary}]}
                  onPress={() => navigation.navigate({
                    name: 'AddFoodItem',
                    params: { petId: activePetId || undefined }
                  })}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addInventoryText}>Add Item</Text>
                </TouchableOpacity>
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
                  <TouchableOpacity 
                    key={item.id}
                    style={[styles.inventoryItem, {backgroundColor: colors.card}]}
                    onPress={() => navigation.navigate({
                      name: 'AddFoodItem',
                      params: { 
                        petId: activePetId || undefined,
                        itemId: item.id 
                      }
                    })}
                  >
                    <View style={styles.inventoryItemMainContent}>
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
                            {item.inventory.currentAmount} {item.inventory.unit}
                          </Text>
                        </View>
                        
                        <View style={styles.inventoryItemGridColumn}>
                          <Text style={[styles.inventoryItemLabel, {color: colors.text + '80'}]}>Daily Feeding</Text>
                          <Text style={[styles.inventoryItemValue, {color: colors.text}]}>
                            {item.inventory.dailyFeedingAmount} {item.inventory.dailyFeedingUnit}
                          </Text>
                        </View>
                        
                        <View style={styles.inventoryItemGridColumn}>
                          <Text style={[styles.inventoryItemLabel, {color: colors.text + '80'}]}>Days Left</Text>
                          <Text style={[
                            styles.inventoryItemValue, 
                            {
                              color: item.inventory.daysRemaining <= 7 
                                ? colors.warning 
                                : colors.success,
                              fontWeight: '600'
                            }
                          ]}>
                            {item.inventory.daysRemaining}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {item.inventory.daysRemaining <= 7 && (
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
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyInventoryContainer}>
                  <Ionicons name="basket-outline" size={60} color={colors.text + '40'} />
                  <Text style={[styles.emptyInventoryText, {color: colors.text}]}>
                    No food items in inventory
                  </Text>
                  <TouchableOpacity 
                    style={[styles.addFirstItemButton, {backgroundColor: colors.primary}]}
                    onPress={() => navigation.navigate({
                      name: 'AddFoodItem',
                      params: { petId: activePetId || undefined }
                    })}
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
  mealTimeColumn: {
    padding: 12,
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
    justifyContent: 'center',
  },
  mealAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
    marginBottom: 4,
  },
  mealNotes: {
    fontSize: 12,
  },
  mealStatusButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentMealContent: {
    flex: 1,
  },
  recentMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recentMealTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentMealTime: {
    fontSize: 12,
  },
  recentMealDetail: {
    fontSize: 12,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  incompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incompletedText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
    height: 220,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingLeft: 8,
  },
  chartContent: {
    flex: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
  },
  chartYAxis: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  chartBar: {
    width: '60%',
    borderRadius: 8,
    minHeight: 4,
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
  addInventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addInventoryText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 6,
    fontSize: 14,
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
    paddingHorizontal: 8,
  },
  metricSummaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSummaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricSummarySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default Feeding; 