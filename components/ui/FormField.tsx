import React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  fieldId?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ 
    label,
    error,
    helperText,
    required = false,
    children,
    className,
    labelClassName,
    fieldId,
    ...props 
  }, ref) => {
    const generatedId = fieldId || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div 
        ref={ref}
        className={cn("w-full space-y-2", className)}
        {...props}
      >
        {label && (
          <label 
            htmlFor={generatedId}
            className={cn(
              "text-sm font-medium text-slate-700 block",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          {children}
        </div>
        
        {(error || helperText) && (
          <p 
            id={error ? `${generatedId}-error` : `${generatedId}-helper`}
            className={cn(
              "text-xs mt-1 transition-colors duration-200",
              error ? "text-red-500" : "text-slate-500"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export { FormField }; 