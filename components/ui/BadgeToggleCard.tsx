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
  // New props for metadata
  createdBy?: string;
  createdAt?: string | Date;
  category?: string;
  description?: string;
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
  createdBy,
  createdAt,
  category,
  description,
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

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'orange':
        return {
          badge: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
          border: 'border-orange-200',
          accent: 'text-orange-600'
        };
      case 'red':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
          border: 'border-red-200',
          accent: 'text-red-600'
        };
      case 'blue':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
          border: 'border-blue-200',
          accent: 'text-blue-600'
        };
      case 'purple':
        return {
          badge: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
          border: 'border-purple-200',
          accent: 'text-purple-600'
        };
      case 'green':
        return {
          badge: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          border: 'border-green-200',
          accent: 'text-green-600'
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200',
          border: 'border-slate-200',
          accent: 'text-slate-600'
        };
    }
  };

  const variantClasses = getVariantClasses();

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
        ${variantClasses.badge}
        ${isHovered || isEditing ? 'rounded-lg w-full' : 'rounded-full w-auto'}
      `}>
        <div className="flex-1 text-left">
          <span className="block">
            {isEditing ? editingTitle : title}
          </span>
        </div>
        
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
        isHovered || isEditing ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
      }`}>
        <div className={`
          bg-white border rounded-lg shadow-lg w-96
          ${variantClasses.border}
        `}>
          {/* Header with metadata */}
          {(createdBy || createdAt || description) && (
            <div className={`px-4 py-3 border-b ${variantClasses.border} bg-gray-50 rounded-t-lg`}>
              <div className="space-y-1">
                {description && (
                  <p className="text-sm text-gray-700 font-medium">
                    {description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {createdBy && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">👤 Criado por:</span>
                      <span className={variantClasses.accent}>{createdBy}</span>
                    </div>
                  )}
                  {createdAt && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">📅 Em:</span>
                      <span className={variantClasses.accent}>{formatDate(createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Main content */}
          <div className="p-4">
            <div className="space-y-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 