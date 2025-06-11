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
  ActivityIndicator,
  Modal
} from 'react-native';
import { useToast } from '../hooks/use-toast';
import { useActivePet } from '../hooks/useActivePet';
import { format } from 'date-fns';
import { Pet, PetStatsProps, Task, Meal, ActivitySession, HealthRecord, WeightRecord } from '../types/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types/navigation';
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
import { addCacheBuster, refreshImageCache } from '../utils/imageCacheHelper';
import { ResponsiveText, ButtonText } from '../components/ResponsiveText';
import { createResponsiveButtonStyle } from '../utils/responsiveLayout';
import { spacing } from '../utils/responsiveText';
import { useAppStore } from '../store/AppStore';
import { notificationService } from '../services/notifications';

const { width } = Dimensions.get('window');

type HomeScreenProps = NativeStackScreenProps<MainStackParamList, 'Home'>;

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
  
  // Navigation state management
  const { updateCurrentRoute, navigationState } = useAppStore();
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
  
  // Add new state for health record modal
  const [selectedHealthRecord, setSelectedHealthRecord] = useState<HealthRecord | null>(null);
  const [healthRecordModalVisible, setHealthRecordModalVisible] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  
  // Add a loading ref to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  // Add a debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use useCallback for the formatActivities function - move this before loadData
  const formatActivities = useCallback((tasks: Task[], meals: Meal[], healthRecords: any[] = []): Activity[] => {
    // Combine all activities
    const allActivities: Activity[] = [];
    
    console.log(`Formatting ${tasks.length} tasks for display`);
    
    // Format tasks
    tasks.forEach(task => {
      // Debug log task status
      console.log(`Task ${task.id} (${task.title}) - Status: ${task.status}, Completed: ${task.status === 'completed'}`);
      
      // Create an activity entry for each task, not just completed ones
      let activityTime = '';
      let isCompleted = false;
      
      if (task.status === 'completed') {
        // For completed tasks, use completion time if available, otherwise use scheduled time
        if (task.completionDetails?.completedAt) {
          activityTime = format(new Date(task.completionDetails.completedAt), 'MMM d, h:mm a');
        } else {
          // If no completion time is available, use the scheduled time
          const taskDate = new Date(task.scheduleInfo.date);
          const taskTime = new Date(task.scheduleInfo.time);
          
          const scheduledDateTime = new Date(
            taskDate.getFullYear(),
            taskDate.getMonth(), 
            taskDate.getDate(),
            taskTime.getHours(),
            taskTime.getMinutes()
          );
          
          activityTime = format(scheduledDateTime, 'MMM d, h:mm a');
        }
        isCompleted = true;
      } else {
        // For pending tasks, use scheduled time
        const taskDate = new Date(task.scheduleInfo.date);
        const taskTime = new Date(task.scheduleInfo.time);
        
        // Create a combined date+time
        const scheduledDateTime = new Date(
          taskDate.getFullYear(),
          taskDate.getMonth(), 
          taskDate.getDate(),
          taskTime.getHours(),
          taskTime.getMinutes()
        );
        
        activityTime = format(scheduledDateTime, 'MMM d, h:mm a');
        isCompleted = false;
      }
      
        allActivities.push({
          id: `task-${task.id}`,
          title: task.title,
        time: activityTime,
        icon: isCompleted ? 'checkmark-circle-outline' : 'calendar-outline',
        iconColor: isCompleted ? '#4CAF50' : '#2196F3',
        iconBackground: isCompleted ? '#4CAF5020' : '#2196F320',
        completed: isCompleted,
          category: 'task'
        });
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
          time: meal.time ? format(new Date(meal.time), 'MMM d, h:mm a') : '',
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
      // Check if this is a follow-up due today
      const isFollowUp = record.followUpNeeded && record.followUpDate && 
                         new Date(record.followUpDate).toDateString() === new Date().toDateString();
      
      // Regular health records shouldn't appear in Today's Schedule, only in Recent Activity
      // For follow-ups due today, create a special reminder activity
      if (isFollowUp) {
        // This is a follow-up reminder for today
        allActivities.push({
          id: `followup-${record.id}`,
          title: record.title ? `${record.type}: ${record.title}` : record.type,
          description: record.notes || record.description,
          time: format(new Date(record.followUpDate), 'MMM d, h:mm a'),
          icon: 'calendar-outline',
          iconColor: '#FF9800',
          iconBackground: '#FF980020',
          // Always show as not completed - it's just a reminder
          completed: false,
          category: 'health-followup'
        });
      }
      
      // Also add the original health record to activities (for Recent Activity section)
      // Only if it's not created today (to avoid duplication in Today's Schedule)
      const recordDate = new Date(record.date);
      const today = new Date();
      const isCreatedToday = recordDate.toDateString() === today.toDateString();
      
      if (!isCreatedToday) {
      allActivities.push({
        id: `health-${record.id}`,
        title: record.type,
          description: record.notes || record.description,
        time: record.date ? format(new Date(record.date), 'MMM d, h:mm a') : '',
        icon: 'fitness-outline',
        iconColor: '#2196F3',
        iconBackground: '#2196F320',
          completed: record.status === 'completed',
        category: 'health'
      });
      }
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
        
        // Check and fix any medication notification issues
        console.log('Checking for medication notification issues...');
        // Get all medications for this pet
        const allMedications = await unifiedDatabaseManager.medications.getAll();
        const petMedications = allMedications.filter(med => med.petId === petToLoadId);
        
        // Find any non-active medications that might still have notifications
        const nonActiveMedications = petMedications.filter((med: any) => 
          (med.status === 'completed' || med.status === 'discontinued')
        );
        
        // Cancel notifications for non-active medications
        if (nonActiveMedications.length > 0) {
          console.log(`Found ${nonActiveMedications.length} non-active medications. Ensuring notifications are cancelled...`);
          for (const medication of nonActiveMedications) {
            try {
              await notificationService.cancelMedicationNotifications(medication.id);
            } catch (error) {
              console.error(`Failed to cancel notifications for medication ${medication.name}:`, error);
            }
          }
          
          // Also fix any medications that have incorrect reminder settings
          const medicationsToFix = nonActiveMedications.filter((med: any) => med.reminderSettings?.enabled === true);
          if (medicationsToFix.length > 0) {
            console.log(`Found ${medicationsToFix.length} medications with incorrect reminder settings. Fixing...`);
            for (const medication of medicationsToFix) {
              try {
                await unifiedDatabaseManager.medications.updateStatus(medication.id, medication.status);
                console.log(`Fixed reminder settings for ${medication.status} medication: ${medication.name}`);
              } catch (error) {
                console.error(`Failed to fix reminder settings for medication ${medication.name}:`, error);
              }
            }
          }
        }
        
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
        
        // Filter to recent health records (last 7 days)
        const recentRecords = healthRecords.filter(
          (record: HealthRecord) => new Date(record.date) >= sevenDaysAgo
        );
        
        // Get health records with follow-ups due today
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Find health records with follow-up dates that match today
        const followUpsDueToday = healthRecords.filter(record => {
          if (!record.followUpNeeded || !record.followUpDate || record.status === 'completed') {
            return false;
          }
          
          const followUpDate = new Date(record.followUpDate);
          followUpDate.setHours(0, 0, 0, 0);
          return followUpDate.getTime() === today.getTime();
        });
        
        console.log(`Found ${followUpsDueToday.length} health record follow-ups due today`);
        
        // Combine recent records with follow-ups due today (avoiding duplicates)
        const healthRecordsToDisplay = [...recentRecords];
        
        // Add follow-ups that aren't already in the recent records
        followUpsDueToday.forEach(followUp => {
          if (!healthRecordsToDisplay.some(record => record.id === followUp.id)) {
            healthRecordsToDisplay.push(followUp);
          }
        });

        // Save all health records to state for use in calculating next checkup
        setRecentHealthRecords(healthRecords);
        
        // Load actual weight records from the weight records table (same as Health page)
        const allWeightRecords = await unifiedDatabaseManager.weightRecords.getAll();
        const petWeightRecords = allWeightRecords
          .filter(record => record.petId === petToLoadId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // If no weight records exist, create one from pet's current weight (same as Health page)
        if (petWeightRecords.length === 0 && pet) {
          const initialWeight: Omit<WeightRecord, 'id'> = {
            petId: petToLoadId,
            date: new Date(),
            weight: pet.weight,
            unit: pet.weightUnit,
            notes: 'Initial weight from profile',
            bodyConditionScore: 3
          };
          
          try {
            const createdRecord = await unifiedDatabaseManager.weightRecords.create(initialWeight);
            petWeightRecords.push(createdRecord);
            console.log('Created initial weight record:', createdRecord);
          } catch (error) {
            console.error('Error creating initial weight record:', error);
            // Fallback to in-memory record for display
            petWeightRecords.push({
              id: `initial-weight-${petToLoadId}`,
              ...initialWeight
            } as WeightRecord);
          }
        }

        setWeightRecords(petWeightRecords);
        console.log(`Loaded ${petWeightRecords.length} weight records for pet ${pet.name}`);
        
        const formattedActivities = formatActivities(petTasks, petMeals, healthRecordsToDisplay);
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
  };

  const loadHomeData = useCallback(async (silentReload = false) => {
    if (isLoadingRef.current) {
      console.log('Already loading data, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    // Only show loading screen on initial load, not on silent reloads
    if (!silentReload) {
      setLoading(true);
    }
    console.log(`Loading home data... (silent: ${silentReload})`);
    
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
          
          // Get all health records for this pet
          const allHealthRecords = await unifiedDatabaseManager.healthRecords.getAll();
          const healthRecords = allHealthRecords.filter(record => record.petId === petToLoadId);
          console.log(`Loaded ${healthRecords.length} health records for pet ${petToLoadId}`);
          
          // Print details of health records with follow-ups
          const recordsWithFollowUps = healthRecords.filter(record => record.followUpNeeded && record.followUpDate);
          console.log(`Found ${recordsWithFollowUps.length} health records with follow-ups`);
          
          recordsWithFollowUps.forEach(record => {
            const followUpDate = new Date(record.followUpDate || '');
            console.log(`Record: ${record.type} (${record.id}), Follow-up: ${followUpDate.toISOString()}`);
          });
          
          // Save all health records to state for use in next checkup calculation
          setRecentHealthRecords(healthRecords);
          
          // Load actual weight records from the weight records table (same as Health page)
          const allWeightRecords = await unifiedDatabaseManager.weightRecords.getAll();
          const petWeightRecords = allWeightRecords
            .filter(record => record.petId === petToLoadId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
          // If no weight records exist, create one from pet's current weight (same as Health page)
          if (petWeightRecords.length === 0 && pet) {
            const initialWeight: Omit<WeightRecord, 'id'> = {
              petId: petToLoadId,
              date: new Date(),
              weight: pet.weight,
              unit: pet.weightUnit,
              notes: 'Initial weight from profile',
              bodyConditionScore: 3
            };
            
            try {
              const createdRecord = await unifiedDatabaseManager.weightRecords.create(initialWeight);
              petWeightRecords.push(createdRecord);
              console.log('Created initial weight record:', createdRecord);
            } catch (error) {
              console.error('Error creating initial weight record:', error);
              // Fallback to in-memory record for display
              petWeightRecords.push({
                id: `initial-weight-${petToLoadId}`,
                ...initialWeight
              } as WeightRecord);
            }
          }
  
          setWeightRecords(petWeightRecords);
          console.log(`Loaded ${petWeightRecords.length} weight records for pet ${pet.name}`);
          
          // Load recent health records (last 7 days) for display
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          // Filter to recent health records (last 7 days)
          const recentRecords = healthRecords.filter(
            (record: HealthRecord) => {
              try {
                return new Date(record.date) >= sevenDaysAgo;
              } catch (e) {
                console.error(`Error parsing record date: ${e}`);
                return false;
              }
            }
          );
          
          // Find health records with follow-up dates that match today
          today.setHours(0, 0, 0, 0);
          const followUpsDueToday = healthRecords.filter(record => {
            if (!record.followUpNeeded || !record.followUpDate || record.status === 'completed') {
              return false;
            }
            
            try {
              const followUpDate = new Date(record.followUpDate);
              followUpDate.setHours(0, 0, 0, 0);
              const isToday = followUpDate.toDateString() === today.toDateString();
              
              if (isToday) {
                console.log(`Follow-up due today: ${record.type} (${record.title || ''}), date: ${followUpDate.toISOString()}`);
              }
              
              return isToday;
            } catch (e) {
              console.error(`Error checking follow-up date: ${e}`);
              return false;
            }
          });
          
          console.log(`Found ${followUpsDueToday.length} health record follow-ups due today`);
          
          // Combine recent records with follow-ups due today (avoiding duplicates)
          const healthRecordsToDisplay = [...recentRecords];
          
          // Add follow-ups that aren't already in the recent records
          followUpsDueToday.forEach(followUp => {
            if (!healthRecordsToDisplay.some(record => record.id === followUp.id)) {
              healthRecordsToDisplay.push(followUp);
            }
          });
          
          const formattedActivities = formatActivities(petTasks, petMeals, healthRecordsToDisplay);
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
      // Only update loading state if not a silent reload
      if (!silentReload) {
        setLoading(false);
      }
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
    loadHomeData(false); // Show loading screen on initial mount
    
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
        console.log('Home screen in focus, refreshing image cache');
        refreshImageCache();
        
        console.log('Home screen focused, checking if data reload is needed');
        
        // Update navigation state when Home screen comes into focus
        console.log('[Home] Updating current route to Home');
        updateCurrentRoute('Home');
        
        // Check if we need to load data (not already loading and either first load or active pet changed)
        const storedActivePetId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
        
        if (isLoadingRef.current) {
          console.log('Already loading data, skipping...');
          return;
        }
        
        // Always reload data when returning to Home screen to reflect any changes made in other screens
        // Use silent reload to avoid showing loading screen during navigation
        console.log('Reloading home data to refresh activities and task status...');
        await loadHomeData(true);
      };
      
      loadData();
      
      return () => {
        // Clean up if needed
      };
    }, [loadHomeData])
  );
  
  // Use useCallback for the getTodaysActivities function
  const getTodaysActivities = useCallback((allActivities: Activity[]): Activity[] => {
    const today = new Date();
    const todayString = format(today, 'MMM d');
    
    return allActivities.filter(activity => {
      if (!activity.time) return false;
      
      // Check if the activity time includes today's date (just month and day)
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
  
  // Enhanced next checkup calculation to include type information
  const nextCheckupInfo = useMemo(() => {
    if (!recentHealthRecords || recentHealthRecords.length === 0) {
      return { 
        date: 'No upcoming checkup',
        type: 'checkup',
        title: '',
        hasUpcoming: false
      };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a list of upcoming health events (follow-ups and future checkups)
    const upcomingEvents: { date: Date; type: string; title?: string; recordId: string }[] = [];
    
    // Process health records to find upcoming follow-ups
    recentHealthRecords.forEach(record => {
      // Check for follow-up dates (this is the primary way to find next health events)
      if (record.followUpNeeded && record.followUpDate) {
        try {
          const followUpDate = new Date(record.followUpDate);
          
          // Check if there's already a follow-up health record for this original record
          // Look for health records that were created after the original record date
          const originalRecordDate = new Date(record.date);
          const hasFollowUpRecord = recentHealthRecords.some(followUpRecord => {
            if (followUpRecord.id === record.id) return false; // Skip the same record
            
            const followUpRecordDate = new Date(followUpRecord.date);
            
            // Check if this record is of the same type and created after the original
            // and is within reasonable timeframe of the follow-up date (within 30 days)
            const timeDifference = Math.abs(followUpRecordDate.getTime() - followUpDate.getTime());
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
            
            return followUpRecord.type === record.type && 
                   followUpRecordDate.getTime() > originalRecordDate.getTime() &&
                   timeDifference <= thirtyDaysInMs;
          });
          
          // If there's already a follow-up record, don't show this as overdue
          if (hasFollowUpRecord) {
            console.log(`Skipping ${record.type} follow-up because follow-up record exists`);
            return;
          }
          
          // Calculate how many days overdue this is
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          twoDaysAgo.setHours(0, 0, 0, 0);
          
          // Only include if it's not more than 2 days overdue OR it's in the future
          if (followUpDate.getTime() >= twoDaysAgo.getTime()) {
            upcomingEvents.push({
              date: followUpDate,
              type: record.type,
              title: record.title,
              recordId: record.id
            });
            
            console.log(`Added ${record.type} follow-up: ${record.title} on ${followUpDate.toISOString()}`);
          } else {
            console.log(`Skipping ${record.type} follow-up because it's more than 2 days overdue`);
          }
        } catch (error) {
          console.error(`Error parsing follow-up date: ${error}`);
        }
      }
    });
    
    // Sort upcoming events by date (earliest first)
    upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // If we found upcoming health events, use the earliest one
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const isOverdue = nextEvent.date.getTime() < today.getTime();
      
      return {
        date: isOverdue ? 'Overdue' : format(nextEvent.date, 'MMM d, yyyy'),
        type: nextEvent.type,
        title: nextEvent.title || '',
        hasUpcoming: true
      };
    }
    
    // If no upcoming events, show "No upcoming checkup"
    return { 
      date: 'No upcoming checkup',
      type: 'checkup',
      title: '',
      hasUpcoming: false
    };
  }, [recentHealthRecords]);
  
  const nextCheckupDate = useMemo(() => {
    return nextCheckupInfo.date;
  }, [nextCheckupInfo]);

  // Calculate the most recent health record by date
  const mostRecentHealthRecord = useMemo(() => {
    if (!recentHealthRecords || recentHealthRecords.length === 0) {
      return null;
    }
    
    // Sort health records by date (most recent first)
    const sortedRecords = [...recentHealthRecords].sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      } catch (error) {
        console.error('Error sorting health records by date:', error);
        return 0;
      }
    });
    
    return sortedRecords[0];
  }, [recentHealthRecords]);

  // Calculate weight trend based on health records with weight data (matching Health page logic)
  const weightTrend = useMemo(() => {
    // This will be updated when we load weight records properly
    return {
      trend: 'stable',
      text: 'Loading...',
      icon: 'remove',
      color: '#6B7280'
    };
  }, []);

  // Add state for weight records (same as Health page)
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  
  // Calculate weight trend using actual weight records (exactly like Health page)
  const calculatedWeightTrend = useMemo(() => {
    if (weightRecords.length < 2) {
      return {
        trend: 'stable',
        text: 'No data',
        icon: 'remove',
        color: '#6B7280'
      };
    }

    // Sort weights by date (newest first) - same as Health page calculateHealthMetrics
    const sortedWeights = [...weightRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const currentWeight = sortedWeights[0].weight;
    const previousWeight = sortedWeights[1].weight;
    const weightChange = currentWeight - previousWeight;

    // Health page logic: if change is less than 0.1, it's stable
    if (Math.abs(weightChange) < 0.1) {
      return {
        trend: 'stable',
        text: 'Stable',
        icon: 'remove',
        color: '#4CAF50'
      };
    } else if (weightChange > 0) {
      return {
        trend: 'up',
        text: `+${Math.abs(weightChange).toFixed(1)}${activePet?.weightUnit || 'kg'}`,
        icon: 'trending-up',
        color: '#f59e0b' // Use same orange as Health page WeightTrendCard
      };
    } else {
      return {
        trend: 'down',
        text: `-${Math.abs(weightChange).toFixed(1)}${activePet?.weightUnit || 'kg'}`,
        icon: 'trending-down',
        color: '#3b82f6' // Use same blue as Health page WeightTrendCard
      };
    }
  }, [weightRecords, activePet?.weightUnit]);
  
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

  // Function to handle health record follow-up click
  const handleHealthRecordClick = useCallback((activityId: string) => {
    // Extract health record ID from activity ID (format: "followup-{recordId}")
    const recordId = activityId.replace('followup-', '');
    
    // Find the health record
    const healthRecord = recentHealthRecords.find(record => record.id === recordId);
    
    if (healthRecord) {
      setSelectedHealthRecord(healthRecord);
      setHealthRecordModalVisible(true);
    } else {
      toast({
        title: "Health record not found",
        description: "Unable to find the health record details",
        variant: 'destructive'
      });
    }
  }, [recentHealthRecords, toast]);
  
  // Function to mark health record follow-up as complete
  const markFollowUpComplete = useCallback(async () => {
    if (!selectedHealthRecord) return;
    
    setIsMarkingComplete(true);
    
    try {
      // Update the health record to mark follow-up as complete
      const currentDate = new Date();
      const updatedRecord = {
        ...selectedHealthRecord,
        followUpNeeded: false,
        status: 'completed' as const,
        // Update the date to reflect when the follow-up was actually completed
        date: currentDate
      };
      
      await unifiedDatabaseManager.healthRecords.update(selectedHealthRecord.id, updatedRecord);
      
      toast({
        title: "Follow-up completed",
        description: `Health record follow-up completed on ${format(currentDate, 'MMM d, yyyy')}`,
        variant: 'default'
      });
      
      // Close modal and refresh data
      setHealthRecordModalVisible(false);
      setSelectedHealthRecord(null);
      
      // Refresh the home data to update the schedule
      await loadHomeData();
      
    } catch (error) {
      console.error('Error marking follow-up as complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark follow-up as complete",
        variant: 'destructive'
      });
    } finally {
      setIsMarkingComplete(false);
    }
  }, [selectedHealthRecord, toast, loadHomeData]);
  
  // Function to close health record modal
  const closeHealthRecordModal = useCallback(() => {
    setHealthRecordModalVisible(false);
    setSelectedHealthRecord(null);
  }, []);

  // Health Record Details Modal Component
  const HealthRecordModal = React.memo(() => {
    if (!selectedHealthRecord) return null;
    
    const formatDate = (dateString: string | Date) => {
      try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return format(date, 'MMM d, yyyy');
      } catch {
        return typeof dateString === 'string' ? dateString : dateString.toString();
      }
    };
    
    const formatTime = (dateString: string | Date) => {
      try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return format(date, 'h:mm a');
      } catch {
        return '';
      }
    };
    
    return (
      <Modal
        visible={healthRecordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeHealthRecordModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeHealthRecordModal}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Health Record Details</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.healthRecordCard, { backgroundColor: colors.card }]}>
              <View style={styles.healthRecordHeader}>
                <View style={[styles.healthRecordIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Icon name="fitness-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.healthRecordInfo}>
                  <Text style={[styles.healthRecordType, { color: colors.text }]}>
                    {selectedHealthRecord.type}
                  </Text>
                  {selectedHealthRecord.title && (
                    <Text style={[styles.healthRecordTitle, { color: colors.text + '80' }]}>
                      {selectedHealthRecord.title}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.healthRecordDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Date:</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatDate(selectedHealthRecord.date)}
                  </Text>
                </View>
                
                {selectedHealthRecord.followUpDate && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Follow-up Due:</Text>
                    <Text style={[styles.detailValue, { color: '#FF9800' }]}>
                      {formatDate(selectedHealthRecord.followUpDate)}
                    </Text>
                  </View>
                )}
                
                {selectedHealthRecord.description && (
                  <View style={styles.detailColumn}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Description:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>
                      {selectedHealthRecord.description}
                    </Text>
                  </View>
                )}
                
                {selectedHealthRecord.treatment && (
                  <View style={styles.detailColumn}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Treatment:</Text>
                    <Text style={[styles.detailValue, { color: colors.text, marginTop: 4 }]}>
                      {selectedHealthRecord.treatment}
                    </Text>
                  </View>
                )}
                
                {selectedHealthRecord.veterinarian && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Veterinarian:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedHealthRecord.veterinarian}
                    </Text>
                  </View>
                )}
                
                {selectedHealthRecord.medications && selectedHealthRecord.medications.length > 0 && (
                  <View style={styles.detailColumn}>
                    <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Medications:</Text>
                    <View style={{ marginTop: 4 }}>
                      {selectedHealthRecord.medications.map((medication, index) => (
                        <Text key={index} style={[styles.detailValue, { color: colors.text, marginBottom: 2 }]}>
                          • {medication.name} - {medication.dosage}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text + '80' }]}>Status:</Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: selectedHealthRecord.followUpNeeded ? '#FF980020' : '#4CAF5020' }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: selectedHealthRecord.followUpNeeded ? '#FF9800' : '#4CAF50' }
                    ]}>
                      {selectedHealthRecord.followUpNeeded ? 'Follow-up Required' : 'Completed'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {selectedHealthRecord.followUpNeeded && (
              <View style={[styles.followUpSection, { backgroundColor: colors.card }]}>
                <Icon name="alarm-outline" size={24} color="#FF9800" />
                <Text style={[styles.followUpText, { color: colors.text }]}>
                  This health record requires a follow-up. Mark as complete when the follow-up care has been provided.
                </Text>
              </View>
            )}
          </ScrollView>
          
          {selectedHealthRecord.followUpNeeded && (
            <View style={[styles.modalFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.completeFollowUpButton, { backgroundColor: colors.primary }]}
                onPress={markFollowUpComplete}
                disabled={isMarkingComplete}
              >
                {isMarkingComplete ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="checkmark-circle-outline" size={20} color="white" />
                    <Text style={styles.completeFollowUpButtonText}>Mark Follow-up Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  });

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
                  loadHomeData(false);
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
              {/* Edit Button */}
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: colors.primary + '10' }]}
                onPress={() => navigation.navigate('EditPet', { petId: activePet.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={16} color={colors.primary} />
              </TouchableOpacity>
              
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
                          { backgroundColor: colors.primary + '20' },
                        ]}
                      >
                        <ResponsiveText
                          variant="label"
                          maxFontSizeMultiplier={1.2}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.8}
                          style={{
                            color: colors.primary,
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                        >
                          {activePet.adoptionDate 
                            ? format(new Date(activePet.adoptionDate), 'MMM yyyy')
                            : 'Forever home'
                          }
                        </ResponsiveText>
                      </View>
                      <Text style={[styles.petStatLabel, { color: colors.text + '60' }]}>Family since</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardAction, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => navigation.navigate('Feeding', { refresh: true })}
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
                      onPress={() => {
                        if (activity.category === 'health-followup') {
                          handleHealthRecordClick(activity.id);
                        }
                      }}
                      disabled={activity.category !== 'health-followup'}
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
                          <View style={[styles.completedStatusContainer, { backgroundColor: "#2dce8920" }]}>
                            <Icon name="checkmark-circle" size={16} color="#2dce89" />
                            <Text style={[styles.completedText, { color: "#2dce89", marginLeft: 4 }]}>Completed</Text>
                          </View>
                        ) : activity.category === 'health-followup' ? (
                          // Only show timer icon for health follow-up reminders, no text
                          <Icon name="time-outline" size={24} color="#fb6340" />
                        ) : (
                          <View style={[styles.pendingStatusContainer, { backgroundColor: "#fb634020" }]}>
                            <Icon name="time-outline" size={16} color="#fb6340" />
                            <Text style={[styles.completedText, { color: "#fb6340", marginLeft: 4 }]}>Pending</Text>
                          </View>
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
                    style={[
                      createResponsiveButtonStyle('primary', 'medium'),
                      { backgroundColor: colors.primary }
                    ]}
                    onPress={() => navigation.navigate('Schedule')}
                  >
                    <ButtonText style={{ color: '#ffffff' }}>Add Activity</ButtonText>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
              Pet Health Overview
            </Text>
            
            {/* Enhanced Health Overview with Grid Layout */}
            <View style={styles.healthOverviewContainer}>
              {/* Health Metrics Grid */}
              <View style={styles.healthMetricsGrid}>
                {/* Next Checkup Card */}
                <TouchableOpacity 
                  style={[styles.healthMetricCard, { backgroundColor: colors.card }]}
                  onPress={() => navigation.navigate('Health')}
                  activeOpacity={0.7}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIconGroup}>
                      <View style={[styles.metricIconContainer, { 
                        backgroundColor: (nextCheckupInfo.hasUpcoming !== false) ? '#FF9800' + '20' : '#6B7280' + '20' 
                      }]}>
                        <Icon 
                          name={(nextCheckupInfo.hasUpcoming !== false) ? "calendar" : "calendar-outline"} 
                          size={20} 
                          color={(nextCheckupInfo.hasUpcoming !== false) ? "#FF9800" : "#6B7280"} 
                        />
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.metricTitle, { color: colors.text }]}>
                    {(nextCheckupInfo.hasUpcoming !== false) 
                      ? (nextCheckupInfo.type ? `Next ${nextCheckupInfo.type.charAt(0).toUpperCase() + nextCheckupInfo.type.slice(1)}` : 'Next Checkup')
                      : 'Schedule Checkup'
                    }
                  </Text>
                  <Text style={[styles.metricValue, { 
                    color: nextCheckupDate === 'Overdue' ? '#F44336' : 
                           (nextCheckupInfo.hasUpcoming !== false) ? colors.text : colors.text + '60' 
                  }]}>
                    {nextCheckupDate}
                  </Text>
                  {nextCheckupInfo.title && (
                    <Text style={[styles.metricSubtitle, { color: colors.text + '70' }]} numberOfLines={1}>
                      {nextCheckupInfo.title}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Weight Trend Card */}
                <TouchableOpacity 
                  style={[styles.healthMetricCard, { backgroundColor: colors.card }]}
                  onPress={() => navigation.navigate('WeightTrend' as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIconGroup}>
                      <View style={[styles.metricIconContainer, { backgroundColor: '#2196F3' + '20' }]}>
                        <Icon name="fitness" size={20} color="#2196F3" />
                      </View>
                      <View style={[styles.trendIndicator, { backgroundColor: calculatedWeightTrend.color + '20' }]}>
                        <Icon name={calculatedWeightTrend.icon} size={14} color={calculatedWeightTrend.color} />
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.metricTitle, { color: colors.text }]}>Weight</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {activePet?.weight} {activePet?.weightUnit}
                  </Text>
                  <Text style={[styles.metricSubtitle, { color: calculatedWeightTrend.color }]}>
                    {calculatedWeightTrend.text}
                  </Text>
                </TouchableOpacity>

                {/* Recent Activity Card */}
                <TouchableOpacity 
                  style={[styles.healthMetricCard, { backgroundColor: colors.card }]}
                  onPress={() => navigation.navigate('Health')}
                  activeOpacity={0.7}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIconGroup}>
                      <View style={[styles.metricIconContainer, { backgroundColor: '#9C27B0' + '20' }]}>
                        <Icon name="time" size={20} color="#9C27B0" />
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.metricTitle, { color: colors.text }]}>Last Visit</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {mostRecentHealthRecord 
                      ? format(new Date(mostRecentHealthRecord.date), 'MMM d')
                      : 'No records'
                    }
                  </Text>
                  <Text style={[styles.metricSubtitle, { color: colors.text + '70' }]}>
                    {mostRecentHealthRecord 
                      ? mostRecentHealthRecord.type
                      : 'Add first record'
                    }
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Health Actions */}
              <View style={styles.healthActionsContainer}>
                <Text style={[styles.healthActionsTitle, { color: colors.text }]}>Quick Actions</Text>
                <View style={styles.healthActionsGrid}>
                  <TouchableOpacity 
                    style={[styles.modernActionCard, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('AddHealthRecord', { petId: activePetId || '' })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Icon name="add-circle" size={28} color={colors.primary} />
                    </View>
                    <ButtonText 
                      style={[styles.quickActionText, { color: colors.text }]}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={2}
                    >
                      Add Record
                    </ButtonText>
                    <Text style={[styles.actionSubtext, { color: colors.text + '70' }]}>
                      Health visit
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modernActionCard, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('AddMedication', { petId: activePetId || '' })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#FF9800' + '15' }]}>
                      <Icon name="medical" size={28} color="#FF9800" />
                    </View>
                    <ButtonText 
                      style={[styles.quickActionText, { color: colors.text }]}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={2}
                    >
                      Add Medication
                    </ButtonText>
                    <Text style={[styles.actionSubtext, { color: colors.text + '70' }]}>
                      Medicine
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modernActionCard, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('Health')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: '#2196F3' + '15' }]}>
                      <Icon name="analytics" size={28} color="#2196F3" />
                    </View>
                    <ButtonText 
                      style={[styles.quickActionText, { color: colors.text }]}
                      maxFontSizeMultiplier={1.2}
                      numberOfLines={2}
                    >
                      View Analytics
                    </ButtonText>
                    <Text style={[styles.actionSubtext, { color: colors.text + '70' }]}>
                      Insights
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
      <HealthRecordModal />
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
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
    position: 'relative',
    minHeight: 140,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  petCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petInfo: {
    marginLeft: 20,
    flex: 1,
    paddingRight: 40,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  petBreed: {
    fontSize: 14,
    marginTop: 2,
    marginBottom: 4,
  },
  petStatsRow: {
    flexDirection: 'row',
    marginTop: 12,
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
    minWidth: 0, // Allow shrinking if needed
    flexShrink: 1, // Allow container to shrink
    alignItems: 'center', // Center the text
    justifyContent: 'center',
  },
  healthIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 4,
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
    marginRight: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleTime: {
    fontSize: 14,
  },
  scheduleStatus: {
    width: 80,
    alignItems: 'flex-end',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
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
  healthCardSubtitle: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
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
  completedStatusContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  healthRecordCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  healthRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthRecordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthRecordInfo: {
    flex: 1,
  },
  healthRecordType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  healthRecordTitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  healthRecordDetails: {
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  detailColumn: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  followUpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  followUpText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  completeFollowUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  completeFollowUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  primaryHealthCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  healthStatusGradient: {
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthStatusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  healthStatusInfo: {
    flex: 1,
  },
  healthStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  healthStatusValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  healthScoreContainer: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  healthScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  healthScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthStatusDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
  },
  healthMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  healthMetricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  healthActionsContainer: {
    marginBottom: 16,
  },
  healthActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  healthActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  healthActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  trendIndicator: {
    width: 24,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modernActionCard: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionSubtext: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
});

// Export with React.memo for better performance
export default React.memo(Home);