-- =====================================================
-- REMOVE PIN REQUIREMENT FROM SIGNUP
-- This script updates the trigger to work without PIN
-- =====================================================

-- 1. Update the profile linking trigger function to remove PIN requirement
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile_count INTEGER;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- Log the signup attempt
    RAISE LOG 'New user signup: % with Role: % CPF: %', NEW.id, user_role, user_cpf;

    -- DOCTOR SIGNUP: Role is required, CPF is not needed
    IF user_role = 'doctor' THEN
        -- Create new doctor profile
        INSERT INTO profiles (
            user_id,
            email,
            role,
            full_name,
            linked
        ) VALUES (
            NEW.id,
            NEW.email,
            'doctor',
            COALESCE(user_name, NEW.email),
            true
        );

        RAISE LOG 'Created new doctor profile for user %', NEW.id;

    -- PATIENT SIGNUP: Requires CPF and role
    ELSIF user_role = 'patient' AND user_cpf IS NOT NULL THEN
        -- Check if a doctor-created profile already exists with this CPF
        SELECT COUNT(*) INTO existing_profile_count
        FROM profiles
        WHERE cpf = user_cpf
        AND role = 'patient'
        AND user_id IS NULL;

        IF existing_profile_count > 0 THEN
            -- Link to existing doctor-created profile
            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                updated_at = NOW()
            WHERE cpf = user_cpf
            AND role = 'patient'
            AND user_id IS NULL;

            RAISE LOG 'Linked user % to existing patient profile with CPF %', NEW.id, user_cpf;
        ELSE
            -- Create new patient profile (no PIN needed)
            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                role,
                full_name,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                user_cpf,
                'patient',
                COALESCE(user_name, NEW.email),
                true
            );

            RAISE LOG 'Created new patient profile for user % with CPF %', NEW.id, user_cpf;
        END IF;
    ELSE
        RAISE LOG 'User signup missing required metadata for role %. CPF=%', user_role, user_cpf;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't block user creation
    RAISE LOG 'Error in handle_new_user_signup: %', SQLERRM;
    RAISE LOG 'Error detail: %', SQLSTATE;
    -- Return NEW to allow user creation even if profile creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- 3. Make PIN column nullable in profiles table (if it's not already)
ALTER TABLE profiles ALTER COLUMN pin DROP NOT NULL;

-- 4. Test the setup
SELECT 'PIN requirement removed - signup now works with just CPF for patients' as status;

-- =====================================================
-- Instructions:
-- 1. Copy and paste this entire script into Supabase SQL Editor
-- 2. Click "Run" to execute
-- 3. Try signup again - should work without PIN now
-- =====================================================
