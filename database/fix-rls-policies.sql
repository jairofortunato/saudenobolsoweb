-- Fix RLS policies for profile creation during signup
-- This script should be run in your Supabase SQL editor

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a more permissive policy for signup
-- This allows INSERT for authenticated users where the user_id matches their auth.uid()
CREATE POLICY "Enable profile creation during signup" ON profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
    );

-- Alternative: If the above still doesn't work, use this more permissive policy
-- Uncomment the lines below if the first policy doesn't work

-- DROP POLICY IF EXISTS "Enable profile creation during signup" ON profiles;
-- CREATE POLICY "Allow authenticated users to create profiles" ON profiles
--     FOR INSERT 
--     WITH CHECK (auth.uid() IS NOT NULL);

-- You can also temporarily disable RLS on profiles table for testing:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable it later:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 