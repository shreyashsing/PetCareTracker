-- SQL Migration to add severity and weight columns to health_records table

-- Add severity column
ALTER TABLE public.health_records
ADD COLUMN IF NOT EXISTS severity TEXT;

-- Add weight column
ALTER TABLE public.health_records
ADD COLUMN IF NOT EXISTS weight NUMERIC;

-- Add user_id column if not exists (for better user association)
ALTER TABLE public.health_records
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Comment on the new columns
COMMENT ON COLUMN public.health_records.severity IS 'Severity level of the health issue (low, medium, high)';
COMMENT ON COLUMN public.health_records.weight IS 'Pet weight recorded during health check'; 