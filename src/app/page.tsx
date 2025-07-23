'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Redirect to dashboard if user is authenticated
  useEffect(() => {
    if (!loading && user && profile) {
      router.push(getDashboardRoute(profile.role));
    }
  }, [loading, user, profile, router]);

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

      </main>
    </div>
  );
}
