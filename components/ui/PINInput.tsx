import React, { useState, useCallback, useRef } from 'react';
import { Input, type InputProps } from './Input';
import { validatePIN, cleanNumeric } from '@/lib/form-validation';
import { cn } from '@/lib/utils';

export interface PINInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange' | 'maxLength'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onValidation?: (isValid: boolean, error?: string) => void;
  showValidation?: boolean;
  showValue?: boolean; // Whether to show actual digits or hide them
}

const PINInput = React.forwardRef<HTMLInputElement, PINInputProps>(
  ({ 
    value = '',
    onChange,
    onValidation,
    showValidation = true,
    showValue = false,
    placeholder = "000 000",
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [validationError, setValidationError] = useState<string | undefined>();
    const [isPasswordVisible, setIsPasswordVisible] = useState(showValue);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Only allow numeric characters
      const cleanValue = cleanNumeric(inputValue);
      
      // Limit to 6 digits
      const limitedValue = cleanValue.slice(0, 6);
      
      // Format the value with space in the middle (XXX XXX)
      let formattedValue = '';
      if (limitedValue.length > 0) {
        if (limitedValue.length <= 3) {
          formattedValue = limitedValue;
        } else {
          formattedValue = `${limitedValue.slice(0, 3)} ${limitedValue.slice(3)}`;
        }
      }
      
      setInternalValue(formattedValue);
      
      // Validate if we have a complete PIN
      let isValid = false;
      let error: string | undefined;
      
      if (limitedValue.length === 6) {
        const validation = validatePIN(limitedValue);
        isValid = validation.isValid;
        error = validation.error;
      } else if (limitedValue.length > 0) {
        error = 'PIN incompleto';
      }
      
      if (showValidation) {
        setValidationError(error);
      }
      
      // Call callbacks
      onChange?.(formattedValue, isValid);
      onValidation?.(isValid, error);
    }, [onChange, onValidation, showValidation]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Validate on blur
      if (internalValue) {
        const cleanValue = cleanNumeric(internalValue);
        if (cleanValue.length === 6) {
          const validation = validatePIN(cleanValue);
          if (showValidation) {
            setValidationError(validation.isValid ? undefined : validation.error);
          }
          onValidation?.(validation.isValid, validation.error);
        }
      }
      
      props.onBlur?.(e);
    }, [internalValue, onValidation, showValidation, props]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          // Allow home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
        return;
      }
      
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
      
      props.onKeyDown?.(e);
    }, [props]);

    const togglePasswordVisibility = useCallback(() => {
      setIsPasswordVisible(prev => !prev);
      // Keep focus on input after toggling
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }, []);

    const EyeIcon = ({ isOpen }: { isOpen: boolean }) => (
      <svg 
        className="h-4 w-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {isOpen ? (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </>
        ) : (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m-3.122-3.122l4.243 4.243M12 12l6.878 6.878" />
          </>
        )}
      </svg>
    );

    const composedRef = useCallback((node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    return (
      <Input
        {...props}
        ref={composedRef}
        type={isPasswordVisible ? "text" : "password"}
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        error={showValidation ? validationError : props.error}
        maxLength={7} // "XXX XXX" format
        inputMode="numeric"
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={cn(
              "hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors",
              "p-0.5 rounded"
            )}
            tabIndex={-1}
            aria-label={isPasswordVisible ? "Ocultar PIN" : "Mostrar PIN"}
          >
            <EyeIcon isOpen={isPasswordVisible} />
          </button>
        }
      />
    );
  }
);

PINInput.displayName = "PINInput";

export { PINInput }; 