'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';

export default function Home() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  // Redirect users to their appropriate dashboards
  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'doctor') {
        router.push('/doctor/dashboard');
      } else if (profile.role === 'patient') {
        router.push('/dashboard');
      }
    }
  }, [user, profile, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-xl font-semibold text-slate-900">Prontodoc</span>
          </div>
          <nav className="flex items-center gap-3">
            {user && profile ? (
              // Authenticated user navigation
              <>
                <span className="text-sm text-slate-600">
                  Olá, {profile.full_name?.split(' ')[0] || 'Usuário'}
                </span>
                {profile.role === 'doctor' ? (
                  <Link href="/doctor/prontodoc-rcr30">
                    <Button variant="primary" size="sm">Ir para Prontuário</Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button variant="primary" size="sm">Meus Dados</Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sair
                </Button>
              </>
            ) : (
              // Guest navigation
              <>
                <Link href="/signin">
                  <Button variant="outline" size="sm">Entrar</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">Começar agora</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <section className="text-center mb-16 md:mb-24">
          {user && profile ? (
            // Authenticated user welcome
            <>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">
                Bem-vindo, {profile.full_name?.split(' ')[0]}!
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-6">
                {profile.role === 'doctor' 
                  ? 'Pronto para criar prontuários automáticos com IA? Acesse o ProntoDoc e comece a transcrever suas consultas.'
                  : 'Gerencie seus dados médicos de forma segura e organizada. Acesse suas informações quando precisar.'
                }
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                {profile.role === 'doctor' ? (
                  <>
                    <Link href="/doctor/prontodoc-rcr30">
                      <Button variant="primary" size="lg" className="min-w-[200px]">Abrir ProntoDoc</Button>
                    </Link>
                    <Link href="/doctor/search">
                      <Button variant="secondary" size="lg" className="min-w-[200px]">Buscar Pacientes</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard">
                      <Button variant="primary" size="lg" className="min-w-[200px]">Meus Dados Médicos</Button>
                    </Link>
                    <Link href="/consultations">
                      <Button variant="secondary" size="lg" className="min-w-[200px]">Minhas Consultas</Button>
                    </Link>
                  </>
                )}
              </div>
            </>
          ) : (
            // Guest welcome
            <>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">
                Prontuário Inteligente Automático
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-6">
                Pare de perder tempo digitando prontuários: ative o microfone e receba o prontuário pronto no fim da consulta
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup">
                  <Button variant="primary" size="lg" className="min-w-[200px]">Criar conta</Button>
                </Link>
                <Link href="/signin">
                  <Button variant="secondary" size="lg" className="min-w-[200px]">Fazer login</Button>
                </Link>
              </div>
            </>
          )}
        </section>



        <section className="bg-slate-50 rounded-lg p-6 md:p-8 mb-16">
          <div className="text-center">
            <p className="text-slate-800 text-lg">Transcrição instantânea e notas estruturadas em segundos. Poupe 2–4 horas por semana e foque no que importa: seus pacientes.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Legal links section */}
          <div className="flex flex-wrap justify-center gap-6 mb-4 text-sm text-slate-500">
            <Link href="/politica-privacidade" className="hover:text-slate-700">
              Política de Privacidade
            </Link>
            <Link href="/termos-servico" className="hover:text-slate-700">
              Termos de Serviço
            </Link>
            <Link href="/exclusao-dados" className="hover:text-slate-700">
              Exclusão de Dados
            </Link>
          </div>

          {/* Main footer content */}
          <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-200 pt-4">
            <span>© {new Date().getFullYear()} Prontodoc - Saúde no Bolso</span>
            <div className="flex items-center gap-4">
              <Link href="/signin" className="hover:text-slate-700">Entrar</Link>
              <Link href="/signup" className="hover:text-slate-700">Criar conta</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
