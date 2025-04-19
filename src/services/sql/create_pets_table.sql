-- IMPORTANT: Run this SQL in the Supabase SQL Editor to create the pets table
-- This table is needed for the pet care tracker app to function correctly

-- First, create the UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the pets table with all required fields
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  breed TEXT,
  birth_date TIMESTAMP WITH TIME ZONE,
  gender TEXT,
  weight NUMERIC,
  weight_unit TEXT DEFAULT 'kg',
  microchipped BOOLEAN DEFAULT false,
  microchip_id TEXT,
  neutered BOOLEAN DEFAULT false,
  adoption_date TIMESTAMP WITH TIME ZONE,
  color TEXT,
  image TEXT,
  medical_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);

-- Set up Row Level Security
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view and modify their own pets
CREATE POLICY "Users can view their own pets" 
  ON public.pets 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pets" 
  ON public.pets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets" 
  ON public.pets 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets" 
  ON public.pets 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;

-- Check existing data (if any exists)
SELECT COUNT(*) FROM pets;

-- OPTIONAL: Create helper functions to check if table exists and get schema
-- These functions are used by the app to verify table structure
-- Note: These require SECURITY DEFINER permissions to work properly

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Function to get a table's schema
CREATE OR REPLACE FUNCTION public.get_table_schema(table_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_schema json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'column_name', c.column_name,
      'data_type', c.data_type,
      'is_nullable', c.is_nullable
    )
  )
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
  AND c.table_name = $1
  INTO table_schema;
  
  RETURN table_schema;
END;
$$;

-- Function to execute SQL statements (used for migrations)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$; 