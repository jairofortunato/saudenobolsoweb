-- =========================================================
-- FINAL FIX: TRIGGER + RLS FOR PATIENT LINKING BY CPF
-- This script fixes both the trigger function and RLS policies
-- =========================================================

-- Step 1: Drop existing trigger and policies
DROP TRIGGER IF EXISTS after_user_signup ON auth.users;
DROP FUNCTION IF EXISTS link_patient_profile();

-- Drop ALL existing RLS policies for profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Doctors can create patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read patient profiles they created" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Doctors can view patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can search patient profiles" ON profiles;
DROP POLICY IF EXISTS "Enable profile creation during signup" ON profiles;

-- Step 2: Create SECURITY DEFINER trigger function (bypasses RLS)
CREATE OR REPLACE FUNCTION link_patient_profile()
RETURNS trigger 
SECURITY DEFINER  -- This is KEY - allows function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Only proceed if we have CPF in metadata
  IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data->>'cpf' IS NOT NULL THEN
    
    -- Log attempt (appears in Supabase logs)
    RAISE NOTICE 'TRIGGER: Attempting to link profile for CPF: %, User ID: %', 
      NEW.raw_user_meta_data->>'cpf', NEW.id;
    
    -- Try to link existing profile by CPF
    UPDATE profiles
    SET user_id = NEW.id,
        linked = true
    WHERE cpf = NEW.raw_user_meta_data->>'cpf'
      AND user_id IS NULL
      AND role = 'patient';
    
    -- Log success
    IF FOUND THEN
      RAISE NOTICE 'TRIGGER: ✅ Successfully linked profile for CPF: %', NEW.raw_user_meta_data->>'cpf';
    ELSE
      RAISE NOTICE 'TRIGGER: ⚠️ No matching profile found for CPF: %', NEW.raw_user_meta_data->>'cpf';
    END IF;
    
  END IF;
  
  -- ALWAYS return NEW to allow user creation to succeed
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- If anything fails, log it but don't block user creation
  RAISE NOTICE 'TRIGGER: ❌ Profile linking failed for User ID: %, Error: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the trigger
CREATE TRIGGER after_user_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION link_patient_profile();

-- Step 4: Create proper RLS policies

-- 1. Allow users to read their own profile (including immediately after signup via CPF)
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND user_id IS NULL AND 
         EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND 
                raw_user_meta_data->>'cpf' = profiles.cpf))
    );

-- 2. Allow users to insert their own profile (for new signups without doctor-created profile)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (user_id IS NULL AND role = 'patient')
    );

-- 3. Allow users to update their own profile (for manual updates, not needed for trigger)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 4. Allow doctors to create patient profiles
CREATE POLICY "Doctors can create patient profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- 5. Allow doctors to read patient profiles
CREATE POLICY "Doctors can read patient profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- Step 5: Test trigger function exists
SELECT 'Trigger function created successfully' as status,
       proname as function_name,
       prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'link_patient_profile';

-- Step 6: Test trigger exists
SELECT 'Trigger created successfully' as status,
       tgname as trigger_name,
       tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'after_user_signup';

-- Step 7: Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Final status
SELECT '🎉 TRIGGER AND RLS SETUP COMPLETE' as final_status; 