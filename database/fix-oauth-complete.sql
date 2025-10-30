-- =====================================================
-- COMPLETE OAUTH FIX - Run this entire script
-- =====================================================

-- 1. Make sure all necessary columns are nullable
ALTER TABLE profiles ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN pin DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop and recreate unique constraints to allow NULLs
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS profiles_cpf_unique;
DROP INDEX IF EXISTS profiles_email_unique;

-- Create partial unique indexes (only for non-NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON profiles(cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- 3. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 4. Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Create simplified trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    v_profile_id UUID;
BEGIN
    -- Get metadata with fallbacks
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'doctor');
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Log the attempt
    RAISE NOTICE 'Creating profile for %, email: %, role: %', NEW.id, NEW.email, user_role;

    -- Create profile (simple version, works for both OAuth and traditional signup)
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
            user_role,
            user_name,
            NEW.raw_user_meta_data->>'cpf', -- Can be NULL for OAuth
            NULL, -- PIN not needed for OAuth or doctors
            true
        ) RETURNING profile_id INTO v_profile_id;

        RAISE NOTICE '✅ Profile created successfully: %', v_profile_id;

    EXCEPTION WHEN unique_violation THEN
        -- If profile already exists (shouldn't happen, but handle it)
        RAISE NOTICE '⚠️ Profile already exists for user %', NEW.id;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log detailed error
        RAISE NOTICE '❌ Error creating profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        RAISE NOTICE '   User ID: %', NEW.id;
        RAISE NOTICE '   Email: %', NEW.email;
        RAISE NOTICE '   Role: %', user_role;
        RAISE NOTICE '   Full Name: %', user_name;
        -- Re-raise to fail the signup
        RAISE;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- 7. Verify setup
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ OAuth support configured successfully!';
    RAISE NOTICE 'Google sign-in users will be created as doctors.';
    RAISE NOTICE '===========================================';
END $$;
