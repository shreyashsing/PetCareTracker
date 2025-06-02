/**
 * Firebase Cloud Functions Push Notification Test Suite
 * 
 * This test file validates the complete Firebase Cloud Functions integration
 * for production push notifications with scheduled delivery and storage.
 */

import { firebaseCloudFunctionsService } from './src/services/notifications/firebaseCloudFunctions';
import { notificationService } from './src/services/notifications';

// Test configuration
const TEST_CONFIG = {
  // Test push token (replace with real token for actual testing)
  pushToken: 'ExponentPushToken[test-token-12345]',
  
  // Test data
  testPetId: 'test-pet-123',
  testMedicationId: 'test-medication-456',
  testTaskId: 'test-task-789',
  testMealId: 'test-meal-101',
  testItemId: 'test-item-202',
  
  // Test names
  medicationName: 'Test Medication',
  taskTitle: 'Test Task',
  mealType: 'Breakfast',
  itemName: 'Dog Food',
  
  // Test timing (5 minutes from now)
  scheduledTime: Date.now() + (5 * 60 * 1000)
};

/**
 * Test Firebase Cloud Functions Service Initialization
 */
async function testServiceInitialization() {
  console.log('\n=== Testing Firebase Cloud Functions Service Initialization ===');
  
  try {
    // Initialize the service
    await firebaseCloudFunctionsService.initialize();
    
    // Check if user ID was generated
    const userId = firebaseCloudFunctionsService.getUserId();
    console.log('✅ Service initialized successfully');
    console.log('📱 User ID:', userId);
    
    // Test endpoints
    const endpoints = firebaseCloudFunctionsService.getEndpoints();
    console.log('🔗 Available endpoints:');
    Object.entries(endpoints).forEach(([name, url]) => {
      console.log(`   ${name}: ${url}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
}

/**
 * Test Firebase Cloud Functions Connection
 */
async function testConnectionToFirebase() {
  console.log('\n=== Testing Firebase Cloud Functions Connection ===');
  
  try {
    const result = await firebaseCloudFunctionsService.testConnection();
    
    if (result.success) {
      console.log('✅ Firebase Cloud Functions connection successful');
      console.log('📊 Current stats:', result.stats);
    } else {
      console.log('❌ Firebase Cloud Functions connection failed:', result.message);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

/**
 * Test Immediate Notification Sending
 */
async function testImmediateNotification() {
  console.log('\n=== Testing Immediate Notification Sending ===');
  
  try {
    const result = await firebaseCloudFunctionsService.sendImmediateNotification(
      TEST_CONFIG.pushToken,
      '🧪 Test Notification',
      'This is a test immediate notification from Firebase Cloud Functions',
      {
        type: 'test_notification',
        testId: 'immediate-test-' + Date.now()
      }
    );
    
    if (result.success) {
      console.log('✅ Immediate notification sent successfully');
      console.log('🎫 Ticket ID:', result.ticketId);
    } else {
      console.log('❌ Immediate notification failed:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Immediate notification error:', error);
    return false;
  }
}

/**
 * Test Scheduled Notification
 */
async function testScheduledNotification() {
  console.log('\n=== Testing Scheduled Notification ===');
  
  try {
    const result = await firebaseCloudFunctionsService.scheduleNotification({
      pushToken: TEST_CONFIG.pushToken,
      title: '⏰ Scheduled Test Notification',
      body: 'This notification was scheduled via Firebase Cloud Functions',
      data: {
        type: 'test_scheduled',
        petId: TEST_CONFIG.testPetId,
        entityId: 'scheduled-test-' + Date.now(),
        priority: 'normal'
      },
      scheduledTime: TEST_CONFIG.scheduledTime
    });
    
    if (result.success) {
      console.log('✅ Notification scheduled successfully');
      console.log('🆔 Notification ID:', result.notificationId);
      console.log('⏰ Scheduled for:', new Date(TEST_CONFIG.scheduledTime).toLocaleString());
      
      // Return notification ID for potential cancellation test
      return result.notificationId;
    } else {
      console.log('❌ Notification scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Scheduled notification error:', error);
    return null;
  }
}

/**
 * Test Medication Reminder Scheduling
 */
async function testMedicationReminder() {
  console.log('\n=== Testing Medication Reminder Scheduling ===');
  
  try {
    const result = await firebaseCloudFunctionsService.scheduleMedicationReminder(
      TEST_CONFIG.pushToken,
      TEST_CONFIG.testMedicationId,
      TEST_CONFIG.testPetId,
      TEST_CONFIG.medicationName,
      TEST_CONFIG.scheduledTime,
      'high'
    );
    
    if (result.success) {
      console.log('✅ Medication reminder scheduled successfully');
      console.log('🆔 Notification ID:', result.notificationId);
      console.log('💊 Medication:', TEST_CONFIG.medicationName);
      
      return result.notificationId;
    } else {
      console.log('❌ Medication reminder scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Medication reminder error:', error);
    return null;
  }
}

/**
 * Test Task Reminder Scheduling
 */
async function testTaskReminder() {
  console.log('\n=== Testing Task Reminder Scheduling ===');
  
  try {
    const result = await firebaseCloudFunctionsService.scheduleTaskReminder(
      TEST_CONFIG.pushToken,
      TEST_CONFIG.testTaskId,
      TEST_CONFIG.testPetId,
      TEST_CONFIG.taskTitle,
      TEST_CONFIG.scheduledTime,
      'normal'
    );
    
    if (result.success) {
      console.log('✅ Task reminder scheduled successfully');
      console.log('🆔 Notification ID:', result.notificationId);
      console.log('📋 Task:', TEST_CONFIG.taskTitle);
      
      return result.notificationId;
    } else {
      console.log('❌ Task reminder scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Task reminder error:', error);
    return null;
  }
}

/**
 * Test Meal Reminder Scheduling
 */
async function testMealReminder() {
  console.log('\n=== Testing Meal Reminder Scheduling ===');
  
  try {
    const result = await firebaseCloudFunctionsService.scheduleMealReminder(
      TEST_CONFIG.pushToken,
      TEST_CONFIG.testMealId,
      TEST_CONFIG.testPetId,
      TEST_CONFIG.mealType,
      TEST_CONFIG.scheduledTime,
      'normal'
    );
    
    if (result.success) {
      console.log('✅ Meal reminder scheduled successfully');
      console.log('🆔 Notification ID:', result.notificationId);
      console.log('🍽️ Meal:', TEST_CONFIG.mealType);
      
      return result.notificationId;
    } else {
      console.log('❌ Meal reminder scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Meal reminder error:', error);
    return null;
  }
}

/**
 * Test Inventory Alert Scheduling
 */
async function testInventoryAlert() {
  console.log('\n=== Testing Inventory Alert Scheduling ===');
  
  try {
    const result = await firebaseCloudFunctionsService.scheduleInventoryAlert(
      TEST_CONFIG.pushToken,
      TEST_CONFIG.testItemId,
      TEST_CONFIG.testPetId,
      TEST_CONFIG.itemName,
      TEST_CONFIG.scheduledTime,
      'high'
    );
    
    if (result.success) {
      console.log('✅ Inventory alert scheduled successfully');
      console.log('🆔 Notification ID:', result.notificationId);
      console.log('📦 Item:', TEST_CONFIG.itemName);
      
      return result.notificationId;
    } else {
      console.log('❌ Inventory alert scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Inventory alert error:', error);
    return null;
  }
}

/**
 * Test Notification Cancellation
 */
async function testNotificationCancellation(notificationId) {
  console.log('\n=== Testing Notification Cancellation ===');
  
  if (!notificationId) {
    console.log('⚠️ No notification ID provided for cancellation test');
    return false;
  }
  
  try {
    const result = await firebaseCloudFunctionsService.cancelNotification(notificationId);
    
    if (result.success) {
      console.log('✅ Notification cancelled successfully');
      console.log('🆔 Cancelled ID:', notificationId);
    } else {
      console.log('❌ Notification cancellation failed:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Notification cancellation error:', error);
    return false;
  }
}

/**
 * Test Notification Statistics
 */
async function testNotificationStats() {
  console.log('\n=== Testing Notification Statistics ===');
  
  try {
    const result = await firebaseCloudFunctionsService.getNotificationStats();
    
    if (result.success) {
      console.log('✅ Notification stats retrieved successfully');
      console.log('📊 Statistics:');
      console.log(`   Pending: ${result.stats.pending}`);
      console.log(`   Sent: ${result.stats.sent}`);
      console.log(`   Failed: ${result.stats.failed}`);
      console.log(`   Total: ${result.stats.total}`);
    } else {
      console.log('❌ Failed to get notification stats:', result.error);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Notification stats error:', error);
    return false;
  }
}

/**
 * Test Cache Management
 */
async function testCacheManagement() {
  console.log('\n=== Testing Cache Management ===');
  
  try {
    // Get cached notifications
    const cached = await firebaseCloudFunctionsService.getCachedNotifications();
    console.log('📱 Cached notifications count:', cached.length);
    
    if (cached.length > 0) {
      console.log('📋 Sample cached notification:', cached[0]);
    }
    
    // Clear cache
    await firebaseCloudFunctionsService.clearCache();
    console.log('✅ Cache cleared successfully');
    
    // Verify cache is empty
    const afterClear = await firebaseCloudFunctionsService.getCachedNotifications();
    console.log('📱 Cached notifications after clear:', afterClear.length);
    
    return true;
  } catch (error) {
    console.error('❌ Cache management error:', error);
    return false;
  }
}

/**
 * Test Production Notification Service Integration
 */
async function testProductionServiceIntegration() {
  console.log('\n=== Testing Production Notification Service Integration ===');
  
  try {
    // Initialize notification service
    const initialized = await notificationService.initialize();
    if (!initialized) {
      console.log('❌ Notification service initialization failed');
      return false;
    }
    
    console.log('✅ Notification service initialized');
    
    // Test production notification scheduling
    const result = await notificationService.scheduleProductionNotification(
      '🔥 Production Test',
      'Testing production notification via integrated service',
      {
        type: 'production_test',
        testId: 'production-' + Date.now()
      },
      Date.now() + (2 * 60 * 1000), // 2 minutes from now
      'high'
    );
    
    if (result.success) {
      console.log('✅ Production notification scheduled via service');
      console.log('🆔 Notification ID:', result.notificationId);
      
      // Test production stats
      const stats = await notificationService.getProductionNotificationStats();
      if (stats.success) {
        console.log('📊 Production stats:', stats.stats);
      }
      
      return result.notificationId;
    } else {
      console.log('❌ Production notification scheduling failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Production service integration error:', error);
    return null;
  }
}

/**
 * Run Complete Test Suite
 */
async function runCompleteTestSuite() {
  console.log('🚀 Starting Firebase Cloud Functions Push Notification Test Suite');
  console.log('=' .repeat(70));
  
  const results = {
    initialization: false,
    connection: false,
    immediate: false,
    scheduled: null,
    medication: null,
    task: null,
    meal: null,
    inventory: null,
    cancellation: false,
    stats: false,
    cache: false,
    production: null
  };
  
  // Test 1: Service Initialization
  results.initialization = await testServiceInitialization();
  
  // Test 2: Connection to Firebase
  results.connection = await testConnectionToFirebase();
  
  // Test 3: Immediate Notification
  results.immediate = await testImmediateNotification();
  
  // Test 4: Scheduled Notification
  results.scheduled = await testScheduledNotification();
  
  // Test 5: Medication Reminder
  results.medication = await testMedicationReminder();
  
  // Test 6: Task Reminder
  results.task = await testTaskReminder();
  
  // Test 7: Meal Reminder
  results.meal = await testMealReminder();
  
  // Test 8: Inventory Alert
  results.inventory = await testInventoryAlert();
  
  // Test 9: Notification Cancellation (using scheduled notification)
  if (results.scheduled) {
    results.cancellation = await testNotificationCancellation(results.scheduled);
  }
  
  // Test 10: Notification Statistics
  results.stats = await testNotificationStats();
  
  // Test 11: Cache Management
  results.cache = await testCacheManagement();
  
  // Test 12: Production Service Integration
  results.production = await testProductionServiceIntegration();
  
  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📋 TEST SUITE SUMMARY');
  console.log('=' .repeat(70));
  
  console.log(`✅ Service Initialization: ${results.initialization ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Firebase Connection: ${results.connection ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Immediate Notification: ${results.immediate ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Scheduled Notification: ${results.scheduled ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Medication Reminder: ${results.medication ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Task Reminder: ${results.task ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Meal Reminder: ${results.meal ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Inventory Alert: ${results.inventory ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Notification Cancellation: ${results.cancellation ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Notification Statistics: ${results.stats ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Cache Management: ${results.cache ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Production Integration: ${results.production ? 'PASS' : 'FAIL'}`);
  
  const passCount = Object.values(results).filter(r => r === true || (r !== null && r !== false)).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 OVERALL RESULTS:');
  console.log(`   Tests Passed: ${passCount}/${totalTests}`);
  console.log(`   Success Rate: ${Math.round((passCount / totalTests) * 100)}%`);
  
  if (passCount === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Firebase Cloud Functions integration is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the logs above for details.');
  }
  
  return results;
}

// Export test functions for individual testing
export {
  runCompleteTestSuite,
  testServiceInitialization,
  testConnectionToFirebase,
  testImmediateNotification,
  testScheduledNotification,
  testMedicationReminder,
  testTaskReminder,
  testMealReminder,
  testInventoryAlert,
  testNotificationCancellation,
  testNotificationStats,
  testCacheManagement,
  testProductionServiceIntegration
};

// Auto-run if this file is executed directly
if (require.main === module) {
  runCompleteTestSuite().catch(console.error);
} 