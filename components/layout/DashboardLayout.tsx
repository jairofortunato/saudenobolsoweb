'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { Loading } from '../ui/Loading';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
  containerMaxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  ({ 
    children, 
    className,
    title,
    subtitle,
    actions,
    breadcrumbs,
    showSidebar = true,
    sidebarCollapsed = false,
    containerMaxWidth = 'full',
    ...props 
  }, ref) => {
    const { user, profile, loading } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsed);
    const [showPin, setShowPin] = useState(false);

    const handleSidebarToggle = (collapsed: boolean) => {
      setIsSidebarCollapsed(collapsed);
    };

    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-none',
    };

    // Show loading while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loading
            type="spinner"
            variant="primary"
            size="lg"
            text="Carregando..."
          />
        </div>
      );
    }

    // Redirect if not authenticated (handled by middleware, but good fallback)
    if (!user) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen",
          className
        )}
        {...props}
      >
        
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          {showSidebar && (
            <>
              {/* Desktop Sidebar */}
              <Sidebar 
                collapsed={isSidebarCollapsed}
                onCollapsedChange={handleSidebarToggle}
                className="hidden md:flex"
              />
              
              {/* Mobile Sidebar Overlay */}
              {!isSidebarCollapsed && (
                <div className="fixed inset-0 z-30 md:hidden">
                  <div 
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    onClick={() => setIsSidebarCollapsed(true)}
                  />
                  <div className="relative w-64 h-full">
                    <Sidebar 
                      collapsed={false}
                      onCollapsedChange={handleSidebarToggle}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className={cn(
              "mx-auto px-4 sm:px-6 lg:px-8 py-6",
              maxWidthClasses[containerMaxWidth]
            )}>
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="mb-6" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((item, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <svg 
                            className="w-4 h-4 mx-2 text-slate-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        {item.href ? (
                          <a 
                            href={item.href}
                            className="text-slate-600 hover:text-slate-800 transition-colors duration-200"
                          >
                            {item.label}
                          </a>
                        ) : (
                          <span className="text-slate-400">{item.label}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}

              {/* Page Header */}
              {(title || subtitle || actions) && (
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-4 sm:mb-0">
                      {title && (
                        <div className="flex items-center gap-4 mb-2">
                          <h1 className="title-1">
                            {title}
                          </h1>
                          {/* PIN Display - for patients only */}
                          {profile?.role === 'patient' && profile?.pin && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                              <span className="text-sm text-blue-700 font-medium">PIN:</span>
                              <span className="text-sm font-mono font-bold text-blue-900">
                                {showPin ? profile.pin : '••••••'}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowPin(!showPin)}
                                className="text-xs px-2 py-1 h-6"
                              >
                                {showPin ? '🙈' : '👁️'}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {subtitle && (
                        <p className="text-slate-600 font-medium">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    
                    {actions && (
                      <div className="flex items-center space-x-3">
                        {actions}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Page Content */}
              <div className="space-y-6">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile Menu Button */}
        {showSidebar && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="md:hidden fixed bottom-6 right-6 p-4 bg-gradient-to-br from-pink-400 to-purple-500 text-white rounded-3xl shadow-lg transform hover:scale-105 transition-all duration-200 z-20"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

DashboardLayout.displayName = "DashboardLayout";

export { DashboardLayout }; 