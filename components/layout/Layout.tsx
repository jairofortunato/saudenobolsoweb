'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dashboard' | 'auth' | 'fullscreen';
  showHeader?: boolean;
  showSidebar?: boolean;
  sidebarCollapsed?: boolean;
  headerVariant?: 'default' | 'dashboard' | 'auth';
}

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ 
    children, 
    className,
    variant = 'default',
    showHeader = true,
    showSidebar = false,
    sidebarCollapsed = false,
    headerVariant,
    ...props 
  }, ref) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsed);

    const handleSidebarToggle = (collapsed: boolean) => {
      setIsSidebarCollapsed(collapsed);
    };

    // Determine layout structure based on variant
    const layoutClasses = {
      default: "min-h-screen bg-gradient-to-br from-slate-50 to-white",
      dashboard: "min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50",
      auth: "min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50",
      fullscreen: "h-screen bg-white overflow-hidden",
    };

    if (variant === 'fullscreen') {
      return (
        <div
          ref={ref}
          className={cn(layoutClasses.fullscreen, className)}
          {...props}
        >
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(layoutClasses[variant], className)}
        {...props}
      >
        {/* Header */}
        {showHeader && (
          <Header 
            variant={headerVariant || variant} 
            showAuthButtons={variant === 'default' || variant === 'auth'}
          />
        )}

        <div className="flex flex-1">
          {/* Sidebar */}
          {showSidebar && (
            <Sidebar 
              collapsed={isSidebarCollapsed}
              onCollapsedChange={handleSidebarToggle}
              className="hidden md:flex"
            />
          )}

          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-300",
              showSidebar && "md:ml-0", // Sidebar handles its own width
              variant === 'dashboard' && "bg-transparent",
              variant === 'auth' && "flex items-center justify-center p-4",
              !showHeader && "pt-0"
            )}
          >
            {variant === 'auth' ? (
              <div className="w-full max-w-md">
                {children}
              </div>
            ) : (
              <div className={cn(
                "w-full",
                variant === 'dashboard' && "p-6",
                variant === 'default' && "p-4"
              )}>
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }
);

Layout.displayName = "Layout";

export { Layout }; 