# Secure Backend API Proxy

This directory contains Netlify serverless functions that act as a secure proxy for third-party APIs. This approach keeps API keys and sensitive credentials on the server-side rather than embedding them in the mobile application.

## Security Benefits

- API keys are stored securely on the server, not in the mobile app
- Requests are authenticated through Supabase, ensuring only authorized users can access the API
- No sensitive credentials are exposed in the client-side code
- The backend can enforce rate limiting and additional security checks

## Setup Instructions

### Local Development

1. Copy `.env.example` to `.env` and fill in your API keys:
   ```
   cp .env.example .env
   ```

2. Add your Gemini API key to `.env`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Make sure Supabase credentials are also in your `.env` file:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

4. Install Netlify CLI if you haven't already:
   ```
   npm install -g netlify-cli
   ```

5. Start the local development server:
   ```
   netlify dev
   ```

### Production Deployment

1. Deploy your functions to Netlify:
   ```
   netlify deploy --prod
   ```

2. Add environment variables in the Netlify dashboard:
   - Go to Site settings > Build & deploy > Environment
   - Add the same variables as in your `.env` file

## API Endpoints

### `/api/chat/proxy-gemini`

Securely proxies requests to the Google Gemini API.

**Request:**
```json
{
  "contents": [...],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 8192
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": {
      "candidates": [...]
    }
  },
  "timestamp": "2023-06-15T12:34:56.789Z"
}
```

### `/api/chat/health-check`

Checks the availability of the API and verifies that API keys are configured.

**Response:**
```json
{
  "success": true,
  "message": "API available",
  "apiConfigured": true
}
```

## Mobile App Integration

The mobile app has been updated to use these secure endpoints instead of directly calling third-party APIs. No changes are needed in the mobile app code after this update.

## Obtaining a Gemini API Key

To get a Gemini API key for the secure proxy:

1. Go to the [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Log in with your Google account
3. Click "Create API Key" and follow the instructions
4. Copy your API key and add it to your `.env` file as `GEMINI_API_KEY`

Note: The Gemini API key should **never** be stored in your mobile app code or included in client-side files.

## Verifying Installation

Once you've set up the proxy and configured your API keys, you can test that everything is working correctly:

1. Start your local Netlify development server:
   ```
   netlify dev
   ```

2. Test the public health check endpoint:
   ```
   curl http://localhost:8888/.netlify/functions/health
   ```

3. You should see a response like:
   ```json
   {
     "success": true,
     "message": "API available",
     "apiConfigured": true
   }
   ```

If your response shows `"apiConfigured": false`, check that your API key is correctly set in your `.env` file. 