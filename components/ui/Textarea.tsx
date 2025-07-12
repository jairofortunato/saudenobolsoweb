import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
  // Base styles with rounded shapes and smooth transitions - ensuring black text
  "flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-black transition-all duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "focus-visible:ring-blue-300 focus-visible:border-blue-300",
        success: "border-green-200 focus-visible:ring-green-300 focus-visible:border-green-300",
        error: "border-red-200 focus-visible:ring-red-300 focus-visible:border-red-300 bg-red-50",
        warning: "border-yellow-200 focus-visible:ring-yellow-300 focus-visible:border-yellow-300 bg-yellow-50",
      },
      size: {
        sm: "min-h-[80px] px-3 py-2 text-xs rounded-xl",
        md: "min-h-[100px] px-4 py-3 text-sm rounded-2xl",
        lg: "min-h-[120px] px-4 py-3 text-base rounded-2xl",
        xl: "min-h-[160px] px-6 py-4 text-base rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  loading?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    label,
    error,
    helperText,
    loading = false,
    id,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const effectiveVariant = error ? "error" : variant;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-sm font-medium text-slate-700 block"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            className={cn(
              textareaVariants({ variant: effectiveVariant, size, className })
            )}
            ref={ref}
            id={textareaId}
            disabled={loading}
            {...props}
          />
          
          {loading && (
            <div className="absolute right-3 top-3">
              <svg
                className="animate-spin h-4 w-4 text-slate-400"
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
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "text-xs mt-1 transition-colors duration-200",
            error ? "text-red-500" : "text-slate-500"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea, textareaVariants }; 