-- =====================================================
-- COMPLETE RLS FIX FOR OAUTH
-- =====================================================

-- 1. Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Add RLS policy to allow trigger to insert profiles
-- First, check if RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Create policy allowing service role (triggers run as this) to insert
CREATE POLICY "Service role can bypass RLS"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create their own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR role = 'doctor');

-- 3. Recreate trigger function (simplified and robust)
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
    v_profile_id UUID;
BEGIN
    -- Get metadata
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'doctor');
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'User'
    );

    RAISE NOTICE 'Signup trigger - User: %, Email: %, Role: %', NEW.id, NEW.email, user_role;

    -- Insert profile (RLS bypassed by service_role policy)
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
        NEW.raw_user_meta_data->>'cpf',
        NEW.raw_user_meta_data->>'pin',
        true
    ) RETURNING profile_id INTO v_profile_id;

    RAISE NOTICE 'Profile created: %', v_profile_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed: %', SQLERRM;
    RAISE; -- Re-raise to fail signup
END;
$$;

-- 4. Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- 5. Verify
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ OAuth signup fixed!';
    RAISE NOTICE 'RLS policies updated to allow trigger.';
    RAISE NOTICE '===========================================';
END $$;
