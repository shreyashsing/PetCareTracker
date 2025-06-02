import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Device from 'expo-device';
import { Task, Medication, Meal, FoodItem } from '../../types/components';
import {unifiedDatabaseManager} from "../db";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fcmService } from './fcm';
import { firebaseCloudFunctionsService } from './firebaseCloudFunctions';

/**
 * Pet Care Tracker Notification Service
 * 
 * IMPORTANT: Mobile devices have strict limits on the number of scheduled notifications.
 * Android typically allows 500 concurrent notifications per app.
 * iOS has a limit of 64 notifications per app.
 * 
 * When handling recurring notifications like medication reminders:
 * 1. Schedule only essential notifications for the near future (1-3 days)
 * 2. Use the rescheduleAllNotifications() method to clear and recreate notifications
 * 3. Prioritize time-sensitive notifications over far-future ones
 * 
 * If users encounter the "maximum limit of concurrent alarms reached" error:
 * - Use the Settings > Reset Notifications feature to clear all notifications
 * - This will cancel existing notifications and reschedule only the most important ones
 * - The app will automatically schedule new notifications as needed
 */

// Constants
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';
const SCHEDULED_MEDICATION_NOTIFICATIONS_KEY = 'scheduled_medication_notifications';
const SCHEDULED_MEAL_NOTIFICATIONS_KEY = 'scheduled_meal_notifications';
const INVENTORY_ALERT_NOTIFICATIONS_KEY = 'inventory_alert_notifications';
const NOTIFICATION_DELIVERY_LOG_KEY = 'notification_delivery_log';
const NOTIFICATION_DELIVERY_STATS_KEY = 'notification_delivery_stats';
const NOTIFICATION_RETRY_QUEUE_KEY = 'notification_retry_queue';
const NOTIFICATION_RETRY_CONFIG_KEY = 'notification_retry_config';
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';
const CRITICAL_REMINDERS_KEY = 'critical_reminders_backup';
const LAST_BACKGROUND_CHECK_KEY = 'last_background_check';
const PUSH_TOKEN_KEY = 'push_notification_token';
const BACKUP_NOTIFICATIONS_KEY = 'backup_notifications_queue';
const SERVER_BACKUP_ACTIVE_KEY = 'server_backup_active';
const DELIVERY_CONFIRMATION_KEY = 'delivery_confirmation_log';
const PERSISTENT_NOTIFICATIONS_KEY = 'persistent_notifications_v2';
const DEVICE_RESTART_DETECTION_KEY = 'device_restart_detection';
const NOTIFICATION_PERSISTENCE_VERSION = '2.0';

// Background task for handling notifications when app is closed
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    console.log('[Background Task] Processing expired notifications...');
    
    // Get the notification service instance
    const service = NotificationService.getInstance();
    
    // Process expired medications and critical reminders
    await service.processBackgroundNotifications();
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Task] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Types for scheduled notifications storage
 */
interface ScheduledNotification {
  id: string;
  taskId: string;
  petId: string;
  title: string;
  body: string;
  data: any;
  triggerTime: number; // timestamp
}

/**
 * Types for scheduled medication notifications storage
 */
interface ScheduledMedicationNotification {
  id: string;
  medicationId: string;
  petId: string;
  title: string;
  body: string;
  data: any;
  triggerTime: number; // timestamp
}

/**
 * Types for scheduled meal notifications storage
 */
interface ScheduledMealNotification {
  id: string;
  mealId: string;
  petId: string;
  title: string;
  body: string;
  data: any;
  triggerTime: number; // timestamp
}

/**
 * Types for inventory alert notifications storage
 */
interface InventoryAlertNotification {
  id: string;
  foodItemId: string;
  petId: string;
  title: string;
  body: string;
  data: any;
  triggerTime: number; // timestamp
}

/**
 * Interface for notification delivery tracking
 */
interface NotificationDeliveryLog {
  id: string;
  notificationId: string;
  type: 'task_reminder' | 'medication_reminder' | 'meal_reminder' | 'inventory_alert' | 'health_record_followup';
  status: 'scheduled' | 'delivered' | 'failed' | 'cancelled' | 'interacted';
  timestamp: number;
  scheduledTime: number;
  deliveredTime?: number;
  failureReason?: string;
  metadata: {
    taskId?: string;
    medicationId?: string;
    mealId?: string;
    foodItemId?: string;
    healthRecordId?: string;
    petId: string;
    title: string;
    body: string;
  };
}

/**
 * Interface for delivery statistics
 */
interface NotificationDeliveryStats {
  totalScheduled: number;
  totalDelivered: number;
  totalFailed: number;
  totalCancelled: number;
  totalInteracted: number;
  deliveryRate: number; // percentage
  interactionRate: number; // percentage
  lastUpdated: number;
}

/**
 * Interface for retry queue entry
 */
interface NotificationRetryEntry {
  id: string;
  originalNotificationId: string;
  type: 'task_reminder' | 'medication_reminder' | 'meal_reminder' | 'inventory_alert' | 'health_record_followup';
  content: {
    title: string;
    body: string;
    data: any;
  };
  originalTriggerTime: number;
  retryAttempts: number;
  maxRetries: number;
  nextRetryTime: number;
  backoffMultiplier: number;
  created: number;
  lastAttempt?: number;
  failureReasons: string[];
}

/**
 * Interface for retry configuration
 */
interface NotificationRetryConfig {
  enabled: boolean;
  maxRetries: number;
  initialDelayMinutes: number;
  backoffMultiplier: number;
  maxDelayHours: number;
  retryTimeoutHours: number; // After this time, stop retrying
}

/**
 * Interface for critical reminder backup
 */
interface CriticalReminder {
  id: string;
  type: 'medication' | 'task' | 'meal';
  entityId: string;
  petId: string;
  title: string;
  body: string;
  scheduledTime: number;
  priority: 'high' | 'critical';
  created: number;
  lastNotified?: number;
  notificationCount: number;
  maxNotifications: number;
}

/**
 * Interface for push notification token
 */
interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  created: number;
  lastUpdated: number;
}

/**
 * Interface for backup notification
 */
interface BackupNotification {
  id: string;
  type: string;
  scheduledTime: number;
  serverPayload: {
    pushToken: string;
    platform: string;
    notification: {
      title: string;
      body: string;
      data: any;
    };
    delivery: {
      immediate: boolean;
      scheduledFor: number;
      retryPolicy: {
        maxRetries: number;
        backoffMultiplier: number;
        initialDelay: number;
      };
    };
  };
  isCritical: boolean;
  retryCount: number;
}

/**
 * Interface for background task data
 */
interface BackgroundTaskData {
  data: any;
  error: Error | null;
  executionInfo: {
    taskName: string;
  };
}

/**
 * Notification Service class to handle scheduling and canceling notifications
 */
class NotificationService {
  private static instance: NotificationService;
  private initialized: boolean = false;
  private navigationRef: any = null; // Navigation reference for deep links
  private appStateSubscription: any = null;
  private backgroundTaskRegistered: boolean = false;
  private pushToken: string | null = null;
  
  // Singleton pattern
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Set the navigation reference for handling notification taps
   * @param navigationRef The navigation reference from React Navigation
   */
  setNavigationRef(navigationRef: any): void {
    this.navigationRef = navigationRef;
  }
  
  /**
   * Initialize notifications with comprehensive background support
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Check if running on a physical device (notifications don't work in simulator)
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices, not in the simulator');
        return false;
      }

      // Detect device restart and restore notifications
      await this.detectAndHandleDeviceRestart();

      // Request permission to show notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Save permission status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, finalStatus);
      
      if (finalStatus === 'granted') {
        // Set up push notification token
        await this.setupPushToken();
        
        // Initialize Firebase Cloud Functions service (for future use)
        await firebaseCloudFunctionsService.initialize();
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        // Enhanced background handling with persistence
        await this.setupEnhancedBackgroundHandling();
        
        // Set up app state change listeners
        this.setupAppStateListeners();
        
        // Initialize retry mechanism
        await this.initializeRetryMechanism();
        
        // Process any pending background notifications
        await this.processBackgroundNotifications();
        
        // Set up periodic notification health checks
        await this.setupNotificationHealthChecks();
      }
      
      // Initialize success
      this.initialized = finalStatus === 'granted';
      
      return this.initialized;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Detect device restart and restore critical notifications
   */
  private async detectAndHandleDeviceRestart(): Promise<void> {
    try {
      const lastAppSession = await AsyncStorage.getItem(DEVICE_RESTART_DETECTION_KEY);
      const currentTime = Date.now();
      
      // If no previous session or gap > 6 hours, likely a restart
      if (!lastAppSession || (currentTime - parseInt(lastAppSession)) > 6 * 60 * 60 * 1000) {
        console.log('Device restart detected - restoring critical notifications');
        
        // Restore persistent notifications
        await this.restorePersistentNotifications();
        
        // Reschedule all notifications
        await this.rescheduleAllNotifications();
      }
      
      // Update session timestamp
      await AsyncStorage.setItem(DEVICE_RESTART_DETECTION_KEY, currentTime.toString());
      
    } catch (error) {
      console.error('Error detecting device restart:', error);
    }
  }

  /**
   * Enhanced background handling with better persistence
   */
  private async setupEnhancedBackgroundHandling(): Promise<void> {
    try {
      // Register background fetch task with enhanced settings
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum interval
        stopOnTerminate: false, // Continue running when app is terminated
        startOnBoot: true, // Start when device boots
      });
      
      // Set up background app refresh for iOS
      if (Platform.OS === 'ios') {
        await BackgroundFetch.setMinimumIntervalAsync(15 * 60); // 15 minutes
      }
      
      this.backgroundTaskRegistered = true;
      console.log('Enhanced background notification task registered successfully');
      
