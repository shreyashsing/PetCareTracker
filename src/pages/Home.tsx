import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  Image, 
  ImageBackground, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useToast } from '../hooks/use-toast';
import { useActivePet } from '../hooks/useActivePet';
import { format } from 'date-fns';
import { Pet, PetStatsProps, Task, Meal, ActivitySession, HealthRecord } from '../types/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../forms';
import { Ionicons } from '@expo/vector-icons';
import { TopNavBar } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { STORAGE_KEYS, unifiedDatabaseManager } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { formatDate, calculateAge } from '../utils/helpers';
import { useAppColors } from '../hooks/useAppColors';
import Footer from '../components/layout/Footer';
import { useAuth } from '../providers/AuthProvider';
import { useFocusEffect } from '@react-navigation/native';
import { syncHealthRecordsForPet } from '../utils/healthRecordSync';

const { width } = Dimensions.get('window');

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Activity = {
  id: string;
  title: string;
  description?: string;
  time: string;
  icon: string;
  iconEmoji?: string;
  iconType?: 'ionicons' | 'emoji';
  iconColor: string;
  iconBackground: string;
  completed: boolean;
  category: string;
};

// Memoize PetStats component to prevent unnecessary re-renders
const PetStats: React.FC<PetStatsProps> = React.memo(({ tasksLoading, mealsLoading, tasks, meals }) => {
  const { colors, isDark } = useAppColors();
  
  return (
    <View style={styles.statsContainer}>
      <View
        style={[
          styles.statCard,
          { backgroundColor: colors.primary }
        ]}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="calendar-outline" size={24} color="white" />
        </View>
        <Text style={styles.statTitle}>Tasks Today</Text>
        <Text style={styles.statValue}>{tasksLoading ? '...' : tasks?.length || 0}</Text>
      </View>
      
      <View
        style={[
          styles.statCard,
          { backgroundColor: colors.secondary }
        ]}
      >
        <View style={styles.statIconContainer}>
          <Ionicons name="restaurant-outline" size={24} color="white" />
        </View>
        <Text style={styles.statTitle}>Meals Today</Text>
        <Text style={styles.statValue}>{mealsLoading ? '...' : meals?.length || 0}</Text>
      </View>
    </View>
  );
});

// Memoize PetDetails component
const PetDetails = React.memo(({ pet, activities }: { pet: Pet, activities: any[] }) => {
  const { colors, isDark } = useAppColors();
  if (!pet) return null;
  
  // Use useCallback for functions that are passed as props or used in dependency arrays
  const getAge = useCallback((birthDate: Date) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    
    return `${years}y ${months}m`;
  }, []);
  
  // Memoize calculated values to prevent recalculation on each render
  const petAge = useMemo(() => {
    return pet.birthDate ? getAge(pet.birthDate) : 'Unknown';
  }, [pet.birthDate, getAge]);
  
  return (
    <View style={{ marginTop: 16, marginBottom: 16 }}>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          backgroundColor: colors.card
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
          <View style={{ position: 'relative', marginRight: 16 }}>
            <Image 
              source={{ uri: pet.image }} 
              style={{ width: 80, height: 80, borderRadius: 40 }} 
            />
            <View style={{ 
              position: 'absolute', 
              bottom: 0, 
              right: 0, 
              backgroundColor: 'white', 
              width: 24, 
              height: 24, 
              borderRadius: 12, 
              justifyContent: 'center', 
              alignItems: 'center', 
              borderWidth: 2, 
              borderColor: 'white' 
            }}>
              <Ionicons 
                name={pet.status === 'healthy' ? 'checkmark-circle' : 'medical'} 
                size={18} 
                color={pet.status === 'healthy' ? '#4CAF50' : '#FF9800'} 
              />
            </View>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: colors.text }}>{pet.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="paw" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 14, color: colors.text + '80' }}>{pet.type}</Text>
            </View>
          </View>
        </View>
        
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-around', 
          padding: 16, 
          borderTopWidth: 1, 
          borderTopColor: colors.border + '40' 
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: colors.text }}>{petAge}</Text>
            <Text style={{ fontSize: 12, color: colors.text + '80' }}>Age</Text>
          </View>
          <View style={{ width: 1, height: '100%', backgroundColor: colors.border + '40' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: colors.text }}>{pet.weight} {pet.weightUnit}</Text>
            <Text style={{ fontSize: 12, color: colors.text + '80' }}>Weight</Text>
          </View>
          <View style={{ width: 1, height: '100%', backgroundColor: colors.border + '40' }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4, color: colors.primary }}>
              {pet.status.charAt(0).toUpperCase() + pet.status.slice(1)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.text + '80' }}>Status</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// Memoize RecentActivity component
