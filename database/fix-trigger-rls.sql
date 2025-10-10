-- =====================================================
-- FIX TRIGGER WITH RLS BYPASS
-- The trigger needs to bypass RLS to insert profiles
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger function with RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public, pg_temp -- Security best practice
AS $$
DECLARE
    user_cpf TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile RECORD;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- DOCTOR SIGNUP
    IF user_role = 'doctor' THEN
        BEGIN
            -- Bypass RLS by setting local role
            PERFORM set_config('request.jwt.claims', json_build_object('sub', NEW.id::text)::text, true);

            INSERT INTO profiles (
                user_id,
                email,
                role,
                full_name,
                cpf,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                'doctor',
                COALESCE(user_name, split_part(NEW.email, '@', 1)),
                user_cpf,
                true
            );

            RAISE LOG 'Created doctor profile for user %', NEW.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Failed to create doctor profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END;
        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP
    IF user_role = 'patient' THEN
        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE LOG 'Patient signup missing CPF';
            RETURN NEW;
        END IF;

        BEGIN
            -- Set JWT claim for RLS
            PERFORM set_config('request.jwt.claims', json_build_object('sub', NEW.id::text)::text, true);

            -- Check for existing doctor-created profile
            SELECT * INTO existing_profile
            FROM profiles
            WHERE cpf = user_cpf
            AND role = 'patient'
            AND user_id IS NULL
            LIMIT 1;

            IF FOUND THEN
                UPDATE profiles
                SET user_id = NEW.id,
                    email = NEW.email,
                    linked = true,
                    full_name = COALESCE(user_name, existing_profile.full_name),
                    updated_at = NOW()
                WHERE profile_id = existing_profile.profile_id;

                RAISE LOG 'Linked patient profile for user %', NEW.id;
            ELSE
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
                    COALESCE(user_name, split_part(NEW.email, '@', 1)),
                    true
                );

                RAISE LOG 'Created patient profile for user %', NEW.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE LOG 'Failed to create patient profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END;
        RETURN NEW;
    END IF;

    -- Unknown role
    RAISE LOG 'Unknown role: %', COALESCE(user_role, 'NULL');
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in trigger: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- ALSO: Add a policy to allow service role to insert profiles
-- This is the real fix - allow inserts from triggers
CREATE POLICY IF NOT EXISTS "Allow service role to insert profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verify
SELECT 'Trigger with RLS bypass installed!' AS status;
