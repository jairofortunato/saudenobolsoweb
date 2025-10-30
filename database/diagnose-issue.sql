-- =====================================================
-- DIAGNOSTIC QUERY - Run this to see what's wrong
-- =====================================================

-- 1. Check if columns are actually nullable now
SELECT
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('cpf', 'pin', 'user_id', 'email', 'full_name', 'role');

-- 2. Check all constraints on profiles table
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass;

-- 3. Test the trigger function manually
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test_oauth_' || gen_random_uuid() || '@gmail.com';
BEGIN
    -- Simulate what happens during OAuth signup
    RAISE NOTICE 'Testing profile creation...';

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
            test_user_id,
            test_email,
            'doctor',
            'Test User',
            NULL,  -- OAuth users don't have CPF
            NULL,  -- OAuth users don't have PIN
            true
        );

        RAISE NOTICE '✅ SUCCESS! Profile creation works fine.';

        -- Clean up test data
        DELETE FROM profiles WHERE user_id = test_user_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
END $$;
