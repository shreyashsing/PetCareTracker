-- Storage policies for pet-images bucket
-- Run these SQL commands in your Supabase SQL Editor
-- The app attempts to create these policies automatically, but they might require admin privileges

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