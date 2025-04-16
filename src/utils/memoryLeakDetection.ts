/**
 * Memory Leak Detection Utility
 * 
 * Provides tools to detect and prevent memory leaks in React Native applications.
 * It includes hooks and utilities for:
 * - Tracking component mounting/unmounting
 * - Detecting common sources of memory leaks
 * - Monitoring app memory usage
 * - Safe subscriptions and async operations
 */

import { useRef, useEffect, useState } from 'react';
import { InteractionManager, AppState, AppStateStatus, Platform } from 'react-native';
import type { NativeEventSubscription } from 'react-native';

/**
 * Options for the useIsMounted hook
 */
interface IsMountedOptions {
  debug?: boolean;
  componentName?: string;
}

/**
 * Track component mounting state to prevent memory leaks from async operations
 * 
 * @example
 * ```
 * const isMounted = useIsMounted({ componentName: 'MyComponent' });
 * 
 * useEffect(() => {
 *   const fetchData = async () => {
 *     const response = await api.get('/data');
 *     // Check if component is still mounted before updating state
 *     if (isMounted()) {
 *       setData(response.data);
 *     }
 *   };
 *   
 *   fetchData();
 * }, []);
 * ```
 */
export const useIsMounted = (options: IsMountedOptions = {}): () => boolean => {
  const { debug = false, componentName = 'Component' } = options;
  const isMounted = useRef(false);
  
  // Track unmounting time for debug purposes
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    isMounted.current = true;
    mountTime.current = Date.now();
    
    if (debug) {
      console.log(`[MemoryLeak] ${componentName} mounted`);
    }
    
    return () => {
      isMounted.current = false;
      
      if (debug) {
        const timeActive = Date.now() - mountTime.current;
        console.log(`[MemoryLeak] ${componentName} unmounted after ${timeActive}ms`);
      }
    };
  }, []);
  
  return () => isMounted.current;
};

/**
 * Error class for unsubscribed promises
 */
class UnsubscribedPromiseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsubscribedPromiseError';
  }
}

/**
 * Options for the useUnmountSignal hook
 */
interface UnmountSignalOptions {
  throwOnUnmount?: boolean;
}

/**
 * Create a signal to abort operations when a component unmounts
 * Works with the AbortController API
 */
export const useUnmountSignal = (options: UnmountSignalOptions = {}): AbortSignal => {
  const abortController = useRef(new AbortController());
  
  useEffect(() => {
    return () => {
      abortController.current.abort(
        options.throwOnUnmount 
          ? new UnsubscribedPromiseError('Component was unmounted') 
          : 'Component was unmounted'
      );
    };
  }, []);
  
  return abortController.current.signal;
};

/**
 * List of tracked subscriptions to ensure cleanup
 */
const subscriptions: { [id: string]: { cleanup: () => void, stack: string }[] } = {};

/**
 * Generate a unique ID for tracking subscriptions
 */
const generateId = (): string => 
  Math.random().toString(36).substring(2, 9);

/**
 * Register a subscription to ensure it gets cleaned up
 */
export const trackSubscription = (
  componentId: string, 
  cleanup: () => void,
  debugInfo?: string
): string => {
  const subscriptionId = generateId();
  
  if (!subscriptions[componentId]) {
    subscriptions[componentId] = [];
  }
  
  subscriptions[componentId].push({
    cleanup,
    stack: debugInfo || new Error().stack || 'No stack trace available'
  });
  
  return subscriptionId;
};

/**
 * Cleanup all subscriptions for a component
 */
export const cleanupSubscriptions = (componentId: string): void => {
  if (subscriptions[componentId]) {
    subscriptions[componentId].forEach(sub => {
      try {
        sub.cleanup();
      } catch (error) {
        console.warn('[MemoryLeak] Error during subscription cleanup:', error);
      }
    });
    
    delete subscriptions[componentId];
  }
};

/**
 * Hook to safely manage subscriptions that automatically cleanup on unmount
 */
export const useSafeSubscription = (debugName?: string): {
  subscribe: (subscription: () => (() => void) | undefined) => void;
} => {
  const componentId = useRef(generateId()).current;
  const debugLabel = debugName || 'Component';
  
  useEffect(() => {
    return () => {
      cleanupSubscriptions(componentId);
    };
  }, []);
  
  const subscribe = (subscription: () => (() => void) | undefined): void => {
    const cleanup = subscription();
    
    if (typeof cleanup === 'function') {
      trackSubscription(
        componentId, 
        cleanup, 
        `${debugLabel} - ${new Error().stack || 'No stack trace'}`
      );
    }
  };
  
  return { subscribe };
};

/**
 * Track AppState to detect background/foreground transitions
 * Useful for pausing/resuming operations to prevent leaks
 */
export const useAppState = (): {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
  lastActive: number | null;
} => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [lastActive, setLastActive] = useState<number | null>(Date.now());
  const appStateSubscription = useRef<NativeEventSubscription | null>(null);
  
  useEffect(() => {
    appStateSubscription.current = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        setLastActive(Date.now());
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        setLastActive(Date.now());
      }
      
      setAppState(nextAppState);
    });
    
    return () => {
      if (appStateSubscription.current) {
        appStateSubscription.current.remove();
      }
    };
  }, [appState]);
  
  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    lastActive
  };
};

