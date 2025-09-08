'use client';

/**
 * =====================================
 * RCR-30 PROCESSING STATUS
 * =====================================
 * 
 * Backend processing progress display with AI workflow visualization.
 * Clean design showing transcription and medical record generation progress.
 */

import { AppointmentData } from '../../types/rcr30';

interface ProcessingStatusProps {
  currentStatus: AppointmentData | null;
  className?: string;
}

const PROCESSING_STEPS = [
  {
    key: 'processing',
    title: 'Transcrição por IA',
    description: 'Convertendo áudio em texto usando OpenAI Whisper',
    icon: '🎧'
  },
  {
    key: 'transcribed', 
    title: 'Análise Médica',
    description: 'Analisando transcrição para conteúdo médico',
    icon: '🧠'
  },
  {
    key: 'prontuario_ready',
    title: 'Geração de Prontuário',
    description: 'Gerando prontuário médico estruturado',
    icon: '📋'
  }
];

export function ProcessingStatus({ currentStatus, className = '' }: ProcessingStatusProps) {
  if (!currentStatus || !['processing', 'transcribed', 'prontuario_ready', 'failed'].includes(currentStatus.status)) {
    return null;
  }

  const getCurrentStepIndex = (status: AppointmentData['status']): number => {
    switch (status) {
      case 'processing': return 0;
      case 'transcribed': return 1;
      case 'prontuario_ready': return 2;
      case 'failed': return -1;
      default: return -1;
    }
  };

  const currentStepIndex = getCurrentStepIndex(currentStatus.status);
  const isComplete = currentStatus.status === 'prontuario_ready';
  const isFailed = currentStatus.status === 'failed';

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-blue-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${
            isFailed 
              ? 'bg-red-500' 
              : isComplete 
                ? 'bg-green-500' 
                : 'bg-blue-500 animate-pulse'
          }`} />
          <h3 className="text-lg font-semibold text-gray-800">
            {isFailed ? 'Processamento Falhou' : isComplete ? 'Processamento Completo' : 'Processamento IA'}
          </h3>
        </div>
        
        {!isFailed && !isComplete && (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
          </div>
        )}
      </div>

      {/* Processing Steps */}
      <div className="space-y-4">
        {PROCESSING_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex || isComplete;
          const isCurrent = index === currentStepIndex && !isComplete && !isFailed;
          const isPending = index > currentStepIndex && !isComplete;

          return (
            <div key={step.key} className="flex items-start space-x-4">
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                isCompleted 
                  ? 'bg-green-500 border-green-500 text-white'
                  : isCurrent 
                    ? 'bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm">{step.icon}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${
                  isCompleted 
                    ? 'text-green-600' 
                    : isCurrent 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                }`}>
                  {step.title}
                  {isCurrent && (
                    <span className="ml-2 text-sm text-blue-500 animate-pulse">
                      Em andamento...
                    </span>
                  )}
                </div>
                <div className={`text-sm mt-1 ${
                  isCompleted 
                    ? 'text-gray-600' 
                    : isCurrent 
                      ? 'text-gray-600' 
                      : 'text-gray-400'
                }`}>
                  {step.description}
                </div>
              </div>

              {/* Loading Animation for Current Step */}
              {isCurrent && (
                <div className="flex-shrink-0 w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {currentStatus.message && (
        <div className={`mt-6 p-4 rounded-lg border ${
          isFailed 
            ? 'bg-red-50 border-red-200 text-red-700'
            : isComplete 
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-start space-x-2">
            <span className="text-lg">
              {isFailed ? '⚠️' : isComplete ? '✅' : 'ℹ️'}
            </span>
            <div className="flex-1">
              <p className="font-medium">{currentStatus.message}</p>
              {currentStatus.error && (
                <p className="text-sm mt-1 text-red-600">{currentStatus.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            Tempo de processamento: {Math.floor(Date.now() / 1000 - new Date(currentStatus.createdAt).getTime() / 1000)}s
          </span>
          {isComplete && (
            <span className="text-green-600 font-medium">
              🎉 Pronto para visualizar prontuário
            </span>
          )}
          {isFailed && (
            <span className="text-red-600 font-medium">
              ❌ Processamento falhou
            </span>
          )}
        </div>
      </div>
    </div>
  );
}