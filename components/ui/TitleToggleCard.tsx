'use client';

import React, { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface TitleToggleCardProps {
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
}

export const TitleToggleCard: React.FC<TitleToggleCardProps> = ({
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

  return (
    <Card 
      className={`transition-all duration-300 ease-in-out cursor-pointer ${
        isHovered || isEditing ? 'shadow-md' : 'hover:shadow-sm'
      }`}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <CardHeader className="pb-0 px-2 py-1">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold text-slate-800 leading-tight">
            {isEditing ? editingTitle : title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-full transition-colors disabled:opacity-50"
                  title="Salvar alterações"
                >
                  {isSaving ? '⏳' : '✅'}
                </button>
                <button
                  onClick={onCancel}
                  disabled={isSaving}
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50"
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
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors"
                    title="Editar"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                    title="Deletar"
                  >
                    {isDeleting ? '⏳' : '🗑️'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isHovered || isEditing ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <CardContent className="space-y-1 pt-0 px-2 pb-0">
          {children}
        </CardContent>
      </div>
    </Card>
  );
}; 