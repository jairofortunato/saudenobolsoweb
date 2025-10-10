-- =====================================================
-- COMPLETE FIX WITH DETAILED LOGGING
-- This will help us see what's failing
-- =====================================================

-- 1. Make CPF and PIN nullable
ALTER TABLE profiles ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN pin DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop and recreate CPF unique constraint (only for non-NULL values)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON profiles(cpf) WHERE cpf IS NOT NULL;

-- 3. Drop and recreate email unique constraint (only for non-NULL values)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- 4. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 5. Create simplified trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
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

    RAISE LOG 'NEW USER SIGNUP - ID: %, Email: %, Role: %, CPF: %',
        NEW.id, NEW.email, COALESCE(user_role, 'NULL'), COALESCE(user_cpf, 'NULL');

    -- DOCTOR SIGNUP (no CPF required)
    IF user_role = 'doctor' THEN
        RAISE LOG 'Creating DOCTOR profile...';

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
            user_cpf, -- NULL is OK
            NULL, -- PIN not needed
            true
        );

        RAISE LOG 'Doctor profile created successfully';
        RETURN NEW;
    END IF;

    -- PATIENT SIGNUP (CPF required)
    IF user_role = 'patient' THEN
        RAISE LOG 'Creating PATIENT profile...';

        IF user_cpf IS NULL OR user_cpf = '' THEN
            RAISE WARNING 'Patient signup missing CPF - profile creation skipped';
            RETURN NEW;
        END IF;

        -- Check for existing doctor-created profile
        SELECT * INTO existing_profile
        FROM profiles
        WHERE cpf = user_cpf
        AND role = 'patient'
        AND user_id IS NULL
        LIMIT 1;

        IF FOUND THEN
            RAISE LOG 'Linking to existing doctor-created profile...';

            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                full_name = COALESCE(user_name, existing_profile.full_name),
                updated_at = NOW()
            WHERE profile_id = existing_profile.profile_id;

            RAISE LOG 'Patient profile linked successfully';
        ELSE
            RAISE LOG 'Creating new patient profile...';

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
            );

            RAISE LOG 'Patient profile created successfully';
        END IF;

        RETURN NEW;
    END IF;

    -- Unknown role or missing data
    RAISE WARNING 'Signup missing role or invalid role: %', COALESCE(user_role, 'NULL');
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'ERROR in handle_new_user_signup: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE LOG 'User: %, Email: %, Role: %', NEW.id, NEW.email, user_role;
    -- Return NEW to allow auth.users record to be created
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- 7. Verify setup
SELECT 'Setup complete! Try signup again.' AS status;
