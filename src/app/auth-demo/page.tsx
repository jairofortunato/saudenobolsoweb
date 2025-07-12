'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../components';
import { getDisplayName, getRoleDisplayText, getDashboardRoute } from '../../../lib/auth-utils';

export default function AuthDemoPage() {
  const { user, profile, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Authentication Demo
          </h1>
          <p className="text-slate-600">
            Test the complete authentication flow for Saúde no Bolso
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
            </CardHeader>
            <CardContent>
              {user && profile ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <h3 className="font-semibold text-green-800 mb-2">✅ Authenticated</h3>
                    <div className="space-y-2 text-sm text-green-700">
                      <div>
                        <strong>Nome:</strong> {getDisplayName(profile)}
                      </div>
                      <div>
                        <strong>Email:</strong> {profile.email}
                      </div>
                      <div>
                        <strong>CPF:</strong> {profile.cpf || 'Não informado'}
                      </div>
                      <div>
                        <strong>Tipo:</strong> {getRoleDisplayText(profile.role)}
                      </div>
                      <div>
                        <strong>Dashboard:</strong> {getDashboardRoute(profile.role)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Link href={getDashboardRoute(profile.role)}>
                      <Button variant="primary" className="w-full">
                        Ir para Dashboard
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      onClick={handleSignOut}
                      className="w-full"
                    >
                      Sair da Conta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h3 className="font-semibold text-red-800 mb-2">❌ Not Authenticated</h3>
                    <p className="text-sm text-red-700">
                      Você precisa fazer login para acessar o sistema.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Link href="/signin">
                      <Button variant="primary" className="w-full">
                        Fazer Login
                      </Button>
                    </Link>
                    
                    <Link href="/signup">
                      <Button variant="secondary" className="w-full">
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feature Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">✨ Implemented Features</h3>
                  <ul className="space-y-1 text-sm text-slate-600">
                    <li>• Complete signup with CPF validation</li>
                    <li>• 6-digit PIN with security checks</li>
                    <li>• Role-based access (Patient/Doctor)</li>
                    <li>• Email/password authentication</li>
                    <li>• Automatic role-based redirects</li>
                    <li>• Session persistence</li>
                    <li>• Form validation with error handling</li>
                    <li>• Loading states and success feedback</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">🔐 Security Features</h3>
                  <ul className="space-y-1 text-sm text-slate-600">
                    <li>• Brazilian CPF validation algorithm</li>
                    <li>• PIN pattern validation (no sequential/repeating)</li>
                    <li>• Password strength requirements</li>
                    <li>• Protected routes based on user role</li>
                    <li>• Safe redirect URL validation</li>
                    <li>• Supabase RLS (Row Level Security)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Links */}
        <Card>
          <CardHeader>
            <CardTitle>Available Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Auth Pages */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Authentication</h3>
                <div className="space-y-2">
                  <Link href="/signup">
                    <Button variant="outline" size="sm" className="w-full">
                      Signup Page
                    </Button>
                  </Link>
                  <Link href="/signin">
                    <Button variant="outline" size="sm" className="w-full">
                      Signin Page
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Component Demos */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Component Demos</h3>
                <div className="space-y-2">
                  <Link href="/form-components-demo">
                    <Button variant="outline" size="sm" className="w-full">
                      Form Components
                    </Button>
                  </Link>
                  <Link href="/components-demo">
                    <Button variant="outline" size="sm" className="w-full">
                      UI Components
                    </Button>
                  </Link>
                  <Link href="/layout-demo">
                    <Button variant="outline" size="sm" className="w-full">
                      Layout Demo
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Dashboard Pages */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Dashboards</h3>
                <div className="space-y-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="w-full">
                      Patient Dashboard
                    </Button>
                  </Link>
                  <Link href="/doctor/dashboard">
                    <Button variant="outline" size="sm" className="w-full">
                      Doctor Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Other Pages */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Other</h3>
                <div className="space-y-2">
                  <Link href="/test-supabase">
                    <Button variant="outline" size="sm" className="w-full">
                      Supabase Test
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" size="sm" className="w-full">
                      Home Page
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Development Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-700">
                <p><strong>Database:</strong> Supabase with RLS enabled</p>
                <p><strong>Auth Provider:</strong> Supabase Auth</p>
                <p><strong>State Management:</strong> React Context + Hooks</p>
                <p><strong>Validation:</strong> Custom validation utilities</p>
                <p><strong>Styling:</strong> Tailwind CSS with custom components</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 