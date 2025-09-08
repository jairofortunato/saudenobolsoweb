'use client';

/**
 * =====================================
 * RCR-30 RECORDING CONTROLS
 * =====================================
 * 
 * Modern recording control interface with audio visualizer design.
 * Provides Start/Stop/Pause buttons with visual status indicators and animated audio bars.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RecordingStatus } from '../../types/rcr30';

interface RecordingControlsProps {
  recordingStatus: RecordingStatus;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
  className?: string;
  showSetupState?: boolean; // Show setup state instead of waiting for recording to start
  workflowState?: 'setup' | 'recording' | 'processing_upload' | 'completed' | 'error';
}

export function RecordingControls({
  recordingStatus,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
  className = '',
  showSetupState = false,
  workflowState = 'setup'
}: RecordingControlsProps) {
  const { isRecording, isPaused, duration, chunks, size } = recordingStatus;
  const [animatedLevels, setAnimatedLevels] = useState<number[]>(Array.from({ length: 16 }, () => 0));

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Animate audio bars during recording
  const updateAnimatedLevels = useCallback(() => {
    // Stop animation if not actively recording or if we're processing/uploading/completed
    if (!isRecording || isPaused || workflowState === 'processing_upload' || workflowState === 'completed') return;

    // Generate random levels with center emphasis
    const halfLevels: number[] = [];
    for (let i = 0; i < 16; i++) {
      const baseLevel = 0.2 + Math.random() * 0.6;
      const centerEmphasis = 1 - Math.abs(i - 7.5) / 8; // Emphasize center
      const level = Math.max(0.15, baseLevel * (0.5 + centerEmphasis * 0.5));
      halfLevels.push(level);
    }
    
    setAnimatedLevels(halfLevels);
    requestAnimationFrame(updateAnimatedLevels);
  }, [isRecording, isPaused, workflowState]);

  useEffect(() => {
    if (isRecording && !isPaused && workflowState !== 'processing_upload' && workflowState !== 'completed') {
      updateAnimatedLevels();
    }
  }, [isRecording, isPaused, workflowState, updateAnimatedLevels]);

  // Setup state gentle animation - removed since bars are now static

  // Idle profile (center-emphasized)
  const idleHalf = Array.from({ length: 16 }, (_, i) => {
    const center = 7.5;
    const dist = Math.abs(i - center);
    const v = Math.max(0.1, 0.4 - dist * 0.03);
    return Math.max(0.08, v);
  });

  // Different states for different visual profiles
  const completedHalf = Array.from({ length: 16 }, (_, i) => {
    const center = 7.5;
    const dist = Math.abs(i - center);
    const v = Math.max(0.05, 0.2 - dist * 0.02); // Lower, flatter profile for completed state
    return Math.max(0.05, v);
  });
  
  // Setup state shows static bars (no animation)
  const setupLevels = showSetupState ? idleHalf : idleHalf;
  
  const half = workflowState === 'completed' 
    ? completedHalf
    : (isRecording && !isPaused ? animatedLevels : setupLevels);
  // Mirror around center
  const mirrored = [...half.slice().reverse(), ...half];


  const handlePauseAction = () => {
    if (isRecording) {
      onPause();
    }
  };

  return (
    <div className={className}>
      {/* Title and Status */}
      <div className="mb-6">
        
        {/* Status and Duration Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Recording Indicator */}
            <div className={`w-3 h-3 rounded-full ${
              workflowState === 'completed'
                ? 'bg-green-500'
                : isRecording 
                  ? 'bg-red-500 animate-pulse' 
                  : isPaused 
                    ? 'bg-yellow-400' 
                    : showSetupState
                      ? 'bg-black animate-pulse'
                      : 'bg-gray-400'
            }`} />
            
            {/* Status Text */}
            <span className="text-gray-700 font-medium">
              {workflowState === 'completed' 
                ? 'Concluído' 
                : isRecording 
                  ? 'Gravando' 
                  : isPaused 
                    ? 'Pausado' 
                    : showSetupState 
                      ? 'Clique para Iniciar' 
                      : 'Pronto'}
            </span>
          </div>

          {/* Duration */}
          <div className="text-2xl font-mono text-gray-900 font-semibold">
            {formatDuration(duration)}
          </div>
        </div>

        {/* Recording Stats */}
        {(isRecording || isPaused || duration > 0) && (
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>Chunks: {chunks}</span>
            <span>Tamanho: {formatSize(size)}</span>
          </div>
        )}
      </div>

      {/* Audio Visualizer Container */}
      <div className="relative w-full h-40 md:h-48 mb-6">
        {/* Audio Bars */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-7xl flex items-center justify-center gap-1.5 md:gap-2 px-4">
            {mirrored.map((level, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center gap-1 w-2 md:w-2.5 h-full">
                <div
                  className="w-full rounded-full transition-all duration-75 bg-black"
                  style={{ height: `${Math.round(level * 46)}%` }}
                />
                <div
                  className="w-full rounded-full transition-all duration-75 bg-black"
                  style={{ height: `${Math.round(level * 46)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Central Control Buttons */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center space-x-4 pointer-events-auto">
            {/* When recording: show pause button (but not when processing or completed) */}
            {isRecording && workflowState !== 'processing_upload' && workflowState !== 'completed' && (
              <button
                type="button"
                onClick={handlePauseAction}
                disabled={disabled}
                className="rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white bg-yellow-500 hover:bg-yellow-600 active:scale-95 hover:scale-105 w-24 h-24 md:w-28 md:h-28"
                aria-label="Pausar gravação"
              >
                <svg className="w-7 h-7 md:w-9 md:h-9" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              </button>
            )}

            {/* When recording: show stop button (but not when processing or completed) */}
            {isRecording && workflowState !== 'processing_upload' && workflowState !== 'completed' && (
              <button
                type="button"
                onClick={onStop}
                disabled={disabled}
                className="rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white bg-red-500 hover:bg-red-600 active:scale-95 hover:scale-105 w-24 h-24 md:w-28 md:h-28"
                aria-label="Parar gravação"
              >
                <svg className="w-7 h-7 md:w-9 md:h-9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
                </svg>
              </button>
            )}

            {/* When paused: show continue button */}
            {isPaused && (
              <button
                type="button"
                onClick={onResume}
                disabled={disabled}
                className="rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white bg-green-500 hover:bg-green-600 active:scale-95 hover:scale-105 w-24 h-24 md:w-28 md:h-28"
                aria-label="Continuar gravação"
              >
                <svg className="w-7 h-7 md:w-9 md:h-9 ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            )}

            {/* When paused: show stop button */}
            {isPaused && (
              <button
                type="button"
                onClick={onStop}
                disabled={disabled}
                className="rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white bg-red-500 hover:bg-red-600 active:scale-95 hover:scale-105 w-24 h-24 md:w-28 md:h-28"
                aria-label="Parar gravação"
              >
                <svg className="w-7 h-7 md:w-9 md:h-9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
                </svg>
              </button>
            )}

            {/* When processing: show processing indicator */}
            {workflowState === 'processing_upload' && (
              <div className="flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-blue-500 text-white">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-medium">Processando</span>
                </div>
              </div>
            )}

            {/* When completed: show checkmark icon */}
            {workflowState === 'completed' && (
              <div className="flex items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-green-500 text-white">
                <svg className="w-12 h-12 md:w-16 md:h-16" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
            )}

            {/* When not recording and not paused and not processing and not completed: show start button */}
            {!isRecording && !isPaused && workflowState !== 'processing_upload' && workflowState !== 'completed' && (
              <button
                type="button"
                onClick={onStart}
                disabled={disabled}
                className={`pointer-events-auto rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white ${
                  disabled
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : showSetupState
                      ? 'bg-black hover:bg-gray-800 active:scale-95 hover:scale-105'
                      : 'bg-blue-500 hover:bg-blue-600 active:scale-95 hover:scale-105'
                } w-28 h-28 md:w-36 md:h-36`}
                aria-label={showSetupState ? 'Iniciar gravação da consulta' : 'Iniciar gravação'}
              >
                {/* Microphone icon */}
                <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" fill="currentColor" stroke="currentColor" />
                  <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" />
                  <path d="M12 18v4m0 0H9m3 0h3" stroke="currentColor" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-600">
        {workflowState === 'completed' && 'Gravação processada com sucesso! Confira os resultados abaixo.'}
        {workflowState === 'processing_upload' && 'Processando gravação... Aguarde'}
        {workflowState !== 'processing_upload' && workflowState !== 'completed' && !isRecording && !isPaused && 'Clique no microfone para iniciar a gravação'}
        {workflowState !== 'processing_upload' && workflowState !== 'completed' && isRecording && 'Gravação em andamento... Clique na pausa para pausar ou no quadrado para terminar'}
        {workflowState !== 'processing_upload' && workflowState !== 'completed' && isPaused && 'Gravação pausada. Clique no play para continuar ou no quadrado para terminar'}
      </div>
    </div>
  );
}