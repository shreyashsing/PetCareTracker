/* 
 * Fix Pets Table - Remove insurance_info column
 * 
 * This script removes the insurance_info column from the pets table
 * that is causing the "could not find the insurance_info column of pets in the schema cache" error.
 * 
 * Run this in the Supabase SQL Editor.
 */

-- First check if the column exists
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if the insurance_info column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pets'
    AND column_name = 'insurance_info'
  ) INTO column_exists;
  
  -- If column exists, drop it
  IF column_exists THEN
    RAISE NOTICE 'Found insurance_info column, dropping it...';
    ALTER TABLE public.pets DROP COLUMN insurance_info;
    RAISE NOTICE 'Successfully removed insurance_info column from pets table!';
  ELSE
    RAISE NOTICE 'No insurance_info column found in pets table, no action needed.';
  END IF;
END $$; 