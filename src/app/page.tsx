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
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

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

  // Lazy load video when it comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadVideo(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' } // Load when 10% visible or 50px before
    );

    if (videoContainerRef.current) {
      observer.observe(videoContainerRef.current);
    }

    return () => observer.disconnect();
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
                  <button
                    className="px-6 py-2 text-sm font-medium text-white rounded-[16px] transition-all duration-300 ease-out
                      bg-gradient-to-b from-[#5B9EE8] to-[#4F7FD9]
                      shadow-[0_4px_12px_rgba(79,127,217,0.3),0_2px_6px_rgba(79,127,217,0.2)]
                      hover:shadow-[0_8px_20px_rgba(79,127,217,0.4),0_4px_10px_rgba(79,127,217,0.3)]
                      hover:-translate-y-0.5
                      active:translate-y-0"
                  >
                    Criar Conta
                  </button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="outline" size="sm" className="bg-white/80 hover:bg-white">Entrar</Button>
                </Link>
                <Link href="/signup">
                  <button
                    className="px-6 py-2 text-sm font-medium text-white rounded-[16px] transition-all duration-300 ease-out
                      bg-gradient-to-b from-[#5B9EE8] to-[#4F7FD9]
                      shadow-[0_4px_12px_rgba(79,127,217,0.3),0_2px_6px_rgba(79,127,217,0.2)]
                      hover:shadow-[0_8px_20px_rgba(79,127,217,0.4),0_4px_10px_rgba(79,127,217,0.3)]
                      hover:-translate-y-0.5
                      active:translate-y-0"
                  >
                    Criar Conta
                  </button>
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
            <h1 className="font-petrona-normal text-5xl md:text-7xl lg:text-8xl tracking-tight text-white mb-8 leading-tight">
              Ganhe <span className="font-petrona-italic">tempo</span>,
              <br />
              foque no <span className="font-petrona-italic">paciente</span>.
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed">
              Seus Prontuários Prontos em Segundos, Direto no WhatsApp.
            </p>

            {/* CTA Button */}
            <div className="flex justify-center mb-16">
              <Link href="/signup">
                <button
                  className="group relative px-8 py-4 text-lg font-medium text-white rounded-[20px] transition-all duration-300 ease-out
                    bg-gradient-to-b from-[#5B9EE8] to-[#4F7FD9]
                    shadow-[0_8px_24px_rgba(79,127,217,0.4),0_4px_12px_rgba(79,127,217,0.3)]
                    hover:shadow-[0_16px_40px_rgba(79,127,217,0.5),0_8px_20px_rgba(79,127,217,0.4)]
                    hover:-translate-y-1
                    active:translate-y-0"
                >
                  Teste Gratis
                </button>
              </Link>
            </div>

            {/* Hero Video */}
            <div ref={videoContainerRef} className="max-w-5xl mx-auto mb-20">
              <div className="relative rounded-2xl shadow-2xl overflow-hidden aspect-video bg-gradient-to-br from-slate-800 to-slate-900">
                {shouldLoadVideo ? (
                  <video
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    muted
                    autoPlay
                    loop
                    preload="metadata"
                  >
                    <source src="/herolow.mp4" type="video/mp4" />
                    <p className="text-white/60 text-sm p-4">Seu navegador não suporta vídeos HTML5.</p>
                  </video>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-10 h-10 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                      </div>
                      <p className="text-white/60 text-sm font-medium">Carregando vídeo...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="max-w-6xl mx-auto pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Feature 1 - Audio Recording */}
                <div>
                  <h2 className="font-petrona-normal text-2xl md:text-3xl text-slate-900 mb-4">
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
                  <h2 className="font-petrona-normal text-2xl md:text-3xl text-slate-900 mb-4">
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
              <p className="text-2xl md:text-3xl text-slate-900 mb-8">
                Você não precisa anotar o que o paciente fala.
              </p>

              <h2 className="font-petrona-normal text-4xl md:text-5xl lg:text-6xl leading-tight mb-12">
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
                  <button
                    className="group relative px-8 py-4 text-lg font-medium text-white rounded-[20px] transition-all duration-300 ease-out
                      bg-gradient-to-b from-[#5B9EE8] to-[#4F7FD9]
                      shadow-[0_8px_24px_rgba(79,127,217,0.4),0_4px_12px_rgba(79,127,217,0.3)]
                      hover:shadow-[0_16px_40px_rgba(79,127,217,0.5),0_8px_20px_rgba(79,127,217,0.4)]
                      hover:-translate-y-1
                      active:translate-y-0"
                  >
                    Teste Gratis
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-petrona-normal text-4xl md:text-5xl lg:text-6xl text-slate-900 mb-8">
                Teste Grátis 5 Consultas e Economize Seu Tempo Hoje.
              </h2>
              <Link href="/signup">
                <button
                  className="group relative px-8 py-4 text-lg font-medium text-white rounded-[20px] transition-all duration-300 ease-out
                    bg-gradient-to-b from-[#5B9EE8] to-[#4F7FD9]
                    shadow-[0_8px_24px_rgba(79,127,217,0.4),0_4px_12px_rgba(79,127,217,0.3)]
                    hover:shadow-[0_16px_40px_rgba(79,127,217,0.5),0_8px_20px_rgba(79,127,217,0.4)]
                    hover:-translate-y-1
                    active:translate-y-0"
                >
                  Teste Gratis
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 4 - Safety & Features */}
        <section className="py-32 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="mb-16 text-center">
              <p className="text-blue-600 text-sm md:text-base font-semibold mb-4">
                Segurança e Confiabilidade
              </p>
              <h2 className="font-petrona-normal text-4xl md:text-5xl lg:text-6xl text-slate-900 max-w-4xl mx-auto mb-12">
                Atenda com confiança, seus dados são 100% privados e seguros.
              </h2>
            </div>

            {/* Single Column Content */}
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl md:text-2xl text-slate-700 leading-relaxed">
                  Você não precisa de mais um sistema. Converse naturalmente gravando pelo whatsapp que cuidamos do resto.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl md:text-2xl text-slate-700 leading-relaxed">
                  Testamos e iteramos nossos modelos em cenários do mundo real para garantir que a IA permaneça precisa, confiável e clinicamente sólida.
                </p>
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
