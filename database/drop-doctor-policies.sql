-- =====================================================
-- DROP RECURSIVE DOCTOR POLICIES
-- =====================================================

-- These policies cause infinite recursion by checking role
DROP POLICY IF EXISTS "Doctors can create patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can update patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can delete patient profiles" ON profiles;

-- Verify remaining policies
SELECT
    policyname,
    cmd,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'profiles';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Recursive doctor policies removed!';
    RAISE NOTICE 'Only simple, non-recursive policies remain.';
    RAISE NOTICE '========================================';
END $$;
