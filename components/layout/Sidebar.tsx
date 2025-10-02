'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { ProntuariosList } from './ProntuariosList';

export interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, collapsed = false, onCollapsedChange, ...props }, ref) => {
    const { user, profile, signOut, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(collapsed);

    // Minimal, inline SVG icons using currentColor
    const IconHome = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 10.5l9-7 9 7" />
        <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" />
      </svg>
    );

    const IconPill = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10.5 13.5l6-6a3.536 3.536 0 115 5l-6 6a3.536 3.536 0 11-5-5z" />
        <path d="M7 17l4-4" />
      </svg>
    );

    const IconAlert = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86l-8.13 14A1 1 0 003 19h18a1 1 0 00.87-1.5l-8.13-14a1 1 0 00-1.74 0z" />
      </svg>
    );

    const IconLab = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10 2v4l-6 10a3 3 0 002.6 4.5h10.8A3 3 0 0020 16L14 6V2" />
      </svg>
    );

    const IconStethoscope = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 4v6a4 4 0 108 0V4" />
        <path d="M2 4h8" />
        <path d="M14 14a4 4 0 008 0v-1" />
        <circle cx="18" cy="13" r="2" />
      </svg>
    );

    const IconUsers = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a3 3 0 010 5.74" />
      </svg>
    );

    const IconHospital = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M12 7v10" />
        <path d="M7 12h10" />
      </svg>
    );

    const IconCalendar = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );

    const IconFileText = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8M16 17H8M10 9H8" />
      </svg>
    );

    const IconTemplate = () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6" />
        <path d="M9 12h6" />
        <path d="M9 15h6" />
      </svg>
    );

    const IconLogout = () => (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
      </svg>
    );

    const handleToggleCollapse = () => {
      const newCollapsed = !isCollapsed;
      setIsCollapsed(newCollapsed);
      onCollapsedChange?.(newCollapsed);
    };

    const handleSignOut = async () => {
      try {
        await signOut();
        // Redirect to sign-in page after successful sign-out
        router.push('/signin');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    const isDoctor = profile?.role === 'doctor';

    const patientNavItems = [
      {
        href: '/dashboard',
        label: 'Resumo Médico',
        icon: <IconHome />,
      },
      {
        href: '/medications',
        label: 'Medicamentos',
        icon: <IconPill />,
      },
      { 
        href: '/allergies', 
        label: 'Alergias', 
        icon: <IconAlert />,
      },
      { 
        href: '/exams', 
        label: 'Exames', 
        icon: <IconLab />,
      },
      { 
        href: '/diseases', 
        label: 'Doenças', 
        icon: <IconStethoscope />,
      },
      { 
        href: '/consultations', 
        label: 'Consultas', 
        icon: <IconCalendar />,
      },
    ];

    const doctorNavItems = [
      {
        href: '/doctor/prontodoc-rcr30',
        label: 'Nova Consulta',
        icon: <IconFileText />,
      },
      {
        href: '/prontuarios',
        label: 'Prontuários',
        icon: <IconHospital />,
      },
      {
        href: '/doctor/patients',
        label: 'Meus Pacientes',
        icon: <IconUsers />,
      },
      {
        href: '/doctor/templates-prontuario',
        label: 'Templates Prontuário',
        icon: <IconTemplate />,
      },
    ];

    const navigationItems = isDoctor ? doctorNavItems : patientNavItems;

    if (!user) return null;

    return (
      <aside
        ref={ref}
        className={cn(
          "flex flex-col h-screen bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
        {...props}
      >
        {/* Header with toggle */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
            
              <span className="font-bold text-slate-800">ProntoDoc</span>
            </div>
          )}
          
          <button
            onClick={handleToggleCollapse}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all duration-200 transform hover:scale-105"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <svg
              className={cn("h-5 w-5 transform transition-transform duration-200", 
                isCollapsed && "rotate-180"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" 
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-2xl p-3 text-sm font-medium transition-all duration-200 transform hover:scale-105 group",
                  isActive 
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 shadow-sm border border-blue-200" 
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100",
                  isCollapsed && "justify-center"
                )}
              >
                <span className={cn("flex-shrink-0", !isCollapsed && "mr-3")}>
                  {item.icon}
                </span>
                
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{item.label}</p>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Prontuários Section - Only for doctors */}
        {isDoctor && (
          <div className="flex-1 flex flex-col border-t border-slate-200 overflow-hidden">
            <div className="px-3 pt-4 pb-3 flex-shrink-0">
              <div className={cn("flex items-center justify-between", isCollapsed && "justify-center")}>
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Consultas Recentes
                  </h3>
                )}
              </div>
            </div>

            <div className="px-3 pb-4 overflow-y-auto flex-1">
              <ProntuariosList collapsed={isCollapsed} />
            </div>
          </div>
        )}

        {/* Footer with user info */}
        {!isCollapsed && profile && (
          <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center space-x-3">
            
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {profile.role === 'doctor' ? 'Médico(a)' : 'Paciente'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
                loading={loading}
                className="text-xs px-2 py-1 h-7"
              >
                Sair
              </Button>
            </div>
          </div>
        )}

        {/* Collapsed user avatar */}
        {isCollapsed && profile && (
          <div className="p-3 border-t border-slate-200 space-y-2">
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleSignOut}
                loading={loading}
                className="h-8 w-8 text-xs"
                title="Sair"
              >
                <IconLogout />
              </Button>
            </div>
          </div>
        )}
      </aside>
    );
  }
);

Sidebar.displayName = "Sidebar";

export { Sidebar }; 