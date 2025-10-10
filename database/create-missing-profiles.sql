-- =====================================================
-- CREATE MISSING PROFILES FOR EXISTING USERS
-- =====================================================

-- Create profiles for users who don't have one
INSERT INTO profiles (
    user_id,
    email,
    role,
    full_name,
    cpf,
    linked
)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'doctor') as role,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
    au.raw_user_meta_data->>'cpf' as cpf,
    true as linked
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Verify
SELECT
    au.email,
    au.raw_user_meta_data->>'role' as role,
    p.profile_id,
    p.full_name
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id;
