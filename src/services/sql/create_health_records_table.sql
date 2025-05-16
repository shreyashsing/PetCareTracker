-- IMPORTANT: Run this SQL in the Supabase SQL Editor to create the health_records table
-- This table is needed for health record synchronization to work correctly

-- First, create the UUID extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the health_records table with all required fields
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  symptoms TEXT[] DEFAULT '{}',
  diagnosis TEXT,
  treatment TEXT,
  provider_name TEXT,
  provider_clinic TEXT,
  cost NUMERIC,
  insurance_covered BOOLEAN DEFAULT false,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_records_pet_id ON public.health_records(pet_id);

-- Set up Row Level Security
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- Create policies to allow users to access health records of their own pets
CREATE POLICY "Users can view health records of their own pets" 
  ON public.health_records 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT user_id FROM public.pets WHERE id = pet_id
  ));

CREATE POLICY "Users can insert health records for their own pets" 
  ON public.health_records 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.pets WHERE id = pet_id
  ));

CREATE POLICY "Users can update health records of their own pets" 
  ON public.health_records 
  FOR UPDATE 
  USING (auth.uid() IN (
    SELECT user_id FROM public.pets WHERE id = pet_id
  ));

CREATE POLICY "Users can delete health records of their own pets" 
  ON public.health_records 
  FOR DELETE 
  USING (auth.uid() IN (
    SELECT user_id FROM public.pets WHERE id = pet_id
  ));

-- Grant necessary permissions
GRANT ALL ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role; 