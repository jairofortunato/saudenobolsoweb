import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    open,
    onClose,
    children,
    title,
    description,
    size = 'md',
    closeOnBackdrop = true,
    showCloseButton = true,
    className,
    ...props 
  }, ref) => {
    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && open) {
          onClose();
        }
      };

      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [open, onClose]);

    if (!open) return null;

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4',
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={handleBackdropClick}
        {...props}
      >
        {/* Backdrop with smooth fade */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/20 backdrop-blur-sm transition-all duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        />
        
        {/* Modal content with bouncy animation */}
        <div
          ref={ref}
          className={cn(
            "relative bg-white rounded-3xl shadow-2xl border border-slate-100 mx-4 my-8 max-h-[90vh] overflow-hidden",
            "transform transition-all duration-300 ease-out",
            open ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4",
            sizeClasses[size],
            className
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex-1">
                {title && (
                  <h2 className="text-xl font-semibold text-slate-800">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {description}
                  </p>
                )}
              </div>
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all duration-200 transform hover:scale-105"
                  aria-label="Close modal"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Content with custom scrollbar */}
          <div className="overflow-y-auto max-h-[calc(90vh-8rem)] overscroll-contain">
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

export { Modal }; 