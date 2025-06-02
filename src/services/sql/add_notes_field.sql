-- Add notes field to the pets table
-- Run this SQL in the Supabase SQL Editor if the notes column doesn't exist

-- Add notes field if it doesn't exist
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add a comment to document the new field
COMMENT ON COLUMN public.pets.notes IS 'Additional notes or information about the pet';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets' 
  AND column_name = 'notes';

-- Check if the column was added successfully
SELECT COUNT(*) as notes_column_exists
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets' 
  AND column_name = 'notes'; 