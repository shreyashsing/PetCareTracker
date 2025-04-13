import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Alert } from 'react-native';
import { useActivePet } from '../hooks/useActivePet';
import { format, addDays, isToday, isTomorrow, isSameDay } from 'date-fns';
import { TopNavBar } from '../components';
import { useAppColors } from '../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { databaseManager, STORAGE_KEYS } from '../services/db';
import { AsyncStorageService } from '../services/db/asyncStorage';
import { formatDate } from '../utils/helpers';
import { useFocusEffect } from '@react-navigation/native';
import Footer from '../components/layout/Footer';

type ScheduleScreenProps = NativeStackScreenProps<RootStackParamList, 'Schedule'>;

type Task = {
  id: string;
  time: string;
  title: string;
  completed: boolean;
  category?: 'feeding' | 'medication' | 'exercise' | 'grooming' | 'training' | 'veterinary' | 'social' | 'other';
  icon?: keyof typeof Ionicons.glyphMap;
};

type UpcomingEvent = {
  id: string;
  date: Date;
  title: string;
  time?: string;
  category?: 'feeding' | 'medication' | 'exercise' | 'grooming' | 'training' | 'veterinary' | 'social' | 'other';
  icon?: keyof typeof Ionicons.glyphMap;
  completed?: boolean;
};

