-- =====================================================
-- FIX CPF CONSTRAINT FOR DOCTOR SIGNUP
-- Makes CPF nullable so doctors can signup without it
-- =====================================================

-- Make CPF nullable (doctors don't need CPF)
ALTER TABLE profiles ALTER COLUMN cpf DROP NOT NULL;

-- Drop the unique constraint on CPF and recreate as partial unique
-- (only enforce uniqueness for non-NULL CPF values)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
CREATE UNIQUE INDEX profiles_cpf_unique ON profiles(cpf) WHERE cpf IS NOT NULL;

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ CPF CONSTRAINT FIX APPLIED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'CPF is now nullable - doctors can signup without CPF';
    RAISE NOTICE 'CPF uniqueness is still enforced when provided';
    RAISE NOTICE '';
    RAISE NOTICE 'Try doctor signup again - it should work now!';
    RAISE NOTICE '===========================================';
END $$;
