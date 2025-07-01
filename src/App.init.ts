/**
 * PetCareTracker App Initialization
 * 
 * This file contains initialization code that runs before the app starts
 * It applies various patches and fixes needed for the app to run correctly
 */

import './patches/fixDatePickerNative';
import { initMemoryLeakDetection } from './utils/memoryLeakDetection';
import { Platform } from 'react-native';
import { securityService } from './services/security';
import { setupErrorHandling } from './utils/errorHandler';
import { unifiedDatabaseManager } from "./services/db";
import { notificationService } from './services/notifications';
import { initializeStorage } from './utils/setupStorage';
import { createAppFeedbackTable } from './services/db';
import { 
  ProductionLogger, 
  PerformanceMonitor, 
  applyProductionOptimizations, 
  getProductionTimeout,
  shouldPerformInProduction 
} from './utils/productionConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Apply production optimizations immediately
applyProductionOptimizations();

// Initialize memory leak detection in development mode only
if (shouldPerformInProduction('memory_debug')) {
  const stopMemoryLeakDetection = initMemoryLeakDetection(60000); // Check every minute
  ProductionLogger.debug('Memory leak detection initialized', 'Init');
  
  // For debugging in development, expose some globals
  if (global) {
    // @ts-ignore - This is for debugging purposes
    global.stopMemoryLeakDetection = stopMemoryLeakDetection;
  }
}

// Log platform information (development only)
if (shouldPerformInProduction('verbose_logging')) {
  ProductionLogger.info(`Running on ${Platform.OS} (${Platform.Version})`, 'Platform');
}

// Track initialization
let appInitialized = false;
let initializationTimer: NodeJS.Timeout | null = null;

// Flag to track initialization status
let isInitializationComplete = false;

/**
 * Helper function to create a timeout promise
 * @param ms Timeout in milliseconds
 */
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
);

/**
 * Force initialization to complete after a timeout
 * This prevents the app from getting stuck during initialization
 */
function forceInitializationComplete() {
  ProductionLogger.warn('Forcing initialization complete due to timeout', 'Init');
  isInitializationComplete = true;
}

/**
 * Check if initialization is complete
 */
export function checkInitializationComplete() {
  return isInitializationComplete;
}

/**
 * Mark initialization as complete
 */
export function markInitializationComplete() {
  ProductionLogger.info('Marking initialization complete', 'Init');
  isInitializationComplete = true;
}

/**
 * Initialize core services in parallel for better performance
 */
async function initializeCoreServices(): Promise<void> {
  const services = [
    {
      name: 'Security',
      fn: () => securityService.initialize(),
      timeout: getProductionTimeout('SECURITY_INIT'),
      critical: false
    },
    {
      name: 'Database',
      fn: () => unifiedDatabaseManager.initialize(),
      timeout: getProductionTimeout('DATABASE_INIT'),
      critical: true
    },
    {
      name: 'Notifications',
      fn: () => notificationService.initialize(),
      timeout: getProductionTimeout('NOTIFICATION_INIT'),
      critical: false
    }
  ];

  ProductionLogger.info('Initializing core services in parallel', 'Init');

  // Initialize services in parallel with individual timeouts and performance monitoring
  const results = await Promise.allSettled(
    services.map(async (service) => {
      const measurementName = `${service.name}_Init`;
      
      try {
        await PerformanceMonitor.measureAsync(measurementName, async () => {
          await Promise.race([
            service.fn(),
            timeout(service.timeout)
          ]);
        });
        
        ProductionLogger.info(`✅ ${service.name} service initialized`, 'Init');
        return { service: service.name, success: true };
      } catch (error: any) {
        const isTimeout = error.message.includes('timeout');
        const message = `${service.name} service ${isTimeout ? 'timed out' : 'failed'}`;
        
        if (service.critical) {
          ProductionLogger.error(`❌ Critical: ${message}`, 'Init');
        } else {
          ProductionLogger.warn(`⚠️ ${message}`, 'Init');
        }
        
        return { service: service.name, success: false, critical: service.critical };
      }
    })
  );

  // Check if any critical services failed
  const failedCritical = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result.value as any))
    .filter(result => !result.success && result.critical);

  if (failedCritical.length > 0) {
    throw new Error(`Critical services failed: ${failedCritical.map(f => f.service).join(', ')}`);
  }
}

/**
 * Initialize background tasks that don't block app startup
 */
