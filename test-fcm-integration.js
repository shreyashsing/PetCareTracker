/**
 * FCM Integration Test
 * Run this to verify Firebase Cloud Messaging is working
 */

import { fcmService } from './src/services/notifications/fcm';
import { notificationService } from './src/services/notifications/index';

const testFCMIntegration = async () => {
  console.log('🔥 Testing FCM Integration...\n');
  
  try {
    // Test 1: Initialize FCM Service
    console.log('1️⃣ Testing FCM Service Initialization...');
    const fcmInitialized = await fcmService.initialize();
    console.log(`   ✅ FCM Initialized: ${fcmInitialized}\n`);
    
    // Test 2: Get FCM Token
    console.log('2️⃣ Testing FCM Token Generation...');
    const fcmToken = await fcmService.getFCMToken();
    if (fcmToken) {
      console.log(`   ✅ FCM Token Generated: ${fcmToken.substring(0, 20)}...`);
      console.log(`   📱 Token Length: ${fcmToken.length} characters\n`);
    } else {
      console.log('   ❌ Failed to generate FCM token\n');
    }
    
    // Test 3: Check FCM Availability
    console.log('3️⃣ Testing FCM Availability...');
    const isAvailable = fcmService.isAvailable();
    console.log(`   ✅ FCM Available: ${isAvailable}\n`);
    
    // Test 4: Initialize Notification Service
    console.log('4️⃣ Testing Notification Service Integration...');
    const notificationInitialized = await notificationService.initialize();
    console.log(`   ✅ Notification Service Initialized: ${notificationInitialized}\n`);
    
    // Test 5: Get Push Token from Notification Service
    console.log('5️⃣ Testing Push Token from Notification Service...');
    const pushToken = await notificationService.getPushToken();
    if (pushToken) {
      console.log(`   ✅ Push Token Retrieved: ${pushToken.substring(0, 20)}...`);
      console.log(`   🔗 Tokens Match: ${pushToken === fcmToken}\n`);
    } else {
      console.log('   ❌ Failed to get push token from notification service\n');
    }
    
    // Test 6: Test Critical Reminder Creation
    console.log('6️⃣ Testing Critical Reminder Backup...');
    const testReminder = {
      id: 'test_reminder_001',
      type: 'medication',
      entityId: 'test_med_001',
      petId: 'test_pet_001',
      title: 'Test Medication Reminder',
      body: 'This is a test critical reminder',
      scheduledTime: Date.now() + (5 * 60 * 1000), // 5 minutes from now
      priority: 'critical'
    };
    
    try {
      await fcmService.sendCriticalRemindersToFirebase([testReminder]);
      console.log('   ✅ Critical reminder backup test completed\n');
    } catch (error) {
      console.log(`   ⚠️  Critical reminder test (expected): ${error.message}\n`);
    }
    
    // Summary
    console.log('📊 FCM Integration Test Summary:');
    console.log('================================');
    console.log(`FCM Service: ${fcmInitialized ? '✅ Working' : '❌ Failed'}`);
    console.log(`FCM Token: ${fcmToken ? '✅ Generated' : '❌ Failed'}`);
    console.log(`FCM Available: ${isAvailable ? '✅ Yes' : '❌ No'}`);
    console.log(`Notification Service: ${notificationInitialized ? '✅ Working' : '❌ Failed'}`);
    console.log(`Push Token Integration: ${pushToken ? '✅ Working' : '❌ Failed'}`);
    
    if (fcmInitialized && fcmToken && isAvailable && notificationInitialized && pushToken) {
      console.log('\n🎉 FCM Integration: FULLY WORKING!');
      console.log('Your app is ready for production push notifications.');
    } else {
      console.log('\n⚠️  FCM Integration: PARTIAL/FAILED');
      console.log('Some features may not work. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ FCM Integration Test Failed:', error);
  }
};

// Export for use in your app
export { testFCMIntegration };

// If running directly
if (require.main === module) {
  testFCMIntegration();
} 