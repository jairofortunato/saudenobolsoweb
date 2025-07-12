'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

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
        label: 'Início', 
        icon: '🏠',
      },
      { 
        href: '/medications', 
        label: 'Medicamentos', 
        icon: '💊',
      },
      { 
        href: '/allergies', 
        label: 'Alergias', 
        icon: '⚠️',
      },
      { 
        href: '/exams', 
        label: 'Exames', 
        icon: '🔬',
      },
      { 
        href: '/diseases', 
        label: 'Doenças', 
        icon: '🩺',
      },
      { 
        href: '/consultations', 
        label: 'Consultas', 
        icon: '👩‍⚕️',
      },
    ];

    const doctorNavItems = [
      { 
        href: '/doctor/dashboard', 
        label: 'Dashboard', 
        icon: '🏥',
        description: 'Painel do médico'
      },
      { 
        href: '/doctor/patients', 
        label: 'Meus Pacientes', 
        icon: '👥',
        description: 'Lista de pacientes atendidos'
      },
      { 
        href: '/doctor/search', 
        label: 'Buscar Paciente', 
        icon: '🔍',
        description: 'Buscar paciente por CPF'
      },
      { 
        href: '/doctor/schedule', 
        label: 'Agenda', 
        icon: '📅',
        description: 'Consultas agendadas'
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
              <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <span className="font-bold text-slate-800">Saúde no Bolso</span>
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
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
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
                <span className={cn("text-lg flex-shrink-0", !isCollapsed && "mr-3")}>
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

        

        {/* Footer with user info */}
        {!isCollapsed && profile && (
          <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
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
                ↩️
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