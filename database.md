# 📄 Saúde no Bolso + ProntoDoc – Complete Database Schema

This document contains the **complete SQL schema** for the integrated Saúde no Bolso + ProntoDoc project.  
It includes:
- ✅ `profile_id` as internal primary key for `profiles`
- ✅ Nullable `user_id` (so doctors can pre-create patients)
- ✅ PIN field for emergency lookup
- ✅ Trigger to auto-link patients when they sign up by CPF
- 🎙️ **ProntoDoc Integration**: Audio transcription and AI-generated medical records
- 📋 **Medical Records**: Structured prontuários generated from consultations
- 🎯 **Consultation Templates**: Customizable templates for different consultation types

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
  -- 🎙️ ProntoDoc fields for audio transcription and AI processing
  title text,
  transcript text,
  transcript_status text check (transcript_status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  speaker_separation jsonb, -- stores speaker-separated transcript
  ai_processing_status text check (ai_processing_status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  transcription_service text default 'assemblyai', -- track which service was used
  transcription_job_id text, -- external service job ID for tracking
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

-- =========================================================
-- 📋 MEDICAL RECORDS TABLE (PRONTUÁRIO) - PRONTODOC
-- Structured medical reports generated from consultations by AI
-- =========================================================

create table medical_records (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid references consultations(id) on delete cascade,
  patient_id uuid references profiles(profile_id) on delete cascade, -- for direct patient access
  created_by uuid references profiles(profile_id) on delete cascade, -- doctor who created/approved
  
  -- Structured medical report fields (prontuário)
  summary text,
  chief_complaint text, -- queixa principal
  history_of_present_illness text, -- história da doença atual
  review_of_systems text, -- revisão de sistemas
  physical_examination text, -- exame físico
  assessment text, -- avaliação/impressão diagnóstica
  plan text, -- plano terapêutico
  
  -- Additional structured data
  diagnosis jsonb, -- array of diagnoses with ICD codes if available
  medications_prescribed jsonb, -- medications prescribed in this consultation
  follow_up_instructions text, -- orientações de seguimento
  next_appointment date, -- próxima consulta
  
  -- AI and processing metadata
  ai_generated boolean default true,
  ai_model_used text default 'gpt-4',
  confidence_score decimal(3,2), -- 0.00 to 1.00
  reviewed_by_doctor boolean default false,
  doctor_modifications text, -- track what doctor changed
  
  -- Standard fields
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_deleted boolean default false
);

-- =========================================================
-- 🎯 CONSULTATION TEMPLATES - PRONTODOC
-- Predefined templates for different consultation types
-- =========================================================

create table consultation_templates (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid references profiles(profile_id) on delete cascade, -- doctor who created template
  name text not null,
  specialty text, -- cardiology, dermatology, etc.
  template_structure jsonb not null, -- defines expected sections and prompts
  ai_prompt_template text, -- custom AI prompt for this consultation type
  is_default boolean default false,
  is_public boolean default false, -- can be shared with other doctors
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_deleted boolean default false
);

-- =========================================================
-- 📊 TRANSCRIPTION ANALYTICS - PRONTODOC
-- Track transcription quality and processing metrics
-- =========================================================

create table transcription_analytics (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid references consultations(id) on delete cascade,
  
  -- Transcription metrics
  transcription_accuracy decimal(3,2), -- estimated accuracy
  words_per_minute integer,
  total_words integer,
  speaker_changes integer, -- number of times speaker changed
  
  -- Processing times
  transcription_time_seconds integer,
  ai_processing_time_seconds integer,
  total_processing_time_seconds integer,
  
  -- Error tracking
  errors_detected jsonb, -- any errors or warnings during processing
  
  created_at timestamp with time zone default now()
);

-- =========================================================
-- 🔄 UPDATE TRIGGERS FOR TIMESTAMPS
-- =========================================================

-- Create update trigger function if it doesn't exist
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

-- Add update triggers to new tables
drop trigger if exists update_medical_records_updated_at on medical_records;
create trigger update_medical_records_updated_at 
    before update on medical_records 
    for each row execute function update_updated_at_column();

drop trigger if exists update_consultation_templates_updated_at on consultation_templates;
create trigger update_consultation_templates_updated_at 
    before update on consultation_templates 
    for each row execute function update_updated_at_column();

-- =========================================================
-- 📋 INDEXES FOR PERFORMANCE
-- =========================================================

-- Consultation indexes for ProntoDoc queries
create index if not exists idx_consultations_patient_created_at on consultations(patient_id, created_at desc);
create index if not exists idx_consultations_created_by_created_at on consultations(created_by, created_at desc);
create index if not exists idx_consultations_transcript_status on consultations(transcript_status);
create index if not exists idx_consultations_ai_processing_status on consultations(ai_processing_status);

-- Medical records indexes
create index if not exists idx_medical_records_consultation_id on medical_records(consultation_id);
create index if not exists idx_medical_records_patient_created_at on medical_records(patient_id, created_at desc);
create index if not exists idx_medical_records_created_by on medical_records(created_by);
create index if not exists idx_medical_records_reviewed on medical_records(reviewed_by_doctor);

-- Templates indexes
create index if not exists idx_consultation_templates_created_by on consultation_templates(created_by);
create index if not exists idx_consultation_templates_specialty on consultation_templates(specialty);
create index if not exists idx_consultation_templates_public on consultation_templates(is_public) where is_public = true;

-- Analytics indexes
create index if not exists idx_transcription_analytics_consultation on transcription_analytics(consultation_id);

-- =========================================================
-- 🔐 ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES
-- =========================================================

-- Enable RLS on new tables
alter table medical_records enable row level security;
alter table consultation_templates enable row level security;
alter table transcription_analytics enable row level security;

-- Medical Records Policies
create policy "medical_records_select_policy" on medical_records
    for select using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
        or patient_id = (select profile_id from profiles where user_id = auth.uid())
    );

create policy "medical_records_insert_policy" on medical_records
    for insert with check (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

create policy "medical_records_update_policy" on medical_records
    for update using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

create policy "medical_records_delete_policy" on medical_records
    for delete using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

-- Consultation Templates Policies
create policy "consultation_templates_select_policy" on consultation_templates
    for select using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
        or is_public = true
    );

create policy "consultation_templates_insert_policy" on consultation_templates
    for insert with check (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

create policy "consultation_templates_update_policy" on consultation_templates
    for update using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

create policy "consultation_templates_delete_policy" on consultation_templates
    for delete using (
        created_by = (select profile_id from profiles where user_id = auth.uid())
    );

-- Transcription Analytics Policies (read-only for consultation owners)
create policy "transcription_analytics_select_policy" on transcription_analytics
    for select using (
        exists (
            select 1 from consultations c 
            where c.id = consultation_id 
            and c.created_by = (select profile_id from profiles where user_id = auth.uid())
        )
    );

create policy "transcription_analytics_insert_policy" on transcription_analytics
    for insert with check (
        exists (
            select 1 from consultations c 
            where c.id = consultation_id 
            and c.created_by = (select profile_id from profiles where user_id = auth.uid())
        )
    );

-- =========================================================
-- 🎯 SAMPLE DATA / DEFAULT TEMPLATES
-- =========================================================

-- Insert a default general consultation template
insert into consultation_templates (name, specialty, template_structure, ai_prompt_template, is_default, is_public)
values (
    'Consulta Geral',
    'Clínica Geral',
    '{
        "sections": [
            {"name": "Queixa Principal", "required": true},
            {"name": "História da Doença Atual", "required": true},
            {"name": "Revisão de Sistemas", "required": false},
            {"name": "Exame Físico", "required": true},
            {"name": "Avaliação", "required": true},
            {"name": "Plano Terapêutico", "required": true}
        ]
    }',
    'Você é um assistente médico de IA. Com base na transcrição da conversa médico-paciente a seguir, gere um prontuário médico estruturado. Foque em extrair: queixa principal, história da doença atual, achados do exame físico, avaliação e plano de tratamento. Mantenha precisão médica e terminologia profissional.',
    true,
    true
) on conflict do nothing;

-- =========================================================
-- 📝 COMMENTS FOR DOCUMENTATION
-- =========================================================

comment on table medical_records is 'Prontuários médicos estruturados gerados a partir de consultas via processamento de IA';
comment on table consultation_templates is 'Templates para diferentes tipos de consultas médicas para orientar o processamento de IA';
comment on table transcription_analytics is 'Análises e métricas de qualidade para transcrição e processamento';

comment on column consultations.transcript is 'Transcrição completa da consulta com identificação dos interlocutores';
comment on column consultations.speaker_separation is 'JSONB contendo diálogo separado por interlocutor (médico/paciente)';
comment on column medical_records.confidence_score is 'Pontuação de confiança da IA (0.00-1.00) para o prontuário gerado';
comment on column medical_records.reviewed_by_doctor is 'Se o médico revisou e aprovou o prontuário gerado pela IA';
