'use client';

import React, { useState } from 'react';
import { 
  Card,
  CardContent
} from '../index';
import { PatientSearchAndDisplay } from './PatientSearchAndDisplay';
import { RecordingAndTranscription } from './RecordingAndTranscription';
import { ConsultationTemplateSelector } from './ConsultationTemplateSelector';

/**
 * =====================================
 * PRONTODOC MAIN PAGE COMPONENT
 * =====================================
 * 
 * This is the main ProntoDoc consultation page that orchestrates:
 * 1. Patient search and selection (via PatientSearchAndDisplay component)
 * 2. Real-time audio recording and transcription
 * 3. AI-powered medical record generation
 * 4. Doctor review and approval workflow
 * 
 * WORKFLOW:
 * 1. Doctor searches/selects patient → PatientSearchAndDisplay handles this
 * 2. Doctor starts recording → Audio stream + transcription begins
 * 3. Real-time transcription → Updates transcript display
 * 4. Doctor stops recording → Triggers AI processing for medical record
 * 5. Generated medical record → Doctor reviews and approves
 * 
 * DATABASE INTEGRATION:
 * - Uses existing consultation workflow with ProntoDoc extensions
 * - New consultations created in 'consultations' table with transcript fields
 * - AI-generated records stored in 'medical_records' table
 * - Analytics tracked in 'transcription_analytics' table
 */

interface PatientProfile {
  id: string;
  name: string;
  cpf: string;
  pin: string;
  isExisting: boolean; // true for existing patients, false for new ones
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
  // Patient selection state (managed by PatientSearchAndDisplay component)
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  
  // Template selection state (managed by ConsultationTemplateSelector component)
  const [selectedTemplate, setSelectedTemplate] = useState<ConsultationTemplate | null>(null);
  
  // Generated prontuário state
  const [generatedProntuario, setGeneratedProntuario] = useState<string>('');

  /**
   * HANDLE PATIENT SELECTION
   * Called by PatientSearchAndDisplay component when patient is selected
   */
  const handlePatientSelection = (patient: PatientProfile | null) => {
    setSelectedPatient(patient);
    // Clear previous prontuário when patient changes
    if (patient?.id !== selectedPatient?.id) {
      setGeneratedProntuario('');
    }
  };

  /**
   * HANDLE TEMPLATE SELECTION
   * Called by ConsultationTemplateSelector component when template is selected
   */
  const handleTemplateSelection = (template: ConsultationTemplate) => {
    setSelectedTemplate(template);
    // Clear previous prontuário when template changes
    if (template?.id !== selectedTemplate?.id) {
      setGeneratedProntuario('');
    }
    console.log('📋 Template selected:', template.name, template.specialty);
  };

  /**
   * HANDLE PRONTUÁRIO GENERATION
   * Called by RecordingAndTranscription component when prontuário is generated
   */
  const handleProntuarioGenerated = (prontuario: string) => {
    setGeneratedProntuario(prontuario);
    console.log('📋 Prontuário generated for patient:', selectedPatient?.name);
    console.log('📋 Using template:', selectedTemplate?.name);
  };



  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${className}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* =====================================
            PATIENT SEARCH AND SELECTION
            ===================================== */}
        {/* This component handles all patient search, selection, and medical data display */}
        <PatientSearchAndDisplay 
          onPatientSelected={handlePatientSelection}
          disabled={false}
        />

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
        <RecordingAndTranscription 
          selectedPatient={selectedPatient}
          selectedTemplate={selectedTemplate}
          onProntuarioGenerated={handleProntuarioGenerated}
        />

        {/* =====================================
            CONSULTATION SUMMARY
            ===================================== */}
        {/* Shows final consultation summary when prontuário is generated */}
        {generatedProntuario && selectedPatient && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                ✅ Consulta Finalizada
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg text-sm">
                <div>
                  <span className="text-gray-600">Paciente:</span>
                  <div className="font-medium">{selectedPatient.name}</div>
                </div>
                <div>
                  <span className="text-gray-600">Data:</span>
                  <div className="font-medium">{new Date().toLocaleString('pt-BR')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Template:</span>
                  <div className="font-medium">{selectedTemplate?.name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Especialidade:</span>
                  <div className="font-medium">{selectedTemplate?.specialty || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Tipo:</span>
                  <div className="font-medium">ProntoDoc - Consulta com IA</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium text-green-600">Prontuário gerado</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                💡 O prontuário foi gerado automaticamente e pode ser editado pelo médico antes do salvamento final.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}