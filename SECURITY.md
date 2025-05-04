# PetCare Tracker Security Architecture

This document outlines the security architecture for PetCare Tracker, focusing on how we protect sensitive API keys and data access.

## Secure Backend Proxy Architecture

The application uses a secure backend proxy architecture to protect sensitive API keys and database access:

1. **API Keys Are Never Stored in the Client**
   - All sensitive API keys (Gemini API key, Supabase service key) are stored only on the server side
   - The client never has direct access to these keys, preventing extraction from the app bundle

2. **Serverless Functions as Secure Proxies**
   - Netlify serverless functions act as secure proxies for all sensitive operations
   - These functions run in a secure server environment with access to protected environment variables

3. **Authentication Flow**
   - The mobile app authenticates with Supabase using the anon key (which is designed for public use)
   - After authentication, all data operations use the authenticated user's JWT token
   - Server-side functions validate the JWT token before performing any operations

## API Request Flow

```
Mobile App → Supabase Auth → Serverless Functions → External APIs/Database
```

1. User authenticates with Supabase Auth
2. The app receives a JWT token
3. This token is sent with all API requests to serverless functions
4. Serverless functions validate the token and user permissions
5. Functions use server-side API keys to access external services or the database

## Security Boundaries

- **Client-side Security Boundary**
  - Only public keys are stored on the client (Supabase URL, anon key)
  - Authentication is the only direct database operation performed by the client

- **Server-side Security Boundary**
  - All sensitive keys and operations are isolated to the server
  - Row-Level Security (RLS) provides an additional layer of protection
  - Server functions enforce user permissions for all data operations

## Secure Modules

The project includes these secure modules:

- `api/chatApi.ts` - Secure chat operations through API endpoints
- `api/geminiApi.ts` - Secure Gemini AI interactions through API endpoints
- `petAssistant/secureChatRepository.ts` - Repository pattern using secure API calls
- `petAssistant/secureGeminiService.ts` - Service for secure AI interactions

## Serverless Function Endpoints

- `api/chat/create-session.ts` - Create a new chat session
- `api/chat/get-session-messages.ts` - Get messages for a session
- `api/chat/get-user-sessions.ts` - Get a user's chat sessions
- `api/chat/add-message.ts` - Add a message to a session
- `api/chat/delete-session.ts` - Delete a chat session
- `api/chat/proxy-gemini.ts` - Secure proxy for Gemini AI API calls
- `api/chat/health-check.ts` - Check API availability

## Environment Variables

### Client-side (.env)
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Server-side (functions/.env)
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Security Benefits

- **Prevention of API Key Theft**: No valuable API keys can be extracted from the client
- **Controlled Database Access**: All database operations go through authenticated API endpoints
- **Permission Enforcement**: Server-side validation ensures users can only access their own data
- **Reduced Attack Surface**: Minimal client-side permissions reduce potential attack vectors

By implementing this secure architecture, PetCare Tracker ensures that both API keys and user data remain protected. 
 