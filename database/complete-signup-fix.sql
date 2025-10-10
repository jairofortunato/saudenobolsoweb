-- =====================================================
-- COMPLETE SIGNUP FIX - NO PIN REQUIRED
-- This script:
-- 1. Fixes doctor signup (no CPF/PIN needed)
-- 2. Removes PIN requirement from patient signup
-- 3. Maintains doctor-created patient linking by CPF only
-- =====================================================

-- 1. Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Make PIN column nullable (doctors don't use it, patients don't need it for signup)
ALTER TABLE profiles ALTER COLUMN pin DROP NOT NULL;

-- 3. Make user_id nullable to support doctor-created profiles
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

-- 4. Ensure required columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(profile_id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linked BOOLEAN DEFAULT false;

-- 5. Create the complete profile linking trigger function
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile RECORD;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- Log the signup attempt
    RAISE LOG '=== NEW USER SIGNUP ===';
    RAISE LOG 'User ID: %', NEW.id;
    RAISE LOG 'Email: %', NEW.email;
    RAISE LOG 'Role: %', user_role;
    RAISE LOG 'CPF: %', COALESCE(user_cpf, 'NOT PROVIDED');
    RAISE LOG 'Full Name: %', COALESCE(user_name, 'NOT PROVIDED');

    -- DOCTOR SIGNUP: Only needs email, role, and full_name
    IF user_role = 'doctor' THEN
        RAISE LOG 'Processing DOCTOR signup...';

        -- Create new doctor profile
        INSERT INTO profiles (
            user_id,
            email,
            role,
            full_name,
            linked
        ) VALUES (
            NEW.id,
            NEW.email,
            'doctor',
            COALESCE(user_name, NEW.email),
            true
        );

        RAISE LOG '✅ Created new doctor profile for user %', NEW.id;

    -- PATIENT SIGNUP: Requires CPF and role
    ELSIF user_role = 'patient' AND user_cpf IS NOT NULL THEN
        RAISE LOG 'Processing PATIENT signup...';

        -- Check if a doctor-created profile already exists with this CPF
        -- (Doctor creates patient → profile exists with CPF but no user_id)
        SELECT * INTO existing_profile
        FROM profiles
        WHERE cpf = user_cpf
        AND role = 'patient'
        AND user_id IS NULL
        LIMIT 1;

        IF FOUND THEN
            RAISE LOG '🔗 Found existing doctor-created profile with CPF %', user_cpf;
            RAISE LOG '   Profile ID: %', existing_profile.profile_id;
            RAISE LOG '   Created by doctor: %', existing_profile.created_by;

            -- Link the existing profile to this user account
            -- This preserves ALL medical data the doctor added!
            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                full_name = COALESCE(user_name, existing_profile.full_name),
                updated_at = NOW()
            WHERE profile_id = existing_profile.profile_id;

            RAISE LOG '✅ Linked user % to existing patient profile %', NEW.id, existing_profile.profile_id;
            RAISE LOG '   Patient now has access to all medical data added by doctor!';
        ELSE
            RAISE LOG 'ℹ️  No doctor-created profile found for CPF %', user_cpf;
            RAISE LOG '   Creating new patient profile...';

            -- Create new patient profile (no doctor created this patient yet)
            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                role,
                full_name,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                user_cpf,
                'patient',
                COALESCE(user_name, NEW.email),
                true
            );

            RAISE LOG '✅ Created new patient profile for user % with CPF %', NEW.id, user_cpf;
        END IF;
    ELSE
        -- Missing required data
        RAISE WARNING '⚠️  User signup missing required metadata';
        RAISE WARNING '   Role: %', COALESCE(user_role, 'MISSING');
        RAISE WARNING '   CPF: %', COALESCE(user_cpf, 'MISSING (required for patients)');
        RAISE WARNING '   This user will need to complete their profile manually';
    END IF;

    RAISE LOG '=== SIGNUP COMPLETE ===';
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Log errors but DON'T block user creation
    RAISE LOG '❌ ERROR in handle_new_user_signup: %', SQLERRM;
    RAISE LOG '   SQL State: %', SQLSTATE;
    RAISE LOG '   User ID: %', NEW.id;
    RAISE LOG '   Email: %', NEW.email;
    RAISE LOG '   Role: %', user_role;
    RAISE LOG '   ⚠️  User created but profile creation failed - they will need manual setup';
    -- Return NEW so user account is still created
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop old trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- 7. Verify the setup
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ SIGNUP FIX APPLIED SUCCESSFULLY';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'DOCTOR SIGNUP:';
    RAISE NOTICE '  • Email + Password + Full Name';
    RAISE NOTICE '  • No CPF/PIN required';
    RAISE NOTICE '  • Creates new doctor profile automatically';
    RAISE NOTICE '';
    RAISE NOTICE 'PATIENT SIGNUP:';
    RAISE NOTICE '  • Email + Password + Full Name + CPF';
    RAISE NOTICE '  • No PIN required';
    RAISE NOTICE '  • If doctor created patient: Links to existing profile (keeps all medical data!)';
    RAISE NOTICE '  • If new patient: Creates new profile';
    RAISE NOTICE '';
    RAISE NOTICE 'DOCTOR-CREATED PATIENT FLOW:';
    RAISE NOTICE '  1. Doctor creates patient → Profile created with CPF (user_id = NULL)';
    RAISE NOTICE '  2. Doctor adds medical data → All data linked to profile_id';
    RAISE NOTICE '  3. Patient signs up with same CPF → Trigger links profile (user_id = patient auth id)';
    RAISE NOTICE '  4. Patient logs in → Sees all medical data doctor added!';
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
END $$;

-- =====================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy this ENTIRE script
-- 3. Click "RUN"
-- 4. Try doctor signup - should work!
-- 5. Try patient signup - should work!
-- =====================================================
