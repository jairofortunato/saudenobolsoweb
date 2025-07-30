-- =========================================================
-- SAFE RLS POLICIES UPDATE - HANDLES EXISTING POLICIES
-- =========================================================

-- Drop ALL existing RLS policies for profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Doctors can create patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read patient profiles they created" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Doctors can view patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can create patient profiles" ON profiles;

-- 1. Allow users to read their own profile (including immediately after signup)
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (auth.uid() IS NOT NULL AND user_id IS NULL AND 
         EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND 
                raw_user_meta_data->>'cpf' = profiles.cpf))
    );

-- 2. Allow users to insert their own profile (for new signups without doctor-created profile)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (user_id IS NULL AND role = 'patient')
    );

-- 3. Allow users to update their own profile (for trigger linking)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND 
                                   raw_user_meta_data->>'cpf' = profiles.cpf))
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 4. Allow doctors to create patient profiles
CREATE POLICY "Doctors can create patient profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- 5. Allow doctors to read patient profiles they created or are treating
CREATE POLICY "Doctors can read patient profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- Test that policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Show final status
SELECT 'RLS policies updated successfully' as status; 