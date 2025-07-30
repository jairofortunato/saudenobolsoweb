-- RAW MEDICAL ENTRIES TABLE
-- Stores the original raw text input from users before AI processing
CREATE TABLE raw_medical_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  raw_text TEXT NOT NULL,
  category VARCHAR(50), -- original category selected (if any)
  ai_processed BOOLEAN DEFAULT false,
  processing_success BOOLEAN DEFAULT false,
  processing_error TEXT,
  entries_created INTEGER DEFAULT 0, -- number of structured entries created from this text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- Add RLS policies for raw_medical_entries
ALTER TABLE raw_medical_entries ENABLE ROW LEVEL SECURITY;

-- Patients can view their own raw entries
CREATE POLICY "Patients can view own raw entries" ON raw_medical_entries
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Patients can insert their own raw entries
CREATE POLICY "Patients can insert own raw entries" ON raw_medical_entries
  FOR INSERT WITH CHECK (
    patient_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'patient'
    ) AND
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Doctors can view raw entries for patients they have access to
CREATE POLICY "Doctors can view patient raw entries" ON raw_medical_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Doctors can insert raw entries for any patient
CREATE POLICY "Doctors can insert patient raw entries" ON raw_medical_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Users can update their own entries or entries they created
CREATE POLICY "Users can update own raw entries" ON raw_medical_entries
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX idx_raw_medical_entries_patient_id ON raw_medical_entries(patient_id);
CREATE INDEX idx_raw_medical_entries_created_by ON raw_medical_entries(created_by);
CREATE INDEX idx_raw_medical_entries_created_at ON raw_medical_entries(created_at DESC); 