/**
 * @format
 */

// This is the first file that is run when the app starts
// Import any polyfills or shims needed for the application

// Import Platform for Android detection
import { Platform } from 'react-native';

// Type declarations for global objects
declare global {
  interface Window {
    originalXMLHttpRequest?: any;
  }
  
  namespace NodeJS {
    interface Global {
      originalXMLHttpRequest: any;
      _fetch: typeof fetch;
    }
  }
}

// Configure network request timeouts and policies
if (__DEV__) {
  // Increase the timeout for fetch requests during development
  // @ts-ignore - We know this exists in the React Native environment
  global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
  
  // Global fetch timeout settings
  // @ts-ignore - Adding custom property to global
  global._fetch = global.fetch;
  global.fetch = (url: string | URL | Request, opts: RequestInit = {}) => {
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
    
    // @ts-ignore - Using our custom _fetch property
    return global._fetch(fixedUrl, {
      ...opts,
      signal,
    })
      .then((response: Response) => {
        clearTimeout(timeoutId);
        return response;
      })
      .catch((error: Error) => {
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
  XMLHttpRequest.prototype.open = function(
    method: string, 
    url: string | URL, 
    async?: boolean, 
    username?: string | null, 
    password?: string | null
  ) {
    // Fix localhost URLs for Android
    if (Platform.OS === 'android' && typeof url === 'string') {
      if (url.includes('localhost')) {
        url = url.replace('localhost', '10.0.2.2');
        console.log(`XHR: Fixed URL from localhost to ${url}`);
      }
      
      if (url.includes('127.0.0.1')) {
        url = url.replace('127.0.0.1', '10.0.2.2');
        console.log(`XHR: Fixed URL from 127.0.0.1 to ${url}`);
      }
    }
    
    return originalXHROpen.apply(this, [method, url, async, username, password].filter(x => x !== undefined) as [string, string, boolean?, string?, string?]);
  };
}

// Import the registerRootComponent function from Expo
import { registerRootComponent } from 'expo';

// Import our App component
import App from './App';

// Register the App component with Expo
// This makes it the root component of the app
registerRootComponent(App);
