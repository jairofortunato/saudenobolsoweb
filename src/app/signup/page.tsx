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
import { WhatsAppReturnModal } from '../../../components/WhatsAppReturnModal';
import { useAuth } from '../../../hooks/useAuth';
import { validateCPF, validatePIN, validateEmail, validatePassword, validateName } from '../../../lib/form-validation';
import { getDashboardRoute } from '../../../lib/auth-utils';
import { isMobileDevice, isFromWhatsApp } from '../../../lib/device-utils';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  role: UserRole | '';
  fullName: string;
}

interface FormErrors {
  [key: string]: string;
}

// Enable patient signup mode
const ENABLE_PATIENT_SIGNUP = true; // Allow patients to create accounts

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, error: authError, user } = useAuth();
  
  // Check URL params for patient mode or default to doctor mode
  const [isPatientMode, setIsPatientMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'doctor') {
        return false; // Doctor mode
      }
      if (params.get('mode') === 'patient') {
        return true; // Patient mode
      }
    }
    return false; // Default to doctor mode for public signup
  });
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    cpf: '',
    role: isPatientMode ? 'patient' : 'doctor', // Set role based on mode
    fullName: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFromWA, setIsFromWA] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // Detect mobile device and WhatsApp
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsFromWA(isFromWhatsApp());
  }, []);

  // Handle successful signup - auto-redirect to WhatsApp or show modal/dashboard
  useEffect(() => {
    if (showSuccess) {
      if (isMobile && isFromWA) {
        // Auto-redirect to WhatsApp after countdown
        setShowWhatsAppModal(true);
        const whatsappLink = 'https://wa.me/5548996728482?text=Prontodoc';

        // Start countdown
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Redirect to WhatsApp
              window.location.href = whatsappLink;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(countdownInterval);
      } else if (isMobile) {
        // Show WhatsApp return modal on mobile (manual action)
        setShowWhatsAppModal(true);
      } else {
        // Redirect to dashboard on desktop
        const timeout = setTimeout(() => {
          const dashboardRoute = getDashboardRoute(isPatientMode ? 'patient' : 'doctor');
          router.push(dashboardRoute);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [showSuccess, isMobile, isFromWA, isPatientMode, router]);

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

    // CPF validation removed - not required for signup

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
      // Prepare signup data without CPF
      const signupData: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role as UserRole,
        fullName: formData.fullName
      };

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

  const handleRoleChange = (role: UserRole) => {
    handleInputChange('role', role);
  };

  const handleContinueInBrowser = () => {
    setShowWhatsAppModal(false);
    const dashboardRoute = getDashboardRoute(isPatientMode ? 'patient' : 'doctor');
    router.push(dashboardRoute);
  };

  // Show WhatsApp modal on mobile
  if (showWhatsAppModal) {
    // If from WhatsApp, show countdown
    if (isFromWA && redirectCountdown > 0) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Conta criada com sucesso!
              </h2>
              {formData.fullName && (
                <p className="text-white/90 text-sm">
                  Bem-vindo, Dr(a). {formData.fullName}
                </p>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-center">
              <p className="text-slate-700 font-medium">
                Você já está logado!
              </p>
              <p className="text-slate-600 text-sm">
                Redirecionando para WhatsApp em...
              </p>

              {/* Countdown */}
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{redirectCountdown}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  No WhatsApp, envie seu email e senha para fazer login
                </p>
              </div>

              {/* Cancel option */}
              <button
                onClick={handleContinueInBrowser}
                className="text-sm text-slate-600 hover:text-slate-800 underline transition-colors"
              >
                Cancelar e continuar no navegador
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Regular modal (no auto-redirect)
    return (
      <WhatsAppReturnModal
        isOpen={showWhatsAppModal}
        doctorName={formData.fullName}
        onContinueInBrowser={handleContinueInBrowser}
      />
    );
  }

  // Show success message on desktop
  if (showSuccess && !isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
              Você será redirecionado para o painel em instantes...
            </p>
            <div className="animate-spin h-6 w-6 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Criar Conta - Médico
          </h1>
          <p className="text-slate-600 mb-4">
            Cadastre-se como médico no ProntoDoc
          </p>

          {/* Mode Toggle - Hidden for public, accessible via URL params ?mode=patient */}
          <div className="hidden">
            <Button
              type="button"
              variant={isPatientMode ? "primary" : "outline"}
              onClick={() => {
                setIsPatientMode(true);
                setFormData(prev => ({ ...prev, role: 'patient' }));
              }}
              size="sm"
            >
              👤 Paciente
            </Button>
            <Button
              type="button"
              variant={!isPatientMode ? "primary" : "outline"}
              onClick={() => {
                setIsPatientMode(false);
                setFormData(prev => ({ ...prev, role: 'doctor' }));
              }}
              size="sm"
            >
              👨‍⚕️ Médico
            </Button>
          </div>
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

              {/* CPF field removed for simpler signup */}

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