export default function Schedule({ navigation }: ScheduleScreenProps) {
  const { activePetId } = useActivePet();
  const { colors, isDark } = useAppColors();
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d, yyyy');
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load data from database
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get active pet ID if not provided through context
      let petId = activePetId;
      if (!petId) {
        petId = await AsyncStorageService.getItem<string>(STORAGE_KEYS.ACTIVE_PET_ID);
      }
      
      if (petId) {
        // Get tasks for the selected date (today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayTasks = await databaseManager.tasks.getByPetIdAndDate(petId, today);
        
        // Format today's tasks for UI display
        const formattedTodayTasks = todayTasks.map(task => {
          let icon = 'calendar-outline';
          
          switch (task.category) {
            case 'exercise':
              icon = 'walk-outline';
              break;
            case 'medication':
              icon = 'medkit-outline';
              break;
            case 'feeding':
              icon = 'fast-food-outline';
              break;
            case 'grooming':
              icon = 'cut-outline';
              break;
            case 'veterinary':
              icon = 'medical-outline';
              break;
            case 'training':
              icon = 'barbell-outline';
              break;
            default:
              icon = 'calendar-outline';
          }
          
          const taskTime = new Date(task.scheduleInfo.time);
          const formattedTime = taskTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          
          return {
            id: task.id,
            time: formattedTime,
            title: task.title,
            completed: task.status === 'completed',
            category: task.category,
            icon: icon as keyof typeof Ionicons.glyphMap
          };
        });
        
        // Sort tasks by time
        formattedTodayTasks.sort((a, b) => {
          const timeA = a.time;
          const timeB = b.time;
          return timeA.localeCompare(timeB);
        });
        
        setTasks(formattedTodayTasks);
        
        // Get upcoming tasks for this pet (next 14 days, excluding today)
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        
        const allTasks = await databaseManager.tasks.getByPetId(petId);
        
        // Filter for upcoming tasks within the next 14 days
        const upcomingTasks = allTasks.filter(task => {
          const taskDate = new Date(task.scheduleInfo.date);
          taskDate.setHours(0, 0, 0, 0);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          
          // Include only future dates (not today)
          return taskDate > todayDate && taskDate <= twoWeeksLater;
        });
        
        // Sort by date
        upcomingTasks.sort((a, b) => {
          const dateA = new Date(a.scheduleInfo.date);
          const dateB = new Date(b.scheduleInfo.date);
          return dateA.getTime() - dateB.getTime();
        });
        
        // Transform to UI format
        const formattedEvents = upcomingTasks.map(task => {
          // Get icon based on category
          let icon = 'calendar-outline';
          
          switch (task.category) {
            case 'exercise':
              icon = 'walk-outline';
              break;
            case 'medication':
              icon = 'medkit-outline';
              break;
            case 'feeding':
              icon = 'fast-food-outline';
              break;
            case 'grooming':
              icon = 'cut-outline';
              break;
            case 'veterinary':
              icon = 'medical-outline';
              break;
            case 'training':
              icon = 'barbell-outline';
              break;
            default:
              icon = 'calendar-outline';
          }
          
          const taskTime = new Date(task.scheduleInfo.time);
          const formattedTime = taskTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          
          const eventDate = new Date(task.scheduleInfo.date);
          
          return {
            id: task.id,
            date: eventDate,
            time: formattedTime,
            title: task.title,
            category: task.category,
            icon: icon as keyof typeof Ionicons.glyphMap,
            completed: task.status === 'completed'
          };
        });
        
        setUpcomingEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseManager.tasks.delete(taskId);
              loadData(); // Reload data after deletion
            } catch (error) {
              console.error('Error deleting task:', error);
            }
          },
        },
      ]
    );
  };

  // Toggle task completion status
  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    try {
      const newStatus = currentStatus ? 'pending' : 'completed';
      await databaseManager.tasks.updateStatus(taskId, newStatus);
      loadData(); // Reload data after status change
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Use useFocusEffect to reload data whenever the screen becomes focused
  // This ensures that when the user adds or edits a task and comes back to this screen, 
  // the data will be refreshed
  useFocusEffect(
    React.useCallback(() => {
      console.log('Schedule screen focused - loading data');
      // Always reload data when coming back to this screen
      loadData();
      return () => {
        // Cleanup function (optional)
      };
    // Empty dependency array means this will run on every focus
    }, [])
  );
  
  // Get category color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'exercise':
        return colors.primary;
      case 'medication':
        return colors.warning;
      case 'feeding':
        return colors.info;
      case 'grooming':
        return colors.secondary;
      case 'veterinary':
        return colors.error;
      case 'training':
        return '#ffd600';
      default:
        return colors.primary;
    }
  };

  // Get category icon
  const getCategoryIcon = (category?: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'exercise':
        return 'walk-outline';
      case 'medication':
        return 'medkit-outline';
      case 'feeding':
        return 'restaurant-outline';
      case 'grooming':
        return 'cut-outline';
      case 'veterinary':
        return 'medical-outline';
      case 'training':
        return 'barbell-outline';
      default:
        return 'calendar-outline';
    }
  };

  // Format date for display
  const formatEventDate = (date: Date) => {
    if (isToday(date)) {
      return 'Today';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEEE, MMMM d');
    }
  };

  // Filter tasks for selected date
  const filteredTasks = tasks.filter(task => {
    // In a real app, tasks would have dates and we'd filter by date
    // For now, we'll just show all tasks for today
    return true;
  });

  // Filter upcoming events
  const filteredUpcomingEvents = upcomingEvents.filter(event => {
    return !isToday(event.date) && !isSameDay(event.date, selectedDate);
  });

  if (!activePetId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopNavBar title="Schedule" />
        <View style={styles.centerContainer}>
          <Text style={[styles.noSelectionText, { color: colors.text }]}>Please select a pet to view schedule</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavBar title="Pet Schedule" />
      
      <LinearGradient
        colors={[colors.primary + '20', colors.secondary + '20', 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: colors.text }]}>{formattedDate}</Text>
            <Text style={[styles.dateSubtext, { color: colors.text + '80' }]}>
              {filteredTasks.length} tasks today
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate({
              name: 'AddTask',
              params: { petId: activePetId || undefined }
            })}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'today' && styles.activeTab]} 
          onPress={() => setActiveTab('today')}
        >
          <Ionicons 
            name="today-outline" 
            size={20} 
            color={activeTab === 'today' ? colors.primary : colors.text + '60'} 
          />
          <Text style={[styles.tabText, { color: activeTab === 'today' ? colors.primary : colors.text + '60' }]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]} 
          onPress={() => setActiveTab('upcoming')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={activeTab === 'upcoming' ? colors.primary : colors.text + '60'} 
          />
          <Text style={[styles.tabText, { color: activeTab === 'upcoming' ? colors.primary : colors.text + '60' }]}>
            Upcoming
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'today' ? (
          <>
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <View 
                  key={task.id} 
                  style={[styles.taskCard, { backgroundColor: colors.card }]}
                >
                  <View style={[styles.taskTimeContainer, { backgroundColor: getCategoryColor(task.category) + '15' }]}>
                    <Ionicons name={task.icon || getCategoryIcon(task.category)} size={24} color={getCategoryColor(task.category)} />
                    <Text style={[styles.taskTime, { color: getCategoryColor(task.category) }]}>{task.time}</Text>
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                    <TouchableOpacity 
                      style={[
                        styles.taskStatusButton,
                        task.completed ? { backgroundColor: colors.success + '20' } : { backgroundColor: colors.warning + '20' }
                      ]}
                      onPress={() => toggleTaskCompletion(task.id, task.completed)}
                    >
                      <Ionicons 
                        name={task.completed ? "checkmark-circle" : "time-outline"} 
                        size={16} 
                        color={task.completed ? colors.success : colors.warning} 
                      />
                      <Text style={[styles.taskStatusText, { color: task.completed ? colors.success : colors.warning }]}>
                        {task.completed ? 'Completed' : 'Pending'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.taskActionButton}
                      onPress={() => navigation.navigate({
                        name: 'AddTask',
                        params: { 
                          petId: activePetId || undefined,
                          taskId: task.id 
                        }
                      })}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.taskActionButton}
                      onPress={() => handleDeleteTask(task.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={48} color={colors.text + '40'} />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>No tasks scheduled for today</Text>
                <TouchableOpacity 
                  style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate({
                    name: 'AddTask',
                    params: { petId: activePetId || undefined }
                  })}
                >
                  <Text style={styles.emptyStateButtonText}>Add a Task</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            {filteredUpcomingEvents.length > 0 ? (
              filteredUpcomingEvents.map(event => (
                <View 
                  key={event.id} 
                  style={[styles.upcomingCard, { backgroundColor: colors.card }]}
                >
                  <View style={[styles.upcomingIconContainer, { backgroundColor: getCategoryColor(event.category) + '15' }]}>
                    <Ionicons name={event.icon || getCategoryIcon(event.category)} size={24} color={getCategoryColor(event.category)} />
                  </View>
                  <View style={styles.upcomingContent}>
                    <Text style={[styles.upcomingDate, { color: colors.text }]}>{formatEventDate(event.date)}</Text>
                    <Text style={[styles.upcomingTitle, { color: colors.text }]}>{event.title}</Text>
                    {event.time && (
                      <Text style={[styles.upcomingTime, { color: colors.text + '80' }]}>
                        <Ionicons name="time-outline" size={14} color={colors.text + '80'} /> {event.time}
                      </Text>
                    )}
                    {event.completed !== undefined && (
                      <View style={[
                        styles.upcomingStatusIndicator, 
                        { backgroundColor: event.completed ? colors.success + '20' : colors.warning + '20' }
                      ]}>
                        <Ionicons 
                          name={event.completed ? "checkmark-circle" : "time-outline"} 
                          size={14} 
                          color={event.completed ? colors.success : colors.warning} 
                        />
                        <Text style={[
                          styles.upcomingStatusText, 
                          { color: event.completed ? colors.success : colors.warning }
                        ]}>
                          {event.completed ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.upcomingActions}>
                    <TouchableOpacity
                      style={styles.upcomingActionButton}
                      onPress={() => navigation.navigate({
                        name: 'AddTask',
                        params: { 
                          petId: activePetId || undefined,
                          taskId: event.id 
                        }
                      })}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.upcomingActionButton}
                      onPress={() => handleDeleteTask(event.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={48} color={colors.text + '40'} />
                <Text style={[styles.emptyStateText, { color: colors.text }]}>No upcoming events</Text>
                <TouchableOpacity 
                  style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate({
                    name: 'AddTask',
                    params: { petId: activePetId || undefined }
                  })}
                >
                  <Text style={styles.emptyStateButtonText}>Schedule an Event</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noSelectionText: {
    fontSize: 18,
    textAlign: 'center',
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateSubtext: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  taskTimeContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  taskTime: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  taskContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  taskStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  taskActions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  taskActionButton: {
    padding: 8,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  upcomingCard: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  upcomingIconContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  upcomingContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  upcomingDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  upcomingTime: {
    fontSize: 12,
  },
  upcomingStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
  },
  upcomingStatusText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  upcomingActions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  upcomingActionButton: {
    padding: 8,
  },
  upcomingButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
}); 