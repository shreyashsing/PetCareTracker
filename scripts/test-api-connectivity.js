/**
 * Script to test API connectivity
 * 
 * Run with:
 * node scripts/test-api-connectivity.js
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

// API URLs to test
const urls = [
  // Test localhost (for desktop/iOS)
  'http://localhost:8888/.netlify/functions/health-check',
  'http://localhost:8888/.netlify/functions/api/health-check',
  'http://localhost:8888/.netlify/functions/api/chat/health-check',
  'http://localhost:8888/.netlify/functions/chat-health-check',
  // Test 10.0.2.2 (for Android emulator)
  'http://10.0.2.2:8888/.netlify/functions/health-check',
  'http://10.0.2.2:8888/.netlify/functions/api/health-check',
  'http://10.0.2.2:8888/.netlify/functions/api/chat/health-check',
  'http://10.0.2.2:8888/.netlify/functions/chat-health-check',
  // Test IP address bindings
  'http://127.0.0.1:8888/.netlify/functions/health-check'
];

// Function to test a URL
async function testUrl(url) {
  return new Promise((resolve) => {
    console.log(`Testing URL: ${url}`);
    
    // Choose the right module based on protocol
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`Status Code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('Response Body:', data);
          const jsonData = JSON.parse(data);
          console.log('Success:', jsonData.success);
          resolve({
            url,
            success: res.statusCode === 200,
            statusCode: res.statusCode,
            response: jsonData
          });
        } catch (error) {
          console.error('Error parsing response:', error);
          resolve({
            url,
            success: false,
            statusCode: res.statusCode,
            error: 'Failed to parse response'
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error testing ${url}:`, error.message);
      resolve({
        url,
        success: false,
        error: error.message
      });
    });
    
    // Set a timeout
    req.setTimeout(5000, () => {
      req.abort();
      console.error(`Timeout testing ${url}`);
      resolve({
        url,
        success: false,
        error: 'Request timeout'
      });
    });
  });
}

// Main function
async function main() {
  console.log('=== API Connectivity Test ===');
  console.log('Testing all endpoints...\n');
  
  let anySuccess = false;
  
  for (const url of urls) {
    const result = await testUrl(url);
    console.log(`\nResult for ${url}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('-'.repeat(50));
    
    if (result.success) {
      anySuccess = true;
    }
  }
  
  console.log('\n=== Summary ===');
  if (anySuccess) {
    console.log('At least one endpoint is working! The API server is accessible.');
  } else {
    console.log('All endpoints failed. Check if the Netlify server is running on port 8888.');
    console.log('Run: npx netlify dev --port 8888');
  }
}

// Run the main function
main().catch(console.error); 