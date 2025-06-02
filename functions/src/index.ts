/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

/**
 * Firebase Cloud Functions for PetCareTracker Push Notifications
 * 
 * This module provides:
 * - Scheduled notification storage and delivery
 * - Push notification sending via Expo
 * - Notification retry mechanisms
 * - Critical reminder backup system
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

// Firestore database reference
const db = admin.firestore();

// Types for scheduled notifications
interface ScheduledNotification {
  id: string;
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
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
}

interface NotificationDeliveryLog {
  id: string;
  notificationId: string;
  status: 'scheduled' | 'delivered' | 'failed' | 'cancelled' | 'interacted';
  timestamp: number;
  error?: string;
  pushTicketId?: string;
  receiptId?: string;
}

/**
 * HTTP Function: Schedule a push notification
 */
export const scheduleNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      userId,
      pushToken,
      title,
      body,
      data,
      scheduledTime,
      maxRetries = 3
    } = req.body;

    // Validate required fields
    if (!userId || !pushToken || !title || !body || !scheduledTime) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate push token
    if (!Expo.isExpoPushToken(pushToken)) {
      res.status(400).json({ error: 'Invalid Expo push token' });
      return;
    }

    // Create scheduled notification
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledNotification: ScheduledNotification = {
      id: notificationId,
      userId,
      pushToken,
      title,
      body,
      data: data || {},
      scheduledTime,
      status: 'pending',
      retryCount: 0,
      maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Store in Firestore
    await db.collection('scheduledNotifications').doc(notificationId).set(scheduledNotification);

    // Log the scheduling
    await logNotificationDelivery(notificationId, 'scheduled');

    functions.logger.info(`Notification scheduled: ${notificationId}`, { 
      userId, 
      scheduledTime: new Date(scheduledTime).toISOString() 
    });

    res.status(200).json({ 
      success: true, 
      notificationId,
      message: 'Notification scheduled successfully' 
    });

  } catch (error) {
    functions.logger.error('Error scheduling notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * HTTP Function: Send immediate push notification
 */
export const sendImmediateNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { pushToken, title, body, data } = req.body;

    // Validate required fields
    if (!pushToken || !title || !body) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate push token
    if (!Expo.isExpoPushToken(pushToken)) {
      res.status(400).json({ error: 'Invalid Expo push token' });
      return;
    }

    // Send notification immediately
    const result = await sendPushNotification(pushToken, title, body, data);

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        ticketId: result.ticketId,
        message: 'Notification sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

  } catch (error) {
    functions.logger.error('Error sending immediate notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * HTTP Function: Cancel a scheduled notification
 */
export const cancelNotification = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { notificationId } = req.body;

    if (!notificationId) {
      res.status(400).json({ error: 'Missing notification ID' });
      return;
    }

    // Update notification status to cancelled
    await db.collection('scheduledNotifications').doc(notificationId).update({
      status: 'cancelled',
      updatedAt: Date.now()
    });

    // Log the cancellation
    await logNotificationDelivery(notificationId, 'cancelled');

    functions.logger.info(`Notification cancelled: ${notificationId}`);

    res.status(200).json({ 
      success: true, 
      message: 'Notification cancelled successfully' 
    });

  } catch (error) {
    functions.logger.error('Error cancelling notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Scheduled Function: Process pending notifications every minute
 */
export const processScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    try {
      const now = Date.now();
      
      // Query pending notifications that are due
      const snapshot = await db.collection('scheduledNotifications')
        .where('status', '==', 'pending')
        .where('scheduledTime', '<=', now)
        .limit(100) // Process max 100 notifications per run
        .get();

      if (snapshot.empty) {
        functions.logger.info('No pending notifications to process');
        return;
      }

      const notifications = snapshot.docs.map(doc => doc.data() as ScheduledNotification);
      functions.logger.info(`Processing ${notifications.length} pending notifications`);

      // Process notifications in batches
      const batchSize = 10;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await Promise.all(batch.map(processNotification));
      }

    } catch (error) {
      functions.logger.error('Error processing scheduled notifications:', error);
    }
  });

/**
 * Scheduled Function: Clean up old notifications daily
 */
export const cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // Delete notifications older than 7 days
      const snapshot = await db.collection('scheduledNotifications')
        .where('createdAt', '<', sevenDaysAgo)
        .limit(500)
        .get();

      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        functions.logger.info(`Cleaned up ${snapshot.size} old notifications`);
      }

      // Also clean up old delivery logs
      const logSnapshot = await db.collection('notificationDeliveryLogs')
        .where('timestamp', '<', sevenDaysAgo)
        .limit(500)
        .get();

      if (!logSnapshot.empty) {
        const logBatch = db.batch();
        logSnapshot.docs.forEach(doc => {
          logBatch.delete(doc.ref);
        });
        await logBatch.commit();
        
        functions.logger.info(`Cleaned up ${logSnapshot.size} old delivery logs`);
      }

    } catch (error) {
      functions.logger.error('Error cleaning up old notifications:', error);
    }
  });

