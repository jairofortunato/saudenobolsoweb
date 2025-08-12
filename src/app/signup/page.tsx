'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FormField, 
  CPFInput, 
  PINInput, 
  RoleSelector, 
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  type UserRole 
} from '../../../components';
import { useAuth } from '../../../hooks/useAuth';
import { validateCPF, validatePIN, validateEmail, validatePassword, validateName } from '../../../lib/form-validation';
import { getDashboardRoute } from '../../../lib/auth-utils';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  pin: string;
  role: UserRole | '';
  fullName: string;
}

interface FormErrors {
  [key: string]: string;
}

// Hidden patient signup mode - can be enabled by adding ?mode=patient to URL
const ENABLE_PATIENT_SIGNUP = false; // Set to true to show patient fields

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, error: authError, user } = useAuth();
  
  // Check URL params for patient mode (hidden feature)
  const [isPatientMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'patient' && ENABLE_PATIENT_SIGNUP;
    }
    return false;
  });
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    pin: '',
    role: isPatientMode ? '' : 'doctor', // Default to doctor for simplified UI
    fullName: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect to signin after successful signup
  useEffect(() => {
    if (showSuccess) {
      const timeout = setTimeout(() => {
        router.push('/signin');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [showSuccess, router]);

  // Allow authenticated users to access signup page for testing
  // In production, you might want to redirect authenticated users to dashboard

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!;
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error!;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    // CPF validation (only for patient mode)
    if (isPatientMode) {
      const cpfValidation = validateCPF(formData.cpf);
      if (!cpfValidation.isValid) {
        newErrors.cpf = cpfValidation.error!;
      }
    }

    // PIN validation (only for patient mode)
    if (isPatientMode) {
      const pinValidation = validatePIN(formData.pin.replace(/\s/g, ''));
      if (!pinValidation.isValid) {
        newErrors.pin = pinValidation.error!;
      }
    }

    // Role validation (only for patient mode, doctor is default)
    if (isPatientMode && !formData.role) {
      newErrors.role = 'Tipo de usuário é obrigatório';
    }

    // Full name validation
    const nameValidation = validateName(formData.fullName);
    if (!nameValidation.isValid) {
      newErrors.fullName = nameValidation.error!;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare signup data based on mode
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role as UserRole,
        fullName: formData.fullName
      };

      // Only include CPF and PIN for patient mode
      if (isPatientMode) {
        signupData.cpf = formData.cpf.replace(/\D/g, ''); // Remove formatting
        signupData.pin = formData.pin.replace(/\s/g, ''); // Remove formatting
      }

      const result = await signUp(signupData);

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Show email confirmation message instead of success
          setErrors({ email: 'Verifique seu email para confirmar a conta e tente novamente.' });
        } else {
          console.log(`✅ ${isPatientMode ? 'Patient' : 'Doctor'} signup successful`);
          setShowSuccess(true);
          // Redirect will happen automatically via useEffect when user state updates
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCPFChange = (value: string, isValid: boolean) => {
    handleInputChange('cpf', value);
  };

  const handlePINChange = (value: string, isValid: boolean) => {
    handleInputChange('pin', value);
  };

  const handleRoleChange = (role: UserRole) => {
    handleInputChange('role', role);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Conta criada com sucesso!</h2>
            <p className="text-slate-600 mb-6">
              {isPatientMode 
                ? 'Sua conta foi criada e seus dados médicos foram vinculados automaticamente.' 
                : 'Sua conta de médico foi criada com sucesso!'
              }<br/>
              Você será redirecionado para o login em instantes...
            </p>
            <div className="animate-spin h-6 w-6 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <Link href="/signin">
              <Button variant="primary" className="w-full mt-2">Ir para o login agora</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            {isPatientMode ? 'Criar Conta - Paciente' : 'Criar Conta - Médico'}
          </h1>
          <p className="text-slate-600">
            {isPatientMode 
              ? 'Cadastre-se como paciente no Saúde no Bolso'
              : 'Cadastre-se como médico no ProntoDoc'
            }
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Auth Error Display */}
              {authError && (
                <Alert variant="error">
                  {authError}
                </Alert>
              )}

              {/* Full Name */}
              <FormField 
                label="Nome Completo" 
                required
                error={errors.fullName}
              >
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Digite seu nome completo"
                />
              </FormField>

              {/* Email */}
              <FormField 
                label="Email" 
                required
                error={errors.email}
              >
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </FormField>

              {/* CPF - Only show in patient mode */}
              {isPatientMode && (
                <FormField 
                  label="CPF" 
                  required
                  error={errors.cpf}
                  helperText="Seu CPF será usado para verificação de identidade"
                >
                  <CPFInput
                    value={formData.cpf}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                  />
                </FormField>
              )}

              {/* PIN - Only show in patient mode */}
              {isPatientMode && (
                <FormField 
                  label="PIN de Emergência" 
                  required
                  error={errors.pin}
                  helperText="6 dígitos únicos para acesso médico de emergência"
                >
                  <PINInput
                    value={formData.pin}
                    onChange={handlePINChange}
                    placeholder="000 000"
                    showValue={false}
                  />
                </FormField>
              )}

              {/* Password Fields */}
              <div className="grid gap-6 md:grid-cols-2">
                <FormField 
                  label="Senha" 
                  required
                  error={errors.password}
                >
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </FormField>

                <FormField 
                  label="Confirmar Senha" 
                  required
                  error={errors.confirmPassword}
                >
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Digite a senha novamente"
                  />
                </FormField>
              </div>

              {/* Role Selector - Only show in patient mode */}
              {isPatientMode && (
                <FormField 
                  label="Tipo de Usuário" 
                  required
                  error={errors.role}
                  helperText="Selecione como você irá usar o sistema"
                >
                  <RoleSelector
                    value={formData.role === '' ? undefined : formData.role as UserRole}
                    onChange={handleRoleChange}
                    required
                  />
                </FormField>
              )}

              

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={isSubmitting || loading}
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting || loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </div>

              {/* Sign In Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-600">
                  Já tem uma conta?{' '}
                  <Link 
                    href="/signin" 
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Fazer login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 