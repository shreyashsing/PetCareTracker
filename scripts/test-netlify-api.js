/**
 * Script to test Netlify API connectivity
 * 
 * Run with:
 * node scripts/test-netlify-api.js
 */

const https = require('https');
const URL = require('url').URL;

// Netlify API URL
const NETLIFY_API_URL = 'https://darling-empanada-164b33.netlify.app';

// API endpoints to test
const endpoints = [
  '/api/health-check',
  '/api/chat-health-check'
];

// Function to make an HTTP request with a timeout
function request(url, options = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : require('http');
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    
    // Set a timeout
    req.setTimeout(timeout);
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.abort();
      reject(new Error(`Request to ${url} timed out after ${timeout}ms`));
    });
    
    req.end();
  });
}

// Test all endpoints
async function testAllEndpoints() {
  console.log(`Testing Netlify API at ${NETLIFY_API_URL}...\n`);
  
  for (const endpoint of endpoints) {
    const url = `${NETLIFY_API_URL}${endpoint}`;
    console.log(`Testing endpoint: ${url}`);
    
    try {
      const response = await request(url);
      
      if (response.statusCode === 200) {
        console.log(`✅ SUCCESS: Status code ${response.statusCode}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
      } else {
        console.log(`❌ FAILED: Status code ${response.statusCode}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}\n`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}\n`);
    }
  }
  
  console.log('API testing completed');
}

// Run the tests
testAllEndpoints().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
}); 