'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  onToggleRecording?: () => void;
  className?: string;
}

export function AudioVisualizer({ 
  audioStream, 
  isRecording, 
  onToggleRecording,
  className 
}: AudioVisualizerProps) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [levelsHalf, setLevelsHalf] = useState<number[]>(Array.from({ length: 16 }, () => 0));

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
            className={`pointer-events-auto rounded-full shadow-2xl transition-all duration-200 ease-out active:scale-95 hover:scale-105 flex items-center justify-center text-white ${
              isRecording ? 'bg-black hover:bg-red-600' : 'bg-black hover:bg-slate-900'
            } ${'w-28 h-28 md:w-36 md:h-36'}`}
            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
          >
            {isRecording ? (
              <svg className="w-9 h-9 md:w-11 md:h-11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6.5" y="6.5" width="11" height="11" rx="2.2" />
              </svg>
            ) : (
              <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" fill="currentColor" stroke="currentColor" />
                <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" />
                <path d="M12 18v4m0 0H9m3 0h3" stroke="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}