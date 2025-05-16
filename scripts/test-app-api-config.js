/**
 * Script to test which API endpoint the app would use in production mode
 * 
 * Run with:
 * node scripts/test-app-api-config.js
 */

// Mock React Native Platform
const Platform = {
  OS: 'android' // Change to 'ios' to test iOS behavior
};

// Mock __DEV__ flag to simulate production mode
global.__DEV__ = false; // Set to false to test production mode

// Default API server port
const DEFAULT_PORT = 8888;

// Android alternative IP for direct testing with host machine
const ANDROID_ALTERNATIVE_IP = '10.0.2.2';

// Get API URL based on platform and environment (copied from your network.ts)
function getApiUrl() {
  if (__DEV__) {
    // For local development:
    // - Android emulator: 10.0.2.2 (special IP that routes to host loopback)
    // - iOS simulator: localhost (works directly)
    const host = Platform.OS === 'android' ? ANDROID_ALTERNATIVE_IP : 'localhost';
    return `http://${host}:${DEFAULT_PORT}/.netlify/functions`;
  } else {
    // Production URL - updated to use the deployed Netlify API
    return 'https://darling-empanada-164b33.netlify.app/api';
  }
}

// Print out the current mode and API URL
console.log(`Running in ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
const API_URL = getApiUrl();
console.log(`API URL that would be used: ${API_URL}`);

// Test both development and production mode
console.log('\nTesting both configurations:');
global.__DEV__ = true;
console.log(`Development mode URL: ${getApiUrl()}`);
global.__DEV__ = false;
console.log(`Production mode URL: ${getApiUrl()}`);

// To really verify, try to ping the production URL
const https = require('https');
const url = 'https://darling-empanada-164b33.netlify.app/api/health-check';

console.log(`\nAttempting to connect to production URL: ${url}`);

https.get(url, (res) => {
  console.log(`Connection successful! Status code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonResponse = JSON.parse(data);
      console.log('Response:', JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.apiConfigured) {
        console.log('\n✅ SUCCESS: Your Netlify API is properly configured and will be used in production!');
      } else {
        console.log('\n⚠️ WARNING: Your Netlify API is responding but environment variables may not be set correctly.');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error connecting to production URL:', err.message);
}); 