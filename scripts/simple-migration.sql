-- Simple Prontuários Migration - Run each section separately in Supabase SQL Editor

-- STEP 1: Add new columns
ALTER TABLE public.prontuarios 
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS patient_id UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS specialty VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- STEP 2: Change content column type
ALTER TABLE public.prontuarios 
  ALTER COLUMN content TYPE TEXT USING content::text;

-- STEP 3: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_prontuarios_patient_id ON public.prontuarios(patient_id);
CREATE INDEX IF NOT EXISTS idx_prontuarios_title ON public.prontuarios(title);
CREATE INDEX IF NOT EXISTS idx_prontuarios_updated_at ON public.prontuarios(updated_at DESC);

-- STEP 4: Update RLS policies
DROP POLICY IF EXISTS "prontuarios_select_own" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_insert_self" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_update_own" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_delete_own" ON public.prontuarios;

-- STEP 5: Create new RLS policies
CREATE POLICY "prontuarios_select_policy" ON public.prontuarios
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'doctor')
  );

CREATE POLICY "prontuarios_insert_policy" ON public.prontuarios
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "prontuarios_update_policy" ON public.prontuarios
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "prontuarios_delete_policy" ON public.prontuarios
  FOR DELETE USING (user_id = auth.uid());