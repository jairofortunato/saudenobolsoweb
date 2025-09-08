'use client';

/**
 * =====================================
 * RCR-30 UPLOAD PROGRESS
 * =====================================
 * 
 * Clean progress bar with upload statistics and status.
 * Light blue theme with smooth animations and detailed progress info.
 */

import { UploadProgress as UploadProgressType } from '../../types/rcr30';

interface UploadProgressProps {
  progress: UploadProgressType;
  onCancel?: () => void;
  className?: string;
}

export function UploadProgress({ progress, onCancel, className = '' }: UploadProgressProps) {
  const { loaded, total, percentage, status, error } = progress;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusConfig = (status: UploadProgressType['status']) => {
    switch (status) {
      case 'preparing':
        return {
          color: 'bg-blue-500',
          text: 'Preparando upload...',
          textColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'uploading':
        return {
          color: 'bg-blue-500',
          text: 'Enviando...',
          textColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'completing':
        return {
          color: 'bg-purple-500',
          text: 'Finalizando...',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      case 'completed':
        return {
          color: 'bg-green-500',
          text: 'Upload completo!',
          textColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'failed':
        return {
          color: 'bg-red-500',
          text: 'Falha no upload',
          textColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Status desconhecido',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-blue-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${statusConfig.color} ${
            status === 'uploading' || status === 'preparing' || status === 'completing' 
              ? 'animate-pulse' 
              : ''
          }`} />
          <span className={`font-medium ${statusConfig.textColor}`}>
            {statusConfig.text}
          </span>
        </div>
        
        {/* Cancel Button */}
        {(status === 'preparing' || status === 'uploading') && onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
            title="Cancel upload"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{percentage}% completo</span>
          {total > 0 && (
            <span>{formatBytes(loaded)} / {formatBytes(total)}</span>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ease-out ${statusConfig.color} ${
              status === 'uploading' ? 'animate-pulse' : ''
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Status Details */}
      <div className={`p-3 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        {status === 'failed' && error ? (
          <div className="text-sm text-red-600">
            <strong>Erro:</strong> {error}
          </div>
        ) : status === 'completed' ? (
          <div className="text-sm text-green-600">
            <strong>Sucesso!</strong> Arquivo enviado com sucesso ({formatBytes(total)})
          </div>
        ) : status === 'preparing' ? (
          <div className="text-sm text-blue-600">
            Preparando para enviar seu arquivo de áudio...
          </div>
        ) : status === 'uploading' ? (
          <div className="text-sm text-blue-600">
            <div className="flex justify-between">
              <span>Enviando para armazenamento seguro...</span>
              {loaded > 0 && total > 0 && (
                <span className="font-mono">
                  {((loaded / total) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ) : status === 'completing' ? (
          <div className="text-sm text-purple-600">
            Finalizando upload e iniciando processamento...
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Status do upload: {status}
          </div>
        )}
      </div>

      {/* Upload Speed (only during active upload) */}
      {status === 'uploading' && loaded > 0 && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>Enviando com segurança para armazenamento na nuvem</span>
          </div>
        </div>
      )}
    </div>
  );
}