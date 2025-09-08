'use client';

/**
 * =====================================
 * RCR-30 TRANSCRIPTION DISPLAY
 * =====================================
 * 
 * Beautiful display component for the completed transcription.
 * Shows the raw transcript with audio controls and metadata.
 */

import { useState } from 'react';

interface TranscriptionDisplayProps {
  transcript: string;
  patientName?: string;
  durationSeconds?: number;
  processingTime?: number;
  onClose?: () => void;
  className?: string;
}

export function TranscriptionDisplay({
  transcript,
  patientName,
  durationSeconds = 0,
  processingTime,
  onClose,
  className = ''
}: TranscriptionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatProcessingTime = (seconds: number): string => {
    return `${seconds.toFixed(1)}s`;
  };

  return (
    <div className={`bg-white border border-gray-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300">
        <div>
          <h2 className="text-lg font-medium text-black">Transcription</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 hover:text-black"
          >
            {isExpanded ? '−' : '+'}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-black"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {patientName && (
              <div className="bg-gray-50 p-2 border border-gray-300">
                <div className="text-gray-600 font-medium">Patient</div>
                <div className="text-black">{patientName}</div>
              </div>
            )}
            
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="text-gray-600 font-medium">Duration</div>
              <div className="text-black">{formatDuration(durationSeconds)}</div>
            </div>
            
            <div className="bg-gray-50 p-2 border border-gray-300">
              <div className="text-gray-600 font-medium">Words</div>
              <div className="text-black">{transcript.split(' ').length}</div>
            </div>
            
            {processingTime && (
              <div className="bg-gray-50 p-2 border border-gray-300">
                <div className="text-gray-600 font-medium">Processed in</div>
                <div className="text-black">{formatProcessingTime(processingTime)}</div>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-black">Consultation Transcript</h4>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transcript);
                  // Could add a toast notification here
                }}
                className="px-2 py-1 text-sm text-black bg-white border border-gray-300 hover:bg-gray-50"
              >
                Copy
              </button>
            </div>
            
            <div className="bg-white border border-gray-300 p-3">
              <div className="text-black leading-relaxed whitespace-pre-wrap">
                {transcript}
              </div>
            </div>
          </div>

         
        </div>
      )}
    </div>
  );
}