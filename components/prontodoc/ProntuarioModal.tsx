'use client';

import React from 'react';
import { Button } from '../index';

interface ProntuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  prontuarioText: string;
  patientName?: string;
  templateName?: string;
}

export function ProntuarioModal({ 
  isOpen, 
  onClose, 
  prontuarioText, 
  patientName,
  templateName 
}: ProntuarioModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              📋 Prontuário Médico
            </h2>
            {patientName && (
              <p className="text-sm text-gray-600 mt-1">
                Paciente: <span className="font-medium">{patientName}</span>
              </p>
            )}
            {templateName && (
              <p className="text-sm text-gray-600">
                Template: <span className="font-medium">{templateName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full bg-white border border-gray-200 rounded-lg overflow-y-auto">
            <div className="p-6 text-black font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {prontuarioText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Gerado em {new Date().toLocaleString('pt-BR')}
            </div>
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 