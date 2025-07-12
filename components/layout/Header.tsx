'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  className?: string;
  showAuthButtons?: boolean;
  variant?: 'default' | 'dashboard' | 'auth';
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ className, showAuthButtons = true, variant = 'default', ...props }, ref) => {
    const { user, profile, signOut, loading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    const isDoctor = profile?.role === 'doctor';
    const isPatient = profile?.role === 'patient';

    const navigationItems = user ? [
      ...(isPatient ? [
        { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { href: '/medications', label: 'Medicamentos', icon: '💊' },
        { href: '/allergies', label: 'Alergias', icon: '⚠️' },
        { href: '/exams', label: 'Exames', icon: '🔬' },
        { href: '/diseases', label: 'Doenças', icon: '🩺' },
        { href: '/consultations', label: 'Consultas', icon: '👩‍⚕️' },
      ] : []),
      ...(isDoctor ? [
        { href: '/doctor/dashboard', label: 'Dashboard', icon: '🏥' },
        { href: '/doctor/patients', label: 'Pacientes', icon: '👥' },
        { href: '/doctor/search', label: 'Buscar Paciente', icon: '🔍' },
      ] : []),
    ] : [];

    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-sm transition-all duration-200",
          variant === 'dashboard' && "bg-gradient-to-r from-white to-slate-50",
          variant === 'auth' && "bg-gradient-to-r from-blue-50 to-purple-50",
          className
        )}
        {...props}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link 
              href={user ? (isDoctor ? '/doctor/dashboard' : '/dashboard') : '/'}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
            >
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <span className="text-xl font-bold text-slate-800 hidden sm:block">
                Saúde no Bolso
              </span>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            )}

            {/* User Menu / Auth Buttons */}
            <div className="flex items-center space-x-3">
              {user && profile ? (
                <div className="flex items-center space-x-3">
                  {/* Emergency Button for Patients */}
                  {isPatient && (
                    <Link href="/emergency">
                      <Button 
                        variant="danger" 
                        size="sm"
                        className="hidden sm:flex"
                      >
                        🚨 Emergência
                      </Button>
                    </Link>
                  )}

                  {/* User Profile */}
                  <div className="flex items-center space-x-3">
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-medium text-slate-800">
                        {profile.full_name}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {profile.role === 'doctor' ? 'Médico(a)' : 'Paciente'}
                      </p>
                    </div>
                    
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Sign Out Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSignOut}
                    loading={loading}
                    className="hidden sm:flex"
                  >
                    Sair
                  </Button>
                </div>
              ) : (
                showAuthButtons && (
                  <div className="flex items-center space-x-3">
                    <Link href="/signin">
                      <Button variant="ghost" size="sm">
                        Entrar
                      </Button>
                    </Link>
                    <Link href="/signup">
                      <Button variant="primary" size="sm">
                        Cadastrar
                      </Button>
                    </Link>
                  </div>
                )
              )}

              {/* Mobile Menu Button */}
              {user && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all duration-200 transform hover:scale-105"
                  aria-label="Toggle mobile menu"
                >
                  <svg
                    className={cn("h-5 w-5 transform transition-transform duration-200", 
                      isMobileMenuOpen && "rotate-45"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {user && isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 rounded-b-3xl mt-2 mx-2 shadow-lg">
              <nav className="space-y-2 px-4">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {/* Mobile Emergency & Sign Out */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  {isPatient && (
                    <Link 
                      href="/emergency"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button 
                        variant="danger" 
                        size="sm"
                        className="w-full"
                      >
                        🚨 Emergência
                      </Button>
                    </Link>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    loading={loading}
                    className="w-full"
                  >
                    Sair
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    );
  }
);

Header.displayName = "Header";

export { Header }; 