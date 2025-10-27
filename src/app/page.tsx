'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';

export default function Home() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState({ line1: 0, line2: 0, line3: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  // Redirect all authenticated users to ProntoDoc RCR-30 page
  useEffect(() => {
    if (user && profile) {
      router.push('/doctor/prontodoc-rcr30');
    }
  }, [user, profile, router]);

  // Scroll animation effect
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const section = sectionRef.current;
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate when section is in view
      const sectionTop = rect.top;
      const sectionHeight = rect.height;

      // Start animation when section is 60% in viewport
      const triggerPoint = windowHeight * 0.6;

      if (sectionTop < triggerPoint && sectionTop > -sectionHeight) {
        // Calculate progress (0 to 1) for the entire section
        const progress = Math.max(0, Math.min(1, (triggerPoint - sectionTop) / (sectionHeight * 0.6)));

        // Each line animates in sequence with some overlap
        const line1Progress = Math.max(0, Math.min(1, progress * 3));
        const line2Progress = Math.max(0, Math.min(1, (progress - 0.2) * 3));
        const line3Progress = Math.max(0, Math.min(1, (progress - 0.4) * 3));

        setScrollProgress({
          line1: line1Progress,
          line2: line2Progress,
          line3: line3Progress
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Helper function to get color based on progress
  const getTextColor = (progress: number) => {
    // Interpolate between slate-300 (#CBD5E1) and slate-900 (#0F172A)
    const from = { r: 203, g: 213, b: 225 }; // slate-300
    const to = { r: 15, g: 23, b: 42 }; // slate-900

    const r = Math.round(from.r + (to.r - from.r) * progress);
    const g = Math.round(from.g + (to.g - from.g) * progress);
    const b = Math.round(from.b + (to.b - from.b) * progress);

    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
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

      {/* Decorative blue gradient ellipse at top - only bottom half visible */}
      <div className="absolute top-0 left-0 right-0 h-[900px] overflow-hidden pointer-events-none">
        <div className="absolute top-[-350px] left-1/2 -translate-x-1/2 w-[110%] h-[1100px]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4F95DF] via-[#6FA8E5] to-transparent opacity-90 rounded-[50%] blur-3xl"></div>
          {/* Additional organic shapes for depth */}
          <div className="absolute top-[40%] left-[20%] w-[40%] h-[40%] bg-gradient-to-br from-[#4F95DF]/60 to-transparent rounded-[60%] blur-2xl"></div>
          <div className="absolute top-[45%] right-[15%] w-[35%] h-[35%] bg-gradient-to-bl from-[#4F95DF]/50 to-transparent rounded-[55%] blur-2xl"></div>
        </div>
      </div>

      <main className="relative">
        {/* Section 1 - Hero */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 md:pt-12 md:pb-24">
          <section className="text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 leading-tight">
              Ganhe tempo,
              <br />
              <span className="italic font-serif">foque no paciente.</span>
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
              Seu assistente de IA capturando notas, resumos e acompanhamentos
              <br />
              enquanto você atende. Ao seu lado enquanto o atendimento flui.
            </p>

            {/* CTA Button */}
            <div className="flex justify-center mb-16">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <span className="mr-2">▶</span> Começar ProntoDoc gratuitamente
                </Button>
              </Link>
            </div>

            {/* Video Placeholder */}
            <div className="max-w-5xl mx-auto mb-20">
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl aspect-video flex items-center justify-center border border-slate-700/50">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-10 h-10 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  </div>
                  <p className="text-white/60 text-sm font-medium">Vídeo será inserido aqui</p>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="max-w-6xl mx-auto pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Feature 1 - Audio Recording */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                    Grave áudio da consulta
                  </h2>
                  <p className="text-base md:text-lg text-slate-700 mb-6 leading-relaxed">
                    Grave pelo WhatsApp ou no site e gere prontuário pronto em 1 minuto.
                  </p>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-lg border border-slate-200">
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-2">Consulta gravada</h3>
                            <p className="text-sm text-slate-600">Áudio capturado durante o atendimento</p>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1 flex-1 bg-green-200 rounded-full overflow-hidden">
                                <div className="h-full w-3/4 bg-green-500 rounded-full"></div>
                              </div>
                              <span className="text-xs text-slate-500">5:23</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                          <svg className="w-5 h-5 text-blue-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Processando prontuário...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature 2 - Photo Upload */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                    Envie fotos dos exames
                  </h2>
                  <p className="text-base md:text-lg text-slate-700 mb-6 leading-relaxed">
                    Adicione ao prontuário instantaneamente com análise automática.
                  </p>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 shadow-lg border border-slate-200">
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">Hemograma completo</h3>
                              <p className="text-xs text-slate-500">Adicionado há 2 minutos</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">Raio-X Tórax</h3>
                              <p className="text-xs text-slate-500">Processando...</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>
        </div>

        {/* Section 3 - Big Typography Statement with smooth gradient */}
        <section ref={sectionRef} className="py-32 bg-gradient-to-b from-white via-[#E3E7F1] to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl">
              <h2 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold leading-tight mb-12">
                <span
                  style={{
                    color: getTextColor(scrollProgress.line1),
                    transition: 'color 0.3s ease-out'
                  }}
                >
                  Grave no WhatsApp,
                </span>
                <br />
                <span
                  style={{
                    color: getTextColor(scrollProgress.line2),
                    transition: 'color 0.3s ease-out'
                  }}
                >
                  o ProntoDoc escreve
                </span>
                <br />
                <span
                  style={{
                    color: getTextColor(scrollProgress.line3),
                    transition: 'color 0.3s ease-out'
                  }}
                >
                  por você.
                </span>
              </h2>

              <div className="mt-12">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <span className="mr-2">▶</span> Começar gratuitamente
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 - Privacy Features */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="mb-16">
              <p className="text-blue-600 text-sm md:text-base font-semibold mb-4">
                Completamente discreto
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 max-w-4xl">
                Atenda com confiança, seus dados são 100% privados e seguros.
              </h2>
            </div>

            {/* Three Feature Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Card 1 - LGPD Compliant */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 mb-6 aspect-square flex items-center justify-center border border-slate-300">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 text-sm font-medium">Placeholder do vídeo</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Conforme a LGPD.
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    ProntoDoc segue rigorosamente a Lei Geral de Proteção de Dados, garantindo que todas as informações dos pacientes sejam tratadas com máxima segurança.
                  </p>
                </div>
              </div>

              {/* Card 2 - Encrypted Data */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 mb-6 aspect-square flex items-center justify-center border border-blue-300">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 text-sm font-medium">Placeholder do vídeo</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Dados criptografados.
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Todas as informações são criptografadas de ponta a ponta. Seus prontuários e dados dos pacientes nunca são compartilhados ou acessados por terceiros.
                  </p>
                </div>
              </div>

              {/* Card 3 - You Control Your Data */}
              <div className="flex flex-col">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-8 mb-6 aspect-square flex items-center justify-center border border-purple-300">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 text-sm font-medium">Placeholder do vídeo</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Você controla seus dados.
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Você tem controle total sobre suas informações. Exporte, edite ou delete seus dados quando quiser, sem burocracia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 bg-slate-50 border-t border-slate-200">
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
