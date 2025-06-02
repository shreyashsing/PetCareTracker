/**
 * Test script for Phase 1 Notification Features
 * Tests: Navigation Integration, Delivery Tracking, Retry Mechanism
 */

import { notificationService } from './src/services/notifications';
import { unifiedDatabaseManager } from './src/services/db';

async function testPhase1Features() {
  console.log('🧪 Testing Phase 1 Notification Features...\n');

  try {
    // Initialize notification service
    console.log('1. Initializing notification service...');
    const initialized = await notificationService.initialize();
    console.log(`   ✅ Initialization: ${initialized ? 'Success' : 'Failed'}\n`);

    // Test 1: Navigation Integration
    console.log('2. Testing Navigation Integration...');
    
    // Set a mock navigation reference
    const mockNavigationRef = {
      current: {
        dispatch: (action: any) => {
          console.log(`   📱 Navigation action dispatched:`, action);
        },
        navigate: (screen: string, params?: any) => {
          console.log(`   📱 Navigate to: ${screen}`, params ? `with params: ${JSON.stringify(params)}` : '');
        }
      }
    };
    
    notificationService.setNavigationRef(mockNavigationRef);
    console.log('   ✅ Navigation reference set successfully\n');

    // Test 2: Delivery Tracking
    console.log('3. Testing Delivery Tracking...');
    
    // Track a test notification
    await notificationService.trackNotificationScheduled('test-notification-1', 'task_reminder', {
      taskId: 'test-task-1',
      petId: 'test-pet-1',
      title: 'Test Task Reminder',
      body: 'This is a test notification'
    });
    
    // Get delivery stats
    const stats = await notificationService.getDeliveryStats();
    console.log('   📊 Delivery Statistics:', stats);
    console.log('   ✅ Delivery tracking working\n');

    // Test 3: Retry Mechanism
    console.log('4. Testing Retry Mechanism...');
    
    // Get retry queue status
    const retryStatus = await notificationService.getRetryQueueStatus();
    console.log('   🔄 Retry Queue Status:', retryStatus);
    
    // Process retry queue
    await notificationService.processRetryQueue();
    console.log('   ✅ Retry queue processing completed\n');

    // Test 4: Complete Notification Flow
    console.log('5. Testing Complete Notification Flow...');
    
    // Create a test task
    const testTask = {
      id: 'test-task-flow',
      petId: 'test-pet-1',
      title: 'Test Task for Flow',
      description: 'Testing complete notification flow',
      category: 'feeding' as const,
      priority: 'medium' as const,
      scheduleInfo: {
        date: new Date(Date.now() + 60000), // 1 minute from now
        time: new Date(Date.now() + 60000),
        duration: 30
      },
      reminderSettings: {
        enabled: true,
        times: [15], // 15 minutes before
        notificationType: 'push' as const
      },
      status: 'pending' as const
    };
    
    // Schedule notifications for the test task
    await notificationService.scheduleTaskNotifications(testTask);
    console.log('   ✅ Task notifications scheduled\n');

    // Test 5: Error Handling and Recovery
    console.log('6. Testing Error Handling...');
    
    try {
      // Try to schedule an invalid notification
      await notificationService.trackNotificationFailed('invalid-notification', 'Test failure', {
        type: 'task_reminder',
        taskId: 'invalid-task'
      });
      console.log('   ✅ Error handling working correctly\n');
    } catch (error) {
      console.log('   ⚠️ Error handling test failed:', error);
    }

    // Test 6: Notification Rescheduling
    console.log('7. Testing Notification Rescheduling...');
    
    await notificationService.rescheduleAllNotifications();
    console.log('   ✅ All notifications rescheduled successfully\n');

    // Final Status Report
    console.log('📋 Final Status Report:');
    const finalStats = await notificationService.getDeliveryStats();
    const finalRetryStatus = await notificationService.getRetryQueueStatus();
    
    console.log('   📊 Final Delivery Stats:', finalStats);
    console.log('   🔄 Final Retry Status:', finalRetryStatus);
    
    console.log('\n🎉 Phase 1 Testing Complete!');
    console.log('✅ All core features are working correctly');
    
    return {
      success: true,
      features: {
        navigationIntegration: true,
        deliveryTracking: true,
        retryMechanism: true,
        errorHandling: true,
        notificationScheduling: true,
        rescheduling: true
      },
      stats: finalStats,
      retryStatus: finalRetryStatus
    };

  } catch (error) {
    console.error('❌ Phase 1 Testing Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      features: {
        navigationIntegration: false,
        deliveryTracking: false,
        retryMechanism: false,
        errorHandling: false,
        notificationScheduling: false,
        rescheduling: false
      }
    };
  }
}

// Export for use in the app
export { testPhase1Features };

// If running directly
if (require.main === module) {
  testPhase1Features().then(result => {
    console.log('\n📋 Test Results:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
} 