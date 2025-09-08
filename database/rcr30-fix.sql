-- =====================================================
-- COMPLETE FIX FOR RCR-30 TYPE CASTING ISSUES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Fix the trigger function with proper enum casting and CTE scope
CREATE OR REPLACE FUNCTION public.appointments_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_order int;
  new_order int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Use individual CASE statements instead of CTE to avoid scope issues
    old_order := CASE OLD.status::text
      WHEN 'recording' THEN 1
      WHEN 'uploading' THEN 2
      WHEN 'processing' THEN 3
      WHEN 'transcribed' THEN 4
      WHEN 'prontuario_ready' THEN 5
      WHEN 'failed' THEN 99
      ELSE 0
    END;
    
    new_order := CASE NEW.status::text
      WHEN 'recording' THEN 1
      WHEN 'uploading' THEN 2
      WHEN 'processing' THEN 3
      WHEN 'transcribed' THEN 4
      WHEN 'prontuario_ready' THEN 5
      WHEN 'failed' THEN 99
      ELSE 0
    END;

    -- Allow 'failed' status from any state
    IF NEW.status = 'failed'::appointment_status THEN
      RETURN NEW;
    END IF;

    -- Prevent status regression (except to failed)
    IF new_order < old_order THEN
      RAISE EXCEPTION 'Invalid status regression: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Add missing audio_mime_type column if it doesn't exist
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS audio_mime_type text DEFAULT 'audio/webm;codecs=opus';

-- 3. Add missing updated_at column if it doesn't exist
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Create updated_at trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
BEFORE UPDATE ON public.appointments 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Fix the RPC function with proper column references and enum casting
CREATE OR REPLACE FUNCTION public.set_appointment_uploading(
  _id uuid,
  _audio_path text,
  _audio_mime text,
  _audio_size bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update appointment with audio metadata and set status to uploading
  UPDATE public.appointments
  SET
    audio_path = _audio_path,
    audio_mime_type = COALESCE(_audio_mime, 'audio/webm;codecs=opus'),
    audio_size_bytes = _audio_size,
    status = 'uploading'::appointment_status,
    updated_at = now()
  WHERE
    id = _id
    AND user_id = auth.uid()
    AND status IN ('recording'::appointment_status, 'uploading'::appointment_status);

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or cannot be updated to uploading status';
  END IF;
END;
$$;

-- 6. Grant proper permissions
REVOKE ALL ON FUNCTION public.set_appointment_uploading(uuid, text, text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.set_appointment_uploading(uuid, text, text, bigint) TO authenticated;