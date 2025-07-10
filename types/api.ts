// =====================================================
// API TYPES - Request/Response Types
// Types for API endpoints and HTTP operations
// =====================================================

import {
  type Profile,
  type Medication,
  type Allergy, 
  type Exam,
  type Disease,
  type Consultation,
  type MedicationInsert,
  type AllergyInsert,
  type ExamInsert,
  type DiseaseInsert,
  type ConsultationInsert
} from './database'

import {
  type AuthResult,
  type SignUpData,
  type SignInData,
  type PatientSearchData,
  type PatientSearchResult
} from './auth'

import {
  type MedicalCategory,
  type PatientMedicalRecords,
  type MedicalRecordsQuery,
  type AIProcessingResult,
  type MedicalRecordExport
} from './medical'

// =====================================================
// BASE API TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode?: number
  timestamp?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  details?: Record<string, any>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiMetadata {
  requestId: string
  timestamp: string
  version: string
  processingTime?: number
}

// =====================================================
// AUTHENTICATION API TYPES
// =====================================================

export interface SignUpRequest {
  body: SignUpData
}

export interface SignUpResponse extends ApiResponse<{
  user: any
  profile: Profile
  session: any
}> {}

export interface SignInRequest {
  body: SignInData
}

export interface SignInResponse extends ApiResponse<{
  user: any
  profile: Profile
  session: any
}> {}

export interface SignOutRequest {}

export interface SignOutResponse extends ApiResponse {}

export interface RefreshTokenRequest {
  body: {
    refreshToken: string
  }
}

export interface RefreshTokenResponse extends ApiResponse<{
  accessToken: string
  refreshToken: string
  expiresAt: number
}> {}

// =====================================================
// PROFILE API TYPES
// =====================================================

export interface GetProfileRequest {
  params: {
    id?: string
  }
}

export interface GetProfileResponse extends ApiResponse<Profile> {}

export interface UpdateProfileRequest {
  params: {
    id: string
  }
  body: Partial<Profile>
}

export interface UpdateProfileResponse extends ApiResponse<Profile> {}

export interface SearchPatientRequest {
  body: PatientSearchData
}

export interface SearchPatientResponse extends ApiResponse<PatientSearchResult> {}

// =====================================================
// MEDICAL RECORDS API TYPES
// =====================================================

// Generic medical record types
export interface GetMedicalRecordsRequest {
  params: {
    patientId?: string
    category?: MedicalCategory
  }
  query?: {
    limit?: string
    offset?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    isActive?: string
  }
}

export interface GetMedicalRecordsResponse<T> extends ApiResponse<PaginatedResponse<T>> {}

export interface CreateMedicalRecordRequest<T> {
  params: {
    patientId?: string
  }
  body: T
}

export interface CreateMedicalRecordResponse<T> extends ApiResponse<T> {}

export interface UpdateMedicalRecordRequest<T> {
  params: {
    id: string
  }
  body: Partial<T>
}

export interface UpdateMedicalRecordResponse<T> extends ApiResponse<T> {}

export interface DeleteMedicalRecordRequest {
  params: {
    id: string
  }
}

export interface DeleteMedicalRecordResponse extends ApiResponse {}

// =====================================================
// MEDICATION API TYPES
// =====================================================

export interface GetMedicationsRequest extends GetMedicalRecordsRequest {}
export interface GetMedicationsResponse extends GetMedicalRecordsResponse<Medication> {}

export interface CreateMedicationRequest extends CreateMedicalRecordRequest<MedicationInsert> {}
export interface CreateMedicationResponse extends CreateMedicalRecordResponse<Medication> {}

export interface UpdateMedicationRequest extends UpdateMedicalRecordRequest<Medication> {}
export interface UpdateMedicationResponse extends UpdateMedicalRecordResponse<Medication> {}

export interface DeleteMedicationRequest extends DeleteMedicalRecordRequest {}
export interface DeleteMedicationResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// ALLERGY API TYPES
// =====================================================

export interface GetAllergiesRequest extends GetMedicalRecordsRequest {}
export interface GetAllergiesResponse extends GetMedicalRecordsResponse<Allergy> {}

export interface CreateAllergyRequest extends CreateMedicalRecordRequest<AllergyInsert> {}
export interface CreateAllergyResponse extends CreateMedicalRecordResponse<Allergy> {}

export interface UpdateAllergyRequest extends UpdateMedicalRecordRequest<Allergy> {}
export interface UpdateAllergyResponse extends UpdateMedicalRecordResponse<Allergy> {}

export interface DeleteAllergyRequest extends DeleteMedicalRecordRequest {}
export interface DeleteAllergyResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// EXAM API TYPES
// =====================================================

export interface GetExamsRequest extends GetMedicalRecordsRequest {}
export interface GetExamsResponse extends GetMedicalRecordsResponse<Exam> {}

export interface CreateExamRequest extends CreateMedicalRecordRequest<ExamInsert> {}
export interface CreateExamResponse extends CreateMedicalRecordResponse<Exam> {}

export interface UpdateExamRequest extends UpdateMedicalRecordRequest<Exam> {}
export interface UpdateExamResponse extends UpdateMedicalRecordResponse<Exam> {}

export interface DeleteExamRequest extends DeleteMedicalRecordRequest {}
export interface DeleteExamResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// DISEASE API TYPES
// =====================================================

export interface GetDiseasesRequest extends GetMedicalRecordsRequest {}
export interface GetDiseasesResponse extends GetMedicalRecordsResponse<Disease> {}

export interface CreateDiseaseRequest extends CreateMedicalRecordRequest<DiseaseInsert> {}
export interface CreateDiseaseResponse extends CreateMedicalRecordResponse<Disease> {}

