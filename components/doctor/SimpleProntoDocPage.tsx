'use client';

import React, { useState } from 'react';
import { ConsultationTemplateSelector } from './ConsultationTemplateSelector';
import { SimpleRecordingAndTranscription } from './SimpleRecordingAndTranscription';
import { ErrorBoundary } from '../ErrorBoundary';

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

interface SimpleProntoDocPageProps {
  className?: string;
}

export function SimpleProntoDocPage({ className }: SimpleProntoDocPageProps) {
  // Create a default test patient to bypass patient selection for testing
  const defaultTestPatient: PatientProfile = {
    id: 'test-patient-001',
    name: 'Paciente de Teste',
    cpf: '000.000.000-00',
    pin: '123456',
    isExisting: false
  };

  const [selectedPatient] = useState<PatientProfile | null>(defaultTestPatient);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [generatedProntuario, setGeneratedProntuario] = useState<string>('');

  const handleTemplateSelection = (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    if (template?.id !== selectedTemplate?.id) {
      setGeneratedProntuario('');
    }
  };

  const handleProntuarioGenerated = (prontuario: string) => {
    setGeneratedProntuario(prontuario);
  };

  const handleClearProntuario = () => {
    setGeneratedProntuario('');
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            🎙️ ProntoDoc Simples - Arquitetura Sem Chunking
          </h2>
          <p className="text-blue-700">
            Esta versão usa a arquitetura simples original: grava um único arquivo de áudio, 
            envia para o ai-processor para transcrição, e gera o prontuário usando a API local.
          </p>
        </div>

        {/* Template Selection */}
        <ConsultationTemplateSelector 
          onTemplateSelected={handleTemplateSelection}
          selectedTemplate={selectedTemplate}
          disabled={false}
        />

        {/* Simple Recording and Transcription */}
        <ErrorBoundary
          fallback={
            <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Erro no Sistema de Gravação
              </h3>
              <p className="text-red-700 mb-4">
                Ocorreu um erro no sistema de gravação e transcrição. 
                Tente recarregar a página ou entre em contato com o suporte.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Recarregar Página
              </button>
            </div>
          }
          onError={(error, errorInfo) => {
            console.error('🚨 [SIMPLE-PRONTODOC] Recording component error:', {
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack
            });
          }}
        >
          <SimpleRecordingAndTranscription 
            selectedPatient={selectedPatient}
            selectedTemplate={selectedTemplate}
            onProntuarioGenerated={handleProntuarioGenerated}
            onClearProntuario={handleClearProntuario}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}