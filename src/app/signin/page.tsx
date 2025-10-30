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
  const { signIn, signInWithGoogle, loading, error: authError, user, profile } = useAuth();
  
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

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        console.error('Google signin failed:', result.error);
      }
      // User will be redirected to Google, so no need to handle success here
    } catch (error) {
      console.error('Google signin error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen flex items-center justify-center p-4">
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

              {/* Google Sign In Button */}
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 border-slate-300 hover:bg-slate-50"
                  disabled={isSubmitting || loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">ou entre com email</span>
                  </div>
                </div>
              </div>

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