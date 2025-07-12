'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../components';
import { getDashboardRoute, getDisplayName } from '../../lib/auth-utils';

export default function Home() {
  const { user, profile, loading, error, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading screen while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an auth error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Erro de Conexão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                Não foi possível conectar ao sistema. Verifique sua conexão com a internet e tente novamente.
              </p>
              <p className="text-sm text-red-600 mb-4">
                Erro: {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="primary"
                className="w-full"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-800">
                Saúde no Bolso
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-slate-600">
                    Olá, {profile ? getDisplayName(profile) : user.email}
                  </span>
                  {profile && (
                    <Link href={getDashboardRoute(profile.role)}>
                      <Button variant="primary" size="sm">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/signin">
                    <Button variant="outline" size="sm">
                      Entrar
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" size="sm">
                      Criar Conta
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
            Sua saúde sempre
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
              no seu bolso
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Gerencie suas informações médicas de forma segura e tenha acesso rápido 
            em situações de emergência. Para pacientes e médicos.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button variant="primary" size="xl" className="min-w-[200px]">
                  Começar Agora
                </Button>
              </Link>
              <Link href="/signin">
                <Button variant="secondary" size="xl" className="min-w-[200px]">
                  Já tenho conta
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          
          {/* For Patients */}
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <CardTitle>Para Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Gerencie medicamentos e alergias</li>
                <li>• Histórico de exames e consultas</li>
                <li>• PIN de emergência para médicos</li>
                <li>• Dados sempre atualizados</li>
              </ul>
            </CardContent>
          </Card>

          {/* For Doctors */}
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <CardTitle>Para Médicos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Acesso rápido por CPF + PIN</li>
                <li>• Histórico médico completo</li>
                <li>• Informações de emergência</li>
                <li>• Adicionar novos registros</li>
              </ul>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <CardTitle>Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Dados criptografados</li>
                <li>• Autenticação segura</li>
                <li>• Validação de CPF brasileira</li>
                <li>• Controle de acesso por roles</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Demo Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-slate-50 to-slate-100">
            <CardHeader>
              <CardTitle>Experimente o Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-6">
                Teste todas as funcionalidades com as páginas de demonstração
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/auth-demo">
                  <Button variant="outline" className="w-full">
                    Demo de Autenticação
                  </Button>
                </Link>
                <Link href="/form-components-demo">
                  <Button variant="outline" className="w-full">
                    Demo de Componentes
                  </Button>
                </Link>
                <Link href="/components-demo">
                  <Button variant="outline" className="w-full">
                    Demo de UI
                  </Button>
                </Link>
                <Link href="/test-supabase">
                  <Button variant="outline" className="w-full">
                    Teste Supabase
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Development Status */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="max-w-2xl mx-auto bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">Development Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm">
                  <strong>Authentication Status:</strong>
                  <div className="mt-2 p-3 bg-white rounded-lg">
                    {user ? (
                      <div className="text-green-700">
                        ✅ Authenticated as {profile ? getDisplayName(profile) : user.email}
                        {profile ? ` (${profile.role})` : ' (profile loading...)'}
                      </div>
                    ) : (
                      <div className="text-red-700">
                        ❌ Not authenticated
                      </div>
                    )}
                  </div>
                </div>
                
                {user && (
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700">
                      <strong>Quick Actions:</strong>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSignOut}>
                        Clear Session
                      </Button>
                      {profile && (
                        <Link href={getDashboardRoute(profile.role)}>
                          <Button variant="primary" size="sm">
                            Go to Dashboard
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="space-y-2">
                    <p className="text-sm text-blue-700">
                      <strong>Test Signup/Signin:</strong>
                    </p>
                    <div className="flex gap-2">
                      <Link href="/signup">
                        <Button variant="primary" size="sm">
                          Test Signup
                        </Button>
                      </Link>
                      <Link href="/signin">
                        <Button variant="secondary" size="sm">
                          Test Signin
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Saúde no Bolso</h3>
              <p className="text-slate-300 text-sm">
                Plataforma segura para gerenciamento de informações médicas, 
                desenvolvida para facilitar o acesso em emergências.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Funcionalidades</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Gestão de medicamentos</li>
                <li>Histórico de consultas</li>
                <li>Informações de emergência</li>
                <li>Acesso médico seguro</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tecnologia</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Next.js + TypeScript</li>
                <li>Supabase Database</li>
                <li>Tailwind CSS</li>
                <li>Autenticação Segura</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Saúde no Bolso. Desenvolvido para cuidar da sua saúde.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
