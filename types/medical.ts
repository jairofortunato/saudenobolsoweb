// =====================================================
// MEDICAL RECORD TYPES
// Types for medical record management and patient data
// =====================================================

import { 
  type Profile,
  type Medication, 
  type Allergy, 
  type Exam, 
  type Disease, 
  type Consultation,
  type AllergySeverity,
  type DiseaseStatus,
  type MedicationInsert,
  type AllergyInsert,
  type ExamInsert,
  type DiseaseInsert,
  type ConsultationInsert
} from './database'

// =====================================================
// MEDICAL RECORD CATEGORIES
// =====================================================

export type MedicalCategory = 
  | 'medications' 
  | 'allergies' 
  | 'exams' 
  | 'diseases' 
  | 'consultations'

export interface MedicalCategoryInfo {
  key: MedicalCategory
  name: string
  icon: string
  description: string
  color: string
}

export const MEDICAL_CATEGORIES: Record<MedicalCategory, MedicalCategoryInfo> = {
  medications: {
    key: 'medications',
    name: 'Medicamentos',
    icon: '💊',
    description: 'Medicamentos e prescrições',
    color: 'blue'
  },
  allergies: {
    key: 'allergies',
    name: 'Alergias',
    icon: '⚠️',
    description: 'Alergias e reações adversas',
    color: 'red'
  },
  exams: {
    key: 'exams',
    name: 'Exames',
    icon: '🔬',
    description: 'Exames e resultados',
    color: 'green'
  },
  diseases: {
    key: 'diseases',
    name: 'Doenças',
    icon: '🩺',
    description: 'Doenças e condições',
    color: 'purple'
  },
  consultations: {
    key: 'consultations',
    name: 'Consultas',
    icon: '👩‍⚕️',
    description: 'Consultas médicas',
    color: 'orange'
  }
}

// =====================================================
// ENHANCED MEDICAL RECORD TYPES
// =====================================================

export interface MedicationWithDetails extends Medication {
  patient?: Profile
  createdBy?: Profile
  isExpired?: boolean
  daysRemaining?: number
}

export interface AllergyWithDetails extends Allergy {
  patient?: Profile
  createdBy?: Profile
  severityLevel?: number
}

export interface ExamWithDetails extends Exam {
  patient?: Profile
  createdBy?: Profile
  isRecent?: boolean
  daysAgo?: number
}

export interface DiseaseWithDetails extends Disease {
  patient?: Profile
  createdBy?: Profile
  duration?: string
}

export interface ConsultationWithDetails extends Consultation {
  patient?: Profile
  createdBy?: Profile
  isUpcoming?: boolean
  daysUntil?: number
}

// =====================================================
// MEDICAL RECORD COLLECTIONS
// =====================================================

export interface PatientMedicalRecords {
  profile: Profile
  medications: MedicationWithDetails[]
  allergies: AllergyWithDetails[]
  exams: ExamWithDetails[]
  diseases: DiseaseWithDetails[]
  consultations: ConsultationWithDetails[]
  summary: MedicalRecordsSummary
}

export interface MedicalRecordsSummary {
  totalRecords: number
  activeMedications: number
  criticalAllergies: number
  recentExams: number
  chronicDiseases: number
  upcomingConsultations: number
  lastUpdated: string
}

// =====================================================
// MEDICAL ENTRY FORM TYPES
// =====================================================

export interface MedicationFormData {
  name: string
  dosage?: string
  frequency?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  notes?: string
}

export interface AllergyFormData {
  name: string
  severity?: AllergySeverity
  reaction?: string
  notes?: string
}

export interface ExamFormData {
  name: string
  examDate: string
  result?: string
  doctorName?: string
  notes?: string
  file?: File
}

export interface DiseaseFormData {
  name: string
  diagnosedDate?: string
  isChronic?: boolean
  status?: DiseaseStatus
  description?: string
  notes?: string
}

export interface ConsultationFormData {
  doctorName: string
  specialty?: string
  consultationDate: string
  reason?: string
  diagnosis?: string
  treatment?: string
  followUpDate?: string
  notes?: string
}

// =====================================================
// MEDICAL ENTRY VALIDATION TYPES
// =====================================================

export interface MedicalFormErrors {
  [key: string]: string | undefined
}

export interface MedicalFormValidation {
  isValid: boolean
  errors: MedicalFormErrors
}

// =====================================================
// EMERGENCY INFORMATION TYPES
// =====================================================

