'use client';

import React, { useState } from 'react';
import { PatientSearchAndDisplay } from './PatientSearchAndDisplay';
import { RecordingAndTranscription } from './RecordingAndTranscription';
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

        {generatedProntuario && selectedPatient && (
          <div className="">
           
          </div>
        )}
      </div>
    </div>
  );
}