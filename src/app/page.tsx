'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';

export default function Home() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  // Redirect all authenticated users to ProntoDoc RCR-30 page
  useEffect(() => {
    if (user && profile) {
      router.push('/doctor/prontodoc-rcr30');
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
    <div className="min-h-screen bg-[#DDE3EF] relative overflow-hidden">
      <header className="relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/prontodoclogo.png"
              alt="ProntoDoc"
              width={160}
              height={45}
              className="object-contain"
              priority
            />
          </div>
          <nav className="flex items-center gap-4">
            {user && profile ? (
              <>
                <span className="text-sm text-slate-700 hidden sm:inline">
                  Olá, {profile.full_name?.split(' ')[0] || 'Usuário'}
                </span>
                <Link href="/signin">
                  <Button variant="outline" size="sm" className="bg-white/80 hover:bg-white">Entrar</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-0">
                    Começar
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="outline" size="sm" className="bg-white/80 hover:bg-white">Entrar</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-0">
                    Começar
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Section 1 - Hero */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 md:pt-32 md:pb-40">
        <section className="text-center">
          {user && profile ? (
            <>
              <p className="text-sm md:text-base text-slate-600 mb-6 font-medium">
                Bem-vindo de volta!
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
                Pronto para criar
                <br />
                <span className="italic font-serif">prontuários.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto mb-10 leading-relaxed">
                {profile.role === 'doctor'
                  ? 'Seu assistente de IA capturando notas, resumos e acompanhamentos enquanto você atende. Ao seu lado enquanto o atendimento flui.'
                  : 'Gerencie seus dados médicos de forma segura e organizada.'
                }
              </p>
              <div className="flex justify-center">
                {profile.role === 'doctor' ? (
                  <Link href="/doctor/prontodoc-rcr30">
                    <Button
                      size="lg"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    >
                      <span className="mr-2">+</span> Começar ProntoDoc gratuitamente
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                    >
                      Acessar meus dados
                    </Button>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm md:text-base text-slate-600 mb-6 font-medium">
                IA confiável e amada por médicos
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
                Ganhe tempo,
                <br />
                <span className="italic font-serif">foque no paciente.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto mb-10 leading-relaxed">
                Seu assistente de IA capturando notas, resumos e acompanhamentos
                <br />
                enquanto você atende. Ao seu lado enquanto o atendimento flui.
              </p>
              <div className="flex justify-center">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="mr-2">+</span> Começar ProntoDoc gratuitamente
                  </Button>
                </Link>
              </div>
            </>
          )}
        </section>
        </div>

        {/* Gradient transition to white */}
        <div className="h-32 bg-gradient-to-b from-[#DDE3EF] to-white"></div>

        {/* Section 2 - How it works */}
        <section className="py-20 bg-white relative z-10">
          <div className="flex justify-center">
            <Link href="/signup" className="cursor-pointer">
              <Image
                src="/session2.png"
                alt="Iniciar transcrição"
                width={400}
                height={600}
                className="object-contain transition-transform duration-300 hover:scale-110"
              />
            </Link>
          </div>
        </section>

        {/* Gradient transition back to color */}
        <div className="h-32 bg-gradient-to-b from-white to-[#DDE3EF]"></div>

        {/* Section 3 - Workflow */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-32">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Curved line connecting the points */}
              <svg className="absolute top-0 left-0 w-full h-24 -z-10" viewBox="0 0 1200 100" preserveAspectRatio="none">
                <path
                  d="M 0 50 Q 300 0, 600 50 T 1200 50"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {/* Before the consult */}
                <div className="relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="pt-8 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Antes da consulta</h3>
                    <p className="text-slate-700 leading-relaxed">
                      Revise histórico, notas e resultados em um só lugar, sincronize agendas e entre preparado com descobertas essenciais.
                    </p>
                  </div>
                </div>

                {/* During the consult */}
                <div className="relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="pt-8 text-center">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Durante a consulta</h3>
                    <p className="text-slate-700 leading-relaxed">
                      Transcreva consultas em tempo real, estruture notas do seu jeito e gere instantaneamente encaminhamentos e orientações.
                    </p>
                  </div>
                </div>

                {/* After the consult */}
                <div className="relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="pt-8 text-center md:text-right">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Depois da consulta</h3>
                    <p className="text-slate-700 leading-relaxed">
                      Envie tudo para seu sistema com um clique, aplique códigos e tarefas automaticamente e termine seu dia no horário sem atrasos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>

        {/* Section 4 - How ProntoDoc Works */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-32">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              A ferramenta mais <span className="italic font-serif">simples</span> do mercado
            </h2>
            <p className="text-xl text-slate-700 max-w-3xl mx-auto">
              ProntoDoc é a maneira mais fácil de gerar prontuários automáticos.
              Escolha como prefere trabalhar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Web Platform */}
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">No Site</h3>
              <p className="text-slate-700 mb-4 leading-relaxed">
                Acesse pelo navegador, ative o microfone e comece a atender.
                O ProntoDoc transcreve em tempo real e gera o prontuário estruturado automaticamente.
              </p>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Transcrição em tempo real</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Prontuário formatado automaticamente</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Edição e revisão facilitadas</span>
                </li>
              </ul>
            </div>

            {/* WhatsApp Integration */}
            <div className="p-8">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Pelo WhatsApp</h3>
              <p className="text-slate-700 mb-4 leading-relaxed">
                Ainda mais simples: grave um áudio no WhatsApp durante ou após a consulta
                e envie para o ProntoDoc. Receba o prontuário completo em segundos.
              </p>
              <ul className="space-y-3 text-slate-700">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Envie áudios diretamente pelo WhatsApp</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Processamento automático da consulta</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Receba o prontuário pronto em segundos</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-lg text-slate-700 mb-6">
              Escolha a forma que melhor se adapta ao seu fluxo de trabalho
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
              >
                Experimente gratuitamente
              </Button>
            </Link>
          </div>
        </section>
        </div>
      </main>

      <footer className="relative z-10 bg-[#DDE3EF]/80 backdrop-blur-sm border-t border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Legal links section */}
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm text-slate-600">
            <Link href="/politica-privacidade" className="hover:text-slate-900 transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos-servico" className="hover:text-slate-900 transition-colors">
              Termos de Serviço
            </Link>
            <Link href="/exclusao-dados" className="hover:text-slate-900 transition-colors">
              Exclusão de Dados
            </Link>
          </div>

          {/* Main footer content */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 border-t border-slate-200/50 pt-6">
            <span>© {new Date().getFullYear()} ProntoDoc - Saúde no Bolso</span>
            <div className="flex items-center gap-6">
              <Link href="/signin" className="hover:text-slate-900 transition-colors">Entrar</Link>
              <Link href="/signup" className="hover:text-slate-900 transition-colors">Criar conta</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
