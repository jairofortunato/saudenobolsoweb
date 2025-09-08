-- Prontuários Table Migration Script
-- This script extends the existing prontuarios table to support the ChatGPT-like consultation interface

-- Add missing columns to existing prontuarios table
ALTER TABLE public.prontuarios 
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(profile_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Change content from JSONB to TEXT for editable prontuário text
-- Note: This will convert existing JSONB content to text representation
ALTER TABLE public.prontuarios 
  ALTER COLUMN content TYPE TEXT USING content::text;

-- Create additional indexes for our use case
CREATE INDEX IF NOT EXISTS idx_prontuarios_patient_id ON public.prontuarios(patient_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_created_by ON public.prontuarios(created_by);
CREATE INDEX IF NOT EXISTS idx_prontuarios_title ON public.prontuarios(title);
CREATE INDEX IF NOT EXISTS idx_prontuarios_updated_at ON public.prontuarios(updated_at DESC);

-- Full-text search index for content
CREATE INDEX IF NOT EXISTS idx_prontuarios_content_search ON public.prontuarios USING gin(to_tsvector('portuguese', content));

-- Add trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists, then create new one
DROP TRIGGER IF EXISTS update_prontuarios_updated_at ON public.prontuarios;
CREATE TRIGGER update_prontuarios_updated_at
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update RLS policies to work with both user_id and profile relationships
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "prontuarios_select_own" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_insert_self" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_update_own" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_delete_own" ON public.prontuarios;

-- Create new policies that work with both user_id and profile_id relationships
CREATE POLICY "prontuarios_select_policy" ON public.prontuarios
  FOR SELECT USING (
    user_id = auth.uid()
    OR created_by = (SELECT profile_id FROM public.profiles WHERE user_id = auth.uid())
    OR patient_id = (SELECT profile_id FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'doctor'
    )
  );

CREATE POLICY "prontuarios_insert_policy" ON public.prontuarios
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR created_by = (SELECT profile_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "prontuarios_update_policy" ON public.prontuarios
  FOR UPDATE USING (
    user_id = auth.uid()
    OR created_by = (SELECT profile_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "prontuarios_delete_policy" ON public.prontuarios
  FOR DELETE USING (
    user_id = auth.uid()
    OR created_by = (SELECT profile_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Verification query - uncomment to check the table structure after migration
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'prontuarios' AND table_schema = 'public'
-- ORDER BY ordinal_position;