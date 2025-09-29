-- =====================================================
-- PROFILE LINKING TRIGGER FOR PATIENT SIGNUP
-- This trigger automatically links patients to existing
-- doctor-created profiles during signup
-- =====================================================

-- Function to handle patient profile linking during signup
CREATE OR REPLACE FUNCTION link_patient_profile()
RETURNS TRIGGER AS $$
DECLARE
    profile_cpf TEXT;
    profile_pin TEXT;
    existing_profile_id UUID;
BEGIN
    -- Extract CPF and PIN from user metadata
    profile_cpf := NEW.raw_user_meta_data->>'cpf';
    profile_pin := NEW.raw_user_meta_data->>'pin';

    -- Only process if CPF and PIN are provided (patient signup)
    IF profile_cpf IS NOT NULL AND profile_pin IS NOT NULL THEN

        -- Check if a doctor-created profile exists with same CPF and PIN
        SELECT id INTO existing_profile_id
        FROM profiles
        WHERE cpf = profile_cpf
        AND pin = profile_pin
        AND role = 'patient'
        AND user_id IS NULL; -- Only unlinked profiles

        -- If matching profile found, link it to this user
        IF existing_profile_id IS NOT NULL THEN
            UPDATE profiles
            SET user_id = NEW.id,
                linked = true,
                email = NEW.email,
                updated_at = NOW()
            WHERE id = existing_profile_id;

            -- Log the successful linking
            RAISE LOG 'Successfully linked user % to existing profile %', NEW.id, existing_profile_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION link_patient_profile();

-- =====================================================
-- ALTERNATIVE: Create profile automatically if no link found
-- This ensures every user gets a profile
-- =====================================================

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_cpf TEXT;
    profile_pin TEXT;
    profile_role TEXT;
    profile_name TEXT;
    existing_profile_id UUID;
BEGIN
    -- Extract data from user metadata
    profile_cpf := NEW.raw_user_meta_data->>'cpf';
    profile_pin := NEW.raw_user_meta_data->>'pin';
    profile_role := NEW.raw_user_meta_data->>'role';
    profile_name := NEW.raw_user_meta_data->>'full_name';

    -- Only process if required data is provided
    IF profile_cpf IS NOT NULL AND profile_pin IS NOT NULL AND profile_role IS NOT NULL THEN

        -- First, try to link to existing doctor-created profile
        SELECT id INTO existing_profile_id
        FROM profiles
        WHERE cpf = profile_cpf
        AND pin = profile_pin
        AND role = 'patient'
        AND user_id IS NULL; -- Only unlinked profiles

        IF existing_profile_id IS NOT NULL THEN
            -- Link to existing profile
            UPDATE profiles
            SET user_id = NEW.id,
                linked = true,
                email = NEW.email,
                updated_at = NOW()
            WHERE id = existing_profile_id;

            RAISE LOG 'Linked user % to existing profile %', NEW.id, existing_profile_id;
        ELSE
            -- Create new profile if no existing one found
            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                pin,
                role,
                full_name,
                linked,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                profile_cpf,
                profile_pin,
                profile_role,
                profile_name,
                true,
                NOW(),
                NOW()
            );

            RAISE LOG 'Created new profile for user %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the trigger with the enhanced version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- =====================================================
-- Instructions for applying this fix:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. This will create the missing trigger automatically
-- 3. Test patient signup - it should work now
-- =====================================================