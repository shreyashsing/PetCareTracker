# Pet Care Tracker Mobile App

This React Native application allows users to track and manage their pets' care needs including health records, feeding schedules, medication, and more.

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