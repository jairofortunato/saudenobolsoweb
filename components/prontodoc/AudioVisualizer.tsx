'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// TypeScript declarations for Wake Lock API
declare global {
  interface Navigator {
    wakeLock?: {
      request(type: 'screen'): Promise<WakeLockSentinel>;
    };
  }
  
  interface WakeLockSentinel {
    release(): Promise<void>;
    addEventListener(type: 'release', listener: () => void): void;
    removeEventListener(type: 'release', listener: () => void): void;
  }
}

interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  isProcessing?: boolean; // New prop for loading state
  onToggleRecording?: () => void;
  className?: string;
}

export function AudioVisualizer({ 
  audioStream, 
  isRecording, 
  isProcessing = false,
  onToggleRecording,
  className 
}: AudioVisualizerProps) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [levelsHalf, setLevelsHalf] = useState<number[]>(Array.from({ length: 16 }, () => 0));

  // Wake Lock API functions
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired to prevent screen timeout during recording');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake lock was released');
        });
      } catch (err) {
        console.error('Failed to acquire wake lock:', err);
        // Fallback: try to prevent sleep with audio context
        keepAudioContextActive();
      }
    } else {
      // Fallback for browsers without Wake Lock API
      keepAudioContextActive();
      console.log('Wake Lock API not supported, using audio context fallback');
    }
  }, []);

  // Fallback method: Keep audio context active
  const keepAudioContextActive = useCallback(() => {
    // Note: This fallback should be called after the audio context is created
    // We'll delay this to ensure the analyser is ready
    setTimeout(() => {
      if (analyserRef.current?.context) {
        const audioContext = analyserRef.current.context;
        
        try {
          // Create a silent oscillator to keep audio context running
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          gainNode.gain.setValueAtTime(0, audioContext.currentTime); // Silent
          
          oscillator.frequency.setValueAtTime(20, audioContext.currentTime); // Very low frequency
          oscillator.start();
          
          // Store reference to clean up later
          (wakeLockRef.current as any) = { oscillator, gainNode, type: 'fallback' };
        } catch (err) {
          console.error('Failed to create audio fallback:', err);
        }
      }
    }, 100); // Small delay to ensure audio context is ready
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      if ((wakeLockRef.current as any).type === 'fallback') {
        // Clean up fallback oscillator
        const fallback = wakeLockRef.current as any;
        try {
          fallback.oscillator.stop();
          fallback.oscillator.disconnect();
          fallback.gainNode.disconnect();
        } catch (err) {
          console.error('Error cleaning up audio fallback:', err);
        }
      } else if ('release' in wakeLockRef.current) {
        // Release actual wake lock
        wakeLockRef.current.release();
      }
      wakeLockRef.current = null;
      console.log('Wake lock released');
    }
  }, []);

  // Manage wake lock based on recording state
  useEffect(() => {
    if (isRecording) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount or when recording state changes
    return () => {
      releaseWakeLock();
    };
  }, [isRecording, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible (handles browser minimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRecording && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, requestWakeLock]);

  // Init analyser
  useEffect(() => {
    if (!audioStream || !isRecording) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      analyser.fftSize = 512; // higher resolution
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      return () => {
        source.disconnect();
        audioContext.close();
      };
    } catch (e) {
      console.error('Audio analyzer init error:', e);
    }
  }, [audioStream, isRecording]);

  // Update loop
  const update = useCallback(() => {
    if (!isRecording || !analyserRef.current || !dataArrayRef.current) return;

    const analyser = analyserRef.current;
    const data = dataArrayRef.current;
    analyser.getByteFrequencyData(data);

    // Compute half-spectrum buckets, then mirror to center heavy energy near middle
    const halfCount = 16; // total bars will be 32 (mirrored)
    const segmentSize = Math.floor(data.length / halfCount);
    const halfLevels: number[] = [];

    for (let i = 0; i < halfCount; i++) {
      const start = i * segmentSize;
      const end = i === halfCount - 1 ? data.length : start + segmentSize;
      let sum = 0;
      for (let j = start; j < end; j++) sum += data[j];
      const avg = sum / Math.max(1, end - start);
      const normalized = Math.max(0.06, Math.min(1, avg / 255));
      halfLevels.push(normalized);
    }

    setLevelsHalf(halfLevels);
    requestAnimationFrame(update);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) update();
  }, [isRecording, update]);

  // Idle profile (center-emphasized)
  const idleHalf = Array.from({ length: 16 }, (_, i) => {
    const center = 0; // index 0 will be placed at center by mirroring
    const dist = Math.abs(i - center);
    const v = Math.max(0.1, 0.5 - dist * 0.03);
    return Math.max(0.08, v);
  });

  const half = isRecording ? levelsHalf : idleHalf;
  // Mirror around center so index 0 sits near the middle on both sides
  const mirrored = [...half.slice().reverse(), ...half];

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        Escutar e entender consulta
      </h2>
      <div className={`relative w-full h-40 md:h-48 ${className}`}>
        {/* Bars */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-7xl flex items-center justify-center gap-1.5 md:gap-2 px-4">
            {mirrored.map((level, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center gap-1 w-2 md:w-2.5 h-full">
                <div
                  className="w-full rounded-full bg-black"
                  style={{ height: `${Math.round(level * 46)}%` }}
                />
                <div
                  className="w-full rounded-full bg-black"
                  style={{ height: `${Math.round(level * 46)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Central mic button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={isProcessing}
            className={`pointer-events-auto rounded-full shadow-2xl transition-all duration-200 ease-out flex items-center justify-center text-white ${
              isProcessing 
                ? 'bg-blue-600 cursor-not-allowed' 
                : isRecording 
                  ? 'bg-black hover:bg-red-600 active:scale-95 hover:scale-105' 
                  : 'bg-black hover:bg-slate-900 active:scale-95 hover:scale-105'
            } ${'w-28 h-28 md:w-36 md:h-36'}`}
            aria-label={
              isProcessing 
                ? 'Processando áudio...' 
                : isRecording 
                  ? 'Parar gravação' 
                  : 'Iniciar gravação'
            }
          >
            {isProcessing ? (
              // Loading spinner
              <div className="animate-spin w-10 h-10 md:w-12 md:h-12">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                  <circle 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeDasharray="60 40"
                    className="opacity-75"
                  />
                </svg>
              </div>
            ) : isRecording ? (
              // Stop recording icon (square)
              <svg className="w-9 h-9 md:w-11 md:h-11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
              </svg>
            ) : (
              // Check icon (recording done)
              <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}