/**
 * HTTP Function: Get notification statistics
 */
export const getNotificationStats = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'Missing user ID' });
      return;
    }

    // Get notification counts
    const [pendingSnapshot, sentSnapshot, failedSnapshot] = await Promise.all([
      db.collection('scheduledNotifications').where('userId', '==', userId).where('status', '==', 'pending').get(),
      db.collection('scheduledNotifications').where('userId', '==', userId).where('status', '==', 'sent').get(),
      db.collection('scheduledNotifications').where('userId', '==', userId).where('status', '==', 'failed').get()
    ]);

    const stats = {
      pending: pendingSnapshot.size,
      sent: sentSnapshot.size,
      failed: failedSnapshot.size,
      total: pendingSnapshot.size + sentSnapshot.size + failedSnapshot.size
    };

    res.status(200).json({ success: true, stats });

  } catch (error) {
    functions.logger.error('Error getting notification stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function: Process a single notification
 */
async function processNotification(notification: ScheduledNotification): Promise<void> {
  try {
    functions.logger.info(`Processing notification: ${notification.id}`);

    // Send the push notification
    const result = await sendPushNotification(
      notification.pushToken,
      notification.title,
      notification.body,
      notification.data
    );

    if (result.success) {
      // Update status to sent
      await db.collection('scheduledNotifications').doc(notification.id).update({
        status: 'sent',
        updatedAt: Date.now()
      });

      // Log successful delivery
      await logNotificationDelivery(notification.id, 'delivered', undefined, result.ticketId);

      functions.logger.info(`Notification sent successfully: ${notification.id}`);

    } else {
      // Handle failure
      await handleNotificationFailure(notification, result.error || 'Unknown error');
    }

  } catch (error) {
    functions.logger.error(`Error processing notification ${notification.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await handleNotificationFailure(notification, errorMessage);
  }
}

/**
 * Helper function: Send push notification via Expo
 */
async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data: any = {}
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      return { success: false, error: 'Invalid push token' };
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      title,
      body,
      data,
      sound: 'default',
      badge: 1,
      priority: data.priority === 'critical' ? 'high' : 'normal'
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets[0];

    if (ticket.status === 'ok') {
      return { success: true, ticketId: ticket.id };
    } else {
      return { success: false, error: ticket.message || 'Unknown error' };
    }

  } catch (error) {
    functions.logger.error('Error sending push notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper function: Handle notification failure with retry logic
 */
async function handleNotificationFailure(notification: ScheduledNotification, error: string): Promise<void> {
  const newRetryCount = notification.retryCount + 1;

  if (newRetryCount <= notification.maxRetries) {
    // Schedule retry with exponential backoff
    const retryDelay = Math.pow(2, newRetryCount) * 5 * 60 * 1000; // 5min, 10min, 20min
    const newScheduledTime = Date.now() + retryDelay;

    await db.collection('scheduledNotifications').doc(notification.id).update({
      retryCount: newRetryCount,
      scheduledTime: newScheduledTime,
      updatedAt: Date.now()
    });

    functions.logger.info(`Notification retry scheduled: ${notification.id}, attempt ${newRetryCount}`);

  } else {
    // Max retries reached, mark as failed
    await db.collection('scheduledNotifications').doc(notification.id).update({
      status: 'failed',
      updatedAt: Date.now()
    });

    functions.logger.error(`Notification failed permanently: ${notification.id}`);
  }

  // Log the failure
  await logNotificationDelivery(notification.id, 'failed', error);
}

/**
 * Helper function: Log notification delivery status
 */
async function logNotificationDelivery(
  notificationId: string,
  status: 'scheduled' | 'delivered' | 'failed' | 'cancelled' | 'interacted',
  error?: string,
  pushTicketId?: string,
  receiptId?: string
): Promise<void> {
  try {
    const logId = `log_${notificationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deliveryLog: NotificationDeliveryLog = {
      id: logId,
      notificationId,
      status,
      timestamp: Date.now(),
      error,
      pushTicketId,
      receiptId
    };

    await db.collection('notificationDeliveryLogs').doc(logId).set(deliveryLog);

  } catch (error) {
    functions.logger.error('Error logging notification delivery:', error);
  }
}
