import React, { useEffect, useState, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  // Base styles with rounded shapes and smooth transitions
  "relative w-full rounded-2xl border p-4 transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white border-slate-200 text-slate-800",
        success: "bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-800",
        warning: "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800", 
        error: "bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-800",
        info: "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-800",
        lavender: "bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 text-purple-800",
      },
      size: {
        sm: "text-xs p-3 rounded-xl",
        md: "text-sm p-4 rounded-2xl",
        lg: "text-base p-6 rounded-3xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

const toastVariants = cva(
  // Toast-specific styles with enhanced animations
  "fixed z-50 flex w-full max-w-sm items-center space-x-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-white/95 border-slate-200 text-slate-800",
        success: "bg-green-50/95 border-green-200 text-green-800",
        warning: "bg-yellow-50/95 border-yellow-200 text-yellow-800",
        error: "bg-red-50/95 border-red-200 text-red-800",
        info: "bg-blue-50/95 border-blue-200 text-blue-800",
        lavender: "bg-purple-50/95 border-purple-200 text-purple-800",
      },
      position: {
        "top-left": "top-4 left-4",
        "top-center": "top-4 left-1/2 transform -translate-x-1/2",
        "top-right": "top-4 right-4",
        "bottom-left": "bottom-4 left-4",
        "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2",
        "bottom-right": "bottom-4 right-4",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "top-right",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  closable?: boolean;
}

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: number; // Auto-hide duration in ms
  onClose?: () => void;
  closable?: boolean;
  show?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant, 
    size,
    title,
    description,
    icon,
    onClose,
    closable = false,
    children,
    ...props 
  }, ref) => {
    const DefaultIcons = {
      success: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      warning: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L3.178 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      error: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      info: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };

    const displayIcon = icon || (variant && variant !== 'default' && variant !== 'lavender' ? DefaultIcons[variant as keyof typeof DefaultIcons] : null);

    return (
      <div
        ref={ref}
        className={cn(alertVariants({ variant, size, className }))}
        {...props}
      >
        <div className="flex items-start space-x-3">
          {displayIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {displayIcon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {title && (
              <h5 className="mb-1 font-medium leading-none tracking-tight">
                {title}
              </h5>
            )}
            {description && (
              <div className="text-sm opacity-90">
                {description}
              </div>
            )}
            {children && !description && (
              <div className="text-sm opacity-90">
                {children}
              </div>
            )}
          </div>
          
          {closable && onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-current opacity-60 hover:opacity-100 rounded-xl hover:bg-black/5 transition-all duration-200 transform hover:scale-105"
              aria-label="Close alert"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    className, 
    variant, 
    position,
    title,
    description,
    icon,
    duration = 5000,
    onClose,
    closable = true,
    show = true,
    children,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(show);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClose = useCallback(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300);
    }, [onClose]);

    useEffect(() => {
      if (show) {
        setIsVisible(true);
        setIsAnimating(true);
        
        if (duration > 0) {
          const timer = setTimeout(() => {
            handleClose();
          }, duration);
          return () => clearTimeout(timer);
        }
      }
    }, [show, duration, handleClose]);

    if (!isVisible) return null;

    const DefaultIcons = {
      success: (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
          <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      warning: (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center">
          <svg className="h-3 w-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
      ),
      error: (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-200 flex items-center justify-center">
          <svg className="h-3 w-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
      info: (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center">
          <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01" />
          </svg>
        </div>
      ),
    };

    const displayIcon = icon || (variant && variant !== 'default' && variant !== 'lavender' ? DefaultIcons[variant as keyof typeof DefaultIcons] : null);

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant, position, className }),
          isAnimating 
            ? "translate-y-0 opacity-100 scale-100" 
            : "translate-y-2 opacity-0 scale-95"
        )}
        {...props}
      >
        {displayIcon && displayIcon}
        
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-medium">
              {title}
            </p>
          )}
          {description && (
            <p className="text-xs opacity-90 mt-1">
              {description}
            </p>
          )}
          {children && !description && (
            <div className="text-sm">
              {children}
            </div>
          )}
        </div>
        
        {closable && (
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-current opacity-60 hover:opacity-100 rounded-xl hover:bg-black/5 transition-all duration-200 transform hover:scale-105"
            aria-label="Close notification"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = "Toast";

export { Alert, Toast, alertVariants, toastVariants }; 