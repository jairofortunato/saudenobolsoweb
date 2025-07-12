import React, { useState, useCallback } from 'react';
import { Input, type InputProps } from './Input';
import { validateCPF, cleanNumeric } from '@/lib/form-validation';

export interface CPFInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string, isValid: boolean) => void;
  onValidation?: (isValid: boolean, error?: string) => void;
  showValidation?: boolean;
}

const CPFInput = React.forwardRef<HTMLInputElement, CPFInputProps>(
  ({ 
    value = '',
    onChange,
    onValidation,
    showValidation = true,
    placeholder = "000.000.000-00",
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value);
    const [validationError, setValidationError] = useState<string | undefined>();

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Only allow numeric characters and format characters
      const cleanValue = cleanNumeric(inputValue);
      
      // Limit to 11 digits
      const limitedValue = cleanValue.slice(0, 11);
      
      // Format the value
      let formattedValue = '';
      if (limitedValue.length > 0) {
        if (limitedValue.length <= 3) {
          formattedValue = limitedValue;
        } else if (limitedValue.length <= 6) {
          formattedValue = `${limitedValue.slice(0, 3)}.${limitedValue.slice(3)}`;
        } else if (limitedValue.length <= 9) {
          formattedValue = `${limitedValue.slice(0, 3)}.${limitedValue.slice(3, 6)}.${limitedValue.slice(6)}`;
        } else {
          formattedValue = `${limitedValue.slice(0, 3)}.${limitedValue.slice(3, 6)}.${limitedValue.slice(6, 9)}-${limitedValue.slice(9)}`;
        }
      }
      
      setInternalValue(formattedValue);
      
      // Validate if we have a complete CPF
      let isValid = false;
      let error: string | undefined;
      
      if (limitedValue.length === 11) {
        const validation = validateCPF(formattedValue);
        isValid = validation.isValid;
        error = validation.error;
      } else if (limitedValue.length > 0) {
        error = 'CPF incompleto';
      }
      
      if (showValidation) {
        setValidationError(error);
      }
      
      // Call callbacks
      onChange?.(formattedValue, isValid);
      onValidation?.(isValid, error);
    }, [onChange, onValidation, showValidation]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      // Validate on blur for better UX
      if (internalValue) {
        const validation = validateCPF(internalValue);
        if (showValidation) {
          setValidationError(validation.isValid ? undefined : validation.error);
        }
        onValidation?.(validation.isValid, validation.error);
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

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        error={showValidation ? validationError : props.error}
        maxLength={14} // XXX.XXX.XXX-XX format
        inputMode="numeric"
        autoComplete="off"
      />
    );
  }
);

CPFInput.displayName = "CPFInput";

export { CPFInput }; 