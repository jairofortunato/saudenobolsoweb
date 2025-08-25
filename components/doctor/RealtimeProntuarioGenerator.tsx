'use client';

import React, { useState } from 'react';

interface PatientProfile {
  id: string;
  name: string;
  cpf: string;
  pin: string;
  isExisting: boolean;
}

interface ConsultationTemplate {
  id: string;
  name: string;
  specialty: string;
  template_structure: {
    sections: Array<{
      name: string;
      required: boolean;
    }>;
  };
  ai_prompt_template: string;
  is_default: boolean;
  is_public: boolean;
}

interface RealtimeProntuarioGeneratorProps {
  transcription: string;
  selectedPatient: PatientProfile | null;
  selectedTemplate: ConsultationTemplate | null;
  sessionId: string;
  onProntuarioGenerated: (prontuario: string) => void;
  className?: string;
}

export function RealtimeProntuarioGenerator({
  transcription,
  selectedPatient,
  selectedTemplate,
  sessionId,
  onProntuarioGenerated,
  className
}: RealtimeProntuarioGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedProntuario, setGeneratedProntuario] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerateProntuario = async () => {
    console.log('🚀 [REALTIME-PRONTUARIO] Starting prontuário generation');
    console.log('📝 [REALTIME-PRONTUARIO] Transcription length:', transcription.length);
    console.log('👤 [REALTIME-PRONTUARIO] Patient:', selectedPatient?.name || 'Not selected');
    console.log('📋 [REALTIME-PRONTUARIO] Template:', selectedTemplate?.name || 'Default');

    if (!transcription || transcription.trim().length === 0) {
      setError('Não há transcrição disponível para gerar o prontuário.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody = {
        transcript: transcription,
        patient_info: selectedPatient ? {
          name: selectedPatient.name,
          cpf: selectedPatient.cpf
        } : null,
        template: selectedTemplate ? {
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        } : null,
        session_id: sessionId
      };

      console.log('📤 [REALTIME-PRONTUARIO] Sending request to generate-prontuario API');
      console.log('📤 [REALTIME-PRONTUARIO] Request details:', {
        transcriptLength: transcription.length,
        hasPatient: !!selectedPatient,
        hasTemplate: !!selectedTemplate,
        sessionId
      });

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log('✅ [REALTIME-PRONTUARIO] Prontuário generated successfully');
      console.log('📋 [REALTIME-PRONTUARIO] Generated prontuário length:', result.prontuario?.length || 0);

      if (!result.success || !result.prontuario) {
        throw new Error('Falha ao gerar prontuário - resposta inválida');
      }

      setGeneratedProntuario(result.prontuario);
      setIsEditing(true);
      onProntuarioGenerated(result.prontuario);

    } catch (error) {
      console.error('❌ [REALTIME-PRONTUARIO] Error generating prontuário:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao gerar prontuário');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyProntuario = async () => {
    try {
      await navigator.clipboard.writeText(generatedProntuario);
      // Could add a toast notification here
      console.log('📋 [REALTIME-PRONTUARIO] Prontuário copied to clipboard');
    } catch (error) {
      console.error('❌ [REALTIME-PRONTUARIO] Error copying to clipboard:', error);
    }
  };

  const handleProntuarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedProntuario(e.target.value);
    onProntuarioGenerated(e.target.value);
  };

  return (
    <div className={`realtime-prontuario-generator space-y-4 ${className || ''}`}>
      {/* Generation Button */}
      {!generatedProntuario && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📋 Gerar Prontuário da Transcrição
          </h3>
          <p className="text-blue-700 mb-4">
            Transforme a transcrição completa em um prontuário médico estruturado usando IA.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGenerateProntuario}
              disabled={isGenerating || !transcription || transcription.trim().length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Gerando Prontuário...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Gerar Prontuário
                </>
              )}
            </button>
            
            {transcription && (
              <div className="text-sm text-gray-600">
                Transcrição: {transcription.split(' ').length} palavras
              </div>
            )}
          </div>

          {/* Patient and Template Info */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Paciente:</span>
                <div className="text-blue-700">
                  {selectedPatient ? selectedPatient.name : 'Não selecionado'}
                </div>
              </div>
              <div>
                <span className="font-medium text-blue-800">Template:</span>
                <div className="text-blue-700">
                  {selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.specialty})` : 'Padrão'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-medium text-red-800">Erro na Geração</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Generated Prontuário Display */}
      {generatedProntuario && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-green-800">
              ✅ Prontuário Gerado
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyProntuario}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isEditing ? 'Visualizar' : 'Editar'}
              </button>
            </div>
          </div>

          {/* Prontuário Content */}
          <div className="bg-white border border-green-300 rounded-lg p-4">
            {isEditing ? (
              <textarea
                value={generatedProntuario}
                onChange={handleProntuarioChange}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-vertical focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Prontuário gerado pela IA..."
              />
            ) : (
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                  {generatedProntuario}
                </pre>
              </div>
            )}
          </div>

          {/* Generation Stats */}
          <div className="text-sm text-green-700 bg-green-100 rounded p-2">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="font-medium">Transcrição:</span> {transcription.split(' ').length} palavras
              </div>
              <div>
                <span className="font-medium">Prontuário:</span> {generatedProntuario.split(' ').length} palavras
              </div>
              <div>
                <span className="font-medium">Sessão:</span> {sessionId.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Regenerate Option */}
          <div className="border-t border-green-200 pt-3">
            <button
              onClick={() => {
                setGeneratedProntuario('');
                setIsEditing(false);
                setError(null);
              }}
              className="text-sm text-green-600 hover:text-green-800 underline"
            >
              Gerar Novo Prontuário
            </button>
          </div>
        </div>
      )}
    </div>
  );
}