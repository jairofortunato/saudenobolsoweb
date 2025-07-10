// =====================================================
// AUTHENTICATION TYPES
// User roles, sessions, and authentication flows
// =====================================================

import { type User, type Session } from '@supabase/supabase-js'
import { type Profile, type UserRole } from './database'

// =====================================================
// AUTHENTICATION STATE TYPES
// =====================================================

export interface AuthUser extends User {
  profile?: Profile
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<AuthResult>
  signIn: (data: SignInData) => Promise<AuthResult>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<AuthResult>
  refreshProfile: () => Promise<void>
}

// =====================================================
// AUTHENTICATION DATA TYPES
// =====================================================

export interface SignUpData {
  email: string
  password: string
  cpf: string
  pin: string
  role: UserRole
  fullName: string
  phone?: string
  birthDate?: string
  address?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ResetPasswordData {
  email: string
}

export interface UpdatePasswordData {
  currentPassword: string
  newPassword: string
}

// =====================================================
// AUTHENTICATION RESULT TYPES
// =====================================================

export interface AuthResult {
  success: boolean
  error?: string
  user?: AuthUser
  profile?: Profile
}

export interface AuthError {
  message: string
  status?: number
  code?: string
}

// =====================================================
// DOCTOR PATIENT SEARCH TYPES
// =====================================================

export interface PatientSearchData {
  cpf: string
  pin: string
}

export interface PatientSearchResult {
  success: boolean
  patient?: Profile
  error?: string
}

// =====================================================
// ROLE-BASED ACCESS TYPES
// =====================================================

export interface RolePermissions {
  canViewPatientRecords: boolean
  canEditPatientRecords: boolean
  canCreateRecords: boolean
  canDeleteRecords: boolean
  canAccessEmergencyInfo: boolean
  canSearchPatients: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  patient: {
    canViewPatientRecords: true,   // Own records only
    canEditPatientRecords: true,   // Own records only
    canCreateRecords: true,        // Own records only
    canDeleteRecords: true,        // Own records only
    canAccessEmergencyInfo: true,  // Own emergency info only
    canSearchPatients: false,
  },
  doctor: {
    canViewPatientRecords: true,   // All patient records
    canEditPatientRecords: false,  // Cannot edit existing records
    canCreateRecords: true,        // Can create records for patients
    canDeleteRecords: false,       // Cannot delete patient records
    canAccessEmergencyInfo: true,  // All patient emergency info
    canSearchPatients: true,       // Can search patients by CPF + PIN
  },
}

// =====================================================
// SESSION MANAGEMENT TYPES
// =====================================================

export interface SessionData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
  profile: Profile
}

export interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
}

// =====================================================
// FORM VALIDATION TYPES
// =====================================================

export interface ValidationError {
  field: string
  message: string
}

export interface FormErrors {
  [key: string]: string | undefined
}

export interface AuthFormState {
  data: Record<string, any>
  errors: FormErrors
  isSubmitting: boolean
  isDirty: boolean
}

// =====================================================
// CPF AND PIN VALIDATION TYPES
// =====================================================

export interface CPFValidation {
  isValid: boolean
  formatted: string
  error?: string
}

export interface PINValidation {
  isValid: boolean
  error?: string
}

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

export interface AuthMiddlewareOptions {
  redirectTo?: string
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

export interface RouteGuard {
  path: string
  roles: UserRole[]
  redirectTo: string
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type AuthAction = 
  | 'SIGN_IN'
  | 'SIGN_OUT' 
  | 'SIGN_UP'
  | 'UPDATE_PROFILE'
  | 'REFRESH_SESSION'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'CLEAR_ERROR'

export interface AuthActionPayload {
  type: AuthAction
  payload?: any
  error?: string
}

// =====================================================
// EMERGENCY ACCESS TYPES
// =====================================================

export interface EmergencyAccess {
  patientId: string
  accessedBy: string
  accessedAt: string
  ipAddress?: string
  userAgent?: string
}

export interface EmergencyData {
  patient: Profile
  medications: Array<{ name: string; dosage: string; frequency: string }>
  allergies: Array<{ name: string; severity: string; reaction: string }>
  diseases: Array<{ name: string; status: string; is_chronic: boolean }>
  emergencyContacts: {
    primary?: { name: string; phone: string }
    secondary?: { name: string; phone: string }
  }
}

// =====================================================
// SUPABASE AUTH TYPES EXTENSIONS
// =====================================================

export interface SupabaseAuthUser extends User {
  user_metadata: {
    full_name?: string
    cpf?: string
    role?: UserRole
  }
  app_metadata: {
    provider?: string
    providers?: string[]
  }
}

export interface SupabaseSession extends Session {
  user: SupabaseAuthUser
} 