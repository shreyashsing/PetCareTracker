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

## Storage Bucket Setup

### Setting up the pet-images Storage Bucket

#### Automatic Setup (Recommended)
The app now includes automatic setup of the storage bucket. When the app starts, it will:
1. Check if the 'pet-images' bucket exists
2. Create it if it doesn't exist
3. Attempt to set up the required policies

This automatic setup requires that your Supabase user has sufficient permissions. If you are using a fresh Supabase project, this should work automatically.

#### Manual Setup

If the automatic setup fails, you can manually set up the storage bucket:

1. Go to your Supabase dashboard and navigate to the Storage section
2. Create a new bucket named `pet-images`
3. Make sure the bucket has public access enabled for reading images
4. Set up the following RLS (Row Level Security) policies for the bucket:

Run these SQL statements in the Supabase SQL Editor:

```sql
-- FIRST, make sure the pet-images bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'pet-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('pet-images', 'pet-images', true);
  END IF;
END $$;

-- Policy to allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
USING (bucket_id = 'pet-images' AND auth.uid() = owner);

-- Policy to allow authenticated users to select their own files
CREATE POLICY IF NOT EXISTS "Allow authenticated select" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'pet-images' AND auth.uid() = owner);

-- Policy to allow public access to read files for sharing
CREATE POLICY IF NOT EXISTS "Allow public viewing of images" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'pet-images');

-- Policy to allow users to update their own files
CREATE POLICY IF NOT EXISTS "Allow authenticated updates" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'pet-images' AND auth.uid() = owner);

-- Policy to allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'pet-images' AND auth.uid() = owner);
```

#### Troubleshooting Storage Issues

If you encounter issues with image uploads or display:

1. **Check if the bucket exists**:
   - Go to Supabase Dashboard → Storage → Buckets
   - Verify that 'pet-images' is listed

2. **Check policies**:
   - Go to Supabase Dashboard → Storage → Policies
   - Make sure all the policies above are applied to the 'pet-images' bucket

3. **Check permissions**:
   - Make sure your Supabase user is authenticated when uploading images
   - Verify that the RLS policies allow your user to upload and read images

4. **Enable debugging**:
   - The app includes detailed logging for image operations
   - Check the logs for specific error messages

#### Step-by-Step Manual Bucket Creation in Supabase Dashboard

If you're encountering the "new row violates row-level security policy" error, follow these steps to manually create the bucket:

1. Log in to your Supabase dashboard.

2. Navigate to the "Storage" section in the left sidebar.

3. Click on "New Bucket" button.

4. Enter "pet-images" (exactly as written, including the hyphen) for the bucket name.

5. Enable "Public bucket" option if you want the images to be publicly accessible.

6. Click "Create bucket".

7. Once created, click on the "pet-images" bucket to view it.

8. Navigate to the "Policies" tab.

9. Add these RLS policies:
   - Click "Add Policy" → For Authenticated Users → "Give users access to their own folder":
     - Set "Details" for the policy name: `Allow authenticated uploads`
     - Template: `INSERT` permissions
     - Definition: `(bucket_id = 'pet-images' AND auth.uid() = owner)`
     
   - Click "Add Policy" again → For Authenticated Users:
     - Set "Details" for the policy name: `Allow authenticated select`
     - Template: `SELECT` permissions
     - Definition: `(bucket_id = 'pet-images' AND auth.uid() = owner)`
     
   - Click "Add Policy" again → For Authenticated Users:
     - Set "Details" for the policy name: `Allow authenticated updates`
     - Template: `UPDATE` permissions
     - Definition: `(bucket_id = 'pet-images' AND auth.uid() = owner)`
     
   - Click "Add Policy" again → For Authenticated Users:
     - Set "Details" for the policy name: `Allow authenticated deletes`
     - Template: `DELETE` permissions
     - Definition: `(bucket_id = 'pet-images' AND auth.uid() = owner)`
     
   - Click "Add Policy" one more time → For Public Users:
     - Set "Details" for the policy name: `Allow public viewing of images`
     - Template: `SELECT` permissions
     - Definition: `(bucket_id = 'pet-images')`

10. Restart your app and attempt image uploads again.

#### Common RLS Policy Errors 

If you see errors containing "row-level security policy" or "permission denied", it means:

1. **Missing storage bucket**: The 'pet-images' bucket doesn't exist
2. **Missing policies**: The bucket exists but policies aren't correctly set up
3. **Authentication issue**: You're trying to upload while not properly authenticated

After setting these policies, your app will be able to upload and retrieve images from the pet-images bucket.

## Additional Troubleshooting

### Image Upload Process

The app handles image uploads in a simple, straightforward way:

1. The selected image from your device's gallery/camera is uploaded directly to Supabase storage
2. A unique filename is generated for each image to prevent conflicts
3. Multiple retry attempts occur automatically if an upload fails
4. Clear error messages are displayed to help diagnose any issues

The app intentionally avoids using image manipulation/compression libraries, as these can cause compatibility issues on some devices. Instead, the original image is uploaded as-is, which ensures maximum compatibility.

### Troubleshooting Image Upload Issues

If you encounter issues with image uploads:

1. **Check your internet connection**: Image uploads require a stable internet connection
2. **Verify storage bucket exists**: Follow the manual bucket creation steps detailed above
3. **Check app logs**: Look for specific error messages about permissions or failed uploads
4. **Restart the app**: Sometimes a simple restart can resolve temporary issues