/**
 * Track all pending async operations to ensure they're properly handled
 */
interface AsyncOperation {
  id: string;
  name: string;
  startTime: number;
  stackTrace: string;
}

const pendingOperations: Map<string, AsyncOperation> = new Map();

/**
 * Register an async operation for tracking
 */
export const trackAsyncOperation = (name: string): string => {
  const id = generateId();
  
  pendingOperations.set(id, {
    id,
    name,
    startTime: Date.now(),
    stackTrace: new Error().stack || 'No stack trace available'
  });
  
  return id;
};

/**
 * Complete a tracked async operation
 */
export const completeAsyncOperation = (id: string): void => {
  pendingOperations.delete(id);
};

/**
 * Get all pending async operations for debugging
 */
export const getPendingAsyncOperations = (): AsyncOperation[] => {
  return Array.from(pendingOperations.values());
};

/**
 * Safely run an async operation with cleanup on unmount
 */
export const useSafeAsync = <T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  deps: any[] = [],
  options: { debugName?: string; onError?: (error: Error) => void } = {}
): { 
  data: T | null; 
  loading: boolean; 
  error: Error | null;
  execute: () => Promise<T | null>;
} => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useIsMounted({ componentName: options.debugName });
  const abortController = useRef(new AbortController());
  const operationId = useRef<string | null>(null);
  
  const resetController = () => {
    abortController.current.abort();
    abortController.current = new AbortController();
  };
  
  const execute = async (): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    // Reset the controller for each execution
    resetController();
    
    // Track this operation
    if (operationId.current) {
      completeAsyncOperation(operationId.current);
    }
    operationId.current = trackAsyncOperation(options.debugName || 'Anonymous async operation');
    
    try {
      const result = await asyncFn(abortController.current.signal);
      
      // Check if still mounted before updating state
      if (isMounted()) {
        setData(result);
        setLoading(false);
      }
      
      if (operationId.current) {
        completeAsyncOperation(operationId.current);
        operationId.current = null;
      }
      
      return result;
    } catch (err) {
      // Only handle errors if component is still mounted
      if (isMounted()) {
        // Ignore abort errors
        if (err instanceof DOMException && err.name === 'AbortError') {
          setLoading(false);
          return null;
        }
        
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        
        if (options.onError) {
          options.onError(error);
        }
      }
      
      if (operationId.current) {
        completeAsyncOperation(operationId.current);
        operationId.current = null;
      }
      
      return null;
    }
  };
  
  useEffect(() => {
    execute();
    
    return () => {
      resetController();
      if (operationId.current) {
        completeAsyncOperation(operationId.current);
      }
    };
  }, deps);
  
  return { data, loading, error, execute };
};

/**
 * Log memory usage statistics (iOS only)
 */
export const logMemoryUsage = (): void => {
  if (Platform.OS === 'ios' && __DEV__) {
    try {
      // @ts-ignore - This is a private API
      const { memory } = global.performance;
      console.log('Memory usage:', {
        jsHeapSizeLimit: memory?.jsHeapSizeLimit / 1048576 + ' MB',
        totalJSHeapSize: memory?.totalJSHeapSize / 1048576 + ' MB',
        usedJSHeapSize: memory?.usedJSHeapSize / 1048576 + ' MB',
      });
    } catch (err) {
      console.warn('Cannot log memory usage:', err);
    }
  }
};

/**
 * Check for common memory leak patterns and warn if found
 */
export const checkForMemoryLeaks = (): void => {
  // Check for pending timers
  if (global.setTimeout && typeof global.setTimeout === 'function') {
    // @ts-ignore - This is a debug method
    const activeTimers = global.setTimeout._getActiveTimers?.() || [];
    if (activeTimers.length > 20) {
      console.warn(`[MemoryLeak] Found ${activeTimers.length} active timers. Possible memory leak.`);
    }
  }
  
  // Check for pending async operations
  const pendingOps = getPendingAsyncOperations();
  if (pendingOps.length > 5) {
    console.warn(`[MemoryLeak] Found ${pendingOps.length} pending async operations. Possible memory leak.`);
    console.log('Pending operations:', pendingOps);
  }
  
  // Log current memory usage
  logMemoryUsage();
};

/**
 * Initialize memory leak detection
 */
export const initMemoryLeakDetection = (checkIntervalMs = 30000): () => void => {
  // Start interval to check for memory leaks
  const intervalId = setInterval(() => {
    checkForMemoryLeaks();
  }, checkIntervalMs);
  
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Run a callback safely after interactions have completed
 */
export const runAfterInteractions = <T>(
  callback: () => T,
  timeout = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Set timeout in case interactions take too long
    const timeoutId = setTimeout(() => {
      resolve(callback());
    }, timeout);
    
    // Run after interactions
    InteractionManager.runAfterInteractions(() => {
      clearTimeout(timeoutId);
      try {
        resolve(callback());
      } catch (error) {
        reject(error);
      }
    });
  });
}; 