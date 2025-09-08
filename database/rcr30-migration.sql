-- =====================================================
-- RCR-30 FIX FOR EXISTING APPOINTMENTS TABLE
-- Fixes the column name mismatch and function issues
-- =====================================================

-- Fix the column name mismatch: the table has 'audio_mime' but function expects 'audio_mime_type'
-- Add the missing column that the function expects
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS audio_mime_type text;

-- Copy data from audio_mime to audio_mime_type if audio_mime exists
DO $$
BEGIN
  -- Check if audio_mime column exists and copy its data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'audio_mime') THEN
    UPDATE public.appointments 
    SET audio_mime_type = COALESCE(audio_mime_type, audio_mime, 'audio/webm;codecs=opus')
    WHERE audio_mime_type IS NULL;
  ELSE
    -- Set default value if no audio_mime column exists
    UPDATE public.appointments 
    SET audio_mime_type = COALESCE(audio_mime_type, 'audio/webm;codecs=opus')
    WHERE audio_mime_type IS NULL;
  END IF;
END $$;

-- Make sure audio_mime_type has a default
ALTER TABLE public.appointments 
ALTER COLUMN audio_mime_type SET DEFAULT 'audio/webm;codecs=opus';

-- Add missing updated_at column if it doesn't exist
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Recreate the RPC function with the correct column name and proper enum casting
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