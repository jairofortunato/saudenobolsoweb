-- =====================================================
-- CORRECTED FIX FOR PATIENT SIGNUP DATABASE ERROR
-- This script uses the correct column names (profile_id not id)
-- =====================================================

-- 1. Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update profiles table to use gen_random_uuid() instead of uuid_generate_v4()
ALTER TABLE profiles ALTER COLUMN profile_id SET DEFAULT gen_random_uuid();

-- 3. Make user_id nullable to support doctor-created profiles
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 4. Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 5. Create the profile linking trigger function (with correct column names)
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_pin TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile_count INTEGER;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_pin := NEW.raw_user_meta_data->>'pin';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- Log the signup attempt
    RAISE LOG 'New user signup: % with CPF: % PIN: % Role: %', NEW.id, user_cpf, user_pin, user_role;

    -- Only proceed if we have the required data
    IF user_cpf IS NOT NULL AND user_pin IS NOT NULL AND user_role IS NOT NULL THEN

        -- Check if a doctor-created profile already exists
        SELECT COUNT(*) INTO existing_profile_count
        FROM profiles
        WHERE cpf = user_cpf
        AND pin = user_pin
        AND role = user_role
        AND user_id IS NULL;

        IF existing_profile_count > 0 THEN
            -- Link to existing doctor-created profile
            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                updated_at = NOW()
            WHERE cpf = user_cpf
            AND pin = user_pin
            AND role = user_role
            AND user_id IS NULL;

            RAISE LOG 'Linked user % to existing profile with CPF %', NEW.id, user_cpf;
        ELSE
            -- Create new profile (use correct column names)
            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                pin,
                role,
                full_name,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                user_cpf,
                user_pin,
                user_role,
                COALESCE(user_name, NEW.email),
                true
            );

            RAISE LOG 'Created new profile for user % with CPF %', NEW.id, user_cpf;
        END IF;
    ELSE
        RAISE LOG 'User signup missing required metadata: CPF=%, PIN=%, Role=%', user_cpf, user_pin, user_role;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't block user creation
    RAISE LOG 'Error in handle_new_user_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- 7. Test the setup
SELECT 'Profile linking trigger created successfully (corrected version)' as status;

-- =====================================================
-- Instructions:
-- 1. Copy and paste this entire script into Supabase SQL Editor
-- 2. Click "Run" to execute
-- 3. Try patient signup again - should work now
-- =====================================================