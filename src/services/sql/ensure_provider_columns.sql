-- SQL Migration to ensure provider columns exist in health_records table

-- Add provider_name column if it doesn't exist
ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT '';

-- Add provider_clinic column if it doesn't exist
ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS provider_clinic TEXT DEFAULT '';

-- Comment on the columns
COMMENT ON COLUMN health_records.provider_name IS 'Name of the veterinarian or healthcare provider';
COMMENT ON COLUMN health_records.provider_clinic IS 'Name of the clinic or facility where care was provided';

-- Update any records where provider info is missing
UPDATE health_records 
SET provider_name = COALESCE(provider_name, 'Unknown')
WHERE provider_name IS NULL;

UPDATE health_records 
SET provider_clinic = COALESCE(provider_clinic, 'Unknown')
WHERE provider_clinic IS NULL; 