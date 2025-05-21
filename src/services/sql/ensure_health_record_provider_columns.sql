-- SQL Migration to ensure provider_name and provider_clinic columns exist in health_records table

-- Add both snake_case and camelCase versions of the provider columns
-- Snake case columns (for Supabase API compatibility)
ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT '';

ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS provider_clinic TEXT DEFAULT '';

-- CamelCase columns (for direct database queries)
ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS "providerName" TEXT DEFAULT '';

ALTER TABLE health_records
ADD COLUMN IF NOT EXISTS "providerClinic" TEXT DEFAULT '';

-- Comment on the columns
COMMENT ON COLUMN health_records.provider_name IS 'Name of the veterinarian or healthcare provider (snake_case)';
COMMENT ON COLUMN health_records.provider_clinic IS 'Name of the clinic or facility where care was provided (snake_case)';
COMMENT ON COLUMN health_records."providerName" IS 'Name of the veterinarian or healthcare provider (camelCase)';
COMMENT ON COLUMN health_records."providerClinic" IS 'Name of the clinic or facility where care was provided (camelCase)';

-- Update any records where provider_name is missing but provider_clinic exists
UPDATE health_records 
SET provider_name = COALESCE(provider_name, 'Unknown')
WHERE provider_name IS NULL AND provider_clinic IS NOT NULL;

-- Update any records where provider_clinic is missing but provider_name exists
UPDATE health_records 
SET provider_clinic = COALESCE(provider_clinic, 'Unknown')
WHERE provider_clinic IS NULL AND provider_name IS NOT NULL;

-- Sync camelCase and snake_case columns
UPDATE health_records 
SET "providerName" = provider_name
WHERE provider_name IS NOT NULL AND "providerName" IS NULL;

UPDATE health_records 
SET "providerClinic" = provider_clinic
WHERE provider_clinic IS NOT NULL AND "providerClinic" IS NULL; 