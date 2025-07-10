// TypeScript type definitions
// Export all types from this file

// Database types (Phase 2.2)
export * from './database';

// Auth types - explicit export to avoid conflicts
export type {
  AuthUser,
  AuthState,
  AuthContextType,
  SignUpData,
  SignInData,
  ResetPasswordData,
  UpdatePasswordData,
  AuthResult,
  AuthError,
  PatientSearchData,
  PatientSearchResult,
  RolePermissions,
  SessionData,
  TokenData,
  ValidationError as AuthValidationError,
  FormErrors,
  AuthFormState,
  CPFValidation,
  PINValidation,
  AuthMiddlewareOptions,
  RouteGuard,
  AuthAction,
  AuthActionPayload,
  EmergencyAccess,
  EmergencyData,
  SupabaseAuthUser,
  SupabaseSession,
  ROLE_PERMISSIONS
} from './auth';

// Medical types
export * from './medical';

// API types - explicit export to avoid conflicts  
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiMetadata,
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  SignOutRequest,
  SignOutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  GetProfileRequest,
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  SearchPatientRequest,
  SearchPatientResponse,
  GetMedicalRecordsRequest,
  GetMedicalRecordsResponse,
  CreateMedicalRecordRequest,
  CreateMedicalRecordResponse,
  UpdateMedicalRecordRequest,
  UpdateMedicalRecordResponse,
  DeleteMedicalRecordRequest,
  DeleteMedicalRecordResponse,
  ValidationError as ApiValidationError,
  ApiValidationError as ApiValidationErrorResponse,
  ApiRateLimitError,
  HttpMethod,
  RequestConfig,
  ApiClientConfig,
  ApiMiddleware,
  RateLimitConfig,
  CacheConfig,
  ApiEndpoint
} from './api';

// Add type exports here as they are created 