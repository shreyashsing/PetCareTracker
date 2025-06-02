/**
 * Production Configuration and Optimizations
 * 
 * This file contains all production-specific configurations and optimizations
 * to ensure the app runs efficiently in production environments.
 */

import { Platform } from 'react-native';

// Production configuration constants
export const PRODUCTION_CONFIG = {
  // Timeout configurations (longer in production for slower devices/networks)
  TIMEOUTS: {
    API_REQUEST: __DEV__ ? 10000 : 15000,
    DATABASE_INIT: __DEV__ ? 5000 : 8000,
    SECURITY_INIT: __DEV__ ? 3000 : 5000,
    NOTIFICATION_INIT: __DEV__ ? 3000 : 5000,
    BACKGROUND_TASK: __DEV__ ? 3000 : 8000,
    APP_INITIALIZATION: __DEV__ ? 15000 : 20000,
  },

  // Memory optimizations
  MEMORY: {
    IMAGE_CACHE_SIZE: __DEV__ ? 50 * 1024 * 1024 : 100 * 1024 * 1024, // 50MB dev, 100MB prod
    MAX_CONCURRENT_REQUESTS: __DEV__ ? 5 : 3, // Fewer concurrent requests in production
    CLEANUP_INTERVAL: __DEV__ ? 60000 : 300000, // 1 min dev, 5 min prod
  },

  // Logging configuration
  LOGGING: {
    ENABLED: __DEV__,
    LEVEL: __DEV__ ? 'debug' : 'error', // Only errors in production
    MAX_LOG_ENTRIES: __DEV__ ? 1000 : 100,
  },

  // Performance optimizations
  PERFORMANCE: {
    LAZY_LOAD_IMAGES: !__DEV__, // Enable lazy loading in production
    COMPRESS_IMAGES: !__DEV__, // Enable image compression in production
    CACHE_DURATION: __DEV__ ? 60000 : 300000, // 1 min dev, 5 min prod
    DEBOUNCE_DELAY: __DEV__ ? 300 : 500, // Longer debounce in production
  },

  // Network optimizations
  NETWORK: {
    RETRY_ATTEMPTS: __DEV__ ? 2 : 3,
    RETRY_DELAY: __DEV__ ? 1000 : 2000,
    CONNECTION_TIMEOUT: __DEV__ ? 5000 : 10000,
    READ_TIMEOUT: __DEV__ ? 10000 : 15000,
  },

  // Background task optimizations
  BACKGROUND: {
    MAX_CONCURRENT_TASKS: __DEV__ ? 5 : 3,
    TASK_TIMEOUT: __DEV__ ? 30000 : 60000,
    CLEANUP_FREQUENCY: __DEV__ ? 60000 : 300000,
  },

  // Error handling
  ERROR_HANDLING: {
    SUPPRESS_NON_CRITICAL: !__DEV__,
    TRACK_ERRORS: true,
    MAX_ERROR_REPORTS_PER_SESSION: __DEV__ ? 50 : 10,
  }
};

/**
 * Production-optimized logger
 */
export class ProductionLogger {
  private static logCount = 0;
  private static maxLogs = PRODUCTION_CONFIG.LOGGING.MAX_LOG_ENTRIES;

  static log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info', context?: string) {
    // Skip logging if disabled or if we've exceeded max logs
    if (!PRODUCTION_CONFIG.LOGGING.ENABLED && level !== 'error') return;
    if (this.logCount >= this.maxLogs && level !== 'error') return;

    // Format message with context
    const formattedMessage = context ? `[${context}] ${message}` : message;
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.sss

    // In production, only log warnings and errors
    if (!__DEV__ && level !== 'warn' && level !== 'error') return;

    // Log based on level
    switch (level) {
      case 'debug':
        if (__DEV__) console.log(`${timestamp} DEBUG: ${formattedMessage}`);
        break;
      case 'info':
        if (__DEV__) console.log(`${timestamp} INFO: ${formattedMessage}`);
        break;
      case 'warn':
        console.warn(`${timestamp} WARN: ${formattedMessage}`);
        break;
      case 'error':
        console.error(`${timestamp} ERROR: ${formattedMessage}`);
        break;
    }

