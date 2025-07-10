# Database Schema - Saude no Bolso

## Overview
This directory contains the complete database schema for the Saude no Bolso medical record management system.

## Files
- `schema.sql` - Complete database schema with tables, indexes, RLS policies, and triggers

## How to Apply the Schema

### 1. In Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the entire content of `schema.sql`
4. Click **Run** to execute the schema

### 2. Using Supabase CLI (Alternative)
```bash
supabase db reset
supabase db push
```

## Database Structure

### Core Tables

#### 📋 `profiles`
User profiles for both patients and doctors
- Stores CPF, PIN, role, contact information
- Links to Supabase auth.users

#### 💊 `medications`
Patient medication records
- Dosage, frequency, active status
- Links to patient profile

#### ⚠️ `allergies`
Patient allergy information
- Severity levels, reactions
- Critical for emergency situations

#### 🔬 `exams`
Medical examination records
- Results, dates, file attachments
- Links to performing doctor

#### 🩺 `diseases`
Medical conditions and diseases
- Chronic conditions tracking
- Status monitoring

#### 👩‍⚕️ `consultations`
Medical consultation records
- Doctor visits, diagnoses, treatments
- Follow-up scheduling

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- **Patients**: Full CRUD access to their own records
- **Doctors**: Read access to all patient records + Insert access
- **Cross-references**: Proper foreign key relationships

### Emergency Access
- Doctors can search patients by CPF + PIN combination
- Emergency information is accessible to medical professionals
- Patient privacy is maintained while enabling emergency care

## Key Features

### 1. UUID Primary Keys
All tables use UUID primary keys for security and scalability

### 2. Audit Trail
- `created_by` fields track who added records
- `created_at` and `updated_at` timestamps
- Automatic timestamp updates via triggers

### 3. Data Integrity
- Foreign key constraints
- Check constraints for enums (severity, status, role)
- NOT NULL constraints for critical fields

### 4. Performance Optimization
- Indexes on frequently queried fields
- Composite indexes for common query patterns
- Optimized for patient record lookups

## Sample Queries

### Patient Record Lookup
```sql
-- Get all medical records for a patient
SELECT 
    p.full_name,
    p.cpf,
    p.pin,
    COUNT(m.id) as medication_count,
    COUNT(a.id) as allergy_count,
    COUNT(e.id) as exam_count,
    COUNT(d.id) as disease_count,
    COUNT(c.id) as consultation_count
FROM profiles p
LEFT JOIN medications m ON m.patient_id = p.id
LEFT JOIN allergies a ON a.patient_id = p.id  
LEFT JOIN exams e ON e.patient_id = p.id
LEFT JOIN diseases d ON d.patient_id = p.id
LEFT JOIN consultations c ON c.patient_id = p.id
WHERE p.role = 'patient'
GROUP BY p.id;
```

### Emergency Information
```sql
-- Get critical emergency info for a patient
SELECT 
    p.full_name,
    p.phone,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    array_agg(DISTINCT a.name || ' (' || a.severity || ')') as allergies,
    array_agg(DISTINCT m.name || ' - ' || m.dosage) as current_medications
FROM profiles p
LEFT JOIN allergies a ON a.patient_id = p.id
LEFT JOIN medications m ON m.patient_id = p.id AND m.is_active = true
WHERE p.cpf = '000.000.000-00' AND p.pin = '123456'
GROUP BY p.id;
```

## Next Steps

After applying this schema:
1. Test the connection using the `/test-supabase` page
2. Implement TypeScript types (Phase 2.2)
3. Create authentication hooks (Phase 2.3)
4. Build the authentication pages (Phase 4)

## Notes

- Remember to add your environment variables to `.env.local`
- The schema includes all necessary RLS policies for security
- All tables support soft deletes through status fields where applicable
- The design supports both patient self-management and doctor access 