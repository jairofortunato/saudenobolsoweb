// Utility functions and configurations
// Export all utilities from this file

export { createClient as createBrowserClient } from './supabase.js';
export { createClient as createServerClient } from './supabase-server.js';
export { createClient as createMiddlewareClient } from './supabase-middleware.js';

// AI Processing exports
export { openai, isOpenAIConfigured, testOpenAIConnection } from './openai.js';
export { MEDICAL_PROMPTS, type MedicalCategory } from './ai-prompts.js';
export { 
  processTextWithAI, 
  processAndSubmitMedicalEntry, 
  testAIProcessing,
  type ExtractedMedicalData,
  type AIProcessingResult 
} from './ai-processor.js';
export { cn } from './utils.js';
export { 
  validateCPF, 
  validatePIN, 
  validateEmail, 
  validatePassword, 
  validateRequired, 
  validateName, 
  validatePhone,
  formatCPF, 
  formatPIN, 
  formatPhone, 
  cleanNumeric,
  type ValidationResult 
} from './form-validation.js';
export {
  getRolePermissions,
  hasPermission,
  getDashboardRoute,
  isRouteAllowed,
  getPostAuthRedirect,
  getDisplayName,
  getRoleDisplayText,
  validateSignupForm,
  validateSigninForm,
  generateRandomPIN,
  isDevelopment,
  getSafeReturnUrl,
  type SignupFormData,
  type SigninFormData,
  type FormValidationResult
} from './auth-utils.js';
// Add other utility exports here 