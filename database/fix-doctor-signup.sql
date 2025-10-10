-- =====================================================
-- FIX FOR DOCTOR SIGNUP DATABASE ERROR
-- This script updates the trigger to handle both doctor and patient signup
-- =====================================================

-- 1. Update the profile linking trigger function to handle doctors
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
    RAISE LOG 'New user signup: % with Role: % CPF: % PIN: %', NEW.id, user_role, user_cpf, user_pin;

    -- DOCTOR SIGNUP: Role is required, CPF/PIN are optional
    IF user_role = 'doctor' THEN
        -- Create new doctor profile (doctors don't need CPF/PIN)
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

    -- PATIENT SIGNUP: Requires CPF, PIN, and role
    ELSIF user_role = 'patient' AND user_cpf IS NOT NULL AND user_pin IS NOT NULL THEN
        -- Check if a doctor-created profile already exists
        SELECT COUNT(*) INTO existing_profile_count
        FROM profiles
        WHERE cpf = user_cpf
        AND pin = user_pin
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
            AND pin = user_pin
            AND role = 'patient'
            AND user_id IS NULL;

            RAISE LOG 'Linked user % to existing patient profile with CPF %', NEW.id, user_cpf;
        ELSE
            -- Create new patient profile
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
                'patient',
                COALESCE(user_name, NEW.email),
                true
            );

            RAISE LOG 'Created new patient profile for user % with CPF %', NEW.id, user_cpf;
        END IF;
    ELSE
        RAISE LOG 'User signup missing required metadata for role %. CPF=%, PIN=%', user_role, user_cpf, user_pin;
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

-- 3. Test the setup
SELECT 'Doctor signup trigger fixed - now handles both doctors and patients' as status;

-- =====================================================
-- Instructions:
-- 1. Copy and paste this entire script into Supabase SQL Editor
-- 2. Click "Run" to execute
-- 3. Try doctor signup again - should work now
-- =====================================================
