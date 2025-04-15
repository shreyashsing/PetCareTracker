/**
 * Error handler utility for the PetCareTracker mobile app
 * This provides centralized handling of various React Native errors
 */

// Types
export type ErrorHandlerOptions = {
  /** Whether to suppress known React Native module errors */
  suppressModuleErrors: boolean;
  /** Whether to log suppressed errors as warnings */
  logSuppressions: boolean;
  /** Whether to track errors for analytics */
  trackErrors: boolean;
};

// Critical errors that should never be suppressed
const CRITICAL_ERROR_PATTERNS = [
  'Network request failed',
  'Unable to connect',
  'Authentication failed',
  'Database error',
  'Permission denied',
  'Out of memory'
];

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track suppressed errors
const suppressedErrors = new Map<string, number>();

/**
 * Sets up error handling for the application
 * This is called early in the application lifecycle to catch and handle errors
 */
export function setupErrorHandling(options: ErrorHandlerOptions = { 
  suppressModuleErrors: true, 
  logSuppressions: true,
  trackErrors: true
}): void {
  // Error patterns that are safe to suppress in development
  // These are primarily React Native internal warnings that don't affect functionality
  const moduleErrorPatterns = [
    'expo-modules-core', // Expo module warnings
    'CodedError', // Coded errors from Expo
    'NOBRIDGE', // Bridge-related errors
    'RNCMaterialDatePicker', // DatePicker component warnings
    'is not registered in the native binary' // Native module registration warnings
  ];

  // Setup console.error handler
  console.error = (...args: any[]): void => {
    // Only process string messages
    const errorMsg = args[0]?.toString() || '';
    
    // Never suppress critical errors
    const isCriticalError = CRITICAL_ERROR_PATTERNS.some(pattern => 
      errorMsg.includes(pattern)
    );
    
    if (isCriticalError) {
      // Always log critical errors and track them
      originalConsoleError(...args);
      
      if (options.trackErrors) {
        trackError('CRITICAL', errorMsg);
      }
      return;
    }
    
    // Check if this error should be suppressed
    if (options.suppressModuleErrors && 
        moduleErrorPatterns.some(pattern => errorMsg.includes(pattern))) {
      
      // Count suppressed errors by pattern
      const matchedPattern = moduleErrorPatterns.find(pattern => errorMsg.includes(pattern)) || 'other';
      const currentCount = suppressedErrors.get(matchedPattern) || 0;
      suppressedErrors.set(matchedPattern, currentCount + 1);
      
      // Optionally log suppressed errors as warnings
      if (options.logSuppressions) {
        // Only log the first few occurrences of each type to prevent log spam
        if (currentCount < 3) {
          originalConsoleWarn(`[Suppressed Error #${currentCount + 1}]`, errorMsg);
        } else if (currentCount === 3) {
          originalConsoleWarn(`[Suppressed ${matchedPattern} errors will no longer be logged]`);
        }
      }
      return;
    }
    
    // Track non-suppressed errors
    if (options.trackErrors) {
      trackError('REGULAR', errorMsg);
    }
    
    // Pass through to original console.error for normal errors
    originalConsoleError(...args);
  };
}

/**
 * Sets up warning suppression in React Native's LogBox
 * Call this after importing LogBox
 */
export function setupLogBoxIgnores(LogBox: any): void {
  // Only ignore a minimal set of warnings that are known to be harmless
  LogBox.ignoreLogs([
    'Invariant Violation: Tried to register two views with the same name',
    'ViewPropTypes will be removed from React Native',
    'AsyncStorage has been extracted from react-native'
  ]);
} 

/**
 * Track errors for analytics
 * In a production app, this would send data to a service like Sentry or Firebase Crashlytics
 */
function trackError(level: 'CRITICAL' | 'REGULAR', message: string): void {
  // In development, just log to console
  console.log(`[ERROR TRACKING] ${level}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  
  // In production, you would send this to your error tracking service
  // Example: 
  // if (__DEV__ === false) {
  //   Sentry.captureException(new Error(message), {
  //     level: level === 'CRITICAL' ? Sentry.Severity.Fatal : Sentry.Severity.Error,
  //   });
  // }
}

/**
 * Get statistics about suppressed errors
 * Useful for debugging and monitoring
 */
export function getSuppressedErrorStats(): Record<string, number> {
  return Object.fromEntries(suppressedErrors.entries());
} 