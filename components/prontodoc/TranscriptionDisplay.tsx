'use client';

import React, { useCallback } from 'react';
import { Button } from '../ui/Button';

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  confidence: number;
  duration: number;
  word_count: number;
  provider: string;
}

interface TranscriptionDisplayProps {
  transcriptionResult: TranscriptionResult | null;
  className?: string;
}

export function TranscriptionDisplay({ 
  transcriptionResult, 
  className 
}: TranscriptionDisplayProps) {
  const handleCopyTranscription = useCallback(async () => {
    if (!transcriptionResult?.transcript) return;

    try {
      await navigator.clipboard.writeText(transcriptionResult.transcript);
      // You could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy transcription:', err);
    }
  }, [transcriptionResult?.transcript]);

  if (!transcriptionResult || !transcriptionResult.transcript) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Transcrição da Gravação
        </h3>
        
        <div className="flex items-center gap-3">
          {/* Transcription metadata */}
          <div className="text-sm text-gray-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {Math.round(transcriptionResult.duration)}s
            </span>
            
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m0 0V6a2 2 0 012-2h10a2 2 0 012 2v2" />
              </svg>
              {transcriptionResult.word_count} palavras
            </span>
            
            <span className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                transcriptionResult.confidence >= 0.8 ? 'bg-green-500' :
                transcriptionResult.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              {Math.round(transcriptionResult.confidence * 100)}% confiança
            </span>
          </div>

          {/* Copy button */}
          <Button 
            onClick={handleCopyTranscription}
            variant="outline"
            size="sm"
            className="px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-800"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar
          </Button>
        </div>
      </div>

      {/* Transcription text area */}
      <div className="relative">
        <textarea
          value={transcriptionResult.transcript}
          readOnly
          className={`w-full p-4 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:ring-1 focus:ring-blue-500 focus:border-blue-500 leading-relaxed bg-gray-50 ${
            transcriptionResult.transcript.length > 5000 ? 'h-48' : 'h-32'
          }`}
          placeholder="Transcrição aparecerá aqui..."
        />
        
        {/* Show length indicator for very long transcripts */}
        {transcriptionResult.transcript.length > 10000 && (
          <div className="absolute bottom-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Transcrição longa: {Math.round(transcriptionResult.transcript.length / 1000)}k chars
            </span>
          </div>
        )}
      </div>
    </div>
  );
}