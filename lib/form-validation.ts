/**
 * Form validation utilities for Saude no Bolso
 * Includes CPF, PIN, email, password and other validation functions
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * CPF validation
 * Validates Brazilian CPF format and checksum
 */
export const validateCPF = (cpf: string): ValidationResult => {
  // Remove all non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check if CPF has 11 digits
  if (cleanCPF.length !== 11) {
    return { isValid: false, error: 'CPF deve ter 11 dígitos' };
  }
  
  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  // Validate CPF checksum algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) {
    return { isValid: false, error: 'CPF inválido' };
  }
  
  return { isValid: true };
};

/**
 * PIN validation
 * Validates 6-digit PIN format
 */
export const validatePIN = (pin: string): ValidationResult => {
  const cleanPIN = pin.replace(/\D/g, '');
  
  if (cleanPIN.length !== 6) {
    return { isValid: false, error: 'PIN deve ter 6 dígitos' };
  }
  
  // Check for sequential numbers (123456, 654321)
  if (/^(012345|123456|234567|345678|456789|567890|987654|876543|765432|654321|543210|432109)$/.test(cleanPIN)) {
    return { isValid: false, error: 'PIN não pode ser sequencial' };
  }
  
  // Check for repeating numbers (111111, 222222, etc.)
  if (/^(\d)\1{5}$/.test(cleanPIN)) {
    return { isValid: false, error: 'PIN não pode ter todos os dígitos iguais' };
  }
  
  return { isValid: true };
};

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email é obrigatório' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Email inválido' };
  }
  
  return { isValid: true };
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Senha é obrigatória' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Senha deve ter pelo menos 8 caracteres' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Senha deve conter pelo menos uma letra minúscula' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Senha deve conter pelo menos um número' };
  }
  
  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} é obrigatório` };
  }
  
  return { isValid: true };
};

/**
 * Name validation
 */
export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Nome é obrigatório' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }
  
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
    return { isValid: false, error: 'Nome deve conter apenas letras e espaços' };
  }
  
  return { isValid: true };
};

/**
 * Phone validation (Brazilian format)
 */
export const validatePhone = (phone: string): ValidationResult => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) {
    return { isValid: false, error: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  
  // Check if it's a valid mobile number format
  if (cleanPhone.length === 11 && !['9'].includes(cleanPhone.charAt(2))) {
    return { isValid: false, error: 'Número de celular inválido' };
  }
  
  return { isValid: true };
};

/**
 * Format CPF string
 */
export const formatCPF = (cpf: string): string => {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Format PIN string
 */
export const formatPIN = (pin: string): string => {
  const cleanPIN = pin.replace(/\D/g, '').slice(0, 6);
  return cleanPIN.replace(/(\d{3})(\d{3})/, '$1 $2');
};

/**
 * Format phone string
 */
export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

/**
 * Clean numeric string (remove all non-numeric characters)
 */
export const cleanNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
}; 