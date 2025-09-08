// =====================================================
// DATABASE TYPES - Supabase Schema Types
// Auto-generated types based on our database schema
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================================
// ENUM TYPES
// =====================================================

export type UserRole = 'patient' | 'doctor'
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life-threatening'
export type DiseaseStatus = 'active' | 'resolved' | 'in_remission'

// =====================================================
// TABLE TYPES
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      medications: {
        Row: Medication
        Insert: MedicationInsert
        Update: MedicationUpdate
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      allergies: {
        Row: Allergy
        Insert: AllergyInsert
        Update: AllergyUpdate
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      exams: {
        Row: Exam
        Insert: ExamInsert
        Update: ExamUpdate
        Relationships: [
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      diseases: {
        Row: Disease
        Insert: DiseaseInsert
        Update: DiseaseUpdate
        Relationships: [
          {
            foreignKeyName: "diseases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diseases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      consultations: {
        Row: Consultation
        Insert: ConsultationInsert
        Update: ConsultationUpdate
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      prontuarios: {
        Row: Prontuario
        Insert: ProntuarioInsert
        Update: ProntuarioUpdate
        Relationships: [
          {
            foreignKeyName: "prontuarios_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "prontuarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      allergy_severity: AllergySeverity
      disease_status: DiseaseStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =====================================================
// PROFILE TYPES
// =====================================================

export interface Profile {
  id: string
  user_id: string
  email: string
  cpf: string
  pin: string
  role: UserRole
  full_name: string
  birth_date: string | null
  phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id?: string
  user_id: string
  email: string
  cpf: string
  pin: string
  role: UserRole
  full_name: string
  birth_date?: string | null
  phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  id?: string
  user_id?: string
  email?: string
  cpf?: string
  pin?: string
  role?: UserRole
  full_name?: string
  birth_date?: string | null
  phone?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// MEDICATION TYPES
// =====================================================

export interface Medication {
  id: string
  patient_id: string
  name: string
  dosage: string | null
  frequency: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MedicationInsert {
  id?: string
  patient_id: string
  name: string
  dosage?: string | null
  frequency?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface MedicationUpdate {
  id?: string
  patient_id?: string
  name?: string
  dosage?: string | null
  frequency?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// ALLERGY TYPES
// =====================================================

export interface Allergy {
  id: string
  patient_id: string
  name: string
  severity: AllergySeverity | null
  reaction: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AllergyInsert {
  id?: string
  patient_id: string
  name: string
  severity?: AllergySeverity | null
  reaction?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface AllergyUpdate {
  id?: string
  patient_id?: string
  name?: string
  severity?: AllergySeverity | null
  reaction?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// EXAM TYPES
// =====================================================

export interface Exam {
  id: string
  patient_id: string
  name: string
  exam_date: string
  result: string | null
  file_url: string | null
  doctor_name: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExamInsert {
  id?: string
  patient_id: string
  name: string
  exam_date: string
  result?: string | null
  file_url?: string | null
  doctor_name?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface ExamUpdate {
  id?: string
  patient_id?: string
  name?: string
  exam_date?: string
  result?: string | null
  file_url?: string | null
  doctor_name?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// DISEASE TYPES
// =====================================================

export interface Disease {
  id: string
  patient_id: string
  name: string
  diagnosed_date: string | null
  is_chronic: boolean
  status: DiseaseStatus
  description: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DiseaseInsert {
  id?: string
  patient_id: string
  name: string
  diagnosed_date?: string | null
  is_chronic?: boolean
  status?: DiseaseStatus
  description?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface DiseaseUpdate {
  id?: string
  patient_id?: string
  name?: string
  diagnosed_date?: string | null
  is_chronic?: boolean
  status?: DiseaseStatus
  description?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// CONSULTATION TYPES
// =====================================================

export interface Consultation {
  id: string
  patient_id: string
  doctor_name: string
  specialty: string | null
  consultation_date: string
  reason: string | null
  diagnosis: string | null
  treatment: string | null
  follow_up_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ConsultationInsert {
  id?: string
  patient_id: string
  doctor_name: string
  specialty?: string | null
  consultation_date: string
  reason?: string | null
  diagnosis?: string | null
  treatment?: string | null
  follow_up_date?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface ConsultationUpdate {
  id?: string
  patient_id?: string
  doctor_name?: string
  specialty?: string | null
  consultation_date?: string
  reason?: string | null
  diagnosis?: string | null
  treatment?: string | null
  follow_up_date?: string | null
  notes?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// RAW MEDICAL ENTRY TYPES
// =====================================================

export interface RawMedicalEntry {
  id: string
  patient_id: string
  created_by: string
  raw_text: string
  category: string | null
  ai_processed: boolean
  processing_success: boolean
  processing_error: string | null
  entries_created: number
  created_at: string
  updated_at: string | null
  is_deleted: boolean
}

export interface RawMedicalEntryInsert {
  id?: string
  patient_id: string
  created_by: string
  raw_text: string
  category?: string | null
  ai_processed?: boolean
  processing_success?: boolean
  processing_error?: string | null
  entries_created?: number
  created_at?: string
  updated_at?: string | null
  is_deleted?: boolean
}

export interface RawMedicalEntryUpdate {
  id?: string
  patient_id?: string
  created_by?: string
  raw_text?: string
  category?: string | null
  ai_processed?: boolean
  processing_success?: boolean
  processing_error?: string | null
  entries_created?: number
  created_at?: string
  updated_at?: string | null
  is_deleted?: boolean
}

// =====================================================
// PRONTUARIO TYPES
// =====================================================

export interface Prontuario {
  id: string
  appointment_id: string
  user_id: string
  created_at: string
  version: number
  content: any  // JSONB in database
  summary: string | null
  meta: any
}

export interface ProntuarioInsert {
  id?: string
  appointment_id: string
  user_id: string
  created_at?: string
  version?: number
  content: any
  summary?: string | null
  meta?: any
}

export interface ProntuarioUpdate {
  id?: string
  appointment_id?: string
  user_id?: string
  created_at?: string
  version?: number
  content?: any
  summary?: string | null
  meta?: any
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never 