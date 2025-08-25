'use client';

import React, { useState } from 'react';
import { PatientSearchAndDisplay } from './PatientSearchAndDisplay';
import { RecordingAndTranscription } from './RecordingAndTranscription';
import { MP3FileImportAndTranscription } from './MP3FileImportAndTranscription';
import { ConsultationTemplateSelector } from './ConsultationTemplateSelector';
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

interface ProntoDocPageProps {
  className?: string;
}

export function ProntoDocPage({ className }: ProntoDocPageProps) {
  // Create a default test patient to bypass patient selection for testing
  const defaultTestPatient: PatientProfile = {
    id: 'test-patient-001',
    name: 'Paciente de Teste',
    cpf: '000.000.000-00',
    pin: '123456',
    isExisting: false
  };

  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(defaultTestPatient);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  const [generatedProntuario, setGeneratedProntuario] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'recording' | 'import'>('recording');

  const handlePatientSelection = (patient: PatientProfile | null) => {
    setSelectedPatient(patient);
    if (patient?.id !== selectedPatient?.id) {
      setGeneratedProntuario('');
    }
  };

  const handleTemplateSelection = (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    if (template?.id !== selectedTemplate?.id) {
      setGeneratedProntuario('');
    }
  };

  const handleProntuarioGenerated = (prontuario: string) => {
    setGeneratedProntuario(prontuario);
  };

  // Clear parent prontuario state when new recording starts
  const handleClearProntuario = () => {
    setGeneratedProntuario('');
  };

  // Handle mode switching
  const handleModeChange = (mode: 'recording' | 'import') => {
    setActiveMode(mode);
    setGeneratedProntuario(''); // Clear previous results when switching modes
  };

  // Hidden patient selection for testing - set to true to enable patient selection
  const ENABLE_PATIENT_SELECTION = false;

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-24">
        {/* Patient Selection - Hidden for testing but preserved for future use */}
        {ENABLE_PATIENT_SELECTION && (
          <PatientSearchAndDisplay 
            onPatientSelected={handlePatientSelection}
            disabled={false}
          />
        )}

        {/* =====================================
            CONSULTATION TEMPLATE SELECTION
            ===================================== */}
        {/* This component handles template selection and creation */}
        {/* Templates define the AI prompt and structure for prontuário generation */}
        <ConsultationTemplateSelector 
          onTemplateSelected={handleTemplateSelection}
          selectedTemplate={selectedTemplate}
          disabled={false}
        />

        {/* =====================================
            MODE SELECTOR
            ===================================== */}
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center">
            <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
              <div className="flex space-x-1">
                <button
                  onClick={() => handleModeChange('recording')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeMode === 'recording'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Gravação ao Vivo</span>
                  </div>
                </button>
                <button
                  onClick={() => handleModeChange('import')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeMode === 'import'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Importar Arquivo</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mt-3">
            {activeMode === 'recording' 
              ? 'Grave a consulta em tempo real usando o microfone'
              : 'Importe um arquivo de áudio MP3/WAV de uma consulta já gravada'
            }
          </p>
        </div>

        {/* =====================================
            RECORDING AND TRANSCRIPTION
            ===================================== */}
        {/* This component handles:
             1. Real-time audio recording with MediaRecorder API
             2. Audio visualization during recording
             3. Audio file upload to AI processor for transcription (OpenAI Whisper)
             4. AI-powered SOAP prontuário generation (GPT-4o)
             5. Editable prontuário results for doctor review
             
             API ROUTES USED:
             - POST /api/doctor/transcribe-audio → forwards to AI processor OpenAI Whisper
             - POST /api/doctor/generate-prontuario → uses GPT-4o for SOAP generation
        */}
        {activeMode === 'recording' && (
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
              console.error('🚨 [PRONTODOC] Recording component error:', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
              });
            }}
          >
            <RecordingAndTranscription 
              selectedPatient={selectedPatient}
              selectedTemplate={selectedTemplate}
              onProntuarioGenerated={handleProntuarioGenerated}
              onClearProntuario={handleClearProntuario}
            />
          </ErrorBoundary>
        )}

        {/* =====================================
            MP3 FILE IMPORT AND TRANSCRIPTION
            ===================================== */}
        {/* This component handles:
             1. MP3/WAV/M4A file selection and validation
             2. File upload to AI processor for transcription (OpenAI Whisper)
             3. AI-powered SOAP prontuário generation (GPT-4o)
             4. Editable prontuário results for doctor review
             
             API ROUTES USED:
             - POST /api/doctor/transcribe-audio → forwards to AI processor OpenAI Whisper
             - POST /api/doctor/generate-prontuario → uses GPT-4o for SOAP generation
        */}
        {activeMode === 'import' && (
          <ErrorBoundary
            fallback={
              <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Erro no Sistema de Importação
                </h3>
                <p className="text-red-700 mb-4">
                  Ocorreu um erro no sistema de importação e transcrição. 
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
              console.error('🚨 [PRONTODOC] MP3 import component error:', {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
              });
            }}
          >
            <MP3FileImportAndTranscription 
              selectedPatient={selectedPatient}
              selectedTemplate={selectedTemplate}
              onProntuarioGenerated={handleProntuarioGenerated}
              onClearProntuario={handleClearProntuario}
            />
          </ErrorBoundary>
        )}

        {generatedProntuario && selectedPatient && (
          <div className="">
           
          </div>
        )}
      </div>
    </div>
  );
}