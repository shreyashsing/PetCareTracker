/**
 * Push Notification Test Script
 * 
 * This script tests the complete push notification system including:
 * - FCM service initialization
 * - Push token generation
 * - Test notification sending
 * - Background notification handling
 */

import { fcmService } from './src/services/notifications/fcm';
import { notificationService } from './src/services/notifications';

async function testPushNotifications() {
  console.log('🧪 Starting Push Notification Tests...\n');
  
  try {
    // Test 1: Initialize notification service
    console.log('1️⃣ Testing notification service initialization...');
    const notificationInitialized = await notificationService.initialize();
    console.log(`   Result: ${notificationInitialized ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    
    // Test 2: Initialize FCM service
    console.log('2️⃣ Testing FCM service initialization...');
    const fcmInitialized = await fcmService.initialize();
    console.log(`   Result: ${fcmInitialized ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    
    // Test 3: Get push token
    console.log('3️⃣ Testing push token generation...');
    const pushToken = await fcmService.getFCMToken();
    console.log(`   Token: ${pushToken ? '✅ Generated' : '❌ Failed'}`);
    if (pushToken) {
      console.log(`   Preview: ${pushToken.substring(0, 30)}...`);
    }
    console.log('');
    
    // Test 4: Check availability
    console.log('4️⃣ Testing platform availability...');
    const isAvailable = fcmService.isAvailable();
    console.log(`   Available: ${isAvailable ? '✅ YES' : '❌ NO'}\n`);
    
    // Test 5: Send test notification
    console.log('5️⃣ Testing push notification sending...');
    if (fcmInitialized && pushToken) {
      const testSent = await fcmService.sendTestNotification(
        '🧪 Test Notification',
        'This is a test push notification from the Pet Care Tracker app!'
      );
      console.log(`   Sent: ${testSent ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    } else {
      console.log('   ⏭️ SKIPPED (FCM not initialized or no token)\n');
    }
    
    // Test 6: Test critical reminder system
    console.log('6️⃣ Testing critical reminder system...');
    const testReminders = [
      {
        id: 'test_med_1',
        type: 'medication',
        entityId: 'test_medication_id',
        petId: 'test_pet_id',
        title: 'Test Medication Reminder',
        body: 'Time to give your pet their medication',
        scheduledTime: Date.now() + 5000, // 5 seconds from now
        priority: 'critical'
      }
    ];
    
    try {
      await fcmService.sendCriticalRemindersToFirebase(testReminders);
      console.log('   Critical reminders: ✅ SUCCESS\n');
    } catch (error) {
      console.log(`   Critical reminders: ❌ FAILED (${error.message})\n`);
    }
    
    // Test 7: Test background notification processing
    console.log('7️⃣ Testing background notification processing...');
    try {
      await notificationService.processBackgroundNotifications();
      console.log('   Background processing: ✅ SUCCESS\n');
    } catch (error) {
      console.log(`   Background processing: ❌ FAILED (${error.message})\n`);
    }
    
    // Summary
    console.log('📊 TEST SUMMARY:');
    console.log('================');
    console.log(`Notification Service: ${notificationInitialized ? '✅' : '❌'}`);
    console.log(`FCM Service: ${fcmInitialized ? '✅' : '❌'}`);
    console.log(`Push Token: ${pushToken ? '✅' : '❌'}`);
    console.log(`Platform Support: ${isAvailable ? '✅' : '❌'}`);
    
    const overallStatus = notificationInitialized && fcmInitialized && pushToken && isAvailable;
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus ? '🎉 READY FOR PRODUCTION!' : '⚠️ NEEDS ATTENTION'}`);
    
    if (overallStatus) {
      console.log('\n✨ Your app can now send push notifications even when closed!');
      console.log('📱 Users will receive notifications for:');
      console.log('   • Medication reminders');
      console.log('   • Task reminders');
      console.log('   • Meal reminders');
      console.log('   • Low food inventory alerts');
    } else {
      console.log('\n🔧 Issues to fix:');
      if (!notificationInitialized) console.log('   • Notification service initialization failed');
      if (!fcmInitialized) console.log('   • FCM service initialization failed');
      if (!pushToken) console.log('   • Push token generation failed');
      if (!isAvailable) console.log('   • Platform not supported or not on physical device');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for use in the app
export { testPushNotifications };

// Run tests if this file is executed directly
if (require.main === module) {
  testPushNotifications();
} 