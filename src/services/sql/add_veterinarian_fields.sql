-- Add veterinarian fields to the pets table
-- Run this SQL in the Supabase SQL Editor to add the missing veterinarian columns

-- Add veterinarian fields if they don't exist
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS veterinarian_name TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS veterinarian_phone TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS veterinarian_clinic TEXT;

-- Add some comments to document the new fields
COMMENT ON COLUMN public.pets.veterinarian_name IS 'Name of the pet''s veterinarian';
COMMENT ON COLUMN public.pets.veterinarian_phone IS 'Phone number of the pet''s veterinarian';
COMMENT ON COLUMN public.pets.veterinarian_clinic IS 'Clinic name where the veterinarian works';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pets' 
AND table_schema = 'public'
AND column_name LIKE 'veterinarian_%'; 