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