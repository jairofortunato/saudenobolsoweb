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
  autoSaved?: boolean; // If true, hide save button and show "Auto-saved" message
  savedProntuarioId?: string; // ID of already saved prontuário (for updates)
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
  autoSaved = false,
  savedProntuarioId,
  onSaved
}: SimpleProntuarioProps) {
  const { user } = useAuth();

  // Extract initial text
  const getInitialText = () => {
    if (typeof prontuario === 'string') {
      return prontuario;
    }
    return prontuario?.prontuario_text || prontuario?.content || prontuario?.text || JSON.stringify(prontuario, null, 2);
  };

  const [originalText] = useState(getInitialText());
  const [editableText, setEditableText] = useState(getInitialText());

  // New state for edit tracking and save functionality
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(savedProntuarioId || null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track changes to textarea
  const handleTextChange = (newText: string) => {
    setEditableText(newText);
    setHasUnsavedChanges(newText !== originalText);
  };

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
    if (isSaving) return;

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

      // Determine if we're updating or creating
      const isUpdate = !!savedId;

      if (isUpdate) {
        // UPDATE existing prontuário
        console.log('🔧 [PRONTUARIO UPDATE] Updating prontuário:', savedId);

        const response = await fetch(`/api/prontuarios/${savedId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            title: finalTitle,
            content: editableText,
            patient_id: patientId || null,
            patient_name: patientName || null,
            template_name: templateName || null,
            specialty: specialty || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setHasUnsavedChanges(false);
          onSaved?.(savedId);
          console.log('✅ [PRONTUARIO UPDATE] Successfully updated');
        } else {
          const errorData = await response.json();
          console.error('❌ [PRONTUARIO UPDATE] Failed:', errorData.error);
        }
      } else {
        // CREATE new prontuário
        console.log('🔧 [PRONTUARIO SAVE] Creating new prontuário');

        if (!appointmentId) {
          console.error('Cannot create prontuário without appointmentId');
          return;
        }

        const response = await fetch('/api/prontuarios', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: finalTitle,
            content: editableText,
            appointment_id: appointmentId,
            user_id: user.id,
            patient_id: patientId || null,
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
          setHasUnsavedChanges(false);
          onSaved?.(data.prontuario.id);
          console.log('✅ [PRONTUARIO SAVE] Successfully created:', data.prontuario.id);
        } else {
          const errorData = await response.json();
          console.error('❌ [PRONTUARIO SAVE] Failed:', errorData.error);
        }
      }
    } catch (error) {
      console.error('Error saving prontuário:', error);
    } finally {
      setIsSaving(false);
    }
  }, [savedId, appointmentId, patientId, editableText, title, generateTitle, patientName, templateName, specialty, onSaved, isSaving, user]);

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
          {autoSaved && !hasUnsavedChanges && (
            <p className="text-sm text-green-600 mt-1 text-center">✅ Salvo automaticamente</p>
          )}
          {hasUnsavedChanges && (
            <p className="text-sm text-yellow-600 mt-1 text-center">⚠️ Alterações não salvas</p>
          )}
          {!autoSaved && !hasUnsavedChanges && savedId && (
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

          {/* Save button - show when there are unsaved changes (from RCR-30 auto-save) OR manual creation */}
          {((autoSaved && hasUnsavedChanges) || (!autoSaved && appointmentId && !savedId)) && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-lg transition-colors duration-200"
            >
              {isSaving ? '⏳ Salvando...' : hasUnsavedChanges ? '💾 Salvar Edições' : '💾 Salvar Prontuário'}
            </button>
          )}
        </div>
      </div>

      {/* Title input - only show when saving manually (not for edits after auto-save) */}
      {!autoSaved && appointmentId && !savedId && !hasUnsavedChanges && (
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
          onChange={(e) => handleTextChange(e.target.value)}
          readOnly={!!savedId}
          placeholder="Prontuário will appear here..."
        />
      </div>
    </div>
  );
}