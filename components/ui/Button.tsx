import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles with rounded shapes and smooth transitions
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        // Primary - soft pink gradient
        primary: "bg-gradient-to-br from-pink-200 to-pink-300 text-pink-800 hover:from-pink-300 hover:to-pink-400 focus-visible:ring-pink-300 shadow-md hover:shadow-lg",
        // Secondary - baby blue gradient  
        secondary: "bg-gradient-to-br from-blue-200 to-blue-300 text-blue-800 hover:from-blue-300 hover:to-blue-400 focus-visible:ring-blue-300 shadow-md hover:shadow-lg",
        // Success - mint green gradient
        success: "bg-gradient-to-br from-green-200 to-green-300 text-green-800 hover:from-green-300 hover:to-green-400 focus-visible:ring-green-300 shadow-md hover:shadow-lg",
        // Warning - soft yellow gradient
        warning: "bg-gradient-to-br from-yellow-200 to-yellow-300 text-yellow-800 hover:from-yellow-300 hover:to-yellow-400 focus-visible:ring-yellow-300 shadow-md hover:shadow-lg",
        // Danger - soft red gradient
        danger: "bg-gradient-to-br from-red-200 to-red-300 text-red-800 hover:from-red-300 hover:to-red-400 focus-visible:ring-red-300 shadow-md hover:shadow-lg",
        // Ghost - subtle with lavender tint
        ghost: "text-slate-600 hover:bg-lavender-100 hover:text-slate-700 focus-visible:ring-slate-300",
        // Outline - subtle border with pastels
        outline: "border-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300",
      },
      size: {
        sm: "h-8 px-3 py-1.5 text-xs rounded-xl",
        md: "h-10 px-4 py-2 text-sm rounded-2xl",
        lg: "h-12 px-6 py-3 text-base rounded-2xl",
        xl: "h-14 px-8 py-4 text-lg rounded-3xl",
        icon: "h-10 w-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false, 
    leftIcon, 
    rightIcon, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants }; 