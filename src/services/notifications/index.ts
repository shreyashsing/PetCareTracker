import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { Task, Medication, Meal, FoodItem } from '../../types/components';
import { databaseManager } from '../db';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_granted';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications';
const SCHEDULED_MEDICATION_NOTIFICATIONS_KEY = 'scheduled_medication_notifications';
const SCHEDULED_MEAL_NOTIFICATIONS_KEY = 'scheduled_meal_notifications';
const INVENTORY_ALERT_NOTIFICATIONS_KEY = 'inventory_alert_notifications';

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
 * Notification Service class to handle scheduling and canceling notifications
 */
class NotificationService {
  private static instance: NotificationService;
  private initialized: boolean = false;
  
  // Singleton pattern
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }
  
  /**
   * Initialize notifications
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      // Check if running on a physical device (notifications don't work in simulator)
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices, not in the simulator');
        return false;
      }

      // Request permission to show notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // Save permission status
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, finalStatus);
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Initialize success
      this.initialized = finalStatus === 'granted';
      
      return this.initialized;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Set up notification received and response listeners
   */
  private setupNotificationListeners(): void {
    // When a notification is received while the app is in the foreground
    Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      console.log('Notification received in foreground:', notification);
    });

    // When user taps on a notification (app in background or closed)
    Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      
      // Handle notification tap based on data
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle when a user taps on a notification
   * @param data Data from the notification
   */
  private handleNotificationTap(data: any): void {
    // Handle navigation or other actions based on notification data
    // This would typically be used to navigate to the appropriate screen
    console.log('Notification tapped with data:', data);
    
    // The actual implementation would depend on how navigation is set up
    // Example: navigate to task detail or pet profile screen
  }

  /**
   * Schedule notifications for a task
   * @param task The task to schedule notifications for
   */
  async scheduleTaskNotifications(task: Task): Promise<void> {
    try {
      // Check if notifications are enabled for this task
      if (!task.reminderSettings.enabled) {
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
      const pet = await databaseManager.pets.getById(task.petId);
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
    const identifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: triggerDate,
    });
    
    return identifier;
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
      // Check if notifications are enabled for this medication
      if (!medication.reminderSettings.enabled) {
        return;
      }
      
      // Cancel any existing notifications for this medication
      await this.cancelMedicationNotifications(medication.id);
      
      // Get pet details for notification text
      const pet = await databaseManager.pets.getById(medication.petId);
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
      
      // Calculate how many days to schedule in advance (up to 30 days)
      const now = new Date();
      const maxScheduleDate = new Date();
      maxScheduleDate.setDate(now.getDate() + 30); // Schedule up to 30 days in advance
      
      // Calculate the end of scheduling period
      const schedulingEndDate = endDate && endDate < maxScheduleDate ? endDate : maxScheduleDate;
      
      // Only schedule if the start date is in the past or future
      if (startDate > schedulingEndDate) {
        return; // No need to schedule notifications yet
      }
      
      // Start scheduling from today or start date, whichever is later
      const schedulingStartDate = startDate > now ? startDate : now;
      
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
        
        // Schedule for specific times if provided
        if (medication.frequency.specificTimes && medication.frequency.specificTimes.length > 0) {
          for (const timeString of medication.frequency.specificTimes) {
            // Parse time string (format should be HH:MM)
            const [hours, minutes] = timeString.split(':').map(Number);
            
            // Create a notification date for this specific time
            const notificationDate = new Date(currentDate);
            notificationDate.setHours(hours, minutes, 0, 0);
            
            // Only schedule if the notification time is in the future
            if (notificationDate > now) {
              // Schedule the reminder notification (X minutes before the dose time)
              const reminderDate = new Date(notificationDate);
              reminderDate.setMinutes(reminderDate.getMinutes() - medication.reminderSettings.reminderTime);
              
              if (reminderDate > now) {
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
            }
          }
        } else {
          // If no specific times, distribute doses evenly throughout the day
          const times = this.generateEvenlyDistributedTimes(dosesPerDay);
          
          for (const { hours, minutes } of times) {
            // Create a notification date for this specific time
            const notificationDate = new Date(currentDate);
            notificationDate.setHours(hours, minutes, 0, 0);
            
            // Only schedule if the notification time is in the future
            if (notificationDate > now) {
              // Schedule the reminder notification (X minutes before the dose time)
              const reminderDate = new Date(notificationDate);
              reminderDate.setMinutes(reminderDate.getMinutes() - medication.reminderSettings.reminderTime);
              
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
            }
          }
        }
      }
      
      // Save scheduled notifications
      await this.saveScheduledMedicationNotifications(scheduledNotifications);
      
    } catch (error) {
      console.error('Error scheduling medication notifications:', error);
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
      if (!meal.reminderSettings.enabled) {
        return;
      }
      
      // Cancel any existing notifications for this meal
      await this.cancelMealNotifications(meal.id);
      
      // Get pet details for notification text
      const pet = await databaseManager.pets.getById(meal.petId);
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
        reminderDate.setMinutes(reminderDate.getMinutes() - meal.reminderSettings.reminderTime);
        
        // Only schedule the reminder if it's in the future
        if (reminderDate > new Date()) {
          const content = {
            ...baseContent,
            body: `In ${meal.reminderSettings.reminderTime} minutes: ${baseContent.body}`
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
      // Only schedule if the inventory is below threshold
      if (foodItem.inventory.currentAmount > foodItem.inventory.lowStockThreshold) {
        return;
      }
      
      // Cancel any existing notifications for this food item
      await this.cancelInventoryAlert(foodItem.id);
      
      // Get pet details for notification text
      const pet = await databaseManager.pets.getById(foodItem.petId);
      const petName = pet ? pet.name : 'your pet';
      
      // Calculate days remaining
      const daysRemaining = foodItem.inventory.daysRemaining;
      
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
      const pets = await databaseManager.pets.getAll();
      
      for (const pet of pets) {
        // Get low stock food items for each pet
        const lowStockItems = await databaseManager.foodItems.getLowStock(pet.id);
        
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
      
      // Reschedule task notifications
      const tasks = await databaseManager.tasks.find(
        task => task.status !== 'completed' && task.reminderSettings.enabled
      );
      
      for (const task of tasks) {
        await this.scheduleTaskNotifications(task);
      }
      
      console.log(`Rescheduled notifications for ${tasks.length} tasks`);
      
      // Reschedule medication notifications
      const medications = await databaseManager.medications.find(
        medication => medication.status === 'active' && medication.reminderSettings.enabled
      );
      
      for (const medication of medications) {
        await this.scheduleMedicationNotifications(medication);
      }
      
      console.log(`Rescheduled notifications for ${medications.length} medications`);
      
      // Reschedule meal notifications (for upcoming meals within the next 2 days)
      const now = new Date();
      const twoDaysLater = new Date();
      twoDaysLater.setDate(now.getDate() + 2);
      
      const meals = await databaseManager.meals.find(
        meal => {
          // Check if the meal has a reminder enabled
          if (!meal.reminderSettings?.enabled) return false;
          
          // Make sure the meal date is valid
          const mealDate = new Date(meal.date);
          if (isNaN(mealDate.getTime())) return false;
          
          // Only include upcoming meals within the next 2 days
          return mealDate >= now && mealDate <= twoDaysLater && !meal.completed;
        }
      );
      
      for (const meal of meals) {
        await this.scheduleMealNotifications(meal);
      }
      
      console.log(`Rescheduled notifications for ${meals.length} meals`);
      
      // Check and schedule inventory alerts for low stock items
      await this.checkAndScheduleInventoryAlerts();
      
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
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 