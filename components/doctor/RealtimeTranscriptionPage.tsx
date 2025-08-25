'use client';

import React, { useState } from 'react';
import { RealtimeRecordingManager } from './RealtimeRecordingManager';
import { PatientSearchAndDisplay } from './PatientSearchAndDisplay';
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

interface RealtimeTranscriptionPageProps {
  className?: string;
}

export function RealtimeTranscriptionPage({ className }: RealtimeTranscriptionPageProps) {
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

  // Hidden patient selection for testing - set to true to enable patient selection
  const ENABLE_PATIENT_SELECTION = false;
  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
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
          selectedTemplate={selectedTemplate}
          onTemplateSelected={handleTemplateSelection}
          disabled={false}
        />


        {/* =====================================
            REALTIME RECORDING AND TRANSCRIPTION
            ===================================== */}
        {/* This component handles:
             1. Real-time audio recording with 4-minute chunks
             2. Automatic transcription of each chunk
             3. Display of transcription results as they arrive
             4. Continuous recording until manual stop
             5. Prontuário generation from combined transcription
             
             WORKFLOW:
             - Record for 4 minutes
             - Send chunk for transcription
             - Display transcription result
             - Continue recording next chunk
             - Repeat until user stops
             - Generate prontuário from complete transcription
             
             API ROUTES USED:
             - POST /api/doctor/transcribe-audio → processes each 4-minute chunk
             - POST /api/doctor/generate-prontuario → generates medical record from transcription
        */}
        <ErrorBoundary
          fallback={
            <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Erro no Sistema de Transcrição em Tempo Real
              </h3>
              <p className="text-red-700 mb-4">
                Ocorreu um erro no sistema de transcrição em tempo real. 
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
            console.error('🚨 [REALTIME-TRANSCRIPTION] Component error:', {
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack
            });
          }}
        >
          <RealtimeRecordingManager 
            selectedPatient={selectedPatient}
            selectedTemplate={selectedTemplate}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}