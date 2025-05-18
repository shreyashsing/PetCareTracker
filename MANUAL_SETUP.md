# Manual Setup Guide for PetCareTracker

This guide provides step-by-step instructions for setting up the PetCareTracker app manually.

## Fixing Storage Upload (400) Errors

If you're encountering 400 errors when uploading pet images to Supabase storage, follow these steps:

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Click on the "SQL Editor" tab in the left sidebar

### Step 2: Run the Storage Policy Fix Script

1. Create a new query in the SQL Editor
2. Copy and paste the following SQL script:

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

3. Click the "Run" button to execute the script

### Step 3: Verify Bucket and Policies

1. Navigate to the "Storage" section in Supabase
2. Check that the "pet-images" bucket exists
3. Click on "Policies" to verify that the new policies have been applied

### Step 4: Check CORS Configuration

1. Go to your Supabase project settings
2. Click on "API" in the settings menu
3. Scroll down to the "CORS" section
4. Ensure that the CORS configuration includes:
   - `*` (for testing purposes only)
   - `exp://localhost:*`
   - `exp://192.168.*.*:*`
   - Your specific app domains

### Step 5: Test the Upload

1. Restart your app
2. Try uploading a pet image again
3. Watch the app logs for any relevant error messages

If you're still experiencing issues, see the "Fixing Storage 400 Errors" section in the README.md for more detailed troubleshooting steps.

## Troubleshooting

### Common Issues

1. **Permission denied errors**: Make sure you're logged in with an account that has admin privileges for the Supabase project.

2. **SQL execution errors**: Some of the GRANT statements might fail if you don't have the required permissions. This is normal and won't prevent the policies from being created.

3. **Network errors after fixing policies**: Try signing out and signing back in to refresh your authentication token.

4. **Update not taking effect**: Sometimes cached authentication tokens can cause issues. Restart your app completely to ensure it gets a fresh token. 