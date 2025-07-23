'use client';

import React, { useState, ReactNode } from 'react';

interface BadgeToggleCardProps {
  id: string;
  title: string;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  deleteConfirmMessage?: string;
  editingTitle?: ReactNode;
  children: ReactNode;
  isDeleting?: boolean;
  isSaving?: boolean;
  variant?: 'default' | 'orange' | 'red' | 'blue' | 'purple' | 'green';
}

export const BadgeToggleCard: React.FC<BadgeToggleCardProps> = ({
  id,
  title,
  isEditing = false,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  deleteConfirmMessage,
  editingTitle,
  children,
  isDeleting = false,
  isSaving = false,
  variant = 'default',
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const isHovered = hoveredCard === id;

  const handleDelete = () => {
    if (deleteConfirmMessage) {
      const confirmed = window.confirm(deleteConfirmMessage);
      if (!confirmed) return;
    }
    onDelete?.();
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200';
    }
  };

  return (
    <div 
      className={`transition-all duration-300 ease-in-out min-w-fit relative ${
        isHovered || isEditing ? 'shadow-lg z-10' : ''
      }`}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {/* Badge-like title */}
      <div className={`
        inline-flex items-center justify-between px-3 py-2 rounded-full border text-sm font-medium transition-all duration-300
        ${getVariantClasses()}
        ${isHovered || isEditing ? 'rounded-lg w-full' : 'rounded-full w-auto'}
      `}>
        <span className="flex-1 text-left">
          {isEditing ? editingTitle : title}
        </span>
        
        {/* Action buttons - only show when hovered or editing */}
        <div className={`flex items-center gap-1 transition-all duration-300 ${
          isHovered || isEditing ? 'opacity-100 max-w-none' : 'opacity-0 max-w-0 overflow-hidden'
        }`}>
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded-full transition-colors disabled:opacity-50 text-xs"
                title="Salvar alterações"
              >
                {isSaving ? '⏳' : '✅'}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 p-1 rounded-full transition-colors disabled:opacity-50 text-xs"
                title="Cancelar edição"
              >
                ❌
              </button>
            </>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded-full transition-colors text-xs"
                  title="Editar"
                >
                  ✏️
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors disabled:opacity-50 text-xs"
                  title="Deletar"
                >
                  {isDeleting ? '⏳' : '🗑️'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Expandable Content */}
      <div className={`absolute top-full left-0 overflow-hidden transition-all duration-300 ease-in-out z-20 ${
        isHovered || isEditing ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'
      }`}>
        <div className={`
          bg-white border rounded-lg p-3 shadow-lg space-y-1 w-80
          ${getVariantClasses().includes('orange') ? 'border-orange-200' : ''}
          ${getVariantClasses().includes('red') ? 'border-red-200' : ''}
          ${getVariantClasses().includes('blue') ? 'border-blue-200' : ''}
          ${getVariantClasses().includes('purple') ? 'border-purple-200' : ''}
          ${getVariantClasses().includes('green') ? 'border-green-200' : ''}
          ${getVariantClasses().includes('slate') ? 'border-slate-200' : ''}
        `}>
          {children}
        </div>
      </div>
    </div>
  );
}; 