export interface UpdateDiseaseRequest extends UpdateMedicalRecordRequest<Disease> {}
export interface UpdateDiseaseResponse extends UpdateMedicalRecordResponse<Disease> {}

export interface DeleteDiseaseRequest extends DeleteMedicalRecordRequest {}
export interface DeleteDiseaseResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// CONSULTATION API TYPES
// =====================================================

export interface GetConsultationsRequest extends GetMedicalRecordsRequest {}
export interface GetConsultationsResponse extends GetMedicalRecordsResponse<Consultation> {}

export interface CreateConsultationRequest extends CreateMedicalRecordRequest<ConsultationInsert> {}
export interface CreateConsultationResponse extends CreateMedicalRecordResponse<Consultation> {}

export interface UpdateConsultationRequest extends UpdateMedicalRecordRequest<Consultation> {}
export interface UpdateConsultationResponse extends UpdateMedicalRecordResponse<Consultation> {}

export interface DeleteConsultationRequest extends DeleteMedicalRecordRequest {}
export interface DeleteConsultationResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// PATIENT RECORDS API TYPES
// =====================================================

export interface GetPatientRecordsRequest {
  params: {
    patientId: string
  }
  query?: {
    categories?: string
    includeInactive?: string
  }
}

export interface GetPatientRecordsResponse extends ApiResponse<PatientMedicalRecords> {}

// =====================================================
// EMERGENCY API TYPES
// =====================================================

export interface GetEmergencyInfoRequest {
  params: {
    patientId: string
  }
  query?: {
    cpf?: string
    pin?: string
  }
}

export interface GetEmergencyInfoResponse extends ApiResponse<{
  patient: Profile
  medications: Medication[]
  allergies: Allergy[]
  diseases: Disease[]
  qrCode?: string
}> {}

// =====================================================
// FILE UPLOAD API TYPES
// =====================================================

export interface UploadFileRequest {
  params: {
    patientId: string
    category: MedicalCategory
    recordId?: string
  }
  body: FormData
}

export interface UploadFileResponse extends ApiResponse<{
  url: string
  fileName: string
  fileSize: number
  fileType: string
}> {}

export interface DeleteFileRequest {
  params: {
    fileId: string
  }
}

export interface DeleteFileResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// AI PROCESSING API TYPES
// =====================================================

export interface ProcessAIDataRequest {
  body: {
    text?: string
    imageUrl?: string
    audioUrl?: string
    category?: MedicalCategory
    patientId: string
  }
}

export interface ProcessAIDataResponse extends ApiResponse<AIProcessingResult> {}

// =====================================================
// EXPORT API TYPES
// =====================================================

export interface ExportMedicalRecordsRequest {
  params: {
    patientId: string
  }
  body: MedicalRecordExport
}

export interface ExportMedicalRecordsResponse extends ApiResponse<{
  downloadUrl: string
  fileName: string
  expiresAt: string
}> {}

// =====================================================
// ANALYTICS API TYPES
// =====================================================

export interface GetMedicalStatsRequest {
  params: {
    patientId: string
  }
  query?: {
    period?: string
    category?: string
  }
}

export interface GetMedicalStatsResponse extends ApiResponse<{
  totalRecords: number
  recordsByCategory: Record<string, number>
  recordsByMonth: Array<{ month: string; count: number }>
  trends: Record<string, any>
}> {}

// =====================================================
// DOCTOR ACCESS API TYPES
// =====================================================

export interface GrantDoctorAccessRequest {
  params: {
    patientId: string
  }
  body: {
    doctorId: string
    permissions: string[]
    expiresAt?: string
    reason: string
  }
}

export interface GrantDoctorAccessResponse extends ApiResponse<{
  accessId: string
  grantedAt: string
  expiresAt?: string
}> {}

export interface RevokeDoctorAccessRequest {
  params: {
    accessId: string
  }
}

export interface RevokeDoctorAccessResponse extends DeleteMedicalRecordResponse {}

// =====================================================
// HEALTH CHECK API TYPES
// =====================================================

export interface HealthCheckRequest {}

export interface HealthCheckResponse extends ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  database: 'connected' | 'disconnected'
  services: Record<string, 'up' | 'down'>
}> {}

// =====================================================
// WEBHOOKS API TYPES
// =====================================================

export interface WebhookRequest {
  body: {
    event: string
    data: Record<string, any>
    timestamp: string
    signature: string
  }
}

export interface WebhookResponse extends ApiResponse {}

// =====================================================
// UTILITY API TYPES
// =====================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestConfig {
  method: HttpMethod
  url: string
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string>
  query?: Record<string, string>
}

export interface ApiClientConfig {
  baseUrl: string
  timeout: number
  headers: Record<string, string>
  retries: number
}

// =====================================================
// ERROR HANDLING TYPES
// =====================================================

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiValidationError extends ApiError {
  details: {
    validationErrors: ValidationError[]
  }
}

export interface ApiRateLimitError extends ApiError {
  details: {
    limit: number
    remaining: number
    resetTime: number
  }
}

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

export interface ApiMiddleware {
  name: string
  execute: (req: any, res: any, next: () => void) => void | Promise<void>
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message: string
}

export interface CacheConfig {
  ttl: number
  key: string
  tags?: string[]
}

// =====================================================
// TYPE GUARDS AND UTILITIES
// =====================================================

export type ApiEndpoint<TRequest = any, TResponse = any> = {
  method: HttpMethod
  path: string
  handler: (req: TRequest) => Promise<TResponse>
  middleware?: ApiMiddleware[]
  auth?: boolean
  roles?: string[]
  rateLimit?: RateLimitConfig
  cache?: CacheConfig
} 