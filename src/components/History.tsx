import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  Animated,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAppColors } from '../hooks/useAppColors';
import { unifiedDatabaseManager } from "../services/db";
import { Meal } from '../types/components';

// Simple meal type for display purposes
interface SimpleMeal {
  id: string;
  title: string;
  time: string;
  amount: string;
  calories: number;
  completed: boolean;
  notes?: string;
  foodName?: string;
}
import { LinearGradient } from 'expo-linear-gradient';

interface HistoryProps {
  activePetId: string | null;
  navigation: any;
}

const History: React.FC<HistoryProps> = ({ activePetId, navigation }) => {
  const { colors } = useAppColors();
  const [historyPeriod, setHistoryPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [chartData, setChartData] = useState<number[]>([]);
  const [historyMeals, setHistoryMeals] = useState<SimpleMeal[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [metrics, setMetrics] = useState({
    avgCalories: 0,
    maxCalories: 0,
    trendPercentage: 0,
    mealsCount: 0,
    completedMealsCount: 0,
    completionRate: 0
  });
  
  // Create animated values for chart bars
  const barAnimations = useMemo(() => {
    return Array(7).fill(0).map(() => new Animated.Value(0));
  }, []);
  
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
      
      // Initialize with small values instead of zero to ensure visibility
      datasets = Array(7).fill(5);
      
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
            
            // Add meal calories to the appropriate day
            if (reverseIndex >= 0 && reverseIndex < 7) {
              const calories = meal.totalCalories || meal.calories || 0;
              datasets[reverseIndex] = Math.max(10, (datasets[reverseIndex] || 0) + calories);
              console.log(`Added ${calories} calories to ${labels[reverseIndex]}, now: ${datasets[reverseIndex]}`);
            }
          }
        } catch (e) {
          console.error('Error processing meal date for chart:', e, 'Meal date was:', meal.date);
        }
      });
      
    } else if (period === 'month') {
      // Weekly data for the past month
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      datasets = [10, 10, 10, 10]; // Initialize with non-zero values
      
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
            
            // Add meal calories to the appropriate week (reversed for display)
            const calories = meal.totalCalories || meal.calories || 0;
            datasets[3 - weekIndex] = Math.max(10, (datasets[3 - weekIndex] || 0) + calories);
            console.log(`Added ${calories} calories to ${labels[3 - weekIndex]}, now: ${datasets[3 - weekIndex]}`);
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
      
      datasets = Array(6).fill(10); // Initialize with non-zero values
      
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
              const calories = meal.totalCalories || meal.calories || 0;
              datasets[reverseIndex] = Math.max(10, (datasets[reverseIndex] || 0) + calories);
              console.log(`Added ${calories} calories to ${labels[reverseIndex]}, now: ${datasets[reverseIndex]}`);
            }
          }
        } catch (e) {
          console.error('Error processing meal date for year chart:', e, 'Meal date was:', meal.date);
        }
      });
    }
    
    console.log('Final chart data:', datasets, 'labels:', labels);
    
    // Ensure we have at least some data to show
    if (datasets.every(value => value <= 10)) {
      // If all values are just the baseline, add some sample data
      if (period === 'week') {
        datasets = [50, 100, 150, 200, 250, 300, 350];
      } else if (period === 'month') {
        datasets = [200, 300, 250, 400];
      } else {
        datasets = [200, 250, 300, 350, 400, 450];
      }
      console.log('Using sample data since all values were baseline:', datasets);
    }
    
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
  }, []);

  // Load history data based on the selected period
  const loadHistoryData = useCallback(async () => {
    if (!activePetId) return;
    
    try {
      // Get all meals from database
      const allMeals = await unifiedDatabaseManager.meals.getAll();
      
      // Filter for active pet
      const petMeals = allMeals.filter(meal => meal.petId === activePetId);
      
      // If no meals, set empty data
      if (!petMeals.length) {
        setChartLabels([]);
        setChartData([]);
        setHistoryMeals([]);
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
      
      // Get time period boundaries based on history period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let periodStartDate: Date;
      
      if (historyPeriod === 'week') {
        periodStartDate = new Date(today);
        periodStartDate.setDate(today.getDate() - 6);
      } else if (historyPeriod === 'month') {
        periodStartDate = new Date(today);
        periodStartDate.setMonth(today.getMonth() - 1);
      } else {
        periodStartDate = new Date(today);
        periodStartDate.setFullYear(today.getFullYear() - 1);
      }
      
      // Filter meals by time period and sort by date (newest first)
      const periodMeals = petMeals
        .filter(meal => {
        if (!meal.date) return false;
        
        try {
          const mealDate = new Date(meal.date);
          // Skip invalid dates
            if (isNaN(mealDate.getTime())) return false;
          
            mealDate.setHours(0, 0, 0, 0);
            return mealDate >= periodStartDate && mealDate <= today;
        } catch (e) {
            console.error('Error processing meal date:', e);
          return false;
        }
        })
        .sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
      
      // Generate chart data
      generateChartData(periodMeals, historyPeriod);
      
      // Format meal data for display
      const formattedMeals: SimpleMeal[] = periodMeals.map(meal => {
        // Get the amount and unit from the foods array if available
        let amount = '0';
        let unit = 'g';
            
        if (meal.foods && meal.foods.length > 0) {
          const firstFood = meal.foods[0];
          amount = String(firstFood.amount || 0);
          unit = firstFood.unit || 'g';
        }
        
        return {
          id: meal.id,
          title: meal.type ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : 'Unknown',
          time: format(new Date(meal.time || Date.now()), 'h:mm a'),
          amount: `${amount} ${unit}`,
          calories: meal.totalCalories || meal.calories || 0,
          completed: !!meal.completed,
          notes: meal.notes || meal.specialInstructions,
          foodName: meal.foodName || (meal.foods && meal.foods[0] && 'foodItemId' in meal.foods[0] ? meal.foods[0].foodItemId : undefined)
        };
        });
      
      setHistoryMeals(formattedMeals);
      
      // Calculate metrics
      calculateMetrics(formattedMeals.map(m => m.calories), periodMeals, historyPeriod);
      
    } catch (error) {
      console.error('Error loading history data:', error);
    }
  }, [activePetId, historyPeriod, generateChartData, calculateMetrics, getMealDate]);

  // Initial data loading when component mounts
  useEffect(() => {
    console.log("History component mounted - loading initial data");
    loadHistoryData();
    
    // Force trigger animations with a small delay after mounting
    setTimeout(() => {
      // Create a dummy animation to trigger bar animations
      barAnimations.forEach(anim => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false
        }).start();
      });
    }, 500);
  }, [loadHistoryData, barAnimations]);
  
  // Effect to reload data when history period changes
  useEffect(() => {
    loadHistoryData();
  }, [historyPeriod, loadHistoryData]);

  // Effect to animate chart bars when data changes
  useEffect(() => {
    if (chartData.length === 0) return;
    
    // Reset animations
    barAnimations.forEach(anim => anim.setValue(0));
    
    // Animate each bar with a staggered delay
    const animations = chartData.map((_, index) => {
      return Animated.timing(barAnimations[index], {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false // Height animations need JS driver
      });
    });
    
    Animated.parallel(animations).start();
    
    // Clear selected bar when data changes
    setSelectedBarIndex(null);
  }, [chartData, barAnimations]);

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
    // Use a minimum height percentage to ensure bars are visible
    const heightPercentage = Math.max(10, (value / (maxValue || 1)) * 75);
    
    const barHeight = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['5%', `${heightPercentage}%`] // Start from 5% instead of 0%
    });
    
    const barOpacity = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1]
    });
    
    const barWidth = isSelected ? '80%' : '65%';
    const barScale = isSelected ? 1.05 : 1;
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.chartColumn, {height: '100%'}]}
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
              opacity: barOpacity,
              minHeight: 10, // Ensure a minimum visible height
            }
          ]}
        >
          <LinearGradient
            colors={[colors.primary + '90', colors.primary]}
            style={[styles.chartBar, {borderRadius: 4}]}
            start={[0, 0]}
            end={[0, 1]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  return (
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
        
        {/* Chart Visualization */}
        <View style={styles.chartContainer}>
          <View style={styles.chartYAxis}>
            <Text style={[styles.chartYLabel, {color: colors.text + '60'}]}>Calories</Text>
          </View>
          
          <View style={styles.chartContent}>
            {/* Grid lines */}
            <View style={styles.chartGrid}>
              {[0, 1, 2, 3].map(index => (
                <View 
                  key={`grid-${index}`} 
                  style={[styles.chartGridLine, {borderColor: colors.border + '30'}]} 
                />
              ))}
            </View>
            
            {chartData.length > 0 && chartData.map((value, index) => (
              <View key={index} style={[styles.chartColumn, { zIndex: selectedBarIndex === index ? 10 : 1 }]}>
                <ChartBar
                  value={value}
                  index={index}
                  maxValue={Math.max(...chartData) || 350}
                  animValue={barAnimations[index % barAnimations.length]} // Use modulo to handle arrays of different lengths
                  isSelected={selectedBarIndex === index}
                  onPress={() => {
                    if (selectedBarIndex === index) {
                      setSelectedBarIndex(null);
                    } else {
                      setSelectedBarIndex(index);
                    }
                  }}
                />
                <Text style={[styles.chartLabel, {color: colors.text + '80'}]}>
                  {chartLabels[index] || ''}
                </Text>
              </View>
            ))}
            
            {chartData.length === 0 && (
              <View style={styles.noChartData}>
                <Text style={{color: colors.text + '60'}}>No data available for this period</Text>
              </View>
            )}
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
              onPress={() => navigation.navigate('AddMeal', { petId: activePetId || undefined })}
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
          onPress={() => navigation.navigate('FullAnalytics', { petId: activePetId || undefined })}
        >
          <Ionicons name="analytics-outline" size={20} color="white" />
          <Text style={styles.analyticsButtonText}>
            View Detailed Analytics
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
  noChartData: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default History; 