# Authentication System Documentation - Saúde no Bolso

## Overview

The Saúde no Bolso authentication system is a sophisticated dual-role medical platform that supports both patients and doctors with different access patterns. The system uses Supabase Auth as the foundation with custom profile management and role-based access control.

## System Architecture

### 1. Core Components

#### Authentication Provider (`src/contexts/AuthContext.tsx`)
- Wraps the entire application with authentication state
- Provides auth context to all components
- Manages real-time auth state updates

#### Auth Hook (`hooks/useAuth.ts`)
- Main interface for authentication operations
- Handles signup, signin, signout, and profile management
- Implements background profile fetching for performance
- Manages complex patient profile linking logic

#### Middleware (`src/middleware.ts`)
- Route protection and role-based access control
- Emergency access handling with CPF/PIN combination
- Automatic redirections based on user roles

### 2. Database Schema

#### Profiles Table Structure
```sql
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_by UUID REFERENCES profiles(profile_id),
  linked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Key Fields Explanation
- `profile_id`: Primary identifier for all medical data relationships
- `user_id`: Links to Supabase auth.users (nullable for doctor-created patients)
- `cpf`: Brazilian CPF for patient identification
- `pin`: 6-digit PIN for quick patient access by doctors
- `role`: Either 'patient' or 'doctor'
- `created_by`: Tracks which doctor created the patient profile
- `linked`: Indicates if patient profile is linked to a user account

## Authentication Flows

### 1. Doctor Authentication

#### Standard Login Flow
```typescript
// Doctor signs in with email/password
const result = await signIn({
  email: "doctor@example.com",
  password: "password123"
});

// System automatically:
// 1. Validates credentials
// 2. Fetches doctor profile
// 3. Redirects to /doctor/dashboard
```

#### Doctor Profile Creation
- Doctors must be created by administrators
- Profile includes medical credentials and specializations
- Automatic role assignment during signup

### 2. Patient Authentication

#### Two-Phase Patient System

**Phase 1: Doctor Creates Patient Profile**
```typescript
// Doctor creates patient profile without user account
const patient = await createPatient({
  cpf: "123.456.789-00",
  pin: "123456",
  full_name: "João Silva",
  email: "joao@example.com",
  phone: "+5511999999999",
  // ... other details
});
// Patient can now be accessed via CPF+PIN by doctors
```

**Phase 2: Patient Account Linking**
```typescript
// Patient later signs up and links to existing profile
const result = await signUp({
  email: "joao@example.com",
  password: "password123",
  cpf: "123.456.789-00",
  pin: "123456",
  // ... profile data
});

// System automatically:
// 1. Checks if CPF+PIN profile exists
// 2. Links auth.user to existing profile
// 3. Patient gains full access to their medical data
```

### 3. Profile Linking Mechanism

#### Database Trigger (Automatic Linking)
```sql
-- Trigger function that automatically links patients during signup
CREATE OR REPLACE FUNCTION link_patient_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a doctor-created profile exists with same CPF
  UPDATE profiles
  SET user_id = NEW.id, linked = true
  WHERE cpf = (NEW.raw_user_meta_data->>'cpf')
    AND pin = (NEW.raw_user_meta_data->>'pin')
    AND role = 'patient'
    AND user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Manual Linking Process
1. Doctor creates patient profile with CPF/PIN
2. Patient medical data is added by doctor
3. Patient signs up with same CPF/PIN
4. Trigger automatically links accounts
5. Patient gains access to all their medical history

## Patient Profile Return/Retrieval

### 1. Doctor Search by PIN

```typescript
// API: /api/doctor/patient-search
const searchPatient = async (pin: string) => {
  const response = await fetch('/api/doctor/patient-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });

  const data = await response.json();
  return {
    patient: data.patient,
    medicalData: {
      medications: data.medicalData.medications,
      allergies: data.medicalData.allergies,
      exams: data.medicalData.exams,
      diseases: data.medicalData.diseases,
      consultations: data.medicalData.consultations
    }
  };
};
```

### 2. Emergency Access (CPF + PIN)

```typescript
// Middleware handles emergency access
// URL pattern: /emergency/{cpf}/{pin}
// Provides read-only access to critical medical info

const emergencyAccess = {
  url: "/emergency/12345678900/123456",
  provides: [
    "Allergies and severity",
    "Current medications",
    "Emergency contact information",
    "Critical medical conditions"
  ]
};
```

### 3. Patient Profile Retrieval Methods

#### A. Authenticated Patient Access
```typescript
// Patient logged in - full access to own data
const profile = useAuth().profile;
const medicalData = await fetchPatientMedicalData(profile.profile_id);
```

#### B. Doctor PIN Search
```typescript
// Doctor searches by 6-digit PIN
const patientData = await searchPatientByPIN("123456");
```

