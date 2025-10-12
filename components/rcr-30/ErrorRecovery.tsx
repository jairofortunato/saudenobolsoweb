'use client';

/**
 * =====================================
 * RCR-30 ERROR RECOVERY
 * =====================================
 * 
 * Error handling and retry interface with clean design.
 * Provides user-friendly error messages and recovery options.
 */

import { useState } from 'react';
import { RCR30Error } from '../../types/rcr30';

interface ErrorRecoveryProps {
  error: RCR30Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function ErrorRecovery({
  error,
  onRetry,
  onDismiss,
  onViewDetails,
  className = ''
}: ErrorRecoveryProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const getErrorConfig = (error: RCR30Error) => {
    switch (error.type) {
      case 'recording':
        return {
          icon: '🎤',
          title: 'Recording Error',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          buttonColor: 'bg-red-500 hover:bg-red-600'
        };
      case 'storage':
        return {
          icon: '💾',
          title: 'Storage Error',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          buttonColor: 'bg-orange-500 hover:bg-orange-600'
        };
      case 'upload':
        return {
          icon: '📤',
          title: 'Upload Error',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
        };
      case 'network':
        return {
          icon: '🌐',
          title: 'Network Error',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          buttonColor: 'bg-blue-500 hover:bg-blue-600'
        };
      case 'processing':
        return {
          icon: '⚙️',
          title: 'Processing Error',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-700',
          buttonColor: 'bg-purple-500 hover:bg-purple-600'
        };
      case 'validation':
        // Special handling for upgrade required
        if (error.code === 'UPGRADE_REQUIRED') {
          return {
            icon: '⭐',
            title: 'Upgrade to Professional',
            bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
            borderColor: 'border-blue-300',
            textColor: 'text-blue-900',
            buttonColor: 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
          };
        }
        return {
          icon: '⚠️',
          title: 'Validation Error',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
        };
      default:
        return {
          icon: '❌',
          title: 'Unknown Error',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          buttonColor: 'bg-gray-500 hover:bg-gray-600'
        };
    }
  };

  const config = getErrorConfig(error);

  const getUserFriendlyMessage = (error: RCR30Error): string => {
    switch (error.code) {
      case 'MEDIARECORDER_UNSUPPORTED':
        return 'Your browser does not support audio recording. Please try using Chrome, Firefox, or Edge.';
      case 'START_RECORDING_FAILED':
        return 'Could not start recording. Please check your microphone permissions and try again.';
      case 'BLOB_NOT_FOUND':
        return 'The recorded audio could not be found. You may need to record again.';
      case 'SIGNED_URL_REQUEST_FAILED':
        return 'Could not prepare file upload. Please check your connection and try again.';
      case 'STORAGE_UPLOAD_FAILED':
        return 'File upload failed. Your recording is saved locally and will be retried automatically.';
      case 'STORAGE_UPLOAD_TIMEOUT':
        return 'Upload took too long. Please check your connection and try again.';
      case 'UPLOAD_COMPLETE_FAILED':
        return 'Could not complete the upload process. Please try again.';
      case 'POLLING_TIMEOUT':
        return 'Processing is taking longer than expected. You can wait or try again later.';
      case 'POLLING_FAILED':
        return 'Could not check processing status. Your recording is safe and processing may still be in progress.';
      default:
        return error.message;
    }
  };

  const getRecoveryActions = (error: RCR30Error): string[] => {
    const actions: string[] = [];

    // Special handling for upgrade required
    if (error.code === 'UPGRADE_REQUIRED') {
      actions.push('✨ Consultas ilimitadas com o plano Professional');
      actions.push('💰 Apenas R$ 190/mês (5.240 minutos inclusos)');
      actions.push('📊 Acompanhe seu histórico completo');
      actions.push('🔄 Sem limite de prontuários');
      return actions;
    }

    switch (error.type) {
      case 'recording':
        actions.push('Check microphone permissions');
        actions.push('Try using a different browser');
        actions.push('Refresh the page and try again');
        break;
      case 'storage':
        actions.push('Your recording is safely stored locally');
        actions.push('Try uploading again');
        break;
      case 'upload':
        actions.push('Check your internet connection');
        actions.push('The system will retry automatically');
        actions.push('Your recording is safe in local storage');
        break;
      case 'network':
        actions.push('Check your internet connection');
        actions.push('Try again in a few moments');
        break;
      case 'processing':
        actions.push('The server may be busy');
        actions.push('Try again later');
        actions.push('Your recording is uploaded safely');
        break;
    }

    return actions;
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border-2 ${config.borderColor} ${className}`}>
      <div className={`${config.bgColor} p-6 rounded-t-2xl`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">{config.icon}</div>
            <div>
              <h3 className={`font-semibold text-lg ${config.textColor}`}>
                {config.title}
              </h3>
              <p className={`text-sm mt-1 ${config.textColor} opacity-80`}>
                {getUserFriendlyMessage(error)}
              </p>
            </div>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${config.textColor} hover:opacity-70 transition-opacity duration-200`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Recovery Actions */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-800 mb-3">What you can do:</h4>
          <ul className="space-y-2">
            {getRecoveryActions(error).map((action, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                <span className="text-blue-500 mt-1">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {error.code === 'UPGRADE_REQUIRED' ? (
            // Special upgrade button for UPGRADE_REQUIRED
            <a
              href="/pricing"
              className={`px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${config.buttonColor}`}
            >
              ⭐ Assinar Professional - R$ 190/mês
            </a>
          ) : (
            <>
              {error.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className={`px-4 py-2 text-white rounded-lg font-medium transition-colors duration-200 ${config.buttonColor}`}
                >
                  🔄 Try Again
                </button>
              )}

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-4 py-2 text-gray-600 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                {showDetails ? '📖 Hide Details' : '🔍 Show Details'}
              </button>

              {onViewDetails && (
                <button
                  onClick={onViewDetails}
                  className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  📋 View Logs
                </button>
              )}
            </>
          )}
        </div>

        {/* Error Details */}
        {showDetails && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-800 mb-2">Technical Details:</h5>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Error Code:</strong> {error.code}</div>
              <div><strong>Type:</strong> {error.type}</div>
              <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
              {error.appointmentId && (
                <div><strong>Appointment ID:</strong> {error.appointmentId}</div>
              )}
              {error.details && (
                <div>
                  <strong>Details:</strong>
                  <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Your data is safe and no information has been lost. 
          You can continue when ready.
        </div>
      </div>
    </div>
  );
}