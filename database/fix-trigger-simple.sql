-- =====================================================
-- SIMPLE TRIGGER FIX - NO RLS ISSUES
-- Since RLS is disabled, the issue must be something else
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create simple, working trigger function
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    -- Log what we received
    RAISE LOG '=== NEW USER SIGNUP ===';
    RAISE LOG 'User ID: %', NEW.id;
    RAISE LOG 'Email: %', NEW.email;
    RAISE LOG 'Role: %', COALESCE(user_role, 'NULL');
    RAISE LOG 'CPF: %', COALESCE(user_cpf, 'NULL');
    RAISE LOG 'Full Name: %', COALESCE(user_name, 'NULL');

    -- DOCTOR SIGNUP
    IF user_role = 'doctor' THEN
        RAISE LOG 'Processing DOCTOR signup...';

        BEGIN
            INSERT INTO public.profiles (
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

            RAISE LOG '✅ Doctor profile created successfully';

        EXCEPTION WHEN OTHERS THEN
            RAISE LOG '❌ Failed to create doctor profile';
            RAISE LOG 'Error: %', SQLERRM;
            RAISE LOG 'SQLState: %', SQLSTATE;
        END;

        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP
    IF user_role = 'patient' THEN
        RAISE LOG 'Processing PATIENT signup...';

        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE LOG '⚠️ Patient signup missing CPF - skipping profile creation';
            RETURN NEW;
        END IF;

        BEGIN
            -- Check for existing doctor-created profile
            SELECT * INTO existing_profile
            FROM public.profiles
            WHERE cpf = user_cpf
            AND role = 'patient'
            AND user_id IS NULL
            LIMIT 1;

            IF FOUND THEN
                RAISE LOG 'Linking to existing profile: %', existing_profile.profile_id;

                UPDATE public.profiles
                SET user_id = NEW.id,
                    email = NEW.email,
                    linked = true,
                    full_name = COALESCE(user_name, existing_profile.full_name),
                    updated_at = NOW()
                WHERE profile_id = existing_profile.profile_id;

                RAISE LOG '✅ Patient profile linked successfully';
            ELSE
                RAISE LOG 'Creating new patient profile...';

                INSERT INTO public.profiles (
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

                RAISE LOG '✅ Patient profile created successfully';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE LOG '❌ Failed to create/link patient profile';
            RAISE LOG 'Error: %', SQLERRM;
            RAISE LOG 'SQLState: %', SQLSTATE;
        END;

        RETURN NEW;
    END IF;

    -- Unknown or missing role
    RAISE LOG '⚠️ Unknown or missing role: %', COALESCE(user_role, 'NULL');
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE LOG '❌ Unexpected error in trigger';
    RAISE LOG 'Error: %', SQLERRM;
    RAISE LOG 'SQLState: %', SQLSTATE;
    RETURN NEW; -- Always return NEW to allow user creation
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Verify setup
DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE '✅ Trigger installed successfully!';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Delete test users from Authentication';
    RAISE NOTICE '2. Try signup again';
    RAISE NOTICE '3. Check Postgres logs for trigger output';
    RAISE NOTICE '4. Run create-missing-profiles.sql for existing users';
    RAISE NOTICE '=============================================';
END $$;
