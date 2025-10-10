-- =====================================================
-- DEBUG VERSION - SOFT FAIL TO SEE THE ERROR
-- This allows signup to succeed even if profile creation fails
-- =====================================================

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

    -- Log the signup attempt with ALL metadata
    RAISE WARNING '========================================';
    RAISE WARNING 'NEW USER SIGNUP DEBUG';
    RAISE WARNING '========================================';
    RAISE WARNING 'User ID: %', NEW.id;
    RAISE WARNING 'Email: %', NEW.email;
    RAISE WARNING 'Role: %', COALESCE(user_role, 'NULL');
    RAISE WARNING 'CPF: %', COALESCE(user_cpf, 'NULL');
    RAISE WARNING 'Full Name: %', COALESCE(user_name, 'NULL');
    RAISE WARNING 'Full Metadata: %', NEW.raw_user_meta_data;

    -- DOCTOR SIGNUP (no CPF required)
    IF user_role = 'doctor' THEN
        RAISE WARNING 'Processing DOCTOR signup...';

        BEGIN
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
                user_cpf,
                NULL,
                true
            ) RETURNING profile_id INTO v_profile_id;

            RAISE WARNING '✅ Doctor profile created successfully: %', v_profile_id;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ DOCTOR PROFILE CREATION FAILED';
            RAISE WARNING 'Error: %', SQLERRM;
            RAISE WARNING 'SQLState: %', SQLSTATE;
            RAISE WARNING 'Detail: %', COALESCE(PG_EXCEPTION_DETAIL, 'No detail');
            RAISE WARNING 'Hint: %', COALESCE(PG_EXCEPTION_HINT, 'No hint');
            -- Don't block signup - return NEW to create auth user anyway
        END;

        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP (CPF required)
    IF user_role = 'patient' THEN
        RAISE WARNING 'Processing PATIENT signup...';

        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE WARNING '❌ Patient signup missing CPF';
            RETURN NEW; -- Allow auth user creation
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
                RAISE WARNING 'Linking to existing profile: %', existing_profile.profile_id;

                UPDATE profiles
                SET user_id = NEW.id,
                    email = NEW.email,
                    linked = true,
                    full_name = COALESCE(user_name, existing_profile.full_name),
                    updated_at = NOW()
                WHERE profile_id = existing_profile.profile_id;

                RAISE WARNING '✅ Patient profile linked successfully';
            ELSE
                RAISE WARNING 'Creating new patient profile...';

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
                    NULL,
                    true
                ) RETURNING profile_id INTO v_profile_id;

                RAISE WARNING '✅ Patient profile created: %', v_profile_id;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ PATIENT PROFILE CREATION FAILED';
            RAISE WARNING 'Error: %', SQLERRM;
            RAISE WARNING 'SQLState: %', SQLSTATE;
            RAISE WARNING 'Detail: %', COALESCE(PG_EXCEPTION_DETAIL, 'No detail');
            RAISE WARNING 'Hint: %', COALESCE(PG_EXCEPTION_HINT, 'No hint');
            -- Don't block signup
        END;

        RETURN NEW;
    END IF;

    -- Missing or invalid role
    RAISE WARNING '❌ Invalid or missing role: %', COALESCE(user_role, 'NULL');
    RAISE WARNING 'Allowing auth user creation anyway for debugging';
    RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
SELECT 'Debug trigger installed. Try signup again and check Postgres logs for detailed error messages.' AS status;
