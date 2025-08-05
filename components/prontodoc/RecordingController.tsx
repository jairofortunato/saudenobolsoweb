'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

interface RecordingControllerProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  disabled?: boolean;
  className?: string;
}

export function RecordingController({
  isRecording,
  isPaused,
  duration,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  disabled = false,
  className
}: RecordingControllerProps) {
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const RecordingIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" />
    </svg>
  );

  const StopIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <rect x="4" y="4" width="12" height="12" rx="2" />
    </svg>
  );

  const PauseIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <rect x="6" y="4" width="2" height="12" rx="1" />
      <rect x="12" y="4" width="2" height="12" rx="1" />
    </svg>
  );

  const PlayIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269L18.85 10.82a1.5 1.5 0 000-2.64L6.3 2.84z" />
    </svg>
  );

  const MicIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  return (
    <Card variant="soft" hover="lift" className={cn("w-full max-w-md mx-auto", className)}>
      <CardContent className="text-center space-y-6">
        {/* Recording Status Indicator */}
        <div className="flex flex-col items-center space-y-3">
          <div className={cn(
            "relative p-4 rounded-full transition-all duration-300",
            isRecording 
              ? "bg-red-100 text-red-600" 
              : "bg-slate-100 text-slate-600"
          )}>
            <MicIcon />
            {isRecording && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="text-center">
            <p className={cn(
              "text-sm font-medium transition-colors",
              isRecording 
                ? isPaused 
                  ? "text-yellow-600" 
                  : "text-red-600"
                : "text-slate-600"
            )}>
              {isRecording 
                ? isPaused 
                  ? "Gravação Pausada" 
                  : "Gravando..." 
                : "Pronto para Gravar"
              }
            </p>
            <p className="text-2xl font-mono font-bold text-slate-800 mt-1">
              {formatDuration(duration)}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center items-center space-x-3">
          {!isRecording ? (
            // Start Recording Button
            <Button
              size="lg"
              variant="danger"
              onClick={onStartRecording}
              disabled={disabled}
              className="px-8 py-3"
              leftIcon={<RecordingIcon />}
            >
              Iniciar Gravação
            </Button>
          ) : (
            // Recording Controls
            <>
              {isPaused ? (
                <Button
                  size="lg"
                  variant="success"
                  onClick={onResumeRecording}
                  disabled={disabled}
                  leftIcon={<PlayIcon />}
                >
                  Retomar
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="warning"
                  onClick={onPauseRecording}
                  disabled={disabled}
                  leftIcon={<PauseIcon />}
                >
                  Pausar
                </Button>
              )}
              
              <Button
                size="lg"
                variant="outline"
                onClick={onStopRecording}
                disabled={disabled}
                leftIcon={<StopIcon />}
              >
                Finalizar
              </Button>
            </>
          )}
        </div>

        {/* Additional Info */}
        {isRecording && (
          <div className="text-xs text-slate-500 space-y-1">
            <p>• A consulta está sendo transcrita em tempo real</p>
            <p>• Mantenha o microfone próximo para melhor qualidade</p>
            <p>• Evite ruídos de fundo durante a gravação</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}