      // Create persistent notification backup
      await this.createPersistentNotificationBackup();
      
    } catch (error) {
      console.error('Error registering enhanced background task:', error);
      this.backgroundTaskRegistered = false;
    }
  }

  /**
   * Create persistent backup of all critical notifications
   */
  private async createPersistentNotificationBackup(): Promise<void> {
    try {
      const now = Date.now();
      const next7Days = now + (7 * 24 * 60 * 60 * 1000);
      
      // Get all active medications
      const medications = await unifiedDatabaseManager.medications.find(
        medication => medication.status === 'active' && medication.reminderSettings?.enabled
      );
      
      // Get all pending tasks
      const tasks = await unifiedDatabaseManager.tasks.find(
        task => task.status !== 'completed' && task.reminderSettings?.enabled
      );
      
      // Get upcoming meals
      const meals = await unifiedDatabaseManager.meals.find(
        meal => new Date(meal.date).getTime() <= next7Days
      );
      
      const persistentNotifications = {
        version: NOTIFICATION_PERSISTENCE_VERSION,
        created: now,
        medications: medications.map(med => ({
          id: med.id,
          petId: med.petId,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          reminderTime: med.reminderSettings?.reminderTime || 0,
          startDate: med.duration.startDate,
          endDate: med.duration.endDate,
          priority: 'high'
        })),
        tasks: tasks.map(task => ({
          id: task.id,
          petId: task.petId,
          title: task.title,
          description: task.description,
          scheduledDate: task.scheduleInfo.date,
          scheduledTime: task.scheduleInfo.time,
          priority: task.priority || 'medium'
        })),
        meals: meals.map(meal => ({
          id: meal.id,
          petId: meal.petId,
          type: meal.type,
          date: meal.date,
          time: meal.time,
          priority: 'normal'
        }))
      };
      
      await AsyncStorage.setItem(PERSISTENT_NOTIFICATIONS_KEY, JSON.stringify(persistentNotifications));
      console.log('Created persistent notification backup');
      
    } catch (error) {
      console.error('Error creating persistent notification backup:', error);
    }
  }

  /**
   * Restore notifications from persistent backup
   */
  private async restorePersistentNotifications(): Promise<void> {
    try {
      const backupStr = await AsyncStorage.getItem(PERSISTENT_NOTIFICATIONS_KEY);
      if (!backupStr) return;
      
      const backup = JSON.parse(backupStr);
      const now = Date.now();
      
      console.log('Restoring notifications from persistent backup...');
      
      // Restore medication notifications
      for (const medData of backup.medications) {
        const medication = await unifiedDatabaseManager.medications.getById(medData.id);
        if (medication && medication.status === 'active') {
          await this.scheduleMedicationNotifications(medication);
        }
      }
      
      // Restore task notifications
      for (const taskData of backup.tasks) {
        const task = await unifiedDatabaseManager.tasks.getById(taskData.id);
        if (task && task.status !== 'completed') {
          await this.scheduleTaskNotifications(task);
        }
      }
      
      // Restore meal notifications
      for (const mealData of backup.meals) {
        if (new Date(mealData.date).getTime() > now) {
          const meal = await unifiedDatabaseManager.meals.getById(mealData.id);
          if (meal) {
            await this.scheduleMealNotifications(meal);
          }
        }
      }
      
      console.log('Restored notifications from persistent backup');
      
    } catch (error) {
      console.error('Error restoring persistent notifications:', error);
    }
  }

  /**
   * Set up periodic health checks for notifications
   */
  private async setupNotificationHealthChecks(): Promise<void> {
    try {
      // Check notification health every hour when app is active
      setInterval(async () => {
        if (AppState.currentState === 'active') {
          await this.performNotificationHealthCheck();
        }
      }, 60 * 60 * 1000); // 1 hour
      
    } catch (error) {
      console.error('Error setting up notification health checks:', error);
    }
  }

  /**
   * Perform health check on notification system
   */
  private async performNotificationHealthCheck(): Promise<void> {
    try {
      // Get currently scheduled notifications (using a workaround since getAllScheduledNotificationsAsync doesn't exist)
      const scheduledNotifications = await this.getScheduledNotificationCount();
      
      // Check if we have the expected number of notifications
      const expectedCount = await this.calculateExpectedNotificationCount();
      
      if (scheduledNotifications < expectedCount * 0.8) { // If less than 80% of expected
        console.log('Notification health check failed - rescheduling all notifications');
        await this.rescheduleAllNotifications();
      }
      
      // Update persistent backup
      await this.createPersistentNotificationBackup();
      
    } catch (error) {
      console.error('Error performing notification health check:', error);
    }
  }

  /**
   * Get count of scheduled notifications (workaround method)
   */
  private async getScheduledNotificationCount(): Promise<number> {
    try {
      // Get stored notification records to estimate count
      const [taskNotifs, medNotifs, mealNotifs] = await Promise.all([
        AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY),
        AsyncStorage.getItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY),
        AsyncStorage.getItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY)
      ]);
      
      const taskCount = taskNotifs ? JSON.parse(taskNotifs).length : 0;
      const medCount = medNotifs ? JSON.parse(medNotifs).length : 0;
      const mealCount = mealNotifs ? JSON.parse(mealNotifs).length : 0;
      
      return taskCount + medCount + mealCount;
      
    } catch (error) {
      console.error('Error getting scheduled notification count:', error);
      return 0;
    }
  }

  /**
   * Calculate expected number of notifications
   */
  private async calculateExpectedNotificationCount(): Promise<number> {
    try {
      const now = Date.now();
      const next3Days = now + (3 * 24 * 60 * 60 * 1000);
      
      // Count active medications
      const medications = await unifiedDatabaseManager.medications.find(
        medication => medication.status === 'active' && medication.reminderSettings?.enabled
      );
      
      // Count pending tasks in next 3 days
      const tasks = await unifiedDatabaseManager.tasks.find(
        task => task.status !== 'completed' && 
                task.reminderSettings?.enabled &&
                new Date(task.scheduleInfo.date).getTime() <= next3Days
      );
      
      // Estimate notifications per medication (3 days worth)
      const medicationNotifications = medications.reduce((count, med) => {
        const timesPerDay = med.frequency?.times || 1;
        return count + (timesPerDay * 3); // 3 days worth
      }, 0);
      
      // Task notifications (usually 1-3 per task)
      const taskNotifications = tasks.length * 2; // Average 2 notifications per task
      
      return medicationNotifications + taskNotifications;
      
    } catch (error) {
      console.error('Error calculating expected notification count:', error);
      return 0;
    }
  }

  /**
   * Set up push notification token for server-side notifications
   */
  private async setupPushToken(): Promise<void> {
    try {
      // Initialize FCM service
      const fcmInitialized = await fcmService.initialize();
      
      if (fcmInitialized) {
        // Get real FCM token
        this.pushToken = await fcmService.getFCMToken();
        
        if (this.pushToken) {
          // Store token with metadata
          const pushTokenInfo: PushToken = {
            token: this.pushToken,
            platform: Platform.OS as 'ios' | 'android',
            created: Date.now(),
            lastUpdated: Date.now()
          };
          
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(pushTokenInfo));
          console.log('FCM Push notification token set up:', this.pushToken);
        } else {
          console.warn('Failed to get FCM token');
        }
      } else {
        console.warn('FCM initialization failed, falling back to placeholder token');
        
        // Fallback to placeholder approach for development
        const deviceId = await AsyncStorage.getItem('deviceId') || 'unknown-device';
        this.pushToken = `expo-token-${deviceId}-${Date.now()}`;
        
        const pushTokenInfo: PushToken = {
          token: this.pushToken,
          platform: Platform.OS as 'ios' | 'android',
          created: Date.now(),
          lastUpdated: Date.now()
        };
        
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(pushTokenInfo));
        console.log('Fallback push notification token set up:', this.pushToken);
      }
      
    } catch (error) {
      console.error('Error setting up push token:', error);
      
      // Fallback to placeholder approach
      const deviceId = await AsyncStorage.getItem('deviceId') || 'unknown-device';
      this.pushToken = `expo-token-${deviceId}-${Date.now()}`;
      
      const pushTokenInfo: PushToken = {
        token: this.pushToken,
        platform: Platform.OS as 'ios' | 'android',
        created: Date.now(),
        lastUpdated: Date.now()
      };
      
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify(pushTokenInfo));
      console.log('Error fallback push notification token set up:', this.pushToken);
    }
  }

  /**
   * Set up background task registration for handling notifications when app is closed
   */
  private async setupBackgroundHandling(): Promise<void> {
    try {
      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes minimum interval
        stopOnTerminate: false, // Continue running when app is terminated
        startOnBoot: true, // Start when device boots
      });
      
      this.backgroundTaskRegistered = true;
      console.log('Background notification task registered successfully');
      
    } catch (error) {
      console.error('Error registering background task:', error);
      this.backgroundTaskRegistered = false;
    }
  }

  /**
   * Set up app state change listeners for background refresh handling
   */
  private setupAppStateListeners(): void {
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      console.log(`App state changed to: ${nextAppState}`);
      
      if (nextAppState === 'active') {
        // App came to foreground - check for expired notifications
        await this.handleAppForeground();
      } else if (nextAppState === 'background') {
        // App went to background - set up critical reminders backup
        await this.handleAppBackground();
      }
    });
  }

  /**
   * Handle app coming to foreground
   */
  private async handleAppForeground(): Promise<void> {
    try {
      console.log('[Foreground] Processing expired notifications...');
      
      // Check how long the app was in background
      const lastCheckStr = await AsyncStorage.getItem(LAST_BACKGROUND_CHECK_KEY);
      const lastCheck = lastCheckStr ? parseInt(lastCheckStr) : 0;
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheck;
      
      // If app was in background for more than 5 minutes, do a full check
      if (timeSinceLastCheck > 5 * 60 * 1000) {
        await this.processBackgroundNotifications();
        await this.rescheduleAllNotifications();
      }
      
      // Update last check time
      await AsyncStorage.setItem(LAST_BACKGROUND_CHECK_KEY, now.toString());
      
    } catch (error) {
      console.error('[Foreground] Error processing notifications:', error);
    }
  }

  /**
   * Handle app going to background
   */
  private async handleAppBackground(): Promise<void> {
    try {
      console.log('[Background] Setting up critical reminders backup...');
      
      // Create backup of critical reminders for server-side notifications
      await this.createCriticalRemindersBackup();
      
      // Activate server-side backup for critical reminders
      await this.activateServerSideBackup();
      
      // Update last background check time
      await AsyncStorage.setItem(LAST_BACKGROUND_CHECK_KEY, Date.now().toString());
      
    } catch (error) {
      console.error('[Background] Error setting up backup:', error);
    }
  }

  /**
   * Process background notifications when app is closed or in background
   */
  async processBackgroundNotifications(): Promise<void> {
    try {
      console.log('[Background] Processing expired medications and critical reminders...');
      
      // Check and update expired medications
      const expiredMedications = await unifiedDatabaseManager.medications.checkAndUpdateExpiredMedications();
      if (expiredMedications.length > 0) {
        console.log(`[Background] Marked ${expiredMedications.length} medications as completed`);
      }
      
      // Process critical reminders that may have been missed
      await this.processCriticalReminders();
      
      // Clean up old delivery logs and retry queue
      await this.cleanupOldData();
      
    } catch (error) {
      console.error('[Background] Error processing notifications:', error);
    }
  }

  /**
   * Create backup of critical reminders for server-side notifications
   */
  private async createCriticalRemindersBackup(): Promise<void> {
    try {
      const criticalReminders: CriticalReminder[] = [];
      const now = Date.now();
      const next24Hours = now + (24 * 60 * 60 * 1000);
      
      // Get critical medications (active medications with reminders in next 24 hours)
      const medications = await unifiedDatabaseManager.medications.find(
        med => med.status === 'active' && med.reminderSettings?.enabled
      );
      
      for (const medication of medications) {
        if (medication.frequency.specificTimes) {
          for (const timeString of medication.frequency.specificTimes) {
            const [hours, minutes] = timeString.split(':').map(Number);
            const nextDose = new Date();
            nextDose.setHours(hours, minutes, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (nextDose.getTime() < now) {
              nextDose.setDate(nextDose.getDate() + 1);
            }
            
            if (nextDose.getTime() <= next24Hours) {
              criticalReminders.push({
                id: `med_${medication.id}_${timeString}`,
                type: 'medication',
                entityId: medication.id,
                petId: medication.petId,
                title: `Critical: ${medication.name} Reminder`,
                body: `Your pet needs ${medication.dosage.amount} ${medication.dosage.unit} of ${medication.name}`,
                scheduledTime: nextDose.getTime(),
                priority: 'critical',
                created: now,
                notificationCount: 0,
                maxNotifications: 3
              });
            }
          }
        }
      }
      
      // Get critical tasks (high priority tasks in next 24 hours)
      const tasks = await unifiedDatabaseManager.tasks.find(
        task => task.status !== 'completed' && 
                task.priority === 'high' && 
                task.reminderSettings?.enabled &&
                new Date(task.scheduleInfo.date).getTime() <= next24Hours
      );
      
      for (const task of tasks) {
        criticalReminders.push({
          id: `task_${task.id}`,
          type: 'task',
          entityId: task.id,
          petId: task.petId,
          title: `Critical: ${task.title}`,
          body: task.description || task.title,
          scheduledTime: new Date(task.scheduleInfo.date).getTime(),
          priority: 'critical',
          created: now,
          notificationCount: 0,
          maxNotifications: 2
        });
      }
      
      // Save critical reminders backup
      await AsyncStorage.setItem(CRITICAL_REMINDERS_KEY, JSON.stringify(criticalReminders));
      
      console.log(`[Background] Created backup of ${criticalReminders.length} critical reminders`);
      
      // TODO: Send critical reminders to server for server-side notifications
      // await this.sendCriticalRemindersToServer(criticalReminders);
      
    } catch (error) {
      console.error('[Background] Error creating critical reminders backup:', error);
    }
  }

  /**
   * Process critical reminders that may have been missed
   */
  private async processCriticalReminders(): Promise<void> {
    try {
      const backupStr = await AsyncStorage.getItem(CRITICAL_REMINDERS_KEY);
      if (!backupStr) return;
      
      const criticalReminders: CriticalReminder[] = JSON.parse(backupStr);
      const now = Date.now();
      const updatedReminders: CriticalReminder[] = [];
      
      for (const reminder of criticalReminders) {
        // Check if reminder time has passed and we haven't sent max notifications
        if (reminder.scheduledTime <= now && reminder.notificationCount < reminder.maxNotifications) {
          // Check if we haven't notified recently (at least 30 minutes apart)
          const timeSinceLastNotification = reminder.lastNotified ? now - reminder.lastNotified : Infinity;
          
          if (timeSinceLastNotification >= 30 * 60 * 1000) { // 30 minutes
            // Send immediate notification
            await this.sendImmediateNotification(
              reminder.title,
              reminder.body,
              {
                type: `${reminder.type}_reminder`,
                [`${reminder.type}Id`]: reminder.entityId,
                petId: reminder.petId,
                priority: reminder.priority
              }
            );
            
            // Update reminder
            reminder.lastNotified = now;
            reminder.notificationCount++;
            
            console.log(`[Background] Sent critical reminder for ${reminder.type} ${reminder.entityId}`);
          }
          
          // Keep reminder if we haven't reached max notifications
          if (reminder.notificationCount < reminder.maxNotifications) {
            updatedReminders.push(reminder);
          }
        } else if (reminder.scheduledTime > now) {
          // Keep future reminders
          updatedReminders.push(reminder);
        }
      }
      
      // Update backup with processed reminders
      await AsyncStorage.setItem(CRITICAL_REMINDERS_KEY, JSON.stringify(updatedReminders));
      
    } catch (error) {
      console.error('[Background] Error processing critical reminders:', error);
    }
  }

  /**
   * Clean up old data to prevent storage bloat
   */
  private async cleanupOldData(): Promise<void> {
    try {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      // Clean up old delivery logs (keep only last week)
      const logsStr = await AsyncStorage.getItem(NOTIFICATION_DELIVERY_LOG_KEY);
      if (logsStr) {
        const logs: NotificationDeliveryLog[] = JSON.parse(logsStr);
        const recentLogs = logs.filter(log => log.timestamp > oneWeekAgo);
        await AsyncStorage.setItem(NOTIFICATION_DELIVERY_LOG_KEY, JSON.stringify(recentLogs));
      }
      
      // Clean up old retry queue entries
      const queueStr = await AsyncStorage.getItem(NOTIFICATION_RETRY_QUEUE_KEY);
      if (queueStr) {
        const queue: NotificationRetryEntry[] = JSON.parse(queueStr);
        const activeQueue = queue.filter(entry => entry.created > oneWeekAgo);
        await AsyncStorage.setItem(NOTIFICATION_RETRY_QUEUE_KEY, JSON.stringify(activeQueue));
      }
      
      // Clean up old critical reminders
      const remindersStr = await AsyncStorage.getItem(CRITICAL_REMINDERS_KEY);
      if (remindersStr) {
        const reminders: CriticalReminder[] = JSON.parse(remindersStr);
        const activeReminders = reminders.filter(reminder => 
          reminder.created > oneWeekAgo && reminder.scheduledTime > now - (24 * 60 * 60 * 1000)
        );
        await AsyncStorage.setItem(CRITICAL_REMINDERS_KEY, JSON.stringify(activeReminders));
      }
      
    } catch (error) {
      console.error('[Background] Error cleaning up old data:', error);
    }
  }

  /**
   * Get push notification token for server-side notifications
   */
  async getPushToken(): Promise<string | null> {
    try {
      const tokenStr = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (tokenStr) {
        const tokenInfo: PushToken = JSON.parse(tokenStr);
        return tokenInfo.token;
      }
      return this.pushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Send critical reminders to server for server-side notifications
   * TODO: Implement server-side notification endpoint
   */
  private async sendCriticalRemindersToServer(reminders: CriticalReminder[]): Promise<void> {
    try {
      const token = await this.getPushToken();
      if (!token) {
        console.warn('No push token available for server-side notifications');
        return;
      }
      
      // TODO: Replace with your actual server endpoint
      const serverEndpoint = 'https://your-server.com/api/schedule-notifications';
      
      const payload = {
        pushToken: token,
        reminders: reminders,
        platform: Platform.OS,
        timestamp: Date.now()
      };
      
      // Uncomment when server endpoint is ready
      /*
      const response = await fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('Critical reminders sent to server successfully');
      } else {
        console.error('Failed to send critical reminders to server:', response.status);
      }
      */
      
      console.log('Server-side notifications would be sent:', payload);
      
    } catch (error) {
      console.error('Error sending critical reminders to server:', error);
    }
  }

  /**
   * Create backup notification for server delivery
   */
  private async createBackupNotification(reminder: CriticalReminder): Promise<BackupNotification> {
    const pushToken = await this.getPushToken();
    
    return {
      id: reminder.id,
      type: reminder.type,
      scheduledTime: reminder.scheduledTime,
      serverPayload: {
        pushToken: pushToken || '',
        platform: Platform.OS,
        notification: {
          title: this.getNotificationTitle(reminder),
          body: this.getNotificationBody(reminder),
          data: this.getNotificationData(reminder)
        },
        delivery: {
          immediate: false,
          scheduledFor: reminder.scheduledTime,
          retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 300000 // 5 minutes
          }
        }
      },
      isCritical: reminder.priority === 'critical',
      retryCount: 0
    };
  }

  /**
   * Get notification title for reminder
   */
  private getNotificationTitle(reminder: CriticalReminder): string {
    switch (reminder.type) {
      case 'medication':
        return `Critical: Medication Reminder`;
      case 'task':
        return `Critical: Task Reminder`;
      case 'meal':
        return `Critical: Feeding Time`;
      default:
        return 'Critical Reminder';
    }
  }

  /**
   * Get notification body for reminder
   */
  private getNotificationBody(reminder: CriticalReminder): string {
    return reminder.body;
  }

  /**
   * Get notification data for reminder
   */
  private getNotificationData(reminder: CriticalReminder): any {
    return {
      type: `${reminder.type}_reminder`,
      [`${reminder.type}Id`]: reminder.entityId,
      petId: reminder.petId,
      priority: reminder.priority,
      isBackup: true
    };
  }

  /**
   * Activate server-side backup when app is closed
   */
  private async activateServerSideBackup(): Promise<void> {
    try {
      const criticalReminders = await this.getCriticalReminderBackupQueue();
      
      for (const reminder of criticalReminders) {
        const backupNotification = await this.createBackupNotification(reminder);
        await this.sendToServerBackup([backupNotification]);
      }
      
      await AsyncStorage.setItem(SERVER_BACKUP_ACTIVE_KEY, 'true');
      console.log(`Activated server backup for ${criticalReminders.length} critical reminders`);
    } catch (error) {
      console.error('Server backup activation failed:', error);
    }
  }

  /**
   * Get critical reminder backup queue
   */
  private async getCriticalReminderBackupQueue(): Promise<CriticalReminder[]> {
    try {
      const stored = await AsyncStorage.getItem(CRITICAL_REMINDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get critical reminder backup queue:', error);
      return [];
    }
  }

  /**
   * Send backup notifications to server for delivery when app is closed
   */
  private async sendToServerBackup(backupNotifications: BackupNotification[]): Promise<void> {
    try {
      if (!this.pushToken) {
        console.warn('No push token available for server backup');
        return;
      }

      // Convert backup notifications to FCM format
      const fcmReminders = backupNotifications.map(backup => ({
        id: backup.id,
        type: backup.type as 'medication' | 'task' | 'meal',
        entityId: backup.serverPayload.notification.data.entityId || backup.serverPayload.notification.data.taskId || backup.serverPayload.notification.data.medicationId || backup.serverPayload.notification.data.mealId,
        petId: backup.serverPayload.notification.data.petId,
        title: backup.serverPayload.notification.title,
        body: backup.serverPayload.notification.body,
        scheduledTime: backup.scheduledTime,
        priority: backup.isCritical ? 'critical' : 'high' as 'high' | 'critical'
      }));

      // Send to Firebase via FCM service
      await fcmService.sendCriticalRemindersToFirebase(fcmReminders);

      // Mark notifications as sent to server
      for (const notification of backupNotifications) {
        await this.confirmNotificationDelivery(notification.id, 'sent_to_server');
      }

    } catch (error) {
      console.error('Error sending backup notifications to server:', error);
      
      // Add failed notifications to retry queue
      for (const notification of backupNotifications) {
        await this.handleFailedDelivery(notification.id, (error as Error).message || 'Unknown error');
      }
    }
  }

  /**
   * Get backup notification queue
   */
  private async getBackupNotificationQueue(): Promise<BackupNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(BACKUP_NOTIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get backup notification queue:', error);
      return [];
    }
  }

  /**
   * Confirm notification delivery
   */
  private async confirmNotificationDelivery(notificationId: string, status: 'delivered' | 'failed' | 'sent_to_server'): Promise<void> {
    try {
      const deliveryLog = {
        notificationId,
        status,
        timestamp: Date.now(),
        platform: Platform.OS
      };
      
      // Store delivery confirmation
      const confirmations = await this.getDeliveryConfirmations();
      confirmations.push(deliveryLog);
      await AsyncStorage.setItem(DELIVERY_CONFIRMATION_KEY, JSON.stringify(confirmations));
      
      if (status === 'failed') {
        await this.handleFailedDelivery(notificationId, 'delivery_failed');
      }
    } catch (error) {
      console.error('Error confirming notification delivery:', error);
    }
  }

  /**
   * Get delivery confirmations
   */
  private async getDeliveryConfirmations(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(DELIVERY_CONFIRMATION_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get delivery confirmations:', error);
      return [];
    }
  }

  /**
   * Handle failed delivery with retry mechanism
   */
  private async handleFailedDelivery(notificationId: string, reason: string): Promise<void> {
    try {
      const retryEntry = {
        notificationId,
        originalScheduledTime: Date.now(),
        retryCount: 0,
        nextRetryTime: Date.now() + (5 * 60 * 1000), // 5 minutes
        lastError: reason,
        maxRetries: 3
      };
      
      await this.addToRetryQueue(notificationId, 'backup_notification', {}, Date.now(), reason);
      console.log(`Added failed notification ${notificationId} to retry queue`);
    } catch (error) {
      console.error('Error handling failed delivery:', error);
    }
  }

  /**
   * Check if notification is critical
   */
  private isCriticalNotification(notification: any): boolean {
    const criticalTypes = ['medication_reminder', 'emergency_alert', 'critical_task'];
    return criticalTypes.includes(notification.type) || notification.priority === 'critical';
  }

  /**
   * Create background notification payload
   */
  private createBackgroundNotificationPayload(notification: any): any {
    return {
      _contentAvailable: true, // iOS background delivery
      data: {
        notificationId: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        ...notification.data
      },
      // No title/body for background notifications
      priority: 'high',
      timeToLive: 3600 // 1 hour
    };
  }

  /**
   * Cleanup method to remove listeners and background tasks
   */
  async cleanup(): Promise<void> {
    try {
      // Remove app state listener
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      // Unregister background task
      if (this.backgroundTaskRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        this.backgroundTaskRegistered = false;
      }
      
      this.initialized = false;
      
    } catch (error) {
      console.error('Error during notification service cleanup:', error);
    }
  }

  /**
   * Set up notification received and response listeners
   */
  private setupNotificationListeners(): void {
    // When a notification is received while the app is in the foreground
    Notifications.addNotificationReceivedListener(async (notification: Notifications.Notification) => {
      console.log('Notification received in foreground:', notification);
      
      // Track delivery
      await this.trackNotificationDelivery(
        notification.request.identifier,
        'delivered',
        notification.request.content.data
      );
    });

    // When user taps on a notification (app in background or closed)
    Notifications.addNotificationResponseReceivedListener(async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      
      // Track interaction
      await this.trackNotificationDelivery(
        response.notification.request.identifier,
        'interacted',
        data
      );
      
      // Handle notification tap based on data
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle when a user taps on a notification
   * @param data Data from the notification
   */
  private handleNotificationTap(data: any): void {
    if (!this.navigationRef) {
      console.warn('Navigation reference not set, cannot handle notification tap');
      return;
    }

    try {
      console.log('Handling notification tap with data:', data);

      // Handle different notification types
      switch (data.type) {
        case 'task_reminder':
          this.navigateToTaskDetail(data);
          break;
          
        case 'medication_reminder':
          this.navigateToMedicationDetail(data);
          break;
          
        case 'meal_reminder':
          this.navigateToMealDetail(data);
          break;
          
        case 'inventory_alert':
          this.navigateToFoodTracker(data);
          break;
          
        case 'health_record_followup':
          this.navigateToHealthRecord(data);
          break;
          
        default:
          console.log('Unknown notification type:', data.type);
          // Navigate to home screen as fallback
          this.navigateToHome();
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
      // Fallback to home screen
      this.navigateToHome();
    }
  }

  /**
   * Navigate to task detail screen
   */
  private navigateToTaskDetail(data: any): void {
    if (data.petId) {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Schedule',
          params: {
            highlightTaskId: data.taskId,
            petId: data.petId
          }
        })
      );
    } else {
      this.navigateToHome();
    }
  }

  /**
   * Navigate to medication detail screen
   */
  private navigateToMedicationDetail(data: any): void {
    if (data.petId) {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Health',
          params: {
            highlightMedicationId: data.medicationId,
            petId: data.petId,
            tab: 'medications'
          }
        })
      );
    } else {
      this.navigateToHome();
    }
  }

  /**
   * Navigate to meal detail screen
   */
  private navigateToMealDetail(data: any): void {
    if (data.petId) {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Feeding',
          params: {
            highlightMealId: data.mealId,
            petId: data.petId
          }
        })
      );
    } else {
      this.navigateToHome();
    }
  }

  /**
   * Navigate to food tracker screen
   */
  private navigateToFoodTracker(data: any): void {
    if (data.petId) {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'FoodTracker',
          params: {
            petId: data.petId,
            highlightFoodItemId: data.foodItemId
          }
        })
      );
    } else {
      this.navigateToHome();
    }
  }

  /**
   * Navigate to health record screen
   */
  private navigateToHealthRecord(data: any): void {
    if (data.petId) {
      this.navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Health',
          params: {
            highlightHealthRecordId: data.healthRecordId,
            petId: data.petId,
            tab: 'health-records'
          }
        })
      );
    } else {
      this.navigateToHome();
    }
  }

  /**
   * Navigate to home screen (fallback)
   */
  private navigateToHome(): void {
    this.navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Home'
      })
    );
  }

  /**
   * Schedule notifications for a task
   * @param task The task to schedule notifications for
   */
  async scheduleTaskNotifications(task: Task): Promise<void> {
    try {
      // Check if notifications are enabled for this task
      if (!task.reminderSettings || !task.reminderSettings.enabled) {
        return;
      }
      
      // Cancel any existing notifications for this task
      await this.cancelTaskNotifications(task.id);
      
      // Get task date and time
      const taskDate = new Date(task.scheduleInfo.date);
      const taskTime = new Date(task.scheduleInfo.time);
      
      // Combine date and time
      const scheduledDateTime = new Date(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getDate(),
        taskTime.getHours(),
        taskTime.getMinutes(),
        0,
        0
      );
      
      // Get pet details for notification text
      const pet = await unifiedDatabaseManager.pets.getById(task.petId);
      const petName = pet ? pet.name : 'your pet';
      
      // Set up notification content
      const baseContent = {
        title: task.title,
        body: `Reminder for ${petName}: ${task.description || task.title}`,
        data: {
          taskId: task.id,
          petId: task.petId,
          category: task.category,
          type: 'task_reminder'
        },
      };
      
      // Storage for scheduled notification IDs
      const scheduledNotifications: ScheduledNotification[] = [];
      
      // Schedule a notification for each reminder time
      for (const minutesBefore of task.reminderSettings.times) {
        // Calculate trigger time by subtracting minutes from task time
        const triggerDate = new Date(scheduledDateTime.getTime());
        triggerDate.setMinutes(triggerDate.getMinutes() - minutesBefore);
        
        // Only schedule if the trigger time is in the future
        if (triggerDate > new Date()) {
          // Customize content based on how far in advance this is
          let timeText = '';
          if (minutesBefore >= 1440) { // Days
            const days = Math.floor(minutesBefore / 1440);
            timeText = `${days} day${days > 1 ? 's' : ''} before`;
          } else if (minutesBefore >= 60) { // Hours
            const hours = Math.floor(minutesBefore / 60);
            timeText = `${hours} hour${hours > 1 ? 's' : ''} before`;
          } else { // Minutes
            timeText = `${minutesBefore} minute${minutesBefore > 1 ? 's' : ''} before`;
          }
          
          const content = {
            ...baseContent,
            body: `${timeText}: ${baseContent.body}`
          };
          
          // Schedule the notification
          const notificationId = await this.scheduleNotification(content, triggerDate);
          
          // Store scheduled notification info
          scheduledNotifications.push({
            id: notificationId,
            taskId: task.id,
            petId: task.petId,
            title: content.title,
            body: content.body,
            data: content.data,
            triggerTime: triggerDate.getTime()
          });
        }
      }
      
      // Save the scheduled notifications
      await this.saveScheduledNotifications(scheduledNotifications);
      
    } catch (error) {
      console.error('Error scheduling task notifications:', error);
    }
  }
  
  /**
   * Schedule a notification
   * @param content Notification content
   * @param triggerDate When the notification should trigger
   * @returns ID of the scheduled notification
   */
  private async scheduleNotification(
    content: Notifications.NotificationContentInput,
    triggerDate: Date
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content,
        trigger: triggerDate,
      });
      
      // Track successful scheduling
      await this.trackNotificationScheduled(identifier, content.data?.type || 'unknown', content.data || {});
      
      return identifier;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown scheduling error';
      console.error('Error scheduling notification:', errorMessage);
      
      // Track failure and potentially add to retry queue
      const tempId = `failed_${Date.now()}`;
      await this.trackNotificationFailed(tempId, errorMessage, content.data || {});
      
      // Add to retry queue if this is a retryable error
      if (this.isRetryableError(error)) {
        await this.addToRetryQueue(
          tempId,
          content.data?.type || 'unknown',
          content,
          triggerDate.getTime(),
          errorMessage
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Common retryable errors
    const retryableErrors = [
      'network',
      'timeout',
      'connection',
      'temporary',
      'rate limit',
      'server error',
      'service unavailable'
    ];
    
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
  }
  
  /**
   * Store scheduled notifications in AsyncStorage
   * @param notifications Array of scheduled notifications
   */
  private async saveScheduledNotifications(notifications: ScheduledNotification[]): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const existing: ScheduledNotification[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Filter out any notifications for the same task
      const taskIds = new Set(notifications.map(n => n.taskId));
      const filtered = existing.filter(n => !taskIds.has(n.taskId));
      
      // Add new notifications
      const updated = [...filtered, ...notifications];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving scheduled notifications:', error);
    }
  }
  
  /**
   * Cancel notifications for a task
   * @param taskId ID of the task or 'all' to cancel all notifications
   */
  async cancelTaskNotifications(taskId: string): Promise<void> {
    try {
      // Handle special case for 'all'
      if (taskId === 'all') {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify([]));
        return;
      }
      
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (!existingJson) return;
      
      const notifications: ScheduledNotification[] = JSON.parse(existingJson);
      
      // Find notifications for this task
      const taskNotifications = notifications.filter(n => n.taskId === taskId);
      
      // Cancel each notification
      for (const notification of taskNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }
      
      // Remove from storage
      const updated = notifications.filter(n => n.taskId !== taskId);
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error canceling task notifications:', error);
    }
  }
  
  /**
   * Schedule notifications for a medication
   * @param medication The medication to schedule notifications for
   */
  async scheduleMedicationNotifications(medication: Medication): Promise<void> {
    try {
      console.log(`🔧 [Medication Notifications] Starting to schedule notifications for: ${medication.name}`);
      
      // Check if notifications are enabled for this medication
      if (!medication.reminderSettings || !medication.reminderSettings.enabled) {
        console.log(`🔧 [Medication Notifications] Reminders not enabled for ${medication.name}`);
        return;
      }
      
      // Set a lower limit to prevent hitting system notification limits
      const MAX_NOTIFICATIONS = 50; // Reduced safety limit to avoid system restrictions
      
      // Cancel any existing notifications for this medication
      await this.cancelMedicationNotifications(medication.id);
      
      // Get pet details for notification text
      const pet = await unifiedDatabaseManager.pets.getById(medication.petId);
      const petName = pet ? pet.name : 'your pet';
      
      // Get the medication schedule details
      const startDate = new Date(medication.duration.startDate);
      const endDate = medication.duration.indefinite ? null : medication.duration.endDate ? new Date(medication.duration.endDate) : null;
      const frequencyTimes = medication.frequency.times;
      const frequencyPeriod = medication.frequency.period;
      
      // Calculate how many times a day the medication needs to be taken
      const dosesPerDay = this.calculateDosesPerDay(frequencyTimes, frequencyPeriod);
      
      // Create an array to store all scheduled notifications
      const scheduledNotifications: ScheduledMedicationNotification[] = [];
      
      // Calculate how many days to schedule in advance (reduced from 7 to 3 days to avoid hitting system limits)
      const now = new Date();
      const maxScheduleDate = new Date();
      maxScheduleDate.setDate(now.getDate() + 3); // Schedule up to 3 days in advance
      
      // Calculate the end of scheduling period
      const schedulingEndDate = endDate && endDate < maxScheduleDate ? endDate : maxScheduleDate;
      
      // Only schedule if the start date is in the past or future
      if (startDate > schedulingEndDate) {
        console.log(`🔧 [Medication Notifications] Start date ${startDate} is after scheduling end ${schedulingEndDate}. No notifications to schedule.`);
        return; // No need to schedule notifications yet
      }
      
      // Start scheduling from today or start date, whichever is later
      const schedulingStartDate = startDate > now ? startDate : now;
      
      console.log(`🔧 [Medication Notifications] Scheduling window: ${schedulingStartDate} to ${schedulingEndDate}`);
      
      // Create notification contents
      const baseContent = {
        title: `Time for ${medication.name}`,
        body: `${petName} needs ${medication.dosage.amount} ${medication.dosage.unit} of ${medication.name}`,
        data: {
          medicationId: medication.id,
          petId: medication.petId,
          type: 'medication_reminder'
        },
      };
      
      // Calculate estimated notification count to check if we'll hit limits
      const daysToSchedule = Math.floor((schedulingEndDate.getTime() - schedulingStartDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      let specificTimesCount = medication.frequency.specificTimes?.length || 0;
      if (specificTimesCount === 0) {
        specificTimesCount = Math.ceil(dosesPerDay);
      }
      
      // Each time slot can generate up to 2 notifications (reminder + actual)
      const estimatedNotifications = daysToSchedule * specificTimesCount * 2;
      
      console.log(`🔧 [Medication Notifications] Estimated notifications: ${estimatedNotifications} for ${daysToSchedule} days and ${specificTimesCount} times per day`);
      
      // If we're going to hit limits, reduce scheduling days
      if (estimatedNotifications > MAX_NOTIFICATIONS) {
        const adjustedDays = Math.floor(MAX_NOTIFICATIONS / (specificTimesCount * 2));
        const adjustedEndDate = new Date(schedulingStartDate);
        adjustedEndDate.setDate(schedulingStartDate.getDate() + Math.max(0, adjustedDays - 1));
        
        console.warn(`Reducing medication scheduling window from ${daysToSchedule} to ${adjustedDays} days to stay under notification limits`);
        
        // Update the scheduling end date to our adjusted value
        if (adjustedEndDate < schedulingEndDate) {
          schedulingEndDate.setTime(adjustedEndDate.getTime());
        }
      }
      
      // Schedule notifications for each day in the scheduling period
      for (let currentDate = new Date(schedulingStartDate); 
           currentDate <= schedulingEndDate; 
           currentDate.setDate(currentDate.getDate() + 1)) {
        
        // Skip days based on frequency period
        if (frequencyPeriod === 'week' && !this.shouldScheduleForWeeklyMedication(currentDate, startDate, frequencyTimes)) {
          continue;
        }
        
        if (frequencyPeriod === 'month' && !this.shouldScheduleForMonthlyMedication(currentDate, startDate, frequencyTimes)) {
          continue;
        }
        
        // Check if we're about to exceed our notification limit
        if (scheduledNotifications.length >= MAX_NOTIFICATIONS) {
          console.warn(`Reached maximum notification limit of ${MAX_NOTIFICATIONS}. Some medication reminders won't be scheduled.`);
          break;
        }
        
        // Schedule for specific times if provided
        if (medication.frequency.specificTimes && medication.frequency.specificTimes.length > 0) {
          for (const timeString of medication.frequency.specificTimes) {
            // Parse time string (format should be HH:MM)
            const [hours, minutes] = timeString.split(':').map(Number);
            
            // Create a notification date for this specific time
            const notificationDate = new Date(currentDate);
            notificationDate.setHours(hours, minutes, 0, 0);
            
            console.log(`🔧 [Medication Notifications] Checking time ${timeString} on ${currentDate.toDateString()}: ${notificationDate}`);
            
            // Only schedule if the notification time is in the future
            if (notificationDate > now) {
              // Check if we're about to exceed our notification limit
              if (scheduledNotifications.length >= MAX_NOTIFICATIONS) {
                console.warn(`Reached maximum notification limit. Stopping scheduling.`);
                break;
              }
              
              try {
                // Schedule the reminder notification (X minutes before the dose time)
                const reminderDate = new Date(notificationDate);
                reminderDate.setMinutes(reminderDate.getMinutes() - (medication.reminderSettings?.reminderTime || 15));
                
                if (reminderDate > now) {
                  const content = {
                    ...baseContent,
                    body: `Reminder: ${baseContent.body} at ${timeString}`
                  };
                  
                  console.log(`🔧 [Medication Notifications] Scheduling reminder for ${reminderDate}`);
                  const notificationId = await this.scheduleNotification(content, reminderDate);
                  
                  scheduledNotifications.push({
                    id: notificationId,
                    medicationId: medication.id,
                    petId: medication.petId,
                    title: content.title,
                    body: content.body,
                    data: content.data,
                    triggerTime: reminderDate.getTime()
                  });
                }
                
                // Also schedule the actual notification at the dose time
                const doseContent = {
                  ...baseContent,
                  body: `It's time for ${petName} to take ${medication.dosage.amount} ${medication.dosage.unit} of ${medication.name}`
                };
                
                console.log(`🔧 [Medication Notifications] Scheduling dose notification for ${notificationDate}`);
                const doseNotificationId = await this.scheduleNotification(doseContent, notificationDate);
                
                scheduledNotifications.push({
                  id: doseNotificationId,
                  medicationId: medication.id,
                  petId: medication.petId,
                  title: doseContent.title,
                  body: doseContent.body,
                  data: doseContent.data,
                  triggerTime: notificationDate.getTime()
                });
              } catch (notificationError) {
                console.error('Error scheduling individual notification:', notificationError);
                // Continue with the next notification rather than failing the entire scheduling process
              }
            } else {
              console.log(`🔧 [Medication Notifications] Skipping past time: ${notificationDate}`);
            }
          }
        } else {
          // If no specific times, distribute doses evenly throughout the day
          const times = this.generateEvenlyDistributedTimes(dosesPerDay);
          
          console.log(`🔧 [Medication Notifications] Using generated times for ${dosesPerDay} doses per day:`, times);
          
          for (const { hours, minutes } of times) {
            // Create a notification date for this specific time
            const notificationDate = new Date(currentDate);
            notificationDate.setHours(hours, minutes, 0, 0);
            
            // Only schedule if the notification time is in the future
            if (notificationDate > now) {
              // Check if we're about to exceed our notification limit
              if (scheduledNotifications.length >= MAX_NOTIFICATIONS) {
                console.warn(`Reached maximum notification limit. Stopping scheduling.`);
                break;
              }
              
              try {
                // Schedule the reminder notification (X minutes before the dose time)
                const reminderDate = new Date(notificationDate);
                reminderDate.setMinutes(reminderDate.getMinutes() - (medication.reminderSettings?.reminderTime || 15));
                
                if (reminderDate > now) {
                  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                  const content = {
                    ...baseContent,
                    body: `Reminder: ${baseContent.body} at ${timeString}`
                  };
                  
                  const notificationId = await this.scheduleNotification(content, reminderDate);
                  
                  scheduledNotifications.push({
                    id: notificationId,
                    medicationId: medication.id,
                    petId: medication.petId,
                    title: content.title,
                    body: content.body,
                    data: content.data,
                    triggerTime: reminderDate.getTime()
                  });
                }
                
                // Also schedule the actual notification at the dose time
                const doseContent = {
                  ...baseContent,
                  body: `It's time for ${petName} to take ${medication.dosage.amount} ${medication.dosage.unit} of ${medication.name}`
                };
                
                const doseNotificationId = await this.scheduleNotification(doseContent, notificationDate);
                
                scheduledNotifications.push({
                  id: doseNotificationId,
                  medicationId: medication.id,
                  petId: medication.petId,
                  title: doseContent.title,
                  body: doseContent.body,
                  data: doseContent.data,
                  triggerTime: notificationDate.getTime()
                });
              } catch (notificationError) {
                console.error('Error scheduling individual notification:', notificationError);
                // Continue with the next notification rather than failing the entire scheduling process
              }
            }
          }
        }
      }
      
      // Save scheduled notifications
      await this.saveScheduledMedicationNotifications(scheduledNotifications);
      
      console.log(`✅ [Medication Notifications] Successfully scheduled ${scheduledNotifications.length} notifications for medication ${medication.name}`);
      
    } catch (error) {
      console.error('Error scheduling medication notifications:', error);
      // Instead of failing silently, inform the user by returning a more specific error that the caller can handle
      throw new Error(`Failed to schedule medication notifications: ${error}`);
    }
  }
  
  /**
   * Calculate how many doses to give per day based on frequency
   */
  private calculateDosesPerDay(times: number, period: string): number {
    switch (period) {
      case 'day':
        return times;
      case 'week':
        return times / 7; // Weekly doses divided by days in a week
      case 'month':
        return times / 30; // Monthly doses divided by approx days in a month
      default:
        return 1;
    }
  }
  
  /**
   * Determine if a weekly medication should be scheduled on a specific date
   */
  private shouldScheduleForWeeklyMedication(currentDate: Date, startDate: Date, frequencyTimes: number): boolean {
    // For weekly medications, calculate the day of the week to schedule
    const daysFromStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const weeksFromStart = Math.floor(daysFromStart / 7);
    
    // If frequency is less than once per week, determine if this week is a medication week
    if (frequencyTimes < 1) {
      const weeksPerDose = Math.round(1 / frequencyTimes);
      return weeksFromStart % weeksPerDose === 0;
    }
    
    // If frequency is once per week or more, always schedule on the same day(s) of the week
    return currentDate.getDay() === startDate.getDay();
  }
  
  /**
   * Determine if a monthly medication should be scheduled on a specific date
   */
  private shouldScheduleForMonthlyMedication(currentDate: Date, startDate: Date, frequencyTimes: number): boolean {
    // For monthly medications, schedule on the same day of the month
    return currentDate.getDate() === startDate.getDate();
  }
  
  /**
   * Generate evenly distributed times throughout the day for multiple doses
   */
  private generateEvenlyDistributedTimes(dosesPerDay: number): Array<{ hours: number, minutes: number }> {
    // Round up the doses per day to an integer
    const numDoses = Math.ceil(dosesPerDay);
    
    // If less than one dose per day, default to morning dose
    if (numDoses <= 0) {
      return [{ hours: 9, minutes: 0 }];
    }
    
    const times = [];
    const wakeHour = 8; // 8:00 AM
    const sleepHour = 22; // 10:00 PM
    const availableHours = sleepHour - wakeHour;
    
    // Calculate interval between doses
    const interval = availableHours / numDoses;
    
    // Generate the times
    for (let i = 0; i < numDoses; i++) {
      const hour = wakeHour + Math.floor(interval * i);
      const minute = Math.round((interval * i - Math.floor(interval * i)) * 60);
      times.push({ hours: hour, minutes: minute });
    }
    
    return times;
  }
  
  /**
   * Save scheduled medication notifications to AsyncStorage
   */
  private async saveScheduledMedicationNotifications(notifications: ScheduledMedicationNotification[]): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY);
      const existing: ScheduledMedicationNotification[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Filter out any notifications for the same medication
      const medicationIds = new Set(notifications.map(n => n.medicationId));
      const filtered = existing.filter(n => !medicationIds.has(n.medicationId));
      
      // Add new notifications
      const updated = [...filtered, ...notifications];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving scheduled medication notifications:', error);
    }
  }
  
  /**
   * Cancel notifications for a medication
   * @param medicationId ID of the medication or 'all' to cancel all medication notifications
   */
  async cancelMedicationNotifications(medicationId: string): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY);
      if (!existingJson) return;
      
      const notifications: ScheduledMedicationNotification[] = JSON.parse(existingJson);
      
      if (medicationId === 'all') {
        // Cancel all medication notifications
        for (const notification of notifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        }
        
        // Clear storage
        await AsyncStorage.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify([]));
        return;
      }
      
      // Find notifications for this medication
      const medicationNotifications = notifications.filter(n => n.medicationId === medicationId);
      
      // Cancel each notification
      for (const notification of medicationNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }
      
      // Remove from storage
      const updated = notifications.filter(n => n.medicationId !== medicationId);
      await AsyncStorage.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error canceling medication notifications:', error);
    }
  }

  /**
   * Schedule meal notifications for a pet's feeding schedule
   * @param meal The meal to schedule notifications for
   */
  async scheduleMealNotifications(meal: Meal): Promise<void> {
    try {
      // Check if notifications are enabled for this meal
      if (!meal.reminderSettings || !meal.reminderSettings.enabled) {
        return;
      }
      
      // Cancel any existing notifications for this meal
      await this.cancelMealNotifications(meal.id);
      
      // Get pet details for notification text
      const pet = await unifiedDatabaseManager.pets.getById(meal.petId);
      const petName = pet ? pet.name : 'your pet';
      
      // Get meal date and time
      const mealDate = new Date(meal.date);
      const mealTime = new Date(meal.time);
      
      // Combine date and time
      const scheduledDateTime = new Date(
        mealDate.getFullYear(),
        mealDate.getMonth(),
        mealDate.getDate(),
        mealTime.getHours(),
        mealTime.getMinutes(),
        0,
        0
      );
      
      // Create notification content
      const mealTypeFormatted = meal.type.charAt(0).toUpperCase() + meal.type.slice(1);
      const baseContent = {
        title: `Time for ${petName}'s ${mealTypeFormatted}`,
        body: `${petName} needs to be fed ${meal.amount || ''} ${meal.specialInstructions ? `(${meal.specialInstructions})` : ''}`,
        data: {
          mealId: meal.id,
          petId: meal.petId,
          type: 'meal_reminder'
        },
      };
      
      // Storage for scheduled notification IDs
      const scheduledNotifications: ScheduledMealNotification[] = [];
      
      // Only schedule if the meal time is in the future
      if (scheduledDateTime > new Date()) {
        // Calculate reminder time (X minutes before the meal)
        const reminderDate = new Date(scheduledDateTime);
        reminderDate.setMinutes(reminderDate.getMinutes() - (meal.reminderSettings?.reminderTime || 15));
        
        // Only schedule the reminder if it's in the future
        if (reminderDate > new Date()) {
          const content = {
            ...baseContent,
            body: `In ${meal.reminderSettings?.reminderTime || 15} minutes: ${baseContent.body}`
          };
          
          const notificationId = await this.scheduleNotification(content, reminderDate);
          
          scheduledNotifications.push({
            id: notificationId,
            mealId: meal.id,
            petId: meal.petId,
            title: content.title,
            body: content.body,
            data: content.data,
            triggerTime: reminderDate.getTime()
          });
        }
        
        // Also schedule the actual notification at the meal time
        const mealContent = {
          ...baseContent,
          body: `It's time for ${petName}'s ${mealTypeFormatted.toLowerCase()}! ${meal.specialInstructions ? `(${meal.specialInstructions})` : ''}`
        };
        
        const mealNotificationId = await this.scheduleNotification(mealContent, scheduledDateTime);
        
        scheduledNotifications.push({
          id: mealNotificationId,
          mealId: meal.id,
          petId: meal.petId,
          title: mealContent.title,
          body: mealContent.body,
          data: mealContent.data,
          triggerTime: scheduledDateTime.getTime()
        });
      }
      
      // Save scheduled notifications
      await this.saveScheduledMealNotifications(scheduledNotifications);
      
    } catch (error) {
      console.error('Error scheduling meal notifications:', error);
    }
  }
  
  /**
   * Save scheduled meal notifications to AsyncStorage
   */
  private async saveScheduledMealNotifications(notifications: ScheduledMealNotification[]): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY);
      const existing: ScheduledMealNotification[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Filter out any notifications for the same meal
      const mealIds = new Set(notifications.map(n => n.mealId));
      const filtered = existing.filter(n => !mealIds.has(n.mealId));
      
      // Add new notifications
      const updated = [...filtered, ...notifications];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving scheduled meal notifications:', error);
    }
  }
  
  /**
   * Cancel notifications for a meal
   * @param mealId ID of the meal or 'all' to cancel all meal notifications
   */
  async cancelMealNotifications(mealId: string): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY);
      if (!existingJson) return;
      
      const notifications: ScheduledMealNotification[] = JSON.parse(existingJson);
      
      if (mealId === 'all') {
        // Cancel all meal notifications
        for (const notification of notifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        }
        
        // Clear storage
        await AsyncStorage.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify([]));
        return;
      }
      
      // Find notifications for this meal
      const mealNotifications = notifications.filter(n => n.mealId === mealId);
      
      // Cancel each notification
      for (const notification of mealNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }
      
      // Remove from storage
      const updated = notifications.filter(n => n.mealId !== mealId);
      await AsyncStorage.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error canceling meal notifications:', error);
    }
  }
  
  /**
   * Schedule an inventory alert notification for a low stock item
   * @param foodItem The food item with low stock
   */
  async scheduleInventoryAlert(foodItem: FoodItem): Promise<void> {
    try {
      // Check if inventory exists
      if (!foodItem.inventory) {
        return;
      }
      
      // Only schedule if the inventory is below threshold
      if (foodItem.inventory.currentAmount > foodItem.inventory.lowStockThreshold) {
        return;
      }
      
      // Cancel any existing notifications for this food item
      await this.cancelInventoryAlert(foodItem.id);
      
      // Get pet details for notification text
      const pet = await unifiedDatabaseManager.pets.getById(foodItem.petId);
      const petName = pet ? pet.name : 'your pet';
      
      // Calculate days remaining
      const daysRemaining = foodItem.inventory?.daysRemaining || 0;
      
      // Create notification content
      const content = {
        title: `Low Food Stock Alert`,
        body: `${foodItem.name} for ${petName} is running low! Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of food remaining.`,
        data: {
          foodItemId: foodItem.id,
          petId: foodItem.petId,
          type: 'inventory_alert'
        },
      };
      
      // Schedule the notification for right now
      const notificationId = await this.sendImmediateNotification(
        content.title,
        content.body,
        content.data
      );
      
      if (notificationId) {
        // Save notification to storage
        const notification: InventoryAlertNotification = {
          id: notificationId,
          foodItemId: foodItem.id,
          petId: foodItem.petId,
          title: content.title,
          body: content.body,
          data: content.data,
          triggerTime: new Date().getTime()
        };
        
        await this.saveInventoryAlertNotification(notification);
      }
      
      // If days remaining is critical (2 days or less), schedule a repeating reminder
      if (daysRemaining <= 2) {
        // Schedule a reminder for tomorrow too
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        tomorrowDate.setHours(9, 0, 0, 0); // 9 AM tomorrow
        
        const urgentContent = {
          title: `URGENT: Food Supply Critical`,
          body: `${foodItem.name} for ${petName} is almost gone! Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining. Please restock soon!`,
          data: {
            foodItemId: foodItem.id,
            petId: foodItem.petId,
            type: 'inventory_urgent_alert'
          },
        };
        
        // Schedule the urgent notification
        const urgentNotificationId = await this.scheduleNotification(
          urgentContent,
          tomorrowDate
        );
        
        if (urgentNotificationId) {
          // Save notification to storage
          const notification: InventoryAlertNotification = {
            id: urgentNotificationId,
            foodItemId: foodItem.id,
            petId: foodItem.petId,
            title: urgentContent.title,
            body: urgentContent.body,
            data: urgentContent.data,
            triggerTime: tomorrowDate.getTime()
          };
          
          await this.saveInventoryAlertNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error scheduling inventory alert:', error);
    }
  }
  
  /**
   * Save inventory alert notification to AsyncStorage
   */
  private async saveInventoryAlertNotification(notification: InventoryAlertNotification): Promise<void> {
    try {
      // Get existing notifications
      const existingJson = await AsyncStorage.getItem(INVENTORY_ALERT_NOTIFICATIONS_KEY);
      const existing: InventoryAlertNotification[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Add new notification
      const updated = [...existing, notification];
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving inventory alert notification:', error);
    }
  }
  
  /**
   * Cancel inventory alert for a food item
   * @param foodItemId ID of the food item or 'all' to cancel all inventory alerts
   */
  async cancelInventoryAlert(foodItemId: string): Promise<void> {
    try {
      // Get existing notifications
      const existingJson = await AsyncStorage.getItem(INVENTORY_ALERT_NOTIFICATIONS_KEY);
      if (!existingJson) return;
      
      const notifications: InventoryAlertNotification[] = JSON.parse(existingJson);
      
      if (foodItemId === 'all') {
        // Cancel all inventory alerts
        for (const notification of notifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        }
        
        // Clear storage
        await AsyncStorage.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify([]));
        return;
      }
      
      // Find notifications for this food item
      const itemNotifications = notifications.filter(n => n.foodItemId === foodItemId);
      
      // Cancel each notification
      for (const notification of itemNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }
      
      // Remove from storage
      const updated = notifications.filter(n => n.foodItemId !== foodItemId);
      await AsyncStorage.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error canceling inventory alert:', error);
    }
  }

  /**
   * Check all food inventory items and schedule alerts for low stock
   */
  async checkAndScheduleInventoryAlerts(): Promise<void> {
    try {
      // Get all active pets
      const pets = await unifiedDatabaseManager.pets.getAll();
      
      for (const pet of pets) {
        // Get low stock food items for each pet
        const lowStockItems = await unifiedDatabaseManager.foodItems.getLowStock(pet.id);
        
        // Schedule alerts for each low stock item
        for (const item of lowStockItems) {
          await this.scheduleInventoryAlert(item);
        }
      }
      
      console.log('Scheduled inventory alerts for low stock items');
    } catch (error) {
      console.error('Error checking and scheduling inventory alerts:', error);
    }
  }

  /**
   * Schedule notifications for tasks and medications on app startup
   */
  async rescheduleAllNotifications(): Promise<void> {
    try {
      // Cancel all existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Clear stored notification records
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(SCHEDULED_MEDICATION_NOTIFICATIONS_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(SCHEDULED_MEAL_NOTIFICATIONS_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(INVENTORY_ALERT_NOTIFICATIONS_KEY, JSON.stringify([]));
      
      // Check and update expired medications first
      console.log('Checking for expired medications...');
      const expiredMedications = await unifiedDatabaseManager.medications.checkAndUpdateExpiredMedications();
      if (expiredMedications.length > 0) {
        console.log(`Automatically marked ${expiredMedications.length} medications as completed`);
      }
      
      // Fix medications with incorrect reminder settings (discontinued/completed but reminders still enabled)
      console.log('Checking for medications with incorrect reminder settings...');
      const allMedications = await unifiedDatabaseManager.medications.getAll();
      const medicationsToFix = allMedications.filter(med => 
        (med.status === 'completed' || med.status === 'discontinued') && 
        med.reminderSettings?.enabled === true
      );
      
      if (medicationsToFix.length > 0) {
        console.log(`Found ${medicationsToFix.length} medications with incorrect reminder settings. Fixing...`);
        
        for (const medication of medicationsToFix) {
          try {
            await unifiedDatabaseManager.medications.updateStatus(medication.id, medication.status);
            console.log(`✅ Fixed reminder settings for ${medication.status} medication: ${medication.name}`);
          } catch (error) {
            console.error(`❌ Failed to fix reminder settings for medication ${medication.name}:`, error);
          }
        }
      }
      
      // Reschedule task notifications
      const tasks = await unifiedDatabaseManager.tasks.find(
        task => task.status !== 'completed' && task.reminderSettings?.enabled
      );
      
      for (const task of tasks) {
        await this.scheduleTaskNotifications(task);
      }
      
      console.log(`Rescheduled notifications for ${tasks.length} tasks`);
      
      // Reschedule medication notifications (only for active medications)
      const medications = await unifiedDatabaseManager.medications.find(
        medication => medication.status === 'active' && medication.reminderSettings?.enabled
      );
      
      for (const medication of medications) {
        await this.scheduleMedicationNotifications(medication);
      }
      
      console.log(`Rescheduled notifications for ${medications.length} active medications`);
      
      // Reschedule meal notifications (for upcoming meals within the next 2 days)
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
      
      const meals = await unifiedDatabaseManager.meals.find(
        meal => {
          // Check if the meal has a reminder enabled
          if (!meal.reminderSettings?.enabled) return false;
          
          // Make sure the meal date is valid
          const mealDate = new Date(meal.date);
          if (isNaN(mealDate.getTime())) return false;
          
          // Only include upcoming meals within the next 2 days that are not completed
          return mealDate >= now && mealDate <= twoDaysLater && !meal.completed;
        }
      );
      
      for (const meal of meals) {
        await this.scheduleMealNotifications(meal);
      }
      
      console.log(`Rescheduled notifications for ${meals.length} upcoming meals`);
      
      // Reschedule health record follow-up notifications
      const healthRecords = await unifiedDatabaseManager.healthRecords.find(
        record => record.followUpNeeded === true && 
                 record.status !== 'completed' &&
                 record.followUpDate != null // Check for both null and undefined
      );
      
      for (const healthRecord of healthRecords) {
        // Ensure followUpDate exists before using it
        if (!healthRecord.followUpDate) continue;
        
        const followUpDate = new Date(healthRecord.followUpDate);
        // Only reschedule if follow-up is in the future (within next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        if (followUpDate >= now && followUpDate <= thirtyDaysFromNow) {
          await this.scheduleHealthRecordNotifications(healthRecord);
        }
      }
      
      console.log(`Rescheduled notifications for ${healthRecords.length} health record follow-ups`);
      
      // Check and schedule inventory alerts
      await this.checkAndScheduleInventoryAlerts();
      
      // Process retry queue for any failed notifications
      await this.processRetryQueue();
      
      console.log('All notifications rescheduled successfully');
    } catch (error) {
      console.error('Error rescheduling notifications:', error);
    }
  }
  
  /**
   * Send an immediate notification
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data to include
   */
  async sendImmediateNotification(
    title: string, 
    body: string, 
    data: any = {}
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data
        },
        trigger: null // null trigger means send immediately
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      return null;
    }
  }
  
  /**
   * Check if notification permissions are granted
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
  
  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, status);
    return status === 'granted';
  }

  /**
   * Track notification delivery
   * @param notificationId ID of the notification
   * @param status Delivery status
   * @param data Additional data to include
   */
  private async trackNotificationDelivery(
    notificationId: string, 
    status: 'scheduled' | 'delivered' | 'failed' | 'cancelled' | 'interacted', 
    data: any
  ): Promise<void> {
    try {
      // Get existing delivery log
      const existingJson = await AsyncStorage.getItem(NOTIFICATION_DELIVERY_LOG_KEY);
      const existing: NotificationDeliveryLog[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Add new delivery log entry
      const newEntry: NotificationDeliveryLog = {
        id: notificationId,
        notificationId,
        type: data.type,
        status,
        timestamp: new Date().getTime(),
        scheduledTime: data.triggerTime || new Date().getTime(),
        metadata: {
          taskId: data.taskId,
          medicationId: data.medicationId,
          mealId: data.mealId,
          foodItemId: data.foodItemId,
          healthRecordId: data.healthRecordId,
          petId: data.petId,
          title: data.title || 'Unknown',
          body: data.body || 'Unknown'
        }
      };
      
      // Update delivery time if status is delivered or interacted
      if (status === 'delivered' || status === 'interacted') {
        newEntry.deliveredTime = new Date().getTime();
      }
      
      // Save back to AsyncStorage
      const updated = [...existing, newEntry];
      await AsyncStorage.setItem(NOTIFICATION_DELIVERY_LOG_KEY, JSON.stringify(updated));
      
      // Update statistics
      await this.updateDeliveryStats();
      
    } catch (error) {
      console.error('Error tracking notification delivery:', error);
    }
  }

  /**
   * Update delivery statistics
   */
  private async updateDeliveryStats(): Promise<void> {
    try {
      // Get delivery log
      const logJson = await AsyncStorage.getItem(NOTIFICATION_DELIVERY_LOG_KEY);
      const logs: NotificationDeliveryLog[] = logJson ? JSON.parse(logJson) : [];
      
      // Calculate statistics
      const totalScheduled = logs.filter(log => log.status === 'scheduled').length;
      const totalDelivered = logs.filter(log => log.status === 'delivered').length;
      const totalFailed = logs.filter(log => log.status === 'failed').length;
      const totalCancelled = logs.filter(log => log.status === 'cancelled').length;
      const totalInteracted = logs.filter(log => log.status === 'interacted').length;
      
      const deliveryRate = totalScheduled > 0 ? (totalDelivered / totalScheduled) * 100 : 0;
      const interactionRate = totalDelivered > 0 ? (totalInteracted / totalDelivered) * 100 : 0;
      
      const stats: NotificationDeliveryStats = {
        totalScheduled,
        totalDelivered,
        totalFailed,
        totalCancelled,
        totalInteracted,
        deliveryRate,
        interactionRate,
        lastUpdated: new Date().getTime()
      };
      
      // Save statistics
      await AsyncStorage.setItem(NOTIFICATION_DELIVERY_STATS_KEY, JSON.stringify(stats));
      
    } catch (error) {
      console.error('Error updating delivery stats:', error);
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(): Promise<NotificationDeliveryStats | null> {
    try {
      const statsJson = await AsyncStorage.getItem(NOTIFICATION_DELIVERY_STATS_KEY);
      return statsJson ? JSON.parse(statsJson) : null;
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return null;
    }
  }

  /**
   * Track when a notification is scheduled
   */
  async trackNotificationScheduled(notificationId: string, type: string, data: any): Promise<void> {
    await this.trackNotificationDelivery(notificationId, 'scheduled', {
      ...data,
      type,
      triggerTime: new Date().getTime()
    });
  }

  /**
   * Track when a notification fails
   */
  async trackNotificationFailed(notificationId: string, reason: string, data: any): Promise<void> {
    try {
      // Get existing delivery log
      const existingJson = await AsyncStorage.getItem(NOTIFICATION_DELIVERY_LOG_KEY);
      const existing: NotificationDeliveryLog[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Find and update the entry
      const entryIndex = existing.findIndex(log => log.notificationId === notificationId);
      if (entryIndex !== -1) {
        existing[entryIndex].status = 'failed';
        existing[entryIndex].failureReason = reason;
        existing[entryIndex].timestamp = new Date().getTime();
        
        // Save back to AsyncStorage
        await AsyncStorage.setItem(NOTIFICATION_DELIVERY_LOG_KEY, JSON.stringify(existing));
        
        // Update statistics
        await this.updateDeliveryStats();
      }
      
    } catch (error) {
      console.error('Error tracking notification failure:', error);
    }
  }

  /**
   * Initialize retry mechanism with default configuration
   */
  private async initializeRetryMechanism(): Promise<void> {
    try {
      // Check if retry config exists
      const configJson = await AsyncStorage.getItem(NOTIFICATION_RETRY_CONFIG_KEY);
      if (!configJson) {
        // Set default retry configuration
        const defaultConfig: NotificationRetryConfig = {
          enabled: true,
          maxRetries: 3,
          initialDelayMinutes: 5,
          backoffMultiplier: 2,
          maxDelayHours: 24,
          retryTimeoutHours: 72
        };
        await AsyncStorage.setItem(NOTIFICATION_RETRY_CONFIG_KEY, JSON.stringify(defaultConfig));
      }
      
      // Process any pending retries
      await this.processRetryQueue();
      
    } catch (error) {
      console.error('Error initializing retry mechanism:', error);
    }
  }

  /**
   * Add notification to retry queue
   */
  private async addToRetryQueue(
    originalNotificationId: string,
    type: string,
    content: any,
    originalTriggerTime: number,
    failureReason: string
  ): Promise<void> {
    try {
      // Get retry configuration
      const config = await this.getRetryConfig();
      if (!config.enabled) {
        return;
      }
      
      // Get existing retry queue
      const queueJson = await AsyncStorage.getItem(NOTIFICATION_RETRY_QUEUE_KEY);
      const queue: NotificationRetryEntry[] = queueJson ? JSON.parse(queueJson) : [];
      
      // Check if this notification is already in queue
      const existingIndex = queue.findIndex(entry => entry.originalNotificationId === originalNotificationId);
      
      if (existingIndex !== -1) {
        // Update existing entry
        const existing = queue[existingIndex];
        if (existing.retryAttempts < existing.maxRetries) {
          existing.retryAttempts++;
          existing.lastAttempt = new Date().getTime();
          existing.failureReasons.push(failureReason);
          
          // Calculate next retry time with exponential backoff
          const delayMinutes = config.initialDelayMinutes * Math.pow(config.backoffMultiplier, existing.retryAttempts - 1);
          const maxDelayMinutes = config.maxDelayHours * 60;
          const actualDelayMinutes = Math.min(delayMinutes, maxDelayMinutes);
          
          existing.nextRetryTime = new Date().getTime() + (actualDelayMinutes * 60 * 1000);
          
          queue[existingIndex] = existing;
        } else {
          // Max retries reached, remove from queue
          queue.splice(existingIndex, 1);
          console.log(`Notification ${originalNotificationId} exceeded max retries, removing from queue`);
        }
      } else {
        // Add new entry
        const retryEntry: NotificationRetryEntry = {
          id: `retry_${originalNotificationId}_${Date.now()}`,
          originalNotificationId,
          type: type as any,
          content,
          originalTriggerTime,
          retryAttempts: 1,
          maxRetries: config.maxRetries,
          nextRetryTime: new Date().getTime() + (config.initialDelayMinutes * 60 * 1000),
          backoffMultiplier: config.backoffMultiplier,
          created: new Date().getTime(),
          failureReasons: [failureReason]
        };
        
        queue.push(retryEntry);
      }
      
      // Save updated queue
      await AsyncStorage.setItem(NOTIFICATION_RETRY_QUEUE_KEY, JSON.stringify(queue));
      
    } catch (error) {
      console.error('Error adding to retry queue:', error);
    }
  }

  /**
   * Process retry queue and attempt to resend failed notifications
   */
  async processRetryQueue(): Promise<void> {
    try {
      // Get retry queue
      const queueJson = await AsyncStorage.getItem(NOTIFICATION_RETRY_QUEUE_KEY);
      if (!queueJson) return;
      
      const queue: NotificationRetryEntry[] = JSON.parse(queueJson);
      const now = new Date().getTime();
      const config = await this.getRetryConfig();
      
      // Filter out expired entries (older than retry timeout)
      const timeoutMillis = config.retryTimeoutHours * 60 * 60 * 1000;
      const activeQueue = queue.filter(entry => 
        (now - entry.created) < timeoutMillis
      );
      
      // Process entries ready for retry
      const updatedQueue: NotificationRetryEntry[] = [];
      
      for (const entry of activeQueue) {
        if (entry.nextRetryTime <= now) {
          // Attempt retry
          try {
            const notificationId = await this.scheduleNotification(
              entry.content,
              new Date(now + 1000) // Schedule 1 second from now
            );
            
            // Track successful retry
            await this.trackNotificationScheduled(notificationId, entry.type, entry.content.data);
            console.log(`Successfully retried notification ${entry.originalNotificationId}, attempt ${entry.retryAttempts}`);
            
          } catch (retryError) {
            // Retry failed, add back to queue with updated attempt count
            const errorMessage = retryError instanceof Error ? retryError.message : 'Unknown retry error';
            entry.retryAttempts++;
            entry.lastAttempt = now;
            entry.failureReasons.push(errorMessage);
            
            if (entry.retryAttempts < entry.maxRetries) {
              // Calculate next retry time
              const delayMinutes = config.initialDelayMinutes * Math.pow(config.backoffMultiplier, entry.retryAttempts - 1);
              const maxDelayMinutes = config.maxDelayHours * 60;
              const actualDelayMinutes = Math.min(delayMinutes, maxDelayMinutes);
              
              entry.nextRetryTime = now + (actualDelayMinutes * 60 * 1000);
              updatedQueue.push(entry);
              
              console.log(`Retry failed for ${entry.originalNotificationId}, scheduling next attempt in ${actualDelayMinutes} minutes`);
            } else {
              console.log(`Max retries reached for notification ${entry.originalNotificationId}, giving up`);
            }
          }
        } else {
          // Not ready for retry yet
          updatedQueue.push(entry);
        }
      }
      
      // Save updated queue
      await AsyncStorage.setItem(NOTIFICATION_RETRY_QUEUE_KEY, JSON.stringify(updatedQueue));
      
    } catch (error) {
      console.error('Error processing retry queue:', error);
    }
  }

  /**
   * Get retry configuration
   */
  private async getRetryConfig(): Promise<NotificationRetryConfig> {
    try {
      const configJson = await AsyncStorage.getItem(NOTIFICATION_RETRY_CONFIG_KEY);
      if (configJson) {
        return JSON.parse(configJson);
      }
      
      // Return default config if none exists
      return {
        enabled: true,
        maxRetries: 3,
        initialDelayMinutes: 5,
        backoffMultiplier: 2,
        maxDelayHours: 24,
        retryTimeoutHours: 72
      };
    } catch (error) {
      console.error('Error getting retry config:', error);
      return {
        enabled: false,
        maxRetries: 0,
        initialDelayMinutes: 5,
        backoffMultiplier: 2,
        maxDelayHours: 24,
        retryTimeoutHours: 72
      };
    }
  }

  /**
   * Update retry configuration
   */
  async updateRetryConfig(config: Partial<NotificationRetryConfig>): Promise<void> {
    try {
      const currentConfig = await this.getRetryConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await AsyncStorage.setItem(NOTIFICATION_RETRY_CONFIG_KEY, JSON.stringify(updatedConfig));
    } catch (error) {
      console.error('Error updating retry config:', error);
    }
  }

  /**
   * Get retry queue status
   */
  async getRetryQueueStatus(): Promise<{
    totalEntries: number;
    pendingRetries: number;
    failedPermanently: number;
  }> {
    try {
      const queueJson = await AsyncStorage.getItem(NOTIFICATION_RETRY_QUEUE_KEY);
      if (!queueJson) {
        return { totalEntries: 0, pendingRetries: 0, failedPermanently: 0 };
      }
      
      const queue: NotificationRetryEntry[] = JSON.parse(queueJson);
      const now = new Date().getTime();
      const config = await this.getRetryConfig();
      const timeoutMillis = config.retryTimeoutHours * 60 * 60 * 1000;
      
      const pendingRetries = queue.filter(entry => 
        (now - entry.created) < timeoutMillis && entry.retryAttempts < entry.maxRetries
      ).length;
      
      const failedPermanently = queue.filter(entry => 
        (now - entry.created) >= timeoutMillis || entry.retryAttempts >= entry.maxRetries
      ).length;
      
      return {
        totalEntries: queue.length,
        pendingRetries,
        failedPermanently
      };
      
    } catch (error) {
      console.error('Error getting retry queue status:', error);
      return { totalEntries: 0, pendingRetries: 0, failedPermanently: 0 };
    }
  }

  // ===== FIREBASE CLOUD FUNCTIONS PRODUCTION METHODS =====

  /**
   * Schedule production push notification via Firebase Cloud Functions
   * This method uses server-side scheduling for reliable delivery
   */
  async scheduleProductionNotification(
    title: string,
    body: string,
    data: any,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.scheduleNotification({
        pushToken: this.pushToken,
        title,
        body,
        data: {
          ...data,
          priority
        },
        scheduledTime
      });

      if (result.success) {
        console.log('Production notification scheduled:', result.notificationId);
        
        // Track locally for statistics
        await this.trackNotificationScheduled(result.notificationId!, 'production_notification', data);
      }

      return result;

    } catch (error: any) {
      console.error('Error scheduling production notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule production medication reminder via Firebase Cloud Functions
   */
  async scheduleProductionMedicationReminder(
    medicationId: string,
    petId: string,
    medicationName: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'high'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.scheduleMedicationReminder(
        this.pushToken,
        medicationId,
        petId,
        medicationName,
        scheduledTime,
        priority
      );

      if (result.success) {
        console.log('Production medication reminder scheduled:', result.notificationId);
        
        // Track locally for statistics
        await this.trackNotificationScheduled(result.notificationId!, 'medication_reminder', {
          medicationId,
          petId,
          medicationName
        });
      }

      return result;

    } catch (error: any) {
      console.error('Error scheduling production medication reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule production task reminder via Firebase Cloud Functions
   */
  async scheduleProductionTaskReminder(
    taskId: string,
    petId: string,
    taskTitle: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.scheduleTaskReminder(
        this.pushToken,
        taskId,
        petId,
        taskTitle,
        scheduledTime,
        priority
      );

      if (result.success) {
        console.log('Production task reminder scheduled:', result.notificationId);
        
        // Track locally for statistics
        await this.trackNotificationScheduled(result.notificationId!, 'task_reminder', {
          taskId,
          petId,
          taskTitle
        });
      }

      return result;

    } catch (error: any) {
      console.error('Error scheduling production task reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule production meal reminder via Firebase Cloud Functions
   */
  async scheduleProductionMealReminder(
    mealId: string,
    petId: string,
    mealType: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.scheduleMealReminder(
        this.pushToken,
        mealId,
        petId,
        mealType,
        scheduledTime,
        priority
      );

      if (result.success) {
        console.log('Production meal reminder scheduled:', result.notificationId);
        
        // Track locally for statistics
        await this.trackNotificationScheduled(result.notificationId!, 'meal_reminder', {
          mealId,
          petId,
          mealType
        });
      }

      return result;

    } catch (error: any) {
      console.error('Error scheduling production meal reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule production inventory alert via Firebase Cloud Functions
   */
  async scheduleProductionInventoryAlert(
    itemId: string,
    petId: string,
    itemName: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'high'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.scheduleInventoryAlert(
        this.pushToken,
        itemId,
        petId,
        itemName,
        scheduledTime,
        priority
      );

      if (result.success) {
        console.log('Production inventory alert scheduled:', result.notificationId);
        
        // Track locally for statistics
        await this.trackNotificationScheduled(result.notificationId!, 'inventory_alert', {
          itemId,
          petId,
          itemName
        });
      }

      return result;

    } catch (error: any) {
      console.error('Error scheduling production inventory alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send immediate production push notification via Firebase Cloud Functions
   */
  async sendImmediateProductionNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<{ success: boolean; ticketId?: string; error?: string }> {
    try {
      if (!this.pushToken) {
        return { success: false, error: 'Push token not available' };
      }

      const result = await firebaseCloudFunctionsService.sendImmediateNotification(
        this.pushToken,
        title,
        body,
        data
      );

      if (result.success) {
        console.log('Immediate production notification sent:', result.ticketId);
      }

      return result;

    } catch (error: any) {
      console.error('Error sending immediate production notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel production notification via Firebase Cloud Functions
   */
  async cancelProductionNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await firebaseCloudFunctionsService.cancelNotification(notificationId);

      if (result.success) {
        console.log('Production notification cancelled:', notificationId);
        
        // Track cancellation locally
        await this.trackNotificationDelivery(notificationId, 'cancelled', {});
      }

      return result;

    } catch (error: any) {
      console.error('Error cancelling production notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get production notification statistics from Firebase Cloud Functions
   */
  async getProductionNotificationStats(): Promise<{ 
    success: boolean; 
    stats?: { pending: number; sent: number; failed: number; total: number }; 
    error?: string 
  }> {
    try {
      const result = await firebaseCloudFunctionsService.getNotificationStats();
      
      if (result.success) {
        console.log('Production notification stats retrieved:', result.stats);
      }

      return result;

    } catch (error: any) {
      console.error('Error getting production notification stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Firebase Cloud Functions connection
   */
  async testProductionNotificationConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    stats?: { pending: number; sent: number; failed: number; total: number } 
  }> {
    try {
      const result = await firebaseCloudFunctionsService.testConnection();
      
      if (result.success) {
        console.log('Firebase Cloud Functions connection test successful');
      } else {
        console.error('Firebase Cloud Functions connection test failed:', result.message);
      }

      return result;

    } catch (error: any) {
      console.error('Error testing Firebase Cloud Functions connection:', error);
      return { 
        success: false, 
        message: `Connection test failed: ${error.message}` 
      };
    }
  }

  /**
   * Get Firebase Cloud Functions service endpoints for debugging
   */
  getProductionNotificationEndpoints(): { [key: string]: string } {
    return firebaseCloudFunctionsService.getEndpoints();
  }

  /**
   * Get cached production notifications
   */
  async getCachedProductionNotifications(): Promise<any[]> {
    try {
      return await firebaseCloudFunctionsService.getCachedNotifications();
    } catch (error: any) {
      console.error('Error getting cached production notifications:', error);
      return [];
    }
  }

  /**
   * Clear production notification cache
   */
  async clearProductionNotificationCache(): Promise<void> {
    try {
      await firebaseCloudFunctionsService.clearCache();
      console.log('Production notification cache cleared');
    } catch (error: any) {
      console.error('Error clearing production notification cache:', error);
    }
  }

  /**
   * Schedule notifications for a health record follow-up
   * @param healthRecord The health record to schedule notifications for
   */
  async scheduleHealthRecordNotifications(healthRecord: any): Promise<void> {
    try {
      console.log('🔔 scheduleHealthRecordNotifications called with:', {
        id: healthRecord.id,
        type: healthRecord.type,
        title: healthRecord.title,
        followUpNeeded: healthRecord.followUpNeeded,
        followUpDate: healthRecord.followUpDate
      });

      // Check if follow-up notifications are needed for this health record
      if (!healthRecord.followUpNeeded || !healthRecord.followUpDate) {
        console.log('⏭️ No follow-up notifications needed:', {
          followUpNeeded: healthRecord.followUpNeeded,
          followUpDate: healthRecord.followUpDate
        });
        return;
      }
      
      // Cancel any existing notifications for this health record
      await this.cancelHealthRecordNotifications(healthRecord.id);
      
      // Get pet details for notification text
      const pet = await unifiedDatabaseManager.pets.getById(healthRecord.petId);
      const petName = pet ? pet.name : 'your pet';
      
      const followUpDate = new Date(healthRecord.followUpDate);
      const now = new Date();
      
      // Only schedule if the follow-up date is in the future
      if (followUpDate <= now) {
        return;
      }
      
      // Create an array to store all scheduled notifications
      const scheduledNotifications: ScheduledNotification[] = [];
      
      // Create notification content based on health record type
      const recordTypeDisplay = healthRecord.type.charAt(0).toUpperCase() + healthRecord.type.slice(1);
      const baseContent = {
        title: `${recordTypeDisplay} Follow-up Reminder`,
        body: `${petName} has a ${healthRecord.type} follow-up${healthRecord.title ? ` for ${healthRecord.title}` : ''} scheduled today`,
        data: {
          healthRecordId: healthRecord.id,
          petId: healthRecord.petId,
          type: 'health_record_followup',
          recordType: healthRecord.type,
          title: healthRecord.title || recordTypeDisplay
        },
      };
      
      // Schedule reminder notification (day before follow-up)
      const dayBeforeDate = new Date(followUpDate);
      dayBeforeDate.setDate(dayBeforeDate.getDate() - 1);
      dayBeforeDate.setHours(18, 0, 0, 0); // 6 PM the day before
      
      if (dayBeforeDate > now) {
        const reminderContent = {
          ...baseContent,
          title: `Upcoming ${recordTypeDisplay} Follow-up`,
          body: `Reminder: ${petName} has a ${healthRecord.type} follow-up${healthRecord.title ? ` for ${healthRecord.title}` : ''} scheduled for tomorrow`
        };
        
        const reminderNotificationId = await this.scheduleNotification(reminderContent, dayBeforeDate);
        
        scheduledNotifications.push({
          id: reminderNotificationId,
          taskId: healthRecord.id, // Use taskId field for health record ID for compatibility
          petId: healthRecord.petId,
          title: reminderContent.title,
          body: reminderContent.body,
          data: reminderContent.data,
          triggerTime: dayBeforeDate.getTime()
        });
      }
      
      // Schedule the actual follow-up notification (morning of follow-up day)
      const followUpNotificationDate = new Date(followUpDate);
      followUpNotificationDate.setHours(9, 0, 0, 0); // 9 AM on follow-up day
      
      if (followUpNotificationDate > now) {
        const followUpNotificationId = await this.scheduleNotification(baseContent, followUpNotificationDate);
        
        scheduledNotifications.push({
          id: followUpNotificationId,
          taskId: healthRecord.id, // Use taskId field for health record ID for compatibility
          petId: healthRecord.petId,
          title: baseContent.title,
          body: baseContent.body,
          data: baseContent.data,
          triggerTime: followUpNotificationDate.getTime()
        });
      }
      
      // Save the scheduled notifications
      if (scheduledNotifications.length > 0) {
        await this.saveScheduledNotifications(scheduledNotifications);
        console.log(`Successfully scheduled ${scheduledNotifications.length} notifications for ${healthRecord.type} follow-up`);
      }
      
    } catch (error) {
      console.error('Error scheduling health record notifications:', error);
      throw new Error(`Failed to schedule health record notifications: ${error}`);
    }
  }

  /**
   * Cancel all notifications for a health record
   * @param healthRecordId The health record ID
   */
  async cancelHealthRecordNotifications(healthRecordId: string): Promise<void> {
    try {
      // Get existing scheduled notifications
      const existingJson = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const existingNotifications: ScheduledNotification[] = existingJson 
        ? JSON.parse(existingJson) 
        : [];
      
      // Find notifications for this health record
      const notificationsToCancel = existingNotifications.filter(
        notification => notification.taskId === healthRecordId && 
                       notification.data?.type === 'health_record_followup'
      );
      
      // Cancel each notification
      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.id);
      }
      
      // Remove from stored notifications
      const updatedNotifications = existingNotifications.filter(
        notification => !(notification.taskId === healthRecordId && 
                         notification.data?.type === 'health_record_followup')
      );
      
      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
      
      console.log(`Cancelled ${notificationsToCancel.length} notifications for health record ${healthRecordId}`);
      
    } catch (error) {
      console.error('Error cancelling health record notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 