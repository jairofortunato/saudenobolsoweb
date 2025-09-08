'use client';

/**
 * =====================================
 * RCR-30 PRONTUARIO DISPLAY
 * =====================================
 * 
 * Clean, professional medical record display with light blue theme.
 * Presents the final generated prontuário in an organized, readable format.
 */

import { useState } from 'react';

interface ProntuarioDisplayProps {
  prontuario: any;
  transcript?: string;
  patientName?: string;
  template?: {
    id: string;
    name: string;
    specialty: string;
  };
  onClose?: () => void;
  className?: string;
}

export function ProntuarioDisplay({
  prontuario,
  transcript,
  patientName,
  template,
  onClose,
  className = ''
}: ProntuarioDisplayProps) {
  const [activeTab, setActiveTab] = useState<'prontuario' | 'transcript'>('prontuario');

  if (!prontuario) {
    return (
      <div className={`bg-white border border-gray-300 ${className}`}>
        <div className="text-center text-gray-600 p-8">
          <p>No medical record available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300">
        <div>
          <h2 className="text-lg font-medium text-black">Medical Record</h2>
          {template && (
            <p className="text-sm text-gray-600">
              {template.name} • {template.specialty}
            </p>
          )}
          {patientName && (
            <p className="text-sm text-gray-600">{patientName}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black"
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          onClick={() => setActiveTab('prontuario')}
          className={`px-4 py-2 text-sm border-b-2 ${
            activeTab === 'prontuario'
              ? 'border-black text-black'
              : 'border-transparent text-gray-600 hover:text-black'
          }`}
        >
          Medical Record
        </button>
        {transcript && (
          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-2 text-sm border-b-2 ${
              activeTab === 'transcript'
                ? 'border-black text-black'
                : 'border-transparent text-gray-600 hover:text-black'
            }`}
          >
            Transcript
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'prontuario' ? (
          <div className="space-y-4">
            {/* Render prontuário content */}
            {typeof prontuario === 'string' ? (
              <div>
                <pre className="whitespace-pre-wrap text-sm text-black bg-white p-3 border border-gray-300">
                  {prontuario}
                </pre>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(prontuario).map(([key, value]) => (
                  <div key={key} className="border-l-2 border-gray-400 pl-3">
                    <h3 className="font-medium text-black capitalize mb-1">
                      {key.replace(/_/g, ' ')}
                    </h3>
                    <div className="text-gray-700">
                      {typeof value === 'string' ? (
                        <p className="whitespace-pre-wrap">{value}</p>
                      ) : Array.isArray(value) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {value.map((item, index) => (
                            <li key={index} className="text-sm">
                              {typeof item === 'object' ? JSON.stringify(item, null, 2) : item}
                            </li>
                          ))}
                        </ul>
                      ) : typeof value === 'object' && value !== null ? (
                        <div className="bg-gray-50 p-2 border border-gray-300">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <p>{String(value)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-300 p-3">
              <h3 className="font-medium text-black mb-1">Original Transcript</h3>
              <p className="text-sm text-gray-600">
                Raw transcription from audio recording before medical analysis.
              </p>
            </div>
            <div>
              <pre className="whitespace-pre-wrap text-sm text-black bg-white p-3 border border-gray-300 leading-relaxed">
                {transcript}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-gray-300 bg-gray-50">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Generated with AI</span>
          <span>•</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
        
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-sm text-black bg-white border border-gray-300 hover:bg-gray-50">
            Export
          </button>
          <button className="px-3 py-1 text-sm text-black bg-white border border-gray-300 hover:bg-gray-50">
            Print
          </button>
        </div>
      </div>
    </div>
  );
}