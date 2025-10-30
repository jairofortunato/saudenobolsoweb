-- =====================================================
-- OAUTH SUPPORT - Handle Google/Social Login Users
-- =====================================================
-- This update allows OAuth users to sign in without CPF/PIN
-- They are defaulted to 'doctor' role and can update their profile later
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update trigger function to handle OAuth users
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile RECORD;
    v_profile_id UUID;
    is_oauth_user BOOLEAN;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- Check if this is an OAuth user (no role specified)
    is_oauth_user := (user_role IS NULL OR user_role = '');

    -- Log the signup attempt
    RAISE NOTICE 'NEW USER SIGNUP - ID: %, Email: %, Role: %, CPF: %, OAuth: %',
        NEW.id, NEW.email, COALESCE(user_role, 'NULL'), COALESCE(user_cpf, 'NULL'), is_oauth_user;

    -- OAUTH USERS (Google, etc.) - Default to doctor role
    IF is_oauth_user THEN
        RAISE NOTICE 'Creating OAUTH USER profile (defaulting to doctor)...';

        INSERT INTO profiles (
            user_id,
            email,
            role,
            full_name,
            cpf,
            pin,
            linked
        ) VALUES (
            NEW.id,
            NEW.email,
            'doctor', -- Default OAuth users to doctor
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                split_part(NEW.email, '@', 1)
            ),
            NULL, -- CPF not required for OAuth
            NULL, -- PIN not required for OAuth
            true
        ) RETURNING profile_id INTO v_profile_id;

        RAISE NOTICE '✅ OAuth user profile created: %', v_profile_id;
        RETURN NEW;
    END IF;

    -- DOCTOR SIGNUP (traditional email/password)
    IF user_role = 'doctor' THEN
        RAISE NOTICE 'Creating DOCTOR profile...';

        INSERT INTO profiles (
            user_id,
            email,
            role,
            full_name,
            cpf,
            pin,
            linked
        ) VALUES (
            NEW.id,
            NEW.email,
            'doctor',
            COALESCE(user_name, split_part(NEW.email, '@', 1)),
            user_cpf, -- Can be NULL
            NULL, -- PIN not needed
            true
        ) RETURNING profile_id INTO v_profile_id;

        RAISE NOTICE '✅ Doctor profile created: %', v_profile_id;
        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP (traditional email/password)
    IF user_role = 'patient' THEN
        RAISE NOTICE 'Creating PATIENT profile...';

        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE EXCEPTION 'Patient signup requires CPF';
        END IF;

        -- Check for existing doctor-created profile
        SELECT * INTO existing_profile
        FROM profiles
        WHERE cpf = user_cpf
        AND role = 'patient'
        AND user_id IS NULL
        LIMIT 1;

        IF FOUND THEN
            RAISE NOTICE 'Linking to existing doctor-created profile: %', existing_profile.profile_id;

            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                full_name = COALESCE(user_name, existing_profile.full_name),
                updated_at = NOW()
            WHERE profile_id = existing_profile.profile_id;

            RAISE NOTICE '✅ Patient profile linked successfully';
        ELSE
            RAISE NOTICE 'Creating new patient profile...';

            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                role,
                full_name,
                pin,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                user_cpf,
                'patient',
                COALESCE(user_name, split_part(NEW.email, '@', 1)),
                NULL, -- PIN not needed for signup
                true
            ) RETURNING profile_id INTO v_profile_id;

            RAISE NOTICE '✅ Patient profile created: %', v_profile_id;
        END IF;

        RETURN NEW;
    END IF;

    -- Unknown role - this shouldn't happen anymore
    RAISE EXCEPTION 'Invalid role: %. Expected doctor or patient.', user_role;

EXCEPTION WHEN OTHERS THEN
    -- Log the error with full details
    RAISE NOTICE '❌ ERROR in handle_new_user_signup: %', SQLERRM;
    RAISE NOTICE '   SQLSTATE: %', SQLSTATE;
    RAISE NOTICE '   User ID: %', NEW.id;
    RAISE NOTICE '   Email: %', NEW.email;
    RAISE NOTICE '   Role: %', COALESCE(user_role, 'NULL');
    RAISE NOTICE '   CPF: %', COALESCE(user_cpf, 'NULL');

    -- RE-RAISE the exception so signup fails visibly
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Verify the trigger was created
DO $$
BEGIN
    RAISE NOTICE '✅ OAuth support enabled! Google sign-in users will be created as doctors.';
END $$;
