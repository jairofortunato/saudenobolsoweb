'use client';

/**
 * =====================================
 * RCR-30 STATUS INDICATOR
 * =====================================
 * 
 * Visual status display for the 6-state appointment progression.
 * Clean, minimalist design with light blue theme and smooth animations.
 */

import { AppointmentData } from '../../types/rcr30';

interface StatusIndicatorProps {
  currentStatus: AppointmentData | null;
  className?: string;
}

const STATUS_CONFIG = {
  recording: {
    label: 'Recording',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '🎤',
    description: 'Recording consultation...'
  },
  uploading: {
    label: 'Uploading',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: '📤',
    description: 'Uploading audio file...'
  },
  processing: {
    label: 'Processing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '⚙️',
    description: 'Processing with AI...'
  },
  transcribed: {
    label: 'Transcribed',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    icon: '📝',
    description: 'Generating medical record...'
  },
  prontuario_ready: {
    label: 'Complete',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✅',
    description: 'Medical record ready!'
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '❌',
    description: 'Processing failed'
  }
};

const STATUS_ORDER: AppointmentData['status'][] = [
  'recording',
  'uploading', 
  'processing',
  'transcribed',
  'prontuario_ready'
];

export function StatusIndicator({ currentStatus, className = '' }: StatusIndicatorProps) {
  const status = currentStatus?.status || 'recording';
  const config = STATUS_CONFIG[status];
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-blue-100 p-6 ${className}`}>
      {/* Current Status */}
      <div className={`flex items-center justify-center p-4 rounded-xl border-2 ${config.bgColor} ${config.borderColor} mb-6`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className={`font-semibold text-lg ${config.color}`}>
              {config.label}
            </div>
            <div className="text-sm text-gray-600">
              {config.description}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        {STATUS_ORDER.map((stepStatus, index) => {
          const stepConfig = STATUS_CONFIG[stepStatus];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stepStatus} className="flex items-center space-x-3">
              {/* Step Indicator */}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isCompleted 
                  ? 'bg-green-500 border-green-500' 
                  : isCurrent 
                    ? `${stepConfig.bgColor} ${stepConfig.borderColor} border-2` 
                    : 'bg-gray-100 border-gray-300'
              }`}>
                {isCompleted && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {isCurrent && (
                  <div className={`w-2 h-2 rounded-full ${stepConfig.color.replace('text-', 'bg-')}`} />
                )}
              </div>

              {/* Step Label */}
              <div className={`text-sm font-medium ${
                isCompleted 
                  ? 'text-green-600' 
                  : isCurrent 
                    ? stepConfig.color 
                    : 'text-gray-400'
              }`}>
                {stepConfig.label}
              </div>

              {/* Loading Animation for Current Step */}
              {isCurrent && !['prontuario_ready', 'failed'].includes(status) && (
                <div className="flex space-x-1">
                  <div className={`w-1 h-1 rounded-full ${stepConfig.color.replace('text-', 'bg-')} animate-bounce`} style={{animationDelay: '0ms'}} />
                  <div className={`w-1 h-1 rounded-full ${stepConfig.color.replace('text-', 'bg-')} animate-bounce`} style={{animationDelay: '150ms'}} />
                  <div className={`w-1 h-1 rounded-full ${stepConfig.color.replace('text-', 'bg-')} animate-bounce`} style={{animationDelay: '300ms'}} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      {currentStatus && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1">
            {currentStatus.patientName && (
              <div>Patient: {currentStatus.patientName}</div>
            )}
            <div>Duration: {Math.floor(currentStatus.durationSeconds / 60)}:{(currentStatus.durationSeconds % 60).toString().padStart(2, '0')}</div>
            {currentStatus.message && (
              <div className="text-blue-600 font-medium">{currentStatus.message}</div>
            )}
            {currentStatus.error && (
              <div className="text-red-600 font-medium">{currentStatus.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}