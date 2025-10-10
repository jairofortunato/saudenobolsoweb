-- =====================================================
-- DEBUG: Check what's causing the signup failure
-- =====================================================

-- 1. Check if there are any profiles with the email you're trying to use
SELECT
    profile_id,
    user_id,
    email,
    cpf,
    role,
    full_name,
    linked
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE'; -- Replace with the email you're trying to signup with

-- 2. Check for any duplicate CPF issues
SELECT
    cpf,
    COUNT(*) as count,
    array_agg(email) as emails
FROM profiles
WHERE cpf IS NOT NULL
GROUP BY cpf
HAVING COUNT(*) > 1;

-- 3. Check current trigger definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user_signup';

-- 4. Check if the trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5. Test the trigger manually (this will show you the exact error)
-- Uncomment and replace with test values:
/*
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
BEGIN
    -- Simulate what happens during signup
    BEGIN
        -- Try inserting a profile as the trigger would
        INSERT INTO profiles (
            user_id,
            email,
            role,
            full_name,
            cpf,
            pin,
            linked
        ) VALUES (
            test_user_id,
            'test@example.com', -- Your test email
            'doctor',
            'Test Doctor',
            NULL, -- No CPF for doctor
            NULL, -- No PIN
            true
        );

        RAISE NOTICE '✅ Test insert succeeded! Trigger should work.';

        -- Clean up
        DELETE FROM profiles WHERE user_id = test_user_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
END $$;
*/
