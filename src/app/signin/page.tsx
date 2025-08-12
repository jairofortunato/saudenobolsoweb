'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FormField, 
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert
} from '../../../components';
import { useAuth } from '../../../hooks/useAuth';
import { validateEmail } from '../../../lib/form-validation';
import { getDashboardRoute, getSafeReturnUrl } from '../../../lib/auth-utils';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  [key: string]: string;
}

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, loading, error: authError, user, profile } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Get return URL from search params
  const returnUrl = searchParams.get('returnUrl');

  // Redirect to dashboard after successful authentication
  useEffect(() => {
    if (user && profile) {
      const redirectUrl = getSafeReturnUrl(returnUrl, profile.role);
      router.replace(redirectUrl);
    }
  }, [user, profile, router, returnUrl]);

  // Allow authenticated users to access signin page for testing
  // In production, you might want to redirect authenticated users to dashboard

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
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
      const result = await signIn({
        email: formData.email,
        password: formData.password
      });

      if (result.success && result.user) {
        // Redirect will happen via useEffect when user state updates
        console.log('✅ Signin successful, waiting for redirect...');
      }
    } catch (error) {
      console.error('Signin error:', error);
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

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    // TODO: Implement password reset functionality
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Esqueceu a senha?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-slate-600">
                Entre em contato com o suporte para redefinir sua senha.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setShowForgotPassword(false)}
                className="w-full"
              >
                Voltar ao login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Entrar
          </h1>
        </div>

        <Card>
          <CardHeader>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Auth Error Display */}
              {authError && (
                <Alert variant="error">
                  {authError}
                </Alert>
              )}

              {/* Return URL Info */}
              {returnUrl && (
                <Alert variant="info">
                  Você será redirecionado após o login.
                </Alert>
              )}

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
                  autoComplete="email"
                />
              </FormField>

              {/* Password */}
              <FormField 
                label="Senha" 
                required
                error={errors.password}
              >
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
              </FormField>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button 
                  type="submit" 
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={isSubmitting || loading}
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting || loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </div>

              {/* Sign Up Link */}
              <div className="text-center pt-4">
                <p className="text-sm text-slate-600">
                  Não tem uma conta?{' '}
                  <Link 
                    href="/signup" 
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

      

        {/* Demo Accounts */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                Conta de Demonstração
              </h3>
              <div className="space-y-2 text-xs text-yellow-700">
          
                <div>
                  <strong>Médico:</strong> gabrielsmeister@gmail.com / Saude2025!
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SigninContent />
    </Suspense>
  );
}