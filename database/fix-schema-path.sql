-- =====================================================
-- FIX SCHEMA PATH ISSUE - THE REAL FIX!
-- =====================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate function with explicit schema reference
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

    RAISE NOTICE 'Creating profile - User: %, Role: %', NEW.email, user_role;

    -- EXPLICITLY reference public.profiles
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
        NEW.raw_user_meta_data->>'pin',
        true
    ) RETURNING profile_id INTO v_profile_id;

    RAISE NOTICE '✅ Profile created: %', v_profile_id;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_signup();

-- Verify
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Schema path fixed!';
    RAISE NOTICE 'Function now explicitly uses public.profiles';
    RAISE NOTICE '========================================';
END $$;
