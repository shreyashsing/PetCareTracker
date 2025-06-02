/**
 * Firebase Cloud Functions Client Service
 * 
 * This service handles communication between the mobile app and Firebase Cloud Functions
 * for production push notification scheduling and management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const FIREBASE_PROJECT_ID = 'petcare-tracker-92b0e';
const FIREBASE_REGION = 'us-central1';
const FUNCTIONS_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// Storage keys
const USER_ID_KEY = 'firebase_user_id';
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_notifications_cache';

export interface ScheduledNotificationRequest {
  userId: string;
  pushToken: string;
  title: string;
  body: string;
  data: {
    type: string;
    petId: string;
    entityId: string;
    priority: 'normal' | 'high' | 'critical';
  };
  scheduledTime: number;
  maxRetries?: number;
}

export interface NotificationResponse {
  success: boolean;
  notificationId?: string;
  ticketId?: string;
  message?: string;
  error?: string;
}

export interface NotificationStats {
  pending: number;
  sent: number;
  failed: number;
  total: number;
}

class FirebaseCloudFunctionsService {
  private userId: string | null = null;

  /**
   * Initialize the service with user ID
   */
  async initialize(): Promise<void> {
    try {
      // Get or generate user ID
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
      this.userId = userId;
      console.log('Firebase Cloud Functions service initialized with user ID:', userId);
    } catch (error) {
      console.error('Failed to initialize Firebase Cloud Functions service:', error);
    }
  }

  /**
   * Schedule a push notification via Firebase Cloud Functions
   */
  async scheduleNotification(request: Omit<ScheduledNotificationRequest, 'userId'>): Promise<NotificationResponse> {
    try {
      if (!this.userId) {
        await this.initialize();
      }

      const fullRequest: ScheduledNotificationRequest = {
        ...request,
        userId: this.userId!,
        maxRetries: request.maxRetries || 3
      };

      const response = await fetch(`${FUNCTIONS_BASE_URL}/scheduleNotification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullRequest),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Cache the scheduled notification locally
        await this.cacheScheduledNotification(result.notificationId, fullRequest);
        console.log('Notification scheduled successfully:', result.notificationId);
        return result;
      } else {
        console.error('Failed to schedule notification:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }

    } catch (error: any) {
      console.error('Error scheduling notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send immediate push notification via Firebase Cloud Functions
   */
  async sendImmediateNotification(
    pushToken: string,
    title: string,
    body: string,
    data: any = {}
  ): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/sendImmediateNotification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pushToken,
          title,
          body,
          data
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Immediate notification sent successfully:', result.ticketId);
        return result;
      } else {
        console.error('Failed to send immediate notification:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }

    } catch (error: any) {
      console.error('Error sending immediate notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/cancelNotification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove from local cache
        await this.removeCachedNotification(notificationId);
        console.log('Notification cancelled successfully:', notificationId);
        return result;
      } else {
        console.error('Failed to cancel notification:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }

    } catch (error: any) {
      console.error('Error cancelling notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{ success: boolean; stats?: NotificationStats; error?: string }> {
    try {
      if (!this.userId) {
        await this.initialize();
      }

      const response = await fetch(`${FUNCTIONS_BASE_URL}/getNotificationStats?userId=${this.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Notification stats retrieved:', result.stats);
        return result;
      } else {
        console.error('Failed to get notification stats:', result.error);
        return { success: false, error: result.error || 'Unknown error' };
      }

    } catch (error: any) {
      console.error('Error getting notification stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule medication reminder
   */
  async scheduleMedicationReminder(
    pushToken: string,
    medicationId: string,
    petId: string,
    medicationName: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'high'
  ): Promise<NotificationResponse> {
    return this.scheduleNotification({
      pushToken,
      title: '💊 Medication Reminder',
      body: `Time to give ${medicationName} to your pet`,
      data: {
        type: 'medication_reminder',
        petId,
        entityId: medicationId,
        priority
      },
      scheduledTime
    });
  }

  /**
   * Schedule task reminder
   */
  async scheduleTaskReminder(
    pushToken: string,
    taskId: string,
    petId: string,
    taskTitle: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<NotificationResponse> {
    return this.scheduleNotification({
      pushToken,
      title: '📋 Task Reminder',
      body: `Don't forget: ${taskTitle}`,
      data: {
        type: 'task_reminder',
        petId,
        entityId: taskId,
        priority
      },
      scheduledTime
    });
  }

  /**
   * Schedule meal reminder
   */
  async scheduleMealReminder(
    pushToken: string,
    mealId: string,
    petId: string,
    mealType: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<NotificationResponse> {
    return this.scheduleNotification({
      pushToken,
      title: '🍽️ Meal Time',
      body: `Time for ${mealType}`,
      data: {
        type: 'meal_reminder',
        petId,
        entityId: mealId,
        priority
      },
      scheduledTime
    });
  }

  /**
   * Schedule inventory alert
   */
  async scheduleInventoryAlert(
    pushToken: string,
    itemId: string,
    petId: string,
    itemName: string,
    scheduledTime: number,
    priority: 'normal' | 'high' | 'critical' = 'high'
  ): Promise<NotificationResponse> {
    return this.scheduleNotification({
      pushToken,
      title: '📦 Low Inventory Alert',
      body: `Running low on ${itemName}`,
      data: {
        type: 'inventory_alert',
        petId,
        entityId: itemId,
        priority
      },
      scheduledTime
    });
  }

  /**
   * Test the Firebase Cloud Functions connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; stats?: NotificationStats }> {
    try {
      console.log('Testing Firebase Cloud Functions connection...');
      
      // Test getting stats (this will also test authentication)
      const statsResult = await this.getNotificationStats();
      
      if (statsResult.success) {
        return {
          success: true,
          message: 'Firebase Cloud Functions connection successful!',
          stats: statsResult.stats
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${statsResult.error}`
        };
      }

    } catch (error: any) {
      console.error('Firebase Cloud Functions connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Cache scheduled notification locally for offline reference
   */
  private async cacheScheduledNotification(notificationId: string, request: ScheduledNotificationRequest): Promise<void> {
    try {
      const existingCache = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      const cache = existingCache ? JSON.parse(existingCache) : {};
      
      cache[notificationId] = {
        ...request,
        notificationId,
        cachedAt: Date.now()
      };

      await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache scheduled notification:', error);
    }
  }

  /**
   * Remove cached notification
   */
  private async removeCachedNotification(notificationId: string): Promise<void> {
    try {
      const existingCache = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (existingCache) {
        const cache = JSON.parse(existingCache);
        delete cache[notificationId];
        await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('Failed to remove cached notification:', error);
    }
  }

  /**
   * Get cached scheduled notifications
   */
  async getCachedNotifications(): Promise<any[]> {
    try {
      const existingCache = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (existingCache) {
        const cache = JSON.parse(existingCache);
        return Object.values(cache);
      }
      return [];
    } catch (error) {
      console.error('Failed to get cached notifications:', error);
      return [];
    }
  }

  /**
   * Clear all cached notifications
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
      console.log('Notification cache cleared');
    } catch (error) {
      console.error('Failed to clear notification cache:', error);
    }
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get Firebase Cloud Functions URLs for debugging
   */
  getEndpoints(): { [key: string]: string } {
    return {
      scheduleNotification: `${FUNCTIONS_BASE_URL}/scheduleNotification`,
      sendImmediateNotification: `${FUNCTIONS_BASE_URL}/sendImmediateNotification`,
      cancelNotification: `${FUNCTIONS_BASE_URL}/cancelNotification`,
      getNotificationStats: `${FUNCTIONS_BASE_URL}/getNotificationStats`
    };
  }
}

// Export singleton instance
export const firebaseCloudFunctionsService = new FirebaseCloudFunctionsService(); 