'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showBackLink?: boolean;
  backLinkHref?: string;
  backLinkText?: string;
}

const AuthLayout = React.forwardRef<HTMLDivElement, AuthLayoutProps>(
  ({ 
    children, 
    className,
    title,
    subtitle,
    showLogo = true,
    showBackLink = false,
    backLinkHref = '/',
    backLinkText = 'Voltar ao início',
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8",
          className
        )}
        {...props}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-green-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-yellow-200/20 to-pink-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo and Header */}
          {showLogo && (
            <div className="text-center mb-8">
              <Link 
                href="/"
                className="inline-flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
              >
                <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                  <span className="text-white font-bold text-lg">SB</span>
                </div>
                <span className="text-2xl font-bold text-slate-800">
                  Saúde no Bolso
                </span>
              </Link>
            </div>
          )}

          {/* Back Link */}
          {showBackLink && (
            <div className="mb-6">
              <Link 
                href={backLinkHref}
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-800 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {backLinkText}
              </Link>
            </div>
          )}

          {/* Title and Subtitle */}
          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && (
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-slate-600">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-3xl border border-white/50 sm:px-10">
            {children}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Sistema seguro de gestão de prontuários médicos
            </p>
            <div className="mt-4 flex justify-center space-x-6 text-xs text-slate-500">
              <span>🔒 Dados criptografados</span>
              <span>🏥 Aprovado por médicos</span>
              <span>📱 Acesso móvel</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-16 text-center">
          <p className="text-xs text-slate-500">
            © 2024 Saúde no Bolso. Todos os direitos reservados.
          </p>
          <div className="mt-2 flex justify-center space-x-4 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors duration-200">
              Privacidade
            </Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors duration-200">
              Termos
            </Link>
            <Link href="/help" className="hover:text-slate-600 transition-colors duration-200">
              Ajuda
            </Link>
          </div>
        </div>
      </div>
    );
  }
);

AuthLayout.displayName = "AuthLayout";

export { AuthLayout }; 