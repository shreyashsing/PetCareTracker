/**
 * Firebase Cloud Messaging (FCM) Test Script
 * 
 * This script tests if Firebase notifications are working properly
 * Run this script after building your app to verify the integration
 */

import { fcmService } from './src/services/notifications/fcm';
import { Alert, Platform } from 'react-native';

async function testFirebaseNotifications() {
  console.log('🔥 Starting Firebase Notification Test...\n');
  
  try {
    // Step 1: Initialize FCM service
    console.log('Step 1: Initializing FCM service...');
    const fcmInitialized = await fcmService.initialize();
    console.log(`FCM Initialization: ${fcmInitialized ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (!fcmInitialized) {
      console.error('FCM initialization failed. Please check your Firebase setup.');
      Alert.alert(
        'FCM Test Failed',
        'Firebase initialization failed. Check your Firebase configuration files and setup.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Step 2: Get FCM token
    console.log('\nStep 2: Getting FCM token...');
    const fcmToken = await fcmService.getFCMToken();
    
    if (!fcmToken) {
      console.error('Failed to get FCM token. Check Firebase configuration.');
      Alert.alert(
        'FCM Test Failed',
        'Could not get FCM token. Verify your Firebase project setup and configuration files.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log(`FCM Token: ${fcmToken.substring(0, 20)}...`);
    console.log('✅ Token generated successfully');
    
    // Step 3: Check if platform supports FCM
    console.log('\nStep 3: Checking platform compatibility...');
    const isAvailable = fcmService.isAvailable();
    console.log(`FCM Available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
    
    if (!isAvailable) {
      console.warn('FCM is not available on this platform or emulator. Physical device required.');
      Alert.alert(
        'FCM Test Warning',
        'Firebase Cloud Messaging may not work properly on emulators. Please test on a physical device.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Step 4: Send test notification
    console.log('\nStep 4: Sending test notification...');
    const currentTime = new Date().toLocaleTimeString();
    const testResult = await fcmService.sendTestNotification(
      '🔔 FCM Test Notification',
      `This is a test message sent at ${currentTime}. If you see this, Firebase is working!`
    );
    
    console.log(`Test notification sent: ${testResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (testResult) {
      Alert.alert(
        'FCM Test Success',
        'Test notification sent successfully! You should receive it shortly. If the app is in the background, the notification should appear in your notification tray.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'FCM Test Failed',
        'Failed to send test notification. Check your Firebase setup and logs for more details.',
        [{ text: 'OK' }]
      );
    }
    
    // Log platform-specific tips
    console.log('\n📱 Platform-specific information:');
    if (Platform.OS === 'android') {
      console.log('Android: Ensure google-services.json is in android/app/ directory');
    } else if (Platform.OS === 'ios') {
      console.log('iOS: Ensure GoogleService-Info.plist is in the correct location and APN is configured');
    }
    
    console.log('\n🔥 Firebase Notification Test Complete');
    
  } catch (error) {
    console.error('❌ Firebase test failed with error:', error);
    Alert.alert(
      'FCM Test Error',
      `An error occurred during testing: ${error.message}`,
      [{ text: 'OK' }]
    );
  }
}

// Export for use in the app
export { testFirebaseNotifications };

// Run tests if this file is executed directly
if (require.main === module) {
  testFirebaseNotifications();
} 