#### C. Doctor CPF Search
```typescript
// Doctor searches by CPF (alternative method)
const patients = await searchPatientByCPF("123.456.789-00");
```

#### D. Emergency Access
```typescript
// Emergency access without authentication
// Provides limited critical information
const emergencyInfo = await getEmergencyInfo(cpf, pin);
```

## Security Features

### 1. Row Level Security (RLS)

#### Patient Data Access
```sql
-- Patients can only access their own data
CREATE POLICY "patients_own_data" ON medications
  FOR ALL TO authenticated
  USING (patient_id = (
    SELECT profile_id FROM profiles
    WHERE user_id = auth.uid() AND role = 'patient'
  ));
```

#### Doctor Access
```sql
-- Doctors can access all patient data
CREATE POLICY "doctors_all_patients" ON medications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'doctor'
  ));
```

### 2. Role-Based Route Protection

```typescript
// Middleware protects routes by role
const doctorRoutes = ['/doctor/*'];
const patientRoutes = ['/medications', '/allergies', '/exams'];

// Automatic redirection based on role
if (isDoctorRoute && profile.role !== 'doctor') {
  redirect('/dashboard');
}
```

### 3. PIN Security

- 6-digit numeric PIN for quick access
- Unique per patient
- Used for emergency situations
- Stored in plain text for emergency access needs
- Should be changed to hashed storage in production

## Implementation Details

### 1. Auth State Management

```typescript
interface AuthState {
  user: User | null;          // Supabase auth user
  session: Session | null;    // Supabase session
  profile: Profile | null;    // Application profile
  loading: boolean;           // Loading state
  error: string | null;       // Error message
}
```

### 2. Profile Fetching Strategy

```typescript
// Non-blocking profile fetch
const fetchUserProfileInBackground = async (userId: string) => {
  // Fetch profile without blocking UI
  // Update state when complete
  // Ignore errors to prevent auth loops
};
```

### 3. Error Handling

- Graceful degradation when profile is not found
- Non-blocking background fetches
- Comprehensive error logging
- User-friendly error messages

## Common Use Cases

### 1. New Patient Registration

1. **Doctor Creates Profile**
   - Doctor enters patient details
   - System generates 6-digit PIN
   - Patient can be accessed immediately via PIN

2. **Patient Links Account**
   - Patient signs up with same CPF
   - System automatically links to existing profile
   - Patient gains full access to medical history

### 2. Emergency Access

1. **Hospital Emergency**
   - Medical staff has patient's CPF and PIN
   - Access via `/emergency/{cpf}/{pin}`
   - View critical allergies and medications

2. **Ambulance Scenario**
   - Patient unconscious with ID card
   - EMT uses CPF + PIN from emergency card
   - Quick access to life-saving information

### 3. Regular Medical Consultation

1. **Patient Arrives at Clinic**
   - Doctor searches by 6-digit PIN
   - Instant access to complete medical history
   - Add new medications, diagnoses, etc.

2. **Follow-up Care**
   - Patient logs into personal account
   - Reviews doctor's notes and prescriptions
   - Updates personal information

## Troubleshooting

### Common Issues

1. **Profile Not Found**
   - Check if `profile.id` vs `profile.profile_id`
   - Verify user_id linking
   - Check RLS policies

2. **PIN Search Failing**
   - Ensure PIN is exactly 6 digits
   - Verify role is 'patient'
   - Check database connection

3. **Linking Issues**
   - Verify CPF format consistency
   - Check trigger execution
   - Validate PIN matching

### Debug Queries

```sql
-- Check profile linking status
SELECT user_id, cpf, pin, linked, created_by
FROM profiles
WHERE cpf = '123.456.789-00';

-- Verify medical data relationships
SELECT COUNT(*) as record_count, 'medications' as table_name
FROM medications WHERE patient_id = 'uuid-here'
UNION ALL
SELECT COUNT(*), 'allergies' FROM allergies WHERE patient_id = 'uuid-here';
```

## Future Enhancements

### Security Improvements
- Implement PIN hashing for production
- Add 2FA for doctor accounts
- Audit trail for emergency access
- Rate limiting for PIN searches

### User Experience
- PIN reset functionality
- Profile picture support
- Advanced search capabilities
- Mobile app integration

### Administrative Features
- Bulk patient import
- Doctor credential verification
- System-wide health analytics
- Compliance reporting

## API Reference

### Authentication Endpoints
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User logout

### Patient Search Endpoints
- `POST /api/doctor/patient-search` - Search by PIN
- `POST /api/doctor/patient-search-by-name` - Search by name
- `POST /api/doctor/create-patient` - Create new patient

### Emergency Endpoints
- `GET /emergency/{cpf}/{pin}` - Emergency access
- `GET /api/emergency-info` - Emergency medical data

This documentation covers the complete authentication and patient profile management system in Saúde no Bolso, providing both technical implementation details and practical usage scenarios.