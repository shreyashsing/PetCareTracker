const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 9001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Path to the functions directory
const FUNCTIONS_DIR = path.join(__dirname, 'api');

// Utility to convert Netlify function to Express middleware
const netlifFunctionMiddleware = (functionPath) => {
  const functionModule = require(functionPath);
  
  return async (req, res) => {
    try {
      // Create event object similar to what Netlify would provide
      const event = {
        path: req.path,
        httpMethod: req.method,
        headers: req.headers,
        queryStringParameters: req.query,
        body: JSON.stringify(req.body) || '',
        isBase64Encoded: false
      };
      
      // Call the function with the event
      const response = await functionModule.handler(event, {});
      
      // Set status code
      res.status(response.statusCode);
      
      // Set headers
      if (response.headers) {
        Object.keys(response.headers).forEach(header => {
          res.setHeader(header, response.headers[header]);
        });
      }
      
      // Send response body
      if (response.body) {
        return res.send(typeof response.body === 'string' ? response.body : JSON.stringify(response.body));
      }
      
      return res.end();
    } catch (error) {
      console.error('Error executing function:', error);
      res.status(500).json({ error: 'Function execution failed' });
    }
  };
};

// Load all function files and register routes
fs.readdir(FUNCTIONS_DIR, (err, files) => {
  if (err) {
    console.error('Error reading functions directory:', err);
    return;
  }
  
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const functionName = file.replace('.js', '');
      const functionPath = path.join(FUNCTIONS_DIR, file);
      
      console.log(`Registering function: ${functionName}`);
      
      // Register function routes
      app.all(`/.netlify/functions/${functionName}`, netlifFunctionMiddleware(functionPath));
      app.all(`/api/${functionName}`, netlifFunctionMiddleware(functionPath));
    }
  });
});

// Show environment variables loaded (don't show actual values for security)
console.log('Environment variables loaded:');
Object.keys(process.env).forEach(key => {
  if (key.startsWith('SUPABASE_') || key === 'JWT_SECRET' || key === 'GEMINI_API_KEY') {
    console.log(`- ${key}: ${key.includes('KEY') ? '[HIDDEN]' : process.env[key]}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Functions server running at http://localhost:${PORT}`);
  console.log(`Access functions at: http://localhost:${PORT}/.netlify/functions/[function-name]`);
  console.log(`or http://localhost:${PORT}/api/[function-name]`);
}); 