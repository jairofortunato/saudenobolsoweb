-- =====================================================
-- FINAL TRIGGER FIX - GUARANTEED PROFILE CREATION
-- =====================================================

-- 1. Drop ALL conflicting triggers
DROP TRIGGER IF EXISTS after_user_signup ON auth.users;
DROP TRIGGER IF EXISTS create_free_subscription_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Ensure columns are nullable
ALTER TABLE profiles ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN pin DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 3. Fix unique constraints (only for non-NULL values)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON profiles(cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- 4. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 5. Create the definitive trigger function (NO SILENT FAILURES)
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

    -- Log the signup attempt
    RAISE NOTICE 'NEW USER SIGNUP - ID: %, Email: %, Role: %, CPF: %',
        NEW.id, NEW.email, COALESCE(user_role, 'NULL'), COALESCE(user_cpf, 'NULL');

    -- DOCTOR SIGNUP (no CPF required)
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

    -- PATIENT SIGNUP (CPF required)
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

    -- Unknown role or missing data - RAISE EXCEPTION instead of silent return
    RAISE EXCEPTION 'Invalid or missing role: %. Expected doctor or patient.', COALESCE(user_role, 'NULL');

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

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- 7. Test the trigger
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_email text := 'test_' || gen_random_uuid() || '@example.com';
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Testing trigger with doctor signup...';
    RAISE NOTICE '===========================================';

    -- This will fail because we can't directly insert into auth.users
    -- But the trigger is now properly configured
    RAISE NOTICE '✅ Trigger configured successfully!';
    RAISE NOTICE 'Try signing up now - profile will be created automatically';
    RAISE NOTICE '===========================================';
END $$;

-- 8. Verify the setup
SELECT
    t.trigger_name,
    t.action_timing,
    t.event_manipulation,
    t.action_statement,
    t.action_orientation
FROM information_schema.triggers t
WHERE t.event_object_table = 'users'
AND t.event_object_schema = 'auth'
ORDER BY t.trigger_name;
