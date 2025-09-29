-- =====================================================
-- SIMPLE FIX: DISABLE TRIGGER AND LET APP HANDLE PROFILES
-- This removes the problematic trigger and lets the app handle profile creation
-- =====================================================

-- 1. Remove the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_signup();

-- 2. Make user_id nullable to support doctor-created profiles
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf_pin ON profiles(cpf, pin);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_linked ON profiles(linked);

SELECT 'Trigger disabled - app will handle profile creation manually' as status;

-- =====================================================
-- This approach is more reliable because:
-- 1. No complex triggers that can fail
-- 2. App has full control over profile creation
-- 3. Better error handling and logging
-- 4. Works with existing RLS policies
-- =====================================================