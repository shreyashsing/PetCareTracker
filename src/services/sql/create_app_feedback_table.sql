-- Create app_feedback table to store user feedback, bug reports and feature requests
CREATE TABLE IF NOT EXISTS app_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request', 'general_feedback', 'issue_report')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical', NULL)),
  app_version VARCHAR(20),
  device_info TEXT,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'in_progress', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_anonymous BOOLEAN DEFAULT FALSE,
  contact_email VARCHAR(255),
  admin_notes TEXT
);

-- Add RLS policies
ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;

-- Policy for inserting new feedback (logged in users or anonymous)
CREATE POLICY "Users can submit feedback" ON app_feedback
  FOR INSERT 
  WITH CHECK (true);  -- Allow any authenticated user to submit feedback

-- Policy for users to view their own feedback
CREATE POLICY "Users can view their own feedback" ON app_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for updating feedback status (only admins/service role)
CREATE POLICY "Only service role can update feedback" ON app_feedback
  FOR UPDATE
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Create index on feedback_type for faster queries
CREATE INDEX idx_app_feedback_type ON app_feedback(feedback_type);

-- Create index on user_id for faster user-specific queries
CREATE INDEX idx_app_feedback_user ON app_feedback(user_id);

-- Create index on status for faster filtering
CREATE INDEX idx_app_feedback_status ON app_feedback(status);

-- Add trigger to update updated_at field
CREATE OR REPLACE FUNCTION update_app_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_feedback_updated_at
BEFORE UPDATE ON app_feedback
FOR EACH ROW
EXECUTE FUNCTION update_app_feedback_updated_at(); 