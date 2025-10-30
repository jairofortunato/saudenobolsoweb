-- =====================================================
-- FIX RLS BLOCKING TRIGGER - This is the real fix!
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger function with RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
SECURITY DEFINER -- Run as function owner (postgres)
SET search_path = public, auth -- Ensure correct schema search
AS $$
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

    -- DISABLE RLS for this operation
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

    -- Create profile
    INSERT INTO public.profiles (
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
        CASE WHEN user_role = 'patient' THEN NEW.raw_user_meta_data->>'pin' ELSE NULL END,
        true
    ) RETURNING profile_id INTO v_profile_id;

    RAISE NOTICE '✅ Profile created successfully: %', v_profile_id;

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log detailed error
    RAISE WARNING '❌ Error creating profile: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE WARNING '   User ID: %', NEW.id;
    RAISE WARNING '   Email: %', NEW.email;
    RAISE WARNING '   Role: %', user_role;
    -- Re-raise to fail the signup visibly
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_signup();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION handle_new_user_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_signup() TO service_role;

-- Verify
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Trigger recreated with RLS bypass!';
    RAISE NOTICE 'Try Google sign-up now.';
    RAISE NOTICE '===========================================';
END $$;