async function initializeBackgroundTasks(): Promise<void> {
  const backgroundTasks = [];

  ProductionLogger.info('Starting background tasks', 'Background');

  // Check and create app feedback table if needed
  backgroundTasks.push(
    PerformanceMonitor.measureAsync('AppFeedback_Check', async () => {
      const feedbackTableExists = await Promise.race([
        createAppFeedbackTable(),
        timeout(getProductionTimeout('BACKGROUND_TASK'))
      ]);
      
      if (feedbackTableExists) {
        ProductionLogger.info('App feedback table exists', 'Background');
      } else {
        ProductionLogger.warn('App feedback table needs to be created', 'Background');
      }
    }).catch((error: any) => {
      ProductionLogger.warn(`App feedback table check failed: ${error.message}`, 'Background');
    })
  );

  // Expired medications check
  backgroundTasks.push(
    PerformanceMonitor.measureAsync('ExpiredMeds_Check', async () => {
      const expiredMedications = await Promise.race([
        unifiedDatabaseManager.medications.checkAndUpdateExpiredMedications(),
        timeout(getProductionTimeout('BACKGROUND_TASK'))
      ]) as any[];
      
      if (expiredMedications && Array.isArray(expiredMedications) && expiredMedications.length > 0) {
        ProductionLogger.info(`Marked ${expiredMedications.length} expired medications as completed`, 'Background');
      }
      
      return expiredMedications;
    }).catch((error: any) => {
      ProductionLogger.warn(`Expired medications check failed: ${error.message}`, 'Background');
    })
  );

  // Cleanup completed/discontinued medications that are older than 2 days
  backgroundTasks.push(
    PerformanceMonitor.measureAsync('OldMeds_Cleanup', async () => {
      const deletedCount = await Promise.race([
        unifiedDatabaseManager.medications.cleanupOldCompletedMedications(),
        timeout(getProductionTimeout('BACKGROUND_TASK'))
      ]) as number;
      
      if (deletedCount > 0) {
        ProductionLogger.info(`Cleaned up ${deletedCount} completed/discontinued medications`, 'Background');
      }
      
      return deletedCount;
    }).catch((error: any) => {
      ProductionLogger.warn(`Completed medications cleanup failed: ${error.message}`, 'Background');
    })
  );

  // Notification rescheduling
  backgroundTasks.push(
    PerformanceMonitor.measureAsync('Notifications_Reschedule', async () => {
      await Promise.race([
        notificationService.rescheduleAllNotifications(),
        timeout(getProductionTimeout('BACKGROUND_TASK'))
      ]);
    }).catch((error: any) => {
      ProductionLogger.warn(`Notification rescheduling failed: ${error.message}`, 'Background');
    })
  );

  // Execute all background tasks in parallel
  await Promise.allSettled(backgroundTasks);
  ProductionLogger.info('Background tasks completed', 'Background');
}

/**
 * Initialize the application
 * This should be called as early as possible in the app lifecycle
 */
async function initialize(): Promise<boolean> {
  if (appInitialized) {
    ProductionLogger.info('App already initialized, skipping', 'Init');
    return true;
  }
  
  ProductionLogger.info('🚀 Starting app initialization', 'Init');
  
  try {
    // Set up error handling first
    setupErrorHandling();
    
    // Initialize core services in parallel
    await PerformanceMonitor.measureAsync('CoreServices_Init', () => initializeCoreServices());
    
    // Initialize background tasks (don't await - let them run async)
    initializeBackgroundTasks().catch(error => {
      ProductionLogger.warn(`Background tasks failed: ${error.message}`, 'Background');
    });
    
    // App initialization complete
    appInitialized = true;
    ProductionLogger.info('✅ App initialization complete', 'Init');
    
    // Clear the initialization timer if it's still active
    if (initializationTimer) {
      clearTimeout(initializationTimer);
      initializationTimer = null;
    }
    
    return true;
  } catch (error: any) {
    ProductionLogger.error(`❌ App initialization failed: ${error.message}`, 'Init');
    // Set initialized to true anyway to prevent the app from getting stuck
    appInitialized = true;
    return false;
  }
}

// Production-optimized timeout values
const INIT_TIMEOUT = getProductionTimeout('APP_INITIALIZATION');
const FORCE_TIMEOUT = INIT_TIMEOUT - 2000; // 2 seconds before main timeout

// Initialize app immediately with a timeout to prevent getting stuck
Promise.race([
  PerformanceMonitor.measureAsync('Total_App_Init', () => initialize()),
  timeout(INIT_TIMEOUT)
]).catch(error => {
  ProductionLogger.error(`App initialization timed out: ${error.message}`, 'Init');
  appInitialized = true; // Mark as initialized to allow the app to continue
});

// Set a backup timer to force initialization to complete
initializationTimer = setTimeout(forceInitializationComplete, FORCE_TIMEOUT);

// Export initialization status and functions
export { appInitialized, initialize, forceInitializationComplete };

/**
 * Handle authentication errors gracefully
 * @param error The error to handle
 */
export function handleAuthError(error: any): void {
  if (!error) return;
  
  // Only log in development or for critical errors
  if (shouldPerformInProduction('verbose_logging') || error.message?.includes('critical')) {
    ProductionLogger.warn(`Authentication error: ${error.message || error}`, 'Auth');
  }
  
  // If the error is related to missing session, we can ignore it
  if (error.message && error.message.includes('Auth session missing')) {
    ProductionLogger.debug('Auth session missing - handled gracefully', 'Auth');
    return;
  }
  
  // For other errors, log them but don't crash the app
  ProductionLogger.error(`Unhandled authentication error: ${error.message || error}`, 'Auth');
}

/**
 * Initialize storage buckets and other essentials
 */
async function initializeAppEssentials() {
  try {
    ProductionLogger.debug('Starting essential app initialization', 'Storage');
    
    // Initialize storage buckets for pet images
    await PerformanceMonitor.measureAsync('Storage_Init', () => initializeStorage());

    ProductionLogger.debug('Essential initialization complete', 'Storage');
  } catch (error: any) {
    ProductionLogger.error(`Essential initialization failed: ${error.message}`, 'Storage');
    // Continue despite errors - the app should still work with degraded functionality
  }
}

// Start storage initialization in the background
// Don't await it - let it happen in parallel with app startup
initializeAppEssentials().then(() => {
  ProductionLogger.debug('Background initialization complete', 'Storage');
}).catch(error => {
  ProductionLogger.error(`Background initialization failed: ${error.message}`, 'Storage');
}); 