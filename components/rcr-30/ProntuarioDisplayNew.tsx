'use client';

/**
 * =====================================
 * RCR-30 PRONTUÁRIO DISPLAY
 * =====================================
 * 
 * Professional medical record display component for completed prontuários.
 * Shows structured medical data in SOAP format with professional styling.
 */

import { useState } from 'react';

interface ProntuarioData {
  patient_name: string;
  consultation_date: string;
  duration_seconds: number;
  transcript: string;
  prontuario_text: string;
  ai_model: string;
  template: {
    name: string;
    specialty: string;
  };
  generated_by: string;
  processing_time: number;
}

interface ProntuarioDisplayProps {
  prontuario: ProntuarioData;
  patientName?: string;
  onClose?: () => void;
  className?: string;
}

export function ProntuarioDisplayNew({
  prontuario,
  patientName,
  onClose,
  className = ''
}: ProntuarioDisplayProps) {
  const [activeTab, setActiveTab] = useState<'prontuario' | 'metadata'>('prontuario');

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Parse SOAP sections from prontuario text
  const parseSoapSections = (text: string) => {
    const sections = {
      allergies: '',
      medications: '',
      comorbidities: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    };

    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('Alergias:')) {
        currentSection = 'allergies';
        continue;
      } else if (trimmedLine.includes('MUC:')) {
        currentSection = 'medications';
        continue;
      } else if (trimmedLine.includes('Comorbidades:')) {
        currentSection = 'comorbidities';
        continue;
      } else if (trimmedLine === 'S:') {
        currentSection = 'subjective';
        continue;
      } else if (trimmedLine === 'O:') {
        currentSection = 'objective';
        continue;
      } else if (trimmedLine === 'A:') {
        currentSection = 'assessment';
        continue;
      } else if (trimmedLine === 'P:') {
        currentSection = 'plan';
        continue;
      }

      if (currentSection && trimmedLine) {
        sections[currentSection as keyof typeof sections] += (sections[currentSection as keyof typeof sections] ? '\n' : '') + trimmedLine;
      }
    }

    return sections;
  };

  const soapSections = parseSoapSections(prontuario.prontuario_text);

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-blue-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-blue-800">
              📋 Medical Record Generated
            </h3>
            <p className="text-sm text-blue-600">
              {patientName || prontuario.patient_name} • {formatDate(prontuario.consultation_date)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('prontuario')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'prontuario'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Medical Record
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'metadata'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ℹ️ Details
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'prontuario' ? (
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Patient Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{patientName || prontuario.patient_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">{formatDate(prontuario.consultation_date)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2 font-medium">{formatDuration(prontuario.duration_seconds)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Template:</span>
                  <span className="ml-2 font-medium">{prontuario.template.name}</span>
                </div>
              </div>
            </div>

            {/* SOAP Sections */}
            <div className="space-y-4">
              {/* Background Information */}
              {(soapSections.allergies || soapSections.medications || soapSections.comorbidities) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-3">Background Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-yellow-700">Allergies</h5>
                      <p className="text-yellow-800 mt-1">{soapSections.allergies || 'No allergies reported'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-yellow-700">Medications</h5>
                      <p className="text-yellow-800 mt-1">{soapSections.medications || 'No medications reported'}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-yellow-700">Comorbidities</h5>
                      <p className="text-yellow-800 mt-1">{soapSections.comorbidities || 'No comorbidities reported'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SOAP Format */}
              <div className="space-y-4">
                {/* Subjective */}
                {soapSections.subjective && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">📝 Subjective (S)</h4>
                    <p className="text-green-800 leading-relaxed">{soapSections.subjective}</p>
                  </div>
                )}

                {/* Objective */}
                {soapSections.objective && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🔍 Objective (O)</h4>
                    <p className="text-blue-800 leading-relaxed">{soapSections.objective}</p>
                  </div>
                )}

                {/* Assessment */}
                {soapSections.assessment && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-800 mb-2">🧠 Assessment (A)</h4>
                    <p className="text-purple-800 leading-relaxed">{soapSections.assessment}</p>
                  </div>
                )}

                {/* Plan */}
                {soapSections.plan && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-2">📋 Plan (P)</h4>
                    <p className="text-orange-800 leading-relaxed">{soapSections.plan}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([prontuario.prontuario_text], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = `prontuario-${patientName || 'patient'}-${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Record</span>
              </button>
              
              <button
                onClick={() => navigator.clipboard.writeText(prontuario.prontuario_text)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Record</span>
              </button>
            </div>
          </div>
        ) : (
          /* Metadata Tab */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-2">AI Processing</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{prontuario.ai_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="font-medium">{prontuario.processing_time.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generated by:</span>
                    <span className="font-medium text-xs">{prontuario.generated_by}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 mb-2">Template Info</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Template:</span>
                    <span className="font-medium">{prontuario.template.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Specialty:</span>
                    <span className="font-medium">{prontuario.template.specialty}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw Transcript Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium text-gray-700 mb-2">Original Transcript (Preview)</h5>
              <div className="text-sm text-gray-600 line-clamp-3">
                {prontuario.transcript.substring(0, 200)}...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}