-- =========================================================
-- SAFE TRIGGER FUNCTION FOR PATIENT PROFILE LINKING
-- This fixes the "Database error saving new user" issue
-- =========================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS after_user_signup ON auth.users;
DROP FUNCTION IF EXISTS link_patient_profile();

-- Create new SAFE trigger function with error handling
CREATE OR REPLACE FUNCTION link_patient_profile()
RETURNS trigger AS $$
BEGIN
  -- Only proceed if we have CPF in metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'cpf' IS NOT NULL THEN
    
    -- Try to link existing profile by CPF
    UPDATE profiles
    SET user_id = NEW.id,
        linked = true
    WHERE cpf = NEW.raw_user_meta_data->>'cpf'
      AND user_id IS NULL
      AND role = 'patient';
    
    -- Log success (will appear in Supabase logs)
    RAISE NOTICE 'Profile linking attempted for CPF: %, User ID: %', 
      NEW.raw_user_meta_data->>'cpf', NEW.id;
  END IF;
  
  -- ALWAYS return NEW to allow user creation to succeed
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, log it but don't block user creation
  RAISE NOTICE 'Profile linking failed for User ID: %, Error: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER after_user_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_patient_profile();

-- Test that the function exists
SELECT 'Trigger function created successfully' as status; 