export interface EmergencyMedicalInfo {
  patient: Profile
  criticalAllergies: AllergyWithDetails[]
  currentMedications: MedicationWithDetails[]
  chronicDiseases: DiseaseWithDetails[]
  emergencyContacts: EmergencyContact[]
  bloodType?: string
  medicalAlerts?: string[]
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
  isPrimary: boolean
}

// =====================================================
// SEARCH AND FILTER TYPES
// =====================================================

export interface MedicalRecordFilter {
  category?: MedicalCategory
  dateFrom?: string
  dateTo?: string
  search?: string
  isActive?: boolean
  severity?: AllergySeverity
  status?: DiseaseStatus
}

export interface MedicalRecordSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface MedicalRecordsQuery {
  patientId: string
  category?: MedicalCategory
  filter?: MedicalRecordFilter
  sort?: MedicalRecordSort
  limit?: number
  offset?: number
}

// =====================================================
// FILE UPLOAD TYPES
// =====================================================

export interface MedicalFileUpload {
  file: File
  category: MedicalCategory
  recordId?: string
  description?: string
}

export interface MedicalFileInfo {
  id: string
  url: string
  name: string
  size: number
  type: string
  uploadedAt: string
  uploadedBy: string
}

// =====================================================
// MEDICAL HISTORY TYPES
// =====================================================

export interface MedicalTimeline {
  date: string
  category: MedicalCategory
  title: string
  description: string
  recordId: string
  createdBy?: string
}

export interface MedicalHistoryPeriod {
  period: string
  events: MedicalTimeline[]
}

// =====================================================
// DOCTOR ACCESS TYPES
// =====================================================

export interface DoctorPatientAccess {
  patientId: string
  doctorId: string
  accessGrantedAt: string
  accessReason: string
  permissions: DoctorAccessPermissions
}

export interface DoctorAccessPermissions {
  canView: MedicalCategory[]
  canEdit: MedicalCategory[]
  canAdd: MedicalCategory[]
  expiresAt?: string
}

// =====================================================
// MEDICAL STATISTICS TYPES
// =====================================================

export interface MedicalStatistics {
  patientId: string
  totalRecords: number
  recordsByCategory: Record<MedicalCategory, number>
  recordsByMonth: Array<{ month: string; count: number }>
  mostCommonAllergies: Array<{ name: string; count: number }>
  medicationAdherence: number
  lastActivity: string
}

// =====================================================
// AI PROCESSING TYPES
// =====================================================

export interface AIExtractedData {
  category: MedicalCategory
  confidence: number
  extractedFields: Record<string, any>
  originalText: string
  suggestions: AISuggestion[]
}

export interface AISuggestion {
  field: string
  value: string
  confidence: number
  reasoning: string
}

export interface AIProcessingResult {
  success: boolean
  data?: AIExtractedData[]
  error?: string
  processingTime: number
}

// =====================================================
// EXPORT AND SHARING TYPES
// =====================================================

export interface MedicalRecordExport {
  format: 'pdf' | 'json' | 'csv'
  categories: MedicalCategory[]
  dateRange?: { from: string; to: string }
  includeEmergencyInfo: boolean
  includeFiles: boolean
}

export interface SharedMedicalRecord {
  id: string
  patientId: string
  sharedWith: string[]
  categories: MedicalCategory[]
  expiresAt: string
  shareUrl: string
  accessCount: number
}

// =====================================================
// MEDICAL ALERT TYPES
// =====================================================

export interface MedicalAlert {
  id: string
  patientId: string
  type: 'medication_expiry' | 'appointment_reminder' | 'critical_allergy' | 'chronic_disease_checkup'
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  isRead: boolean
  createdAt: string
  actionRequired?: boolean
  actionUrl?: string
}

// =====================================================
// MEDICATION SPECIFIC TYPES
// =====================================================

export interface MedicationSchedule {
  medicationId: string
  times: string[]
  frequency: string
  startDate: string
  endDate?: string
  reminders: boolean
}

export interface MedicationAdherence {
  medicationId: string
  scheduledDoses: number
  takenDoses: number
  missedDoses: number
  adherenceRate: number
  period: string
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type MedicalRecordType = 
  | Medication 
  | Allergy 
  | Exam 
  | Disease 
  | Consultation

export type MedicalRecordInsertType = 
  | MedicationInsert 
  | AllergyInsert 
  | ExamInsert 
  | DiseaseInsert 
  | ConsultationInsert

export type MedicalFormDataType = 
  | MedicationFormData 
  | AllergyFormData 
  | ExamFormData 
  | DiseaseFormData 
  | ConsultationFormData 