const RecentActivity = React.memo(({ activities }: { activities: any[] }) => {
  const { colors } = useAppColors();
  
  return (
    <View style={styles.activityContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      {activities.length > 0 ? (
        activities.map(activity => (
          <TouchableOpacity key={activity.id} style={[styles.activityItem, { backgroundColor: colors.card }]}>
            <View style={[styles.activityIconContainer, { backgroundColor: activity.iconBackground || (colors.primary + '15') }]}>
              {activity.iconType === 'emoji' ? (
                <Text style={styles.emojiIcon}>{activity.iconEmoji}</Text>
              ) : (
                <Ionicons name={activity.icon} 
                  size={20} 
                  color={activity.iconColor || colors.primary} />
              )}
            </View>
            <View style={styles.activityContent}>
              <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
              {activity.description && (
                <Text style={[styles.activityDescription, { color: colors.text + '80' }]}>{activity.description}</Text>
              )}
            </View>
            <Text style={[styles.activityTime, { color: colors.text + '60' }]}>{activity.time}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.card + '80' }]}>
          <Ionicons name="calendar-outline" size={24} color={colors.text + '60'} />
          <Text style={[styles.emptyStateText, { color: colors.text + '80' }]}>No recent activity</Text>
        </View>
      )}
      
      <TouchableOpacity style={[styles.viewAllButton, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.viewAllButtonText, { color: colors.primary }]}>View All Activity</Text>
      </TouchableOpacity>
    </View>
  );
});