#### Network Errors During Upload

If you see "Network request failed" errors during image upload:

1. **Check your device's internet connection**
   - Make sure you have a stable Wi-Fi or cellular connection
   - Try turning airplane mode on and off to reset the connection
   - If using mobile data, ensure the app has permission to use background data

2. **Verify Supabase service availability**
   - Check if you can access the Supabase dashboard in a browser
   - Ensure your Supabase project is running and not in maintenance mode
   - Verify your project's API endpoints are responding (try the dashboard)

3. **Check for firewall or network restrictions**
   - Some networks may block certain API calls
   - Try using a different network if available
   - Corporate/school networks often restrict file upload endpoints

4. **Examine DNS issues**
   - Sometimes DNS resolution problems can cause "Network request failed" errors
   - Try using a different DNS provider on your device or network
   - Mobile carriers might have DNS issues affecting specific domains

5. **Handle the fallback gracefully**
   - The app will automatically use the local image if upload fails
   - You can sync images later when you have a better connection
   - Locally stored images will remain visible within the app

6. **Check Android Network Security Configuration**
   - For Android, ensure the app has proper network security configurations
   - Check if cleartext traffic is allowed for development servers
   - Verify the network security config XML file is properly set up

7. **Reduce image size**
   - Very large images (>5MB) may time out on slow connections
   - Consider using a smaller image or cropping the image before selection
   - The app now uses a more robust upload mechanism with multiple retry attempts

8. **Check device network permissions**
   - Ensure the app has permission to access the internet in your device settings
   - Some battery optimization features can restrict background network activity

#### Detailed Error Diagnosis

The app includes comprehensive logging for network issues. When a "Network request failed" error occurs:

1. **Check console logs**: The app outputs detailed logs about each step of the upload process
2. **Look for specific error codes**: The error message may include HTTP status codes that provide clues
3. **Check timeouts**: If uploads consistently time out, it may indicate network instability or large file sizes
4. **Progressive retries**: The app automatically attempts multiple retries with progressive backoff
5. **Different upload methods**: On Android, the app will attempt alternative upload methods if the primary method fails

For most images, even without compression, the upload should be relatively quick. If you're consistently experiencing upload failures, please check the storage bucket settings in Supabase and ensure your network connection is stable.

#### Known Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "Network request failed" | Temporary network glitch | Wait a moment and try again, the app includes auto-retry |
| "Network request failed" despite good connection | DNS or routing issue | Try using a different network or restart your device |
| Upload times out | Large image file | Use a smaller or compressed image |
| "new row violates row-level security policy" | Incorrect bucket permissions | Follow the manual bucket setup steps in this README |
| Upload works but image doesn't display | Public access policy missing | Add the public SELECT policy to the storage bucket |

## Fixing Storage 400 Errors

If you're encountering 400 (Bad Request) errors when uploading images to Supabase storage, this is most likely due to Row Level Security (RLS) policy issues. To fix this:

### Solution 1: Apply the SQL Fixes Manually

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the following SQL and run it:

```sql
-- First, ensure the pet-images bucket exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'pet-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('pet-images', 'pet-images', true);
  END IF;
END $$;

-- IMPORTANT: Delete any existing policies for the bucket to ensure clean setup
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of images" ON storage.objects;

-- Policy for INSERT - less restrictive, only check bucket_id
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
USING (bucket_id = 'pet-images');

-- Policy for SELECT - allow users to select files with no owner check
CREATE POLICY "Allow authenticated select" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'pet-images');

-- Policy for public viewing
CREATE POLICY "Allow public viewing of images" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'pet-images');

-- Policy for UPDATE - less restrictive
CREATE POLICY "Allow authenticated updates" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'pet-images');

-- Policy for DELETE - less restrictive
CREATE POLICY "Allow authenticated deletes" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'pet-images');

-- Make sure the auth.users relation has the correct permissions
GRANT SELECT ON auth.users TO authenticated;
GRANT SELECT ON auth.users TO anon;

-- Ensure that the storage schema is accessible
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- Allow all operations on objects table
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Additional permissions that might be needed
GRANT EXECUTE ON FUNCTION storage.extension(text) TO authenticated;
GRANT EXECUTE ON FUNCTION storage.filename(text) TO authenticated;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO authenticated;
```

5. After running this SQL, restart your app and try uploading an image again.

### Solution 2: Check CORS Configuration

If you're still experiencing issues, ensure your Supabase project has the correct CORS (Cross-Origin Resource Sharing) configuration:

1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Scroll down to the "CORS" section
4. Add the following origins to the allowed list:
   - `*` (for testing purposes only)
   - `exp://localhost:*`
   - `exp://192.168.*.*:*`
   - Your app's specific domain if deployed

### Solution 3: Check Supabase User Authentication

Ensure your authentication is working properly:

1. Verify that your user is properly authenticated before uploading
2. Check the token expiration - if the token has expired, uploads will fail
3. Try signing out and signing back in before uploading

### Understanding the Fix

The original storage policies were too restrictive, requiring the `auth.uid()` to match the `owner` field of each storage object. This creates a circular dependency: 
- The upload needs to set the owner field to match the user's ID
- But the policy requires the owner to already match the user's ID before allowing the upload

The updated policies simply check that the bucket_id is 'pet-images' and that the user is authenticated, which resolves the issue.

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