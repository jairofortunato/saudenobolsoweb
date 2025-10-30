-- =====================================================
-- EMERGENCY FIX - Remove Infinite Recursion in RLS
-- =====================================================

-- Drop ALL policies causing recursion
DROP POLICY IF EXISTS "Service role can bypass RLS" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Create simple, non-recursive policies
-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Service role has full access (for triggers)
CREATE POLICY "Service role full access"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Authenticated users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS policies fixed!';
    RAISE NOTICE 'Infinite recursion removed.';
    RAISE NOTICE '========================================';
END $$;