// Memoize UpcomingTasks component
const UpcomingTasks = React.memo(({ tasks }: { tasks: Task[] }) => {
  const { colors } = useAppColors();
  return (
    <View style={styles.upcomingContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Tasks</Text>
      {tasks?.filter(task => task.status !== 'completed').slice(0, 2).map(task => (
        <TouchableOpacity key={task.id} style={[styles.upcomingItem, { backgroundColor: colors.card }]}>
          <View style={[styles.upcomingTime, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.upcomingTimeText, { color: colors.primary }]}>
              {task.scheduleInfo.time instanceof Date ? 
                `${task.scheduleInfo.time.getHours().toString().padStart(2, '0')}:${task.scheduleInfo.time.getMinutes().toString().padStart(2, '0')}` : 
                (typeof task.scheduleInfo.time === 'string' ? task.scheduleInfo.time : '00:00')}
            </Text>
          </View>
          <View style={styles.upcomingContent}>
            <Text style={[styles.upcomingTitle, { color: colors.text }]}>{task.title}</Text>
          </View>
          <TouchableOpacity style={[styles.completeButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const Home: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { toast } = useToast();
  const { activePetId, setActivePetId } = useActivePet();
  const { colors } = useAppColors();
  const { user } = useAuth();
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'recovering' | 'ill' | 'chronic' | 'unknown'>('healthy');
  const [loading, setLoading] = useState(true);
  const [hasPets, setHasPets] = useState(true);
  const [pets, setPets] = useState<Pet[]>([]);
  const [recentHealthRecords, setRecentHealthRecords] = useState<HealthRecord[]>([]);
  const [debugMessage, setDebugMessage] = useState<string>('');
  
  // Add a loading ref to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  // Add a debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Optimize with useCallback to prevent recreation on every render
  const calculateNextCheckup = useCallback(() => {
    const today = new Date();
    const nextCheckup = new Date(today);
    nextCheckup.setMonth(today.getMonth() + 3); // Assume next checkup in 3 months
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${nextCheckup.getDate()} ${monthNames[nextCheckup.getMonth()]}`;
  }, []);
  
  // Use useCallback for the formatActivities function - move this before loadData
  const formatActivities = useCallback((tasks: Task[], meals: Meal[], healthRecords: any[] = []): Activity[] => {
    // Combine all activities
    const allActivities: Activity[] = [];
    
    // Format tasks
    tasks.forEach(task => {
      if (task.status === 'completed' && task.completionDetails) {
        allActivities.push({
          id: `task-${task.id}`,
          title: task.title,
          time: task.completionDetails.completedAt ? format(new Date(task.completionDetails.completedAt), 'h:mm a') : '',
          icon: 'checkmark-circle-outline',
          iconColor: '#4CAF50',
          iconBackground: '#4CAF5020',
          completed: true,
          category: 'task'
        });
      }
    });
    
    // Format meals
    meals.forEach(meal => {
      if (meal.completed) {
        // Create a food description
        let foodDescription = meal.amount ? `${meal.amount}` : '';
        if (meal.foods && meal.foods.length > 0) {
          const firstFood = meal.foods[0];
          foodDescription = `${firstFood.amount} ${firstFood.unit}`;
        }
        
        allActivities.push({
          id: `meal-${meal.id}`,
          title: `${meal.type} - ${foodDescription}`,
          time: meal.time ? format(new Date(meal.time), 'h:mm a') : '',
          icon: 'restaurant-outline',
          iconColor: '#FFA000',
          iconBackground: '#FFA00020',
          completed: true,
          category: 'meal'
        });
      }
    });
    
    // Format health records
    healthRecords.forEach(record => {
      allActivities.push({
        id: `health-${record.id}`,
        title: record.type,
        description: record.notes,
        time: record.date ? format(new Date(record.date), 'MMM d, h:mm a') : '',
        icon: 'fitness-outline',
        iconColor: '#2196F3',
        iconBackground: '#2196F320',
        completed: true,
        category: 'health'
      });
    });
    
    // Sort activities by time (most recent first)
    allActivities.sort((a, b) => {
      // Parse time strings into Date objects for comparison
      const getTimeValue = (time: string) => {
        if (!time) return 0;
        try {
          return new Date(time).getTime();
        } catch {
          return 0;
        }
      };
      
      return getTimeValue(b.time) - getTimeValue(a.time);
    });
    
    return allActivities;
  }, []);
  
  const loadUserPets = async () => {
    try {
      if (user) {
        setLoading(true);
        
        // Load all pets for the current user
        const allPets = await unifiedDatabaseManager.pets.getAll();
        const userPets = allPets.filter(p => p.userId === user.id);
        console.log(`Found ${userPets.length} pets for user ${user?.id}`);
        
        setPets(userPets);
        
        // If no active pet is set, use the first pet
        const activePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        
        if (userPets.length > 0) {
          if (!activePetId || !userPets.some((p: Pet) => p.id === activePetId)) {
            // Set the first pet as active if there's no active pet or the active pet doesn't belong to this user
            await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, userPets[0].id);
            setActivePet(userPets[0]);
            await loadPetData(userPets[0].id);
          } else {
            // Load the active pet
            setActivePet(userPets.find((p: Pet) => p.id === activePetId) || userPets[0]);
            await loadPetData(activePetId || userPets[0].id);
          }
        } else {
          setActivePet(null);
        }
      }
    } catch (error) {
      console.error('Error loading pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPetData = async (petToLoadId: string) => {
    try {
      if (!petToLoadId) return;
      
      // Load the selected pet and its data
      const pet = await unifiedDatabaseManager.pets.getById(petToLoadId);
      if (pet) {
        console.log(`Loaded pet: ${pet.name} (${pet.id})`);
        setActivePet(pet);
        
        // Load tasks, meals, and health records for today
        const today = new Date();
        
        // Get all tasks and filter by pet ID and date
        const allTasks = await unifiedDatabaseManager.tasks.getAll();
        const petTasks = allTasks.filter(task => {
          return task.petId === petToLoadId && 
                 task.scheduleInfo?.date && 
                 new Date(task.scheduleInfo.date).toDateString() === today.toDateString();
        });
        setTasks(petTasks);
        
        // Get all meals and filter by pet ID and date
        const allMeals = await unifiedDatabaseManager.meals.getAll();
        const petMeals = allMeals.filter(meal => {
          return meal.petId === petToLoadId && 
                 meal.date && 
                 new Date(meal.date).toDateString() === today.toDateString();
        });
        setMeals(petMeals);
        
        // Load recent health records (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const allHealthRecords = await unifiedDatabaseManager.healthRecords.getAll();
        const healthRecords = allHealthRecords.filter(record => {
          return record.petId === petToLoadId;
        });
        console.log(`Loaded ${healthRecords.length} health records for pet ${petToLoadId}`);
        
        // Filter to recent records
        const recentRecords = healthRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= sevenDaysAgo;
        });
        setRecentHealthRecords(recentRecords);
        
        // Save this pet as the active pet
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petToLoadId);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
  };

  const loadHomeData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('Already loading data, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    console.log('Loading home data...');
    
    try {
      // Always check the latest active pet ID from storage
      const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
      console.log(`Stored active pet ID: ${storedActivePetId}`);
      
      // Check if activePetId in context matches storage, and update if needed
      if (storedActivePetId !== activePetId) {
        console.log(`Active pet ID mismatch (context: ${activePetId}, storage: ${storedActivePetId}), updating context`);
        setActivePetId(storedActivePetId);
      }
      
      // Load all pets for the current user
      const allPets = await unifiedDatabaseManager.pets.getAll();
      const userPets = allPets.filter(pet => pet.userId === user?.id);
      console.log(`Found ${userPets.length} pets for user ${user?.id}`);
      
      // Update hasPets state based on pets array
      setHasPets(userPets.length > 0);
      
      if (userPets.length === 0) {
        console.log('No pets found for user, redirecting to add pet screen');
        setActivePet(null);
        setActivePetId(null);
        await AsyncStorageService.removeItem(STORAGE_KEYS.ACTIVE_PET_ID);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
      
      // Determine which pet to load
      let petToLoadId = storedActivePetId;
      
      // If no pet ID in storage or the stored ID doesn't exist in user's pets, use the first pet
      if (!petToLoadId || !userPets.some((p: Pet) => p.id === petToLoadId)) {
        petToLoadId = userPets[0].id;
        console.log(`No valid active pet ID found, using first pet: ${petToLoadId}`);
        // Update active pet ID in storage and context
        await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, petToLoadId);
        setActivePetId(petToLoadId);
      }
      
      console.log(`Loading data for pet: ${petToLoadId}`);
      
      // Synchronize health records for this pet with Supabase
      if (petToLoadId) {
        try {
          console.log(`Synchronizing health records for pet: ${petToLoadId}`);
          const syncResult = await syncHealthRecordsForPet(petToLoadId);
          console.log(`Health records sync result:`, syncResult);
          
          if (!syncResult.success) {
            console.warn(`Health records sync failed: ${syncResult.error}`);
          } else if (syncResult.syncedRecords > 0) {
            console.log(`Successfully synced ${syncResult.syncedRecords} health records`);
          }
        } catch (syncError) {
          console.error('Error syncing health records:', syncError);
          // Continue with loading - not critical enough to fail the whole data loading process
        }
        
        // Load the selected pet and its data
        const pet = await unifiedDatabaseManager.pets.getById(petToLoadId);
        if (pet) {
          console.log(`Loaded pet: ${pet.name} (${pet.id})`);
          setActivePet(pet);
          setHealthStatus(pet.status);
          
          // Load tasks, meals, and health records for today
          const today = new Date();
          
          // Get all tasks and filter by pet ID and date
          const allTasks = await unifiedDatabaseManager.tasks.getAll();
          const petTasks = allTasks.filter(task => {
            return task.petId === petToLoadId && 
                  task.scheduleInfo?.date && 
                  new Date(task.scheduleInfo.date).toDateString() === today.toDateString();
          });
          setTasks(petTasks);
          
          // Get all meals and filter by pet ID and date
          const allMeals = await unifiedDatabaseManager.meals.getAll();
          const petMeals = allMeals.filter(meal => {
            return meal.petId === petToLoadId && 
                  meal.date && 
                  new Date(meal.date).toDateString() === today.toDateString();
          });
          setMeals(petMeals);
          
          // Load recent health records (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          // Get all health records and filter by pet ID
          const allHealthRecords = await unifiedDatabaseManager.healthRecords.getAll();
          const healthRecords = allHealthRecords.filter(record => record.petId === petToLoadId);
          console.log(`Loaded ${healthRecords.length} health records for pet ${petToLoadId}`);
          
          const recentHealthRecords = healthRecords.filter(
            (record: HealthRecord) => new Date(record.date) >= sevenDaysAgo
          );
          
          const formattedActivities = formatActivities(petTasks, petMeals, recentHealthRecords);
          setActivities(formattedActivities);
        } else {
          console.log(`Pet with ID ${petToLoadId} not found`);
          // This should not happen with our validation above, but handle it just in case
          if (userPets.length > 0) {
            console.log(`Falling back to first pet: ${userPets[0].name} (${userPets[0].id})`);
            await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, userPets[0].id);
            setActivePetId(userPets[0].id);
            setActivePet(userPets[0]);
            setHealthStatus(userPets[0].status);
          } else {
            setHasPets(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [activePetId, setActivePetId, user?.id, formatActivities]);
  
  // Create a debounced version of loadData
  const debouncedLoadData = useCallback(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      loadHomeData();
    }, 300); // 300ms debounce time
  }, [loadHomeData]);

  // Load data on initial mount
  useEffect(() => {
    loadHomeData();
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadHomeData]);
  
  // Use useFocusEffect to reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        console.log('Home screen focused, checking if data reload is needed');
        
        // Check if we need to load data (not already loading and either first load or active pet changed)
        const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        
        if (isLoadingRef.current) {
          console.log('Already loading data, skipping...');
          return;
        }
        
        if (!activePet || activePet.id !== storedActivePetId) {
          console.log('Active pet changed or not loaded, reloading data');
          await loadHomeData();
        } else {
          console.log('Active pet unchanged, no need to reload data');
        }
      };
      
      loadData();
      
      return () => {
        // Clean up if needed
      };
    }, [loadHomeData, activePet])
  );
  
  // Use useCallback for the getTodaysActivities function
  const getTodaysActivities = useCallback((allActivities: Activity[]): Activity[] => {
    const today = new Date();
    const todayString = format(today, 'MMM d, yyyy');
    
    return allActivities.filter(activity => {
      if (!activity.time) return false;
      
      // Check if the activity time includes today's date
      return activity.time.includes(todayString);
    });
  }, []);
  
  // Use useCallback for the status-related functions
  const getHealthStatusColor = useCallback(() => {
    switch (healthStatus) {
      case 'healthy':
        return '#4CAF50';
      case 'recovering':
        return '#FFA000';
      case 'ill':
        return '#F44336';
      case 'chronic':
        return '#9C27B0';
      default:
        return '#757575';
    }
  }, [healthStatus]);
  
  const getHealthStatusText = useCallback(() => {
    switch (healthStatus) {
      case 'healthy':
        return 'Your pet is in good health! Continue regular care and monitoring.';
      case 'recovering':
        return 'Your pet is recovering. Follow vet-prescribed treatments carefully.';
      case 'ill':
        return 'Your pet needs special attention! Follow your vet\'s advice closely.';
      case 'chronic':
        return 'Your pet has ongoing care needs. Maintain medication and special care.';
      default:
        return 'Pet health status is unknown. Consider scheduling a checkup.';
    }
  }, [healthStatus]);
  
  // Use useMemo for derived values
  const todayActivities = useMemo(() => {
    return getTodaysActivities(activities);
  }, [activities, getTodaysActivities]);
  
  const healthStatusColorValue = useMemo(() => {
    return getHealthStatusColor();
  }, [getHealthStatusColor]);
  
  const healthStatusTextValue = useMemo(() => {
    return getHealthStatusText();
  }, [getHealthStatusText]);
  
  const nextCheckupDate = useMemo(() => {
    return calculateNextCheckup();
  }, [calculateNextCheckup]);

  // Debug sync function
  const debugSync = async () => {
    try {
      if (user) {
        setDebugMessage('Starting debug sync...');
        
        // Debug: Check if pets exist for this user
        const allPets = await unifiedDatabaseManager.pets.getAll();
        const userPets = allPets.filter((pet: Pet) => pet.userId === user.id);
        console.log(`Debug: Found ${userPets.length} pets for user ${user.id}`);
        userPets.forEach((pet: Pet) => console.log(`- Pet: ${pet.name} (${pet.id}), owned by: ${pet.userId}`));
        
        // Check total pets in DB for debugging
        console.log(`Debug: Total pets in DB: ${allPets.length}`);
        
        // ... rest of the debug function ...
      }
    } catch (error: any) {
      console.error('Debug sync error:', error);
      setDebugMessage(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 20 }}>Loading...</Text>
      </View>
    );
  }

  if (!hasPets) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.topNavContainer}>
          <TopNavBar title="Pet Care Tracker" />
        </View>
        <View style={[styles.emptyPetsContainer, { backgroundColor: colors.background }]}>
          <Icon name="paw-outline" size={60} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Welcome to Pet Care Tracker
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.text + '80' }]}>
            Let's start by adding your first pet to get personalized care recommendations
          </Text>
          <TouchableOpacity
            style={[styles.addPetButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AddPet')}
          >
            <Text style={styles.addPetButtonText}>Add Your First Pet</Text>
          </TouchableOpacity>
          
          {/* Debug button to check database state */}
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: colors.secondary, marginTop: 20 }]}
            onPress={async () => {
              try {
                // Get current user ID
                if (!user || !user.id) {
                  console.log("Debug: No user logged in");
                  toast({ 
                    title: "No user logged in", 
                    description: "Please log in to view pets",
                    variant: 'destructive'
                  });
                  return;
                }
                
                // Debug: Check if pets exist for this user
                const allPets = await unifiedDatabaseManager.pets.getAll();
                const userPets = allPets.filter((pet: Pet) => pet.userId === user.id);
                console.log(`Debug: Found ${userPets.length} pets for user ${user.id}`);
                userPets.forEach((pet: Pet) => console.log(`- Pet: ${pet.name} (${pet.id}), owned by: ${pet.userId}`));
                
                // Check total pets in DB for debugging
                const allDbPets = await unifiedDatabaseManager.pets.getAll();
                console.log(`Debug: Total pets in DB: ${allDbPets.length}`);
                
                // Try to get active pet ID
                const activeId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
                console.log(`Debug: Active pet ID: ${activeId}`);
                
                // Check if there's a mismatch between hasPets and actual pets
                if (userPets.length > 0 && !hasPets) {
                  console.log("Debug: Data inconsistency - pets exist but hasPets is false");
                  
                  // Fix: Reset active pet ID and force reload
                  if (userPets.length > 0) {
                    await AsyncStorageService.setItem(STORAGE_KEYS.ACTIVE_PET_ID, userPets[0].id);
                    console.log(`Debug: Reset active pet ID to first pet: ${userPets[0].id}`);
                    
                    toast({ 
                      title: "Fixed pet data inconsistency", 
                      description: `Set active pet to: ${userPets[0].name}`,
                      variant: 'default'
                    });
                  }
                } else if (userPets.length === 0 && hasPets) {
                  console.log("Debug: Data inconsistency - hasPets is true but no pets exist");
                  setHasPets(false);
                  toast({ 
                    title: "Fixed state inconsistency", 
                    description: "Updated UI to show no pets",
                    variant: 'default'
                  });
                  return;
                } else {
                  toast({ 
                    title: `${userPets.length} pets found for this user`, 
                    description: userPets.length > 0 ? 'Reloading data...' : 'No pets for this user',
                    variant: 'default'
                  });
                }
                
                // Force reload data
                if (userPets.length > 0) {
                  loadHomeData();
                }
              } catch (error: any) {
                console.error('Debug error:', error);
                toast({ 
                  title: "Debug error", 
                  description: error.message || "Unknown error",
                  variant: 'destructive'
                });
              }
            }}
          >
            <Text style={styles.addPetButtonText}>Debug: Check Pets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.topNavContainer}>
        <TopNavBar title="Pet Care Tracker" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 72 }]}
      >
        {activePet && (
          <>
            <View style={[styles.petCard, { backgroundColor: colors.card }]}>
              <View style={styles.petCardContent}>
                <Image
                  source={{ uri: activePet.image || 'https://via.placeholder.com/100' }}
                  style={styles.petImage}
                />
                <View style={styles.petInfo}>
                  <Text style={[styles.petName, { color: colors.text }]}>{activePet.name}</Text>
                  <Text style={[styles.petBreed, { color: colors.text + '80' }]}>
                    {activePet.breed}
                  </Text>
                  <View style={styles.petStatsRow}>
                    <View style={styles.petStat}>
                      <Text style={[styles.petStatValue, { color: colors.text }]}>
                        {calculateAge(activePet.birthDate)}
                      </Text>
                      <Text style={[styles.petStatLabel, { color: colors.text + '60' }]}>Age</Text>
                    </View>
                    <View style={styles.petStatDivider} />
                    <View style={styles.petStat}>
                      <Text style={[styles.petStatValue, { color: colors.text }]}>
                        {activePet.weight} {activePet.weightUnit}
                      </Text>
                      <Text style={[styles.petStatLabel, { color: colors.text + '60' }]}>Weight</Text>
                    </View>
                    <View style={styles.petStatDivider} />
                    <View style={styles.petStat}>
                      <View
                        style={[
                          styles.healthIndicator,
                          { backgroundColor: healthStatusColorValue + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.healthIndicatorText,
                            { color: healthStatusColorValue },
                          ]}
                        >
                          {healthStatusTextValue}
                        </Text>
                      </View>
                      <Text style={[styles.petStatLabel, { color: colors.text + '60' }]}>Status</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardAction, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => navigation.navigate({
                    name: 'Feeding',
                    params: {}
                  })}
                >
                  <Icon name="nutrition-outline" size={20} color={colors.primary} />
                  <Text style={[styles.cardActionText, { color: colors.primary }]}>Feeding</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardAction, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => navigation.navigate('Health')}
                >
                  <Icon name="fitness-outline" size={20} color={colors.primary} />
                  <Text style={[styles.cardActionText, { color: colors.primary }]}>Health</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardAction, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => navigation.navigate('Exercise')}
                >
                  <Icon name="walk-outline" size={20} color={colors.primary} />
                  <Text style={[styles.cardActionText, { color: colors.primary }]}>Exercise</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Schedule</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Schedule')}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>

              {/* Use filtered activities (today only) for Today's Schedule */}
              {todayActivities.length > 0 ? (
                <View style={styles.scheduleList}>
                  {todayActivities.map((activity, index) => (
                    <TouchableOpacity
                      key={`${activity.id}-${index}`}
                      style={[
                        styles.scheduleItem,
                        { backgroundColor: colors.card },
                        index === todayActivities.length - 1 ? { marginBottom: 0 } : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.scheduleIconContainer,
                          { backgroundColor: activity.iconBackground },
                        ]}
                      >
                        {activity.iconType === 'emoji' ? (
                          <Text style={styles.emojiIcon}>{activity.iconEmoji}</Text>
                        ) : (
                          <Icon name={activity.icon} size={20} color={activity.iconColor} />
                        )}
                      </View>
                      <View style={styles.scheduleInfo}>
                        <Text style={[styles.scheduleTitle, { color: colors.text }]}>
                          {activity.title}
                        </Text>
                        <Text style={[styles.scheduleTime, { color: colors.text + '80' }]}>
                          {activity.time}
                        </Text>
                      </View>
                      <View style={styles.scheduleStatus}>
                        {activity.completed ? (
                          <Icon name="checkmark-circle" size={24} color="#2dce89" />
                        ) : (
                          <Icon name="time-outline" size={24} color="#fb6340" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                  <Icon name="calendar-outline" size={32} color={colors.text + '40'} />
                  <Text style={[styles.emptyStateText, { color: colors.text + '80' }]}>
                    No activities scheduled for today
                  </Text>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('Schedule')}
                  >
                    <Text style={styles.addButtonText}>Add Activity</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
              Pet Health Overview
            </Text>
            
            <View style={styles.healthOverviewContainer}>
              <View style={[styles.healthCard, { backgroundColor: colors.card }]}>
                <View style={[styles.healthIconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
                  <Icon name="pulse-outline" size={24} color="#4CAF50" />
                </View>
                <View style={styles.healthCardContent}>
                  <Text style={[styles.healthCardTitle, { color: colors.text }]}>Overall Health</Text>
                  <Text style={[styles.healthCardValue, { color: healthStatusColorValue }]}>
                    {healthStatusTextValue}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.healthCard, { backgroundColor: colors.card }]}>
                <View style={[styles.healthIconContainer, { backgroundColor: '#FF9800' + '20' }]}>
                  <Icon name="alarm-outline" size={24} color="#FF9800" />
                </View>
                <View style={styles.healthCardContent}>
                  <Text style={[styles.healthCardTitle, { color: colors.text }]}>Next Checkup</Text>
                  <Text style={[styles.healthCardValue, { color: colors.text }]}>
                    {nextCheckupDate}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.healthCard, { backgroundColor: colors.card }]}>
                <View style={[styles.healthIconContainer, { backgroundColor: '#2196F3' + '20' }]}>
                  <Icon name="fitness-outline" size={24} color="#2196F3" />
                </View>
                <View style={styles.healthCardContent}>
                  <Text style={[styles.healthCardTitle, { color: colors.text }]}>Weight Trend</Text>
                  <Text style={[styles.healthCardValue, { color: colors.text }]}>
                    {activePet.weight} {activePet.weightUnit}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary }]} 
                onPress={() => navigation.navigate('Health')}
              >
                <Text style={styles.actionButtonText}>View Full Health Record</Text>
              </TouchableOpacity>
            </View>

            {/* Pet Assistant Card */}
            <TouchableOpacity 
              style={[styles.petAssistantCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('ChatAssistant' as any, { petId: activePetId })}
            >
              <View style={styles.petAssistantIconContainer}>
                <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
              </View>
              <View style={styles.petAssistantContent}>
                <Text style={[styles.petAssistantTitle, { color: colors.text }]}>
                  Pet Assistant
                </Text>
                <Text style={[styles.petAssistantDescription, { color: colors.text + '99' }]}>
                  Get answers to all your pet care questions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.text + '80'} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  petCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  petCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petInfo: {
    marginLeft: 16,
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  petBreed: {
    fontSize: 14,
    marginTop: 2,
  },
  petStatsRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  petStat: {
    alignItems: 'center',
    flex: 1,
  },
  petStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petStatLabel: {
    fontSize: 12,
  },
  petStatDivider: {
    width: 1,
    height: '100%',
  },
  healthIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
  },
  scheduleList: {
    marginBottom: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  scheduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleTime: {
    fontSize: 14,
  },
  scheduleStatus: {
    width: 40,
    alignItems: 'flex-end',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  healthOverviewContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  healthCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  healthIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  healthCardTitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  healthCardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: 'white',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  activityContainer: {
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: 14,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upcomingContainer: {
    marginBottom: 16,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  upcomingTime: {
    width: 80,
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  upcomingTimeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525f7f',
  },
  topNavContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  emptyPetsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addPetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addPetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  debugButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emojiIcon: {
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  petAssistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petAssistantIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  petAssistantContent: {
    flex: 1,
  },
  petAssistantTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  petAssistantDescription: {
    fontSize: 14,
  },
});

// Export with React.memo for better performance
export default React.memo(Home);