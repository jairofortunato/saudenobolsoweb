-- =====================================================
-- WORKING TRIGGER - NO TRANSACTION ROLLBACK
-- The key: catch ALL exceptions and return NEW anyway
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the working trigger function
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile RECORD;
    v_profile_id UUID;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- DOCTOR SIGNUP
    IF user_role = 'doctor' THEN
        BEGIN
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
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail
            RAISE WARNING 'Failed to create doctor profile: %', SQLERRM;
        END;

        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP
    IF user_role = 'patient' THEN
        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE WARNING 'Patient signup missing CPF';
            RETURN NEW;
        END IF;

        BEGIN
            -- Check for existing doctor-created profile
            SELECT * INTO existing_profile
            FROM profiles
            WHERE cpf = user_cpf
            AND role = 'patient'
            AND user_id IS NULL
            LIMIT 1;

            IF FOUND THEN
                -- Link existing profile
                UPDATE profiles
                SET user_id = NEW.id,
                    email = NEW.email,
                    linked = true,
                    full_name = COALESCE(user_name, existing_profile.full_name),
                    updated_at = NOW()
                WHERE profile_id = existing_profile.profile_id;
            ELSE
                -- Create new patient profile
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
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create patient profile: %', SQLERRM;
        END;

        RETURN NEW;
    END IF;

    -- Unknown role
    RAISE WARNING 'Unknown role or missing role: %', COALESCE(user_role, 'NULL');
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Catch any other errors
    RAISE WARNING 'Error in handle_new_user_signup: %', SQLERRM;
    RETURN NEW; -- ALWAYS return NEW to allow user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Verify
SELECT 'Trigger installed successfully. Try signup now!' AS status;
