import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Network configuration for the app
 * Centralizes API URL handling based on platform and environment
 */

// Default API server port
const DEFAULT_PORT = 8888;

// TEMPORARY FOR TESTING - Force production mode
// Set to true to force the use of the production API URL
const FORCE_PRODUCTION_MODE = true;

// Android alternative IP for direct testing with host machine
// Try different values if 10.0.2.2 doesn't work:
// - Phone via USB: 'localhost'
// - Emulator: '10.0.2.2'
// - Genymotion: '10.0.3.2'
// - Real device: Your computer's IP on the local network
// Note: Update this if needed based on your specific setup
const ANDROID_ALTERNATIVE_IP = '10.0.2.2';

// Get API URL based on platform and environment
export function getApiUrl(): string {
  if (__DEV__ && !FORCE_PRODUCTION_MODE) {
    // For local development:
    // - Android emulator: 10.0.2.2 (special IP that routes to host loopback)
    // - iOS simulator: localhost (works directly)
    const host = Platform.OS === 'android' ? ANDROID_ALTERNATIVE_IP : 'localhost';
    const url = `http://${host}:${DEFAULT_PORT}/.netlify/functions`;
    console.log(`Network config: Using development API URL: ${url}`);
    return url;
  } else {
    // Production URL - updated to use the deployed Netlify API
    const url = 'https://darling-empanada-164b33.netlify.app/.netlify/functions';
    console.log(`Network config: Using production API URL: ${url}`);
    return url;
  }
}

// Export fixed API URL
export const API_URL = getApiUrl();

// Test the API connection
export async function testApiConnection(): Promise<boolean> {
  console.log('Testing API connection to', API_URL);
  
  try {
    // Try multiple endpoints to find one that works
    const endpointsToTry = [
      'health-check',
      'chat-health-check'
    ];
    
    // Set a reasonable timeout (10 seconds is typically enough)
    const TIMEOUT_MS = 10000;
    
    // Try main API URL first
    let success = await tryEndpoints(API_URL, endpointsToTry, TIMEOUT_MS);
    if (success) return true;
    
    // If main URL fails and we're on Android, try alternative URL patterns
    if (Platform.OS === 'android' && __DEV__) {
      console.log('Primary API URL failed, trying alternative Android URLs...');
      
      // Try different IP address patterns that might work on Android
      const alternativeIps = ['10.0.2.2', '10.0.3.2', 'localhost'];
      
      for (const ip of alternativeIps) {
        // Skip if this is the same as our primary URL
        if (ip === ANDROID_ALTERNATIVE_IP) continue;
        
        const altUrl = `http://${ip}:${DEFAULT_PORT}/.netlify/functions`;
        console.log(`Testing Android-specific URL: ${altUrl}`);
        
        success = await tryEndpoints(altUrl, endpointsToTry, TIMEOUT_MS);
        if (success) {
          console.log(`Found working API URL: ${altUrl}`);
          // We could potentially update API_URL here, but that would require making it mutable
          return true;
        }
      }
    }
    
    console.log('All connectivity tests failed');
    return false;
  } catch (error) {
    console.error('Error testing API connection:', error);
    return false;
  }
}

// Helper function to try multiple endpoints for a base URL
async function tryEndpoints(baseUrl: string, endpoints: string[], timeoutMs: number): Promise<boolean> {
  for (const endpoint of endpoints) {
    try {
      // Ensure proper URL construction by handling slashes correctly
      const url = `${baseUrl}/${endpoint.replace(/^\//, '')}`;
      console.log(`Testing endpoint: ${url}`);
      
      // Create an AbortController to enforce a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`API test successful for ${endpoint}:`, data);
        return true;
      } else {
        console.log(`Endpoint ${endpoint} returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint} test failed:`, error);
      // Continue to next endpoint
    }
  }
  
  return false;
}

// Network utilities
export const NetworkUtils = {
  // Simple network check that doesn't make actual network requests
  isNetworkAvailable: async (): Promise<boolean> => {
    try {
      console.log('NetworkUtils: Checking network availability');
      
      // Use NetInfo to check if the device is connected
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
      
      console.log(`NetworkUtils: Device is ${isConnected ? 'connected' : 'disconnected'}`);
      
      if (!isConnected) {
        return false;
      }
      
      // Try to ping a reliable external service to confirm internet connectivity
      try {
        console.log('NetworkUtils: Pinging external service to confirm connectivity');
        
        // Use AbortController for timeout instead of fetch option
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com', { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const isReachable = response.ok;
        console.log(`NetworkUtils: External service is ${isReachable ? 'reachable' : 'unreachable'}`);
        
        return isReachable;
      } catch (fetchError) {
        console.log('NetworkUtils: Failed to reach external service:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('NetworkUtils: Error checking network availability:', error);
      return false;
    }
  },

  // Run a robust connectivity check with multiple fallbacks
  runRobustConnectivityCheck: async (): Promise<boolean> => {
    console.log('Running robust connectivity check...');
    
    // First try the primary API URL
    const primaryUrl = `${API_URL}/health-check`;
    console.log(`Testing primary API URL: ${primaryUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(primaryUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('Primary API URL test successful');
        return true;
      }
    } catch (error) {
      console.log('Primary API URL test failed:', error);
    }
    
    // Try the production URL directly as a fallback
    const productionUrl = 'https://darling-empanada-164b33.netlify.app/.netlify/functions/health-check';
    console.log(`Testing production URL directly: ${productionUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(productionUrl, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Platform': Platform.OS
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('Production URL test successful');
        return true;
      }
    } catch (error) {
      console.log('Production URL test failed:', error);
    }
    
    console.log('All connectivity tests failed');
    return false;
  },
  
  // Check if a URL is reachable
  isUrlReachable: async (url: string, timeout = 5000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error(`URL ${url} is not reachable:`, error);
      return false;
    }
  }
};