import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type UserRole = 'patient' | 'doctor';

export interface RoleSelectorProps {
  value?: UserRole;
  onChange?: (role: UserRole) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

const RoleSelector = React.forwardRef<HTMLDivElement, RoleSelectorProps>(
  ({ 
    value,
    onChange,
    className,
    disabled = false,
    error,
    required = false,
    ...props 
  }, ref) => {
    const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(value);

    const handleRoleSelect = useCallback((role: UserRole) => {
      if (disabled) return;
      
      setSelectedRole(role);
      onChange?.(role);
    }, [disabled, onChange]);

    const PatientIcon = () => (
      <svg 
        className="h-8 w-8" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
        />
      </svg>
    );

    const DoctorIcon = () => (
      <svg 
        className="h-8 w-8" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
    );

    const roles = [
      {
        value: 'patient' as const,
        label: 'Paciente',
        description: 'Gerenciar minhas informações médicas',
        icon: PatientIcon,
        colorClass: 'from-blue-200 to-blue-300 text-blue-800 border-blue-200',
        selectedColorClass: 'from-blue-300 to-blue-400 border-blue-400 ring-blue-300',
      },
      {
        value: 'doctor' as const,
        label: 'Médico',
        description: 'Acessar informações de pacientes',
        icon: DoctorIcon,
        colorClass: 'from-green-200 to-green-300 text-green-800 border-green-200',
        selectedColorClass: 'from-green-300 to-green-400 border-green-400 ring-green-300',
      },
    ];

    return (
      <div 
        ref={ref}
        className={cn("w-full space-y-3", className)}
        {...props}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((role) => {
            const isSelected = selectedRole === role.value;
            const Icon = role.icon;
            
            return (
              <button
                key={role.value}
                type="button"
                onClick={() => handleRoleSelect(role.value)}
                disabled={disabled}
                className={cn(
                  // Base styles
                  "relative p-6 rounded-2xl border-2 transition-all duration-200 text-left",
                  "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                  
                  // Default styling
                  !isSelected && `bg-gradient-to-br ${role.colorClass}`,
                  
                  // Selected styling
                  isSelected && [
                    `bg-gradient-to-br ${role.selectedColorClass}`,
                    "ring-2 ring-offset-2 shadow-lg transform scale-105"
                  ],
                  
                  // Error styling
                  error && !isSelected && "border-red-300 bg-red-50",
                  
                  // Hover states
                  !disabled && !isSelected && "hover:shadow-md",
                  !disabled && isSelected && "hover:shadow-xl"
                )}
                aria-pressed={isSelected}
                aria-describedby={error ? "role-error" : undefined}
              >
                {/* Selection indicator */}
                <div className="absolute top-3 right-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all duration-200",
                    isSelected 
                      ? "bg-white border-current" 
                      : "border-current opacity-40"
                  )}>
                    {isSelected && (
                      <svg 
                        className="w-full h-full text-current p-1" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <Icon />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {role.label}
                      {required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <p className="text-sm opacity-80 mt-1">
                      {role.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {error && (
          <p 
            id="role-error"
            className="text-xs text-red-500 mt-2"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

RoleSelector.displayName = "RoleSelector";

export { RoleSelector }; 