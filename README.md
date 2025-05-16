# Pet Care Tracker Mobile App

This React Native application allows users to track and manage their pets' care needs including health records, feeding schedules, medication, and more.

## TypeScript Migration

This project is in the process of migrating from JavaScript to TypeScript. See [TYPESCRIPT_MIGRATION.md](./TYPESCRIPT_MIGRATION.md) for details on the migration process and guidelines.

## Code Organization

### Navigation Structure

The application follows a clear navigation structure:

- **src/pages/**: Contains the primary screen implementations that are actively used in the app. These are the source of truth for our screens.
- **src/screens/**: Contains legacy screen implementations that are being phased out. New development should focus on the `pages` directory.

### Directory Structure

- **src/components/**: Reusable UI components
- **src/contexts/**: React Context providers (Auth, etc.)
- **src/forms/**: Form components and utilities
- **src/hooks/**: Custom React hooks
- **src/navigation/**: Navigation configuration
- **src/pages/**: Primary screen implementations
- **src/screens/**: Legacy screens (to be migrated or removed)
- **src/services/**: Business logic and services
- **src/types/**: TypeScript type definitions
- **src/utils/**: Utility functions

## Navigation

The app uses React Navigation with the following structure:

1. **AppNavigator**: The root navigator that handles authentication state
2. **AuthStack**: Screens for authentication flow
3. **MainStack**: Primary app screens when logged in

## Development Guidelines

1. **Screen Implementation**: Always create new screens in the `src/pages/` directory.
2. **Type Safety**: Avoid using type assertions like `as any` or `as ComponentType<any>`. Instead, properly type your components.
3. **Code Consistency**: Follow the established patterns in the codebase for new features.
4. **Navigation**: Use the correct route names and parameters as defined in `src/types/navigation.ts`.

## Cleanup Roadmap

1. Migrate any remaining functionality from `src/screens/` to `src/pages/`
2. Remove duplicate screen implementations
3. Ensure proper typing throughout the application

## AI Pet Assistant

The Pet Care Tracker app now includes an AI assistant powered by Google's Gemini 1.5 Pro. This feature allows users to ask pet-related questions and get personalized answers based on their pet's profile data.

### Features

- Chat-style interface for pet care questions
- Personalized responses based on pet profile data
- Secure storage of chat history
- Simple and intuitive design

### Setup

To use the AI Pet Assistant, you'll need to:

1. Get a Google Gemini API key from https://ai.google.dev/
2. Add your API key to the `.env` file:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```
3. Access the assistant from the Settings screen

No user input is required as the API key is loaded automatically from the environment configuration.

### Setting Up the Database Tables

The AI Assistant requires database tables in your Supabase project:

1. First, the `pets` table (needed for foreign key relationships)
2. The `chat_sessions` and `chat_messages` tables for the AI assistant

**Step-by-Step Setup:**

1. Go to your Supabase dashboard and navigate to the **SQL Editor**
2. **Important:** First run the script to create the pets table:
   - Run the SQL in `src/services/sql/create_pets_table.sql`
3. Then create the chat tables with either of these methods:

   **Option 1: Create tables via Supabase function (recommended)**
   - Run the SQL script in `src/services/sql/create_tables_function.sql` to create the `create_chat_tables()` function
   - Then in the app, click on "Create Tables" on the error screen when you first open the Chat Assistant

   **Option 2: Direct SQL setup**
   - Run the SQL in `src/services/db/migrations.ts` (the `createChatTablesSQL` constant)

**Note:** If you encounter an error about missing tables, make sure you've created the `pets` table first. The modified function should handle this situation, but it's better to have all tables properly created with their relationships.

### Implementation Details

- The chat assistant uses Gemini 1.5 Pro model through the Google API
- Messages are securely stored in your Supabase database
- Chat history is associated with the user's account
- The assistant can use pet profile information for context-aware answers
- Token limit management to avoid exceeding API limits
- Includes retry logic for API failures

### Default System Prompt

The assistant is configured with a pet care focused system prompt:

```
You are a helpful pet care assistant. Use your knowledge to provide accurate, 
helpful information about pet care, health, training, and general pet wellbeing. 
Only answer questions related to pets and pet care. If asked about non-pet topics, 
kindly redirect the conversation to pet-related subjects. Be concise and direct in your responses.
```

### Content Filtering

The assistant includes content filtering to:

- Remove potentially harmful or inappropriate content
- Focus responses on pet-related topics
- Ensure safe usage for all users

## Running the Application

### Step 1: Start the Netlify Development Server

The mobile app communicates with serverless functions hosted on Netlify. For local development, you need to run the Netlify development server:

```bash
# Navigate to the project directory
cd PetCareTrackerMobile

# Install dependencies if needed
npm install

# Start the Netlify development server
# Make sure to specify port 8888 as the app is configured to use this port
npx netlify dev --port 8888
```

The Netlify server should show output like:
```
◈ Functions server is listening on 8888
◈ [functions] Loaded function chat-health-check.
◈ [functions] Loaded function health-check.
...
```

### Step 2: Run the mobile app

In a new terminal window:

```bash
# Navigate to the project directory
cd PetCareTrackerMobile

# Start the React Native development server
npm start
```

Then press `a` to start the Android app or `i` for iOS.

## Troubleshooting

### Network Connectivity Issues

If you encounter "Network request failed" errors:

1. **Verify the Netlify server is running** on port 8888
2. **For Android:** 
   - The app is configured to use `10.0.2.2:8888` to connect to your local machine
   - Make sure your emulator is properly configured for network access
3. **For iOS:** 
   - iOS simulators use `localhost:8888` to connect to your local machine

### Android Cleartext Traffic

The app has been configured to allow cleartext (HTTP) traffic for development purposes. This is set up in:
- `android/app/src/main/res/xml/network_security_config.xml`
- Referenced in `AndroidManifest.xml` 

### API Health Check

The app attempts to connect to multiple potential health check endpoints:
- `/.netlify/functions/health-check`
- `/.netlify/functions/api/health-check`
- `/.netlify/functions/api/chat/health-check`
- `/.netlify/functions/chat-health-check`

You can manually test the health check endpoints in your browser or with curl:
```bash
curl http://localhost:8888/.netlify/functions/health-check
```

If the API is properly configured, you should see a JSON response with `"success": true`. 

## Critical Network Configuration

### Netlify Dev Server Configuration

To ensure the Netlify development server is accessible from the Android emulator, you **MUST** use the following command:

```bash
# Important: The --host parameter is critical for Android emulator access
npx netlify dev --port 8888 --host 0.0.0.0
```

The `--host 0.0.0.0` parameter is **critical** - it makes the server listen on all network interfaces, not just localhost, which is necessary for the Android emulator to connect.

### Network Troubleshooting Script

A utility script has been added to test API connectivity:

```bash
node scripts/test-api-connectivity.js
```

## API Deployment

The backend serverless functions are deployed on Netlify at:

```
https://darling-empanada-164b33.netlify.app/api
```

### Required Environment Variables

The following environment variables must be set in the Netlify dashboard:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your Supabase service key
- `GEMINI_API_KEY` - Your Google Gemini API key

### Testing the API

You can use the test script to verify the API is working:

```bash
node scripts/test-netlify-api.js
```

## Database Migration

The app has been migrated from using a legacy database manager to a unified database manager that provides a consistent API for both local storage (AsyncStorage) and cloud storage (Supabase).

### Migration Process

The migration process has been completed with the following steps:

1. Created a unified database manager (`UnifiedDatabaseManager`) that provides a consistent API for both local and cloud storage.
2. Created a generic data manager (`DataManager`) that handles CRUD operations for a specific entity type.
3. Updated the app initialization code to use the unified database manager.
4. Created migration utilities to help with the transition.
5. Updated all references to the legacy database manager throughout the codebase.

### Using the Unified Database Manager

When working with the app's database, always use the unified database manager:

```typescript
import { unifiedDatabaseManager } from '../services/db';

// Get all pets
const pets = await unifiedDatabaseManager.pets.getAll();

// Create a new pet
const newPet = await unifiedDatabaseManager.pets.create({
  name: 'Fluffy',
  type: 'dog',
  // ... other pet properties
});

// Update a pet
await unifiedDatabaseManager.pets.update(petId, {
  name: 'Fluffy Jr.',
  // ... other properties to update
});

// Delete a pet
await unifiedDatabaseManager.pets.delete(petId);
```

### Method Differences

The unified database manager uses a more generic approach, so some specialized methods that were available in the legacy database manager are not directly available. Instead, use the generic methods and filter the results:

```typescript
// Legacy approach:
const userPets = await databaseManager.pets.findByUserId(userId);

// Unified approach:
const allPets = await unifiedDatabaseManager.pets.getAll();
const userPets = allPets.filter(pet => pet.userId === userId);
```

### Synchronization

The unified database manager handles synchronization between local storage and Supabase:

```typescript
// Sync all data for a user
await unifiedDatabaseManager.syncAllData(userId);

// Sync specific entity types
await unifiedDatabaseManager.pets.syncToSupabase();
await unifiedDatabaseManager.pets.syncFromSupabase(userId);
```

## More Documentation

For more detailed documentation on the database management system, see the [Database Management README](./src/services/db/README.md). 