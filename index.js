/**
 * WARNING: This file should be kept in sync with index.ts
 * When making changes to the application entry point:
 * 1. First modify index.ts with proper TypeScript types
 * 2. Then manually update this file to match the functionality
 * 
 * This dual-file approach is necessary for compatibility with bundlers
 * that expect a JavaScript entry point while maintaining TypeScript support.
 */

/**
 * @format
 */

// This is the first file that is run when the app starts
// Import any polyfills or shims needed for the application

// Import Platform for Android detection
import { Platform } from 'react-native';

// Configure network request timeouts and policies
if (__DEV__) {
  // Increase the timeout for fetch requests during development
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
  
  // Global fetch timeout settings
  global._fetch = global.fetch;
  global.fetch = (url, opts = {}) => {
    // Fix any localhost URLs to use 10.0.2.2 on Android
    let fixedUrl = url;
    if (Platform.OS === 'android' && typeof url === 'string') {
      if (url.includes('localhost')) {
        fixedUrl = url.replace('localhost', '10.0.2.2');
        console.log(`Global fetch: Fixed URL from ${url} to ${fixedUrl}`);
      }
      
      // Also fix any other potential URL issues for Android
      if (url.includes('127.0.0.1')) {
        fixedUrl = url.replace('127.0.0.1', '10.0.2.2');
        console.log(`Global fetch: Fixed URL from ${url} to ${fixedUrl}`);
      }
    }
    
    // Add higher timeout for development purposes (30 seconds)
    const timeout = 30000; // 30 seconds for development
    
    // Create a new AbortController that combines any existing signal with our timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`Global fetch: Timeout (${timeout}ms) for request to ${fixedUrl}`);
      controller.abort();
    }, timeout);
    
    // Merge our signal with any existing signal
    let signal = controller.signal;
    if (opts.signal) {
      // If there's already a signal, we need to respect both
      const existingSignal = opts.signal;
      existingSignal.addEventListener('abort', () => controller.abort());
    }
    
    // Log the request
    console.log(`Global fetch: ${fixedUrl} (timeout: ${timeout}ms)`);
    
    return global._fetch(fixedUrl, {
      ...opts,
      signal,
    })
      .then(response => {
        clearTimeout(timeoutId);
        return response;
      })
      .catch(error => {
        clearTimeout(timeoutId);
        
        // Provide better error messages for common network issues
        if (error.name === 'AbortError') {
          console.error(`Fetch request to ${fixedUrl} timed out or was aborted`);
        } else {
          console.error(`Fetch error for ${fixedUrl}:`, error);
        }
        
        throw error;
      });
  };
  
  // Also patch XMLHttpRequest for libraries that use it directly
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    const method = args[0];
    let url = args[1];
    
    // Fix localhost URLs for Android
    if (Platform.OS === 'android' && typeof url === 'string') {
      if (url.includes('localhost')) {
        url = url.replace('localhost', '10.0.2.2');
        args[1] = url;
        console.log(`XHR: Fixed URL from localhost to ${url}`);
      }
      
      if (url.includes('127.0.0.1')) {
        url = url.replace('127.0.0.1', '10.0.2.2');
        args[1] = url;
        console.log(`XHR: Fixed URL from 127.0.0.1 to ${url}`);
      }
    }
    
    return originalXHROpen.apply(this, args);
  };
}

// Import the registerRootComponent function from Expo
import { registerRootComponent } from 'expo';

// Import our App component
import App from './App';

// Register the App component with Expo
// This makes it the root component of the app
registerRootComponent(App); 