    this.logCount++;
  }

  static debug(message: string, context?: string) {
    this.log(message, 'debug', context);
  }

  static info(message: string, context?: string) {
    this.log(message, 'info', context);
  }

  static warn(message: string, context?: string) {
    this.log(message, 'warn', context);
  }

  static error(message: string, context?: string) {
    this.log(message, 'error', context);
  }

  static reset() {
    this.logCount = 0;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map();

  static startMeasurement(name: string) {
    this.measurements.set(name, Date.now());
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.measurements.delete(name);

    if (__DEV__) {
      ProductionLogger.debug(`⏱️ ${name}: ${duration}ms`, 'Performance');
    }

    return duration;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    try {
      const result = await fn();
      this.endMeasurement(name);
      return result;
    } catch (error) {
      this.endMeasurement(name);
      throw error;
    }
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static cleanupCallbacks: Array<() => void> = [];

  static registerCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }

  static performCleanup() {
    ProductionLogger.debug(`Running ${this.cleanupCallbacks.length} cleanup callbacks`, 'Memory');
    
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        ProductionLogger.error(`Cleanup callback failed: ${error}`, 'Memory');
      }
    });
  }

  static startPeriodicCleanup() {
    const interval = PRODUCTION_CONFIG.MEMORY.CLEANUP_INTERVAL;
    
    setInterval(() => {
      this.performCleanup();
      
      // Force garbage collection in development
      if (__DEV__ && global.gc) {
        global.gc();
        ProductionLogger.debug('Forced garbage collection', 'Memory');
      }
    }, interval);
    
    ProductionLogger.info(`Memory cleanup scheduled every ${interval / 1000}s`, 'Memory');
  }
}

/**
 * Network optimization utilities
 */
export class NetworkOptimizer {
  private static requestQueue: Array<() => Promise<any>> = [];
  private static activeRequests = 0;
  private static maxConcurrent = PRODUCTION_CONFIG.MEMORY.MAX_CONCURRENT_REQUESTS;

  static async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        if (this.activeRequests >= this.maxConcurrent) {
          // Wait for a slot
          setTimeout(() => this.queueRequest(requestFn).then(resolve).catch(reject), 100);
          return;
        }

        this.activeRequests++;
        
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      };

      execute();
    });
  }

  private static processQueue() {
    if (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }
}

/**
 * Apply all production optimizations
 */
export function applyProductionOptimizations() {
  ProductionLogger.info('Applying production optimizations', 'Init');

  // Start memory management
  MemoryManager.startPeriodicCleanup();

  // Platform-specific optimizations
  if (Platform.OS === 'android') {
    // Android-specific optimizations
    ProductionLogger.debug('Applying Android optimizations', 'Platform');
    
    // Increase image cache size
    if (global.Image && typeof global.Image === 'object') {
      // @ts-ignore
      global.Image.cacheSize = PRODUCTION_CONFIG.MEMORY.IMAGE_CACHE_SIZE;
    }
  } else if (Platform.OS === 'ios') {
    // iOS-specific optimizations
    ProductionLogger.debug('Applying iOS optimizations', 'Platform');
  }

  // Network optimizations
  ProductionLogger.debug('Network optimization applied', 'Network');

  ProductionLogger.info('Production optimizations complete', 'Init');
}

/**
 * Get production-safe timeout for operation
 */
export function getProductionTimeout(operation: keyof typeof PRODUCTION_CONFIG.TIMEOUTS): number {
  return PRODUCTION_CONFIG.TIMEOUTS[operation];
}

/**
 * Check if operation should be performed based on environment
 */
export function shouldPerformInProduction(operation: 'verbose_logging' | 'memory_debug'): boolean {
  switch (operation) {
    case 'verbose_logging':
      return __DEV__;
    case 'memory_debug':
      return __DEV__;
    default:
      return true;
  }
}

export default PRODUCTION_CONFIG;