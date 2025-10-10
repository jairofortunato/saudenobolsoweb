/**
 * Authentication utility functions for Saude no Bolso
 * Provides role checks, redirects, and form helpers
 */

import { type Profile, type UserRole } from '../types/database';
import { type RolePermissions, ROLE_PERMISSIONS } from '../types/auth';

/**
 * Get permissions for a user role
 */
export const getRolePermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role];
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (
  role: UserRole | undefined, 
  permission: keyof RolePermissions
): boolean => {
  if (!role) return false;
  return getRolePermissions(role)[permission];
};

/**
 * Get dashboard route based on user role
 * Updated to redirect all users to ProntoDoc RCR-30 page after login
 */
export const getDashboardRoute = (role: UserRole): string => {
  // Always redirect to ProntoDoc RCR-30 page after login
  return '/doctor/prontodoc-rcr30';

  // Old role-based routing (commented out):
  // switch (role) {
  //   case 'patient':
  //     return '/dashboard';
  //   case 'doctor':
  //     return '/doctor/dashboard';
  //   default:
  //     return '/';
  // }
};

/**
 * Check if current route is allowed for user role
 */
export const isRouteAllowed = (route: string, role: UserRole | undefined): boolean => {
  if (!role) return false;

  // Public routes (always allowed)
  const publicRoutes = ['/', '/signin', '/signup', '/emergency'];
  if (publicRoutes.includes(route)) return true;

  // Shared routes (allowed for both patients and doctors)
  const sharedRoutes = ['/prontodoc-rcr30', '/prontodoc', '/prontuarios'];
  if (sharedRoutes.some(allowedRoute => route.startsWith(allowedRoute))) {
    return true;
  }

  // Patient routes
  const patientRoutes = ['/dashboard', '/medications', '/allergies', '/exams', '/diseases', '/consultations'];

  // Doctor routes
  const doctorRoutes = ['/doctor'];

  if (role === 'patient') {
    return patientRoutes.some(allowedRoute => route.startsWith(allowedRoute));
  }

  if (role === 'doctor') {
    return doctorRoutes.some(allowedRoute => route.startsWith(allowedRoute));
  }

  return false;
};

/**
 * Get redirect URL after successful authentication
 */
export const getPostAuthRedirect = (role: UserRole, intendedRoute?: string): string => {
  // If there's an intended route and it's allowed for the role, go there
  if (intendedRoute && isRouteAllowed(intendedRoute, role)) {
    return intendedRoute;
  }
  
  // Otherwise, go to the role's default dashboard
  return getDashboardRoute(role);
};

/**
 * Format display name from profile
 */
export const getDisplayName = (profile: Profile | null): string => {
  if (!profile) return 'Usuário';
  
  if (profile.full_name) {
    const names = profile.full_name.split(' ');
    if (names.length > 1) {
      return `${names[0]} ${names[names.length - 1]}`;
    }
    return names[0];
  }
  
  return profile.email?.split('@')[0] || 'Usuário';
};

/**
 * Get role display text
 */
export const getRoleDisplayText = (role: UserRole): string => {
  switch (role) {
    case 'patient':
      return 'Paciente';
    case 'doctor':
      return 'Médico';
    default:
      return 'Usuário';
  }
};

/**
 * Validate form data for signup
 */
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  pin: string;
  role: UserRole;
  fullName: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateSignupForm = (data: SignupFormData): FormValidationResult => {
  const errors: Record<string, string> = {};

  // Email validation
  if (!data.email) {
    errors.email = 'Email é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email inválido';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Senha é obrigatória';
  } else if (data.password.length < 8) {
    errors.password = 'Senha deve ter pelo menos 8 caracteres';
  }

  // Confirm password validation
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Confirmação de senha é obrigatória';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Senhas não coincidem';
  }

  // CPF validation (basic check - detailed validation is in form-validation.ts)
  if (!data.cpf) {
    errors.cpf = 'CPF é obrigatório';
  }

  // PIN validation
  if (!data.pin) {
    errors.pin = 'PIN é obrigatório';
  }

  // Role validation
  if (!data.role) {
    errors.role = 'Tipo de usuário é obrigatório';
  }

  // Full name validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = 'Nome completo é obrigatório';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate signin form data
 */
export interface SigninFormData {
  email: string;
  password: string;
}

export const validateSigninForm = (data: SigninFormData): FormValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = 'Email é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email inválido';
  }

  if (!data.password) {
    errors.password = 'Senha é obrigatória';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Generate random PIN for testing/demo purposes
 */
export const generateRandomPIN = (): string => {
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  
  // Ensure it's not all the same digit or sequential
  if (/^(\d)\1{5}$/.test(pin) || /^(012345|123456|234567|345678|456789|567890|987654|876543|765432|654321|543210|432109)$/.test(pin)) {
    return generateRandomPIN(); // Recursively generate a new one
  }
  
  return pin;
};

/**
 * Check if environment is development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Get safe return URL for redirects
 */
export const getSafeReturnUrl = (returnUrl: string | null, userRole: UserRole): string => {
  // Default dashboard for the user's role
  const defaultUrl = getDashboardRoute(userRole);
  
  // If no return URL provided, use default
  if (!returnUrl) return defaultUrl;
  
  // Only allow relative URLs for security
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return isRouteAllowed(returnUrl, userRole) ? returnUrl : defaultUrl;
  }
  
  return defaultUrl;
}; 