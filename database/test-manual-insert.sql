-- =====================================================
-- TEST MANUAL PROFILE INSERT
-- Let's see what constraint is actually failing
-- =====================================================

-- Test 1: Try inserting a doctor profile manually with the data your signup sends
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_email text := 'test@example.com';
    test_cpf text := '12345678901'; -- Your CPF from signup
    test_name text := 'Test Doctor';
BEGIN
    RAISE NOTICE 'Testing manual insert with:';
    RAISE NOTICE 'user_id: %', test_user_id;
    RAISE NOTICE 'email: %', test_email;
    RAISE NOTICE 'cpf: %', test_cpf;
    RAISE NOTICE 'role: doctor';
    RAISE NOTICE 'full_name: %', test_name;

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
            test_name,
            test_cpf,
            NULL,
            true
        );

        RAISE NOTICE '✅ SUCCESS! Profile inserted successfully!';

        -- Clean up
        DELETE FROM profiles WHERE user_id = test_user_id;
        RAISE NOTICE '✅ Test profile deleted';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT FAILED!';
        RAISE NOTICE 'Error: %', SQLERRM;
        RAISE NOTICE 'SQLState: %', SQLSTATE;
        RAISE NOTICE 'Detail: %', COALESCE(PG_EXCEPTION_DETAIL, 'No detail');
        RAISE NOTICE 'Hint: %', COALESCE(PG_EXCEPTION_HINT, 'No hint');
    END;
END $$;

-- Test 2: Check if there's a constraint we're missing
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass;

-- Test 3: Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;
