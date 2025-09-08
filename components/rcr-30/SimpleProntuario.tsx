'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SimpleProntuarioProps {
  prontuario: any;
  className?: string;
  // New props for auto-save functionality
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  templateId?: string;
  templateName?: string;
  specialty?: string;
  onSaved?: (prontuarioId: string) => void;
}

export function SimpleProntuario({
  prontuario,
  className = '',
  // New props with defaults
  appointmentId,
  patientId,
  patientName,
  templateId,
  templateName,
  specialty,
  onSaved
}: SimpleProntuarioProps) {
  const { user } = useAuth();
  const [editableText, setEditableText] = useState(() => {
    if (typeof prontuario === 'string') {
      return prontuario;
    }
    return prontuario?.prontuario_text || JSON.stringify(prontuario, null, 2);
  });
  
  // New state for auto-save functionality
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Generate title from first line of content
  const generateTitle = useCallback((content: string) => {
    const firstLine = content.split('\n')[0].trim();
    if (firstLine && firstLine.length > 10) {
      return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }
    return `Prontuário ${patientName || 'Paciente'} - ${new Date().toLocaleDateString('pt-BR')}`;
  }, [patientName]);

  // Auto-save functionality
  const handleSave = useCallback(async () => {
    if (!appointmentId || isSaving) return;

    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    setIsSaving(true);
    try {
      const finalTitle = title.trim() || generateTitle(editableText);
      
      // Get the session token for authorization
      const { createClient } = await import('../../lib/supabase');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      console.log('🔧 [PRONTUARIO SAVE] Making request with headers:', Object.keys(headers));
      
      const response = await fetch('/api/prontuarios', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: finalTitle,
          content: editableText,
          appointment_id: appointmentId,
          user_id: user.id, // Use authenticated user's ID
          patient_id: patientId || null, // Allow null if no patient selected
          patient_name: patientName || null,
          template_name: templateName || null,
          specialty: specialty || null,
          version: 1,
          summary: null,
          meta: {}
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedId(data.prontuario.id);
        onSaved?.(data.prontuario.id);
      } else {
        console.error('Failed to save prontuário:', response.statusText);
      }
    } catch (error) {
      console.error('Error saving prontuário:', error);
    } finally {
      setIsSaving(false);
    }
  }, [appointmentId, patientId, editableText, title, generateTitle, patientName, templateName, specialty, onSaved, isSaving, user]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableText);
      // Could add toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className={className}>
      {/* Header with title and status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Prontuário</h2>
          {savedId && (
            <p className="text-sm text-green-600 mt-1 text-center">✅ Salvo com sucesso</p>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            📋 Copiar
          </button>
          
          {/* Save button - only show if we have the required data and haven't saved yet */}
          {appointmentId && !savedId && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-lg transition-colors duration-200"
            >
              {isSaving ? '⏳ Salvando...' : '💾 Salvar Prontuário'}
            </button>
          )}
        </div>
      </div>

      {/* Title input - only show if we have save capability and haven't saved yet */}
      {appointmentId && !savedId && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Título do prontuário (opcional - será gerado automaticamente)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg"
          />
        </div>
      )}
      
      {/* Textarea */}
      <div>
        <textarea
          className="w-full h-[600px] p-3 text-black bg-white border border-gray-300 resize-none focus:outline-none font-mono text-base"
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
          readOnly={!!savedId}
          placeholder="Prontuário will appear here..."
        />
      </div>
    </div>
  );
}