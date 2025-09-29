-- =====================================================
-- SAUDE NO BOLSO - DATABASE SCHEMA
-- Medical Record Management System
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores user information for both patients and doctors
-- =====================================================
CREATE TABLE profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(14) NOT NULL UNIQUE, -- Format: 000.000.000-00
    pin VARCHAR(6) NOT NULL, -- 6-digit PIN for emergency access
    role VARCHAR(10) NOT NULL CHECK (role IN ('patient', 'doctor')),
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_by UUID REFERENCES profiles(profile_id), -- Doctor who created this patient profile
    linked BOOLEAN DEFAULT false, -- Whether profile is linked to a user account
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MEDICATIONS TABLE
-- Stores medication records for patients
-- =====================================================
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100), -- e.g., "10mg", "2 tablets"
    frequency VARCHAR(100), -- e.g., "2x daily", "Every 8 hours"
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Doctor who added this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ALLERGIES TABLE
-- Stores allergy information for patients
-- =====================================================
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL, -- Allergen name
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
    reaction TEXT, -- Description of allergic reaction
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Doctor who added this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EXAMS TABLE
-- Stores medical exam records
-- =====================================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL, -- Exam name/type
    exam_date DATE NOT NULL,
    result TEXT, -- Exam results
    file_url TEXT, -- URL to uploaded exam file (if any)
    doctor_name VARCHAR(255), -- Doctor who performed/ordered the exam
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Who added this record
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DISEASES TABLE
-- Stores disease/condition records
-- =====================================================
CREATE TABLE diseases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL, -- Disease/condition name
    diagnosed_date DATE,
    is_chronic BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'in_remission')),
    description TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Doctor who added this
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONSULTATIONS TABLE
-- Stores medical consultation records
-- =====================================================
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255), -- Medical specialty
    consultation_date DATE NOT NULL,
    reason TEXT, -- Reason for consultation
    diagnosis TEXT, -- Doctor's diagnosis
    treatment TEXT, -- Prescribed treatment
    follow_up_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id), -- Who added this record
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_cpf ON profiles(cpf);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Medical records indexes (for patient lookups)
CREATE INDEX idx_medications_patient_id ON medications(patient_id);
CREATE INDEX idx_medications_active ON medications(patient_id, is_active);
CREATE INDEX idx_allergies_patient_id ON allergies(patient_id);
CREATE INDEX idx_exams_patient_id ON exams(patient_id);
CREATE INDEX idx_exams_date ON exams(patient_id, exam_date DESC);
CREATE INDEX idx_diseases_patient_id ON diseases(patient_id);
CREATE INDEX idx_diseases_status ON diseases(patient_id, status);
CREATE INDEX idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(patient_id, consultation_date DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Doctors can search for patient profiles (for CPF + PIN search)
CREATE POLICY "Doctors can search patient profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- =====================================================
-- MEDICAL RECORDS POLICIES (medications, allergies, exams, diseases, consultations)
-- =====================================================

-- Patients can read their own medical records
CREATE POLICY "Patients can read own medications" ON medications
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can read own allergies" ON allergies
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can read own exams" ON exams
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can read own diseases" ON diseases
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can read own consultations" ON consultations
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Patients can insert their own medical records
CREATE POLICY "Patients can insert own medications" ON medications
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can insert own allergies" ON allergies
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can insert own exams" ON exams
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can insert own diseases" ON diseases
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can insert own consultations" ON consultations
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Patients can update their own medical records
CREATE POLICY "Patients can update own medications" ON medications
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can update own allergies" ON allergies
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can update own exams" ON exams
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can update own diseases" ON diseases
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can update own consultations" ON consultations
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Patients can delete their own medical records
CREATE POLICY "Patients can delete own medications" ON medications
    FOR DELETE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can delete own allergies" ON allergies
    FOR DELETE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can delete own exams" ON exams
    FOR DELETE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can delete own diseases" ON diseases
    FOR DELETE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Patients can delete own consultations" ON consultations
    FOR DELETE USING (
        patient_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- DOCTOR POLICIES - Access to patient records
-- =====================================================

-- Doctors can read all patient medical records (for emergency access and consultations)
CREATE POLICY "Doctors can read patient medications" ON medications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can read patient allergies" ON allergies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can read patient exams" ON exams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can read patient diseases" ON diseases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can read patient consultations" ON consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- Doctors can insert records for patients
CREATE POLICY "Doctors can insert patient medications" ON medications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can insert patient allergies" ON allergies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can insert patient exams" ON exams
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can insert patient diseases" ON diseases
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

CREATE POLICY "Doctors can insert patient consultations" ON consultations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles doctor_profile
            WHERE doctor_profile.user_id = auth.uid()
            AND doctor_profile.role = 'doctor'
        )
    );

-- =====================================================
-- FUNCTIONS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allergies_updated_at BEFORE UPDATE ON allergies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diseases_updated_at BEFORE UPDATE ON diseases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROFILE LINKING TRIGGER FOR USER SIGNUP
-- Automatically creates or links profiles when users sign up
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    user_cpf TEXT;
    user_pin TEXT;
    user_role TEXT;
    user_name TEXT;
    existing_profile_count INTEGER;
BEGIN
    -- Get user metadata
    user_cpf := NEW.raw_user_meta_data->>'cpf';
    user_pin := NEW.raw_user_meta_data->>'pin';
    user_role := NEW.raw_user_meta_data->>'role';
    user_name := NEW.raw_user_meta_data->>'full_name';

    -- Only proceed if we have the required data
    IF user_cpf IS NOT NULL AND user_pin IS NOT NULL AND user_role IS NOT NULL THEN

        -- Check if a doctor-created profile already exists
        SELECT COUNT(*) INTO existing_profile_count
        FROM profiles
        WHERE cpf = user_cpf
        AND pin = user_pin
        AND role = user_role
        AND user_id IS NULL;

        IF existing_profile_count > 0 THEN
            -- Link to existing doctor-created profile
            UPDATE profiles
            SET user_id = NEW.id,
                email = NEW.email,
                linked = true,
                updated_at = NOW()
            WHERE cpf = user_cpf
            AND pin = user_pin
            AND role = user_role
            AND user_id IS NULL;
        ELSE
            -- Create new profile
            INSERT INTO profiles (
                user_id,
                email,
                cpf,
                pin,
                role,
                full_name,
                linked
            ) VALUES (
                NEW.id,
                NEW.email,
                user_cpf,
                user_pin,
                user_role,
                COALESCE(user_name, NEW.email),
                true
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't block user creation if profile creation fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- =====================================================
-- END OF SCHEMA
-- ===================================================== 