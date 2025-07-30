# 📄 Saúde no Bolso – Updated Database Schema

This document contains the **complete SQL schema** for the updated Saúde no Bolso project.  
It introduces:
- ✅ `profile_id` as internal primary key for `profiles`
- ✅ Nullable `user_id` (so doctors can pre-create patients)
- ✅ PIN field for emergency lookup
- ✅ Trigger to auto-link patients when they sign up by CPF

---

## 🧮 Full SQL Schema

```sql
-- Enable UUID extension (needed for uuid_generate_v4)
create extension if not exists "uuid-ossp";

-- =========================================================
-- ✅ USER PROFILES TABLE
-- Doctors can pre-create patient profiles with CPF + PIN
-- Patients link their Supabase user_id on signup
-- =========================================================

create table profiles (
  profile_id uuid primary key default uuid_generate_v4(),  -- internal PK
  user_id uuid unique references auth.users(id) on delete cascade, -- links AFTER signup
  email text,
  cpf varchar(14) unique not null,
  pin varchar(6) not null,  -- required: used for doctor search & emergency lookup
  role text check (role in ('patient', 'doctor')) not null,
  name text,
  created_by uuid references profiles(profile_id), -- doctor who created patient (nullable for doctors)
  linked boolean default false, -- becomes true when user_id is linked
  created_at timestamp default now()
);

-- =========================================================
-- ✅ SHARED RECORD STRUCTURE (All medical tables reference profile_id)
-- patient_id: patient owner (profiles.profile_id)
-- created_by: user (doctor or patient) who created the entry
-- =========================================================

create table medications (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id),
  created_by uuid references profiles(profile_id),
  name text,
  dosage text,
  frequency text,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp,
  is_deleted boolean default false
);

create table allergies (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id),
  created_by uuid references profiles(profile_id),
  name text,
  severity text,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp,
  is_deleted boolean default false
);

create table exams (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id),
  created_by uuid references profiles(profile_id),
  name text,
  date date,
  result text,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp,
  is_deleted boolean default false
);

create table diseases (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id),
  created_by uuid references profiles(profile_id),
  name text,
  diagnosed_on date,
  chronic boolean default false,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp,
  is_deleted boolean default false
);

create table consultations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id),
  created_by uuid references profiles(profile_id),
  doctor_name text,
  specialty text,
  date timestamp,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp,
  is_deleted boolean default false
);

-- =========================================================
-- ✅ RAW MEDICAL ENTRIES (free text → processed into structured data)
-- =========================================================

create table raw_medical_entries (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references profiles(profile_id) not null,
  created_by uuid references profiles(profile_id) not null,
  raw_text text not null,
  category varchar(50),
  ai_processed boolean default false,
  processing_success boolean default false,
  processing_error text,
  entries_created integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_deleted boolean default false
);

-- =========================================================
-- ✅ TRIGGER FUNCTION: When a new auth.users entry is created,
-- it links to any pre-created patient profile by CPF.
-- =========================================================

create or replace function link_patient_profile()
returns trigger as $$
begin
  update profiles
  set user_id = new.id,
      linked = true
  where cpf = new.raw_user_meta_data->>'cpf'
    and user_id is null;
  return new;
end;
$$ language plpgsql;

create trigger after_user_signup
after insert on auth.users
for each row execute function link_patient_profile();
