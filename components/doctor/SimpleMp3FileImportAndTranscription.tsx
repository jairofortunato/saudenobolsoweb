'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../index';
import { TranscriptionDisplay } from '../prontodoc/TranscriptionDisplay';
import { ProntuarioModal } from '../prontodoc/ProntuarioModal';

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

interface SimpleMp3FileImportAndTranscriptionProps {
  selectedPatient: PatientProfile | null;
  selectedTemplate: ConsultationTemplate | null;
  onProntuarioGenerated: (prontuario: string) => void;
  onClearProntuario?: () => void;
  className?: string;
}

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  confidence: number;
  duration: number;
  word_count: number;
  provider: string;
}

interface ProntuarioResult {
  success: boolean;
  prontuario: string;
  model: string;
  processing_time: number;
}

export function SimpleMp3FileImportAndTranscription({ 
  selectedPatient, 
  selectedTemplate,
  onProntuarioGenerated,
  onClearProntuario,
  className 
}: SimpleMp3FileImportAndTranscriptionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingProntuario, setIsGeneratingProntuario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [prontuarioText, setProntuarioText] = useState('');
  const [isEditingProntuario, setIsEditingProntuario] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      setError('Por favor, selecione um arquivo de áudio válido (MP3, WAV, M4A)');
      return;
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo permitido: 100MB');
      return;
    }

    console.log('📁 [SIMPLE-MP3-IMPORT] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setSelectedFile(file);
    setError(null);
    
    // Clear previous results
    setProntuarioText('');
    setIsEditingProntuario(false);
    setTranscriptionResult(null);
    setIsModalOpen(false);
    
    if (onClearProntuario) {
      onClearProntuario();
    }
  }, [onClearProntuario]);

  const handleTranscribeAudio = useCallback(async () => {
    if (!selectedFile) {
      console.error('❌ [SIMPLE-MP3-IMPORT] No file selected');
      return;
    }

    console.log('🤖 [SIMPLE-MP3-IMPORT] Starting transcription via AI processor');
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile, selectedFile.name);

      console.log('📤 [SIMPLE-MP3-IMPORT] Sending audio to AI processor:', {
        fileName: selectedFile.name,
        audioSize: selectedFile.size,
        audioType: selectedFile.type
      });

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      console.log('📥 [SIMPLE-MP3-IMPORT] Transcription response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Falha na transcrição');
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha na transcrição');
      }

      const transcriptionData: TranscriptionResult = {
        success: result.success,
        transcript: result.transcript,
        confidence: result.confidence || 0,
        duration: result.duration || 0,
        word_count: result.word_count || 0,
        provider: result.provider || 'unknown'
      };

      setTranscriptionResult(transcriptionData);
      console.log('✅ [SIMPLE-MP3-IMPORT] Transcription completed successfully');

    } catch (error) {
      console.error('❌ [SIMPLE-MP3-IMPORT] Transcription error:', error);
      setError('Erro na transcrição: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsTranscribing(false);
    }
  }, [selectedFile]);

  const handleGenerateProntuario = useCallback(async () => {
    if (!transcriptionResult?.transcript) {
      console.error('❌ [SIMPLE-MP3-IMPORT] No transcription available for prontuário generation');
      return;
    }

    console.log('📋 [SIMPLE-MP3-IMPORT] Starting prontuário generation');
    setIsGeneratingProntuario(true);
    setError(null);

    try {
      const requestBody = {
        transcript: transcriptionResult.transcript,
        patient_name: selectedPatient?.name,
        template: selectedTemplate ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          template_structure: selectedTemplate.template_structure,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        } : null
      };

      console.log('📤 [SIMPLE-MP3-IMPORT] Sending data for prontuário generation:', {
        transcriptLength: transcriptionResult.transcript.length,
        patientName: selectedPatient?.name,
        templateName: selectedTemplate?.name
      });

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      console.log('📥 [SIMPLE-MP3-IMPORT] Prontuário generation response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Falha na geração do prontuário');
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha na geração do prontuário');
      }

      const prontuarioData: ProntuarioResult = {
        success: result.success,
        prontuario: result.prontuario,
        model: result.model || 'unknown',
        processing_time: result.processing_time || 0
      };

      setProntuarioText(prontuarioData.prontuario);
      onProntuarioGenerated(prontuarioData.prontuario);
      console.log('✅ [SIMPLE-MP3-IMPORT] Prontuário generated successfully');

    } catch (error) {
      console.error('❌ [SIMPLE-MP3-IMPORT] Prontuário generation error:', error);
      setError('Erro na geração do prontuário: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsGeneratingProntuario(false);
    }
  }, [transcriptionResult, selectedPatient, selectedTemplate, onProntuarioGenerated]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setError(null);
    setIsModalOpen(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (onClearProntuario) {
      onClearProntuario();
    }
  }, [onClearProntuario]);

  const handleEditProntuario = () => {
    setIsEditingProntuario(true);
    setIsModalOpen(true);
  };

  const handleSaveProntuario = (editedText: string) => {
    setProntuarioText(editedText);
    onProntuarioGenerated(editedText);
    setIsEditingProntuario(false);
    setIsModalOpen(false);
  };

  const handleViewProntuario = () => {
    setIsEditingProntuario(false);
    setIsModalOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =====================================
          FILE SELECTION SECTION
          ===================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📁 Importar Arquivo de Áudio
        </h3>
        
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,audio/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Formatos suportados: MP3, WAV, M4A (máximo 100MB)
            </p>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    Tamanho: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={handleClearFile}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================
          TRANSCRIPTION SECTION
          ===================================== */}
      {selectedFile && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🤖 Transcrição
            </h3>
            <Button
              onClick={handleTranscribeAudio}
              disabled={isTranscribing || !selectedFile}
              variant={isTranscribing ? "secondary" : "primary"}
              className="min-w-[120px]"
            >
              {isTranscribing ? 'Transcrevendo...' : 'Transcrever Áudio'}
            </Button>
          </div>

          {transcriptionResult && (
            <TranscriptionDisplay 
              transcription={transcriptionResult.transcript}
              confidence={transcriptionResult.confidence}
              duration={transcriptionResult.duration}
              wordCount={transcriptionResult.word_count}
              provider={transcriptionResult.provider}
            />
          )}
        </div>
      )}

      {/* =====================================
          PRONTUÁRIO GENERATION SECTION
          ===================================== */}
      {transcriptionResult && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📋 Prontuário Médico
            </h3>
            <div className="flex space-x-3">
              {!prontuarioText && (
                <Button
                  onClick={handleGenerateProntuario}
                  disabled={isGeneratingProntuario || !transcriptionResult?.transcript || !selectedTemplate}
                  variant={isGeneratingProntuario ? "secondary" : "primary"}
                  className="min-w-[140px]"
                >
                  {isGeneratingProntuario ? 'Gerando...' : 'Gerar Prontuário'}
                </Button>
              )}
              
              {prontuarioText && (
                <>
                  <Button
                    onClick={handleViewProntuario}
                    variant="secondary"
                  >
                    👁️ Visualizar
                  </Button>
                  <Button
                    onClick={handleEditProntuario}
                    variant="primary"
                  >
                    ✏️ Editar
                  </Button>
                </>
              )}
            </div>
          </div>

          {!selectedTemplate && transcriptionResult && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Selecione um template de consulta para gerar o prontuário
              </p>
            </div>
          )}

          {prontuarioText && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium mb-2">
                ✅ Prontuário gerado com sucesso!
              </p>
              <p className="text-xs text-green-700">
                Clique em "Visualizar" para ver o prontuário completo ou "Editar" para fazer alterações.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prontuário Modal */}
      <ProntuarioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prontuarioText={prontuarioText}
        isEditing={isEditingProntuario}
        onSave={handleSaveProntuario}
        patientName={selectedPatient?.name || 'Paciente'}
        templateName={selectedTemplate?.name || 'Template Padrão'}
      />
    </div>
  );
}