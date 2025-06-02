-- Create weight_records table for tracking pet weight over time
CREATE TABLE IF NOT EXISTS weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight DECIMAL(6,2) NOT NULL CHECK (weight > 0),
  unit VARCHAR(10) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'lb')),
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weight_records_pet_id ON weight_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_user_id ON weight_records(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date);
CREATE INDEX IF NOT EXISTS idx_weight_records_pet_date ON weight_records(pet_id, date);

-- Enable Row Level Security
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own pet weight records" ON weight_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert weight records for their own pets" ON weight_records
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM pets 
      WHERE pets.id = weight_records.pet_id 
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pet weight records" ON weight_records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own pet weight records" ON weight_records
  FOR DELETE USING (user_id = auth.uid());

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_weight_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weight_records_updated_at
  BEFORE UPDATE ON weight_records
  FOR EACH ROW
  EXECUTE FUNCTION update_weight_records_updated_at(); 