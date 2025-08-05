'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

interface AudioVisualizerProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  className?: string;
}

export function AudioVisualizer({ 
  audioStream, 
  isRecording, 
  className 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Initialize audio analysis
  useEffect(() => {
    if (!audioStream || !isRecording) {
      setIsActive(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      setIsActive(true);

      return () => {
        source.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('Error initializing audio analyzer:', error);
    }
  }, [audioStream, isRecording]);

  // Animation loop
  const animate = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    
    analyser.getByteFrequencyData(dataArray);

    // Calculate audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    drawWaveform(ctx, canvas, dataArray);

    if (isActive && isRecording) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isActive, isRecording]);

  useEffect(() => {
    if (isActive && isRecording) {
      animate();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, isRecording, animate]);

  const drawWaveform = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    dataArray: Uint8Array
  ) => {
    const width = canvas.width;
    const height = canvas.height;
    const barCount = 32;
    const barWidth = width / barCount;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#10b981'); // green-500
    gradient.addColorStop(0.6, '#f59e0b'); // amber-500  
    gradient.addColorStop(1, '#ef4444'); // red-500

    ctx.fillStyle = gradient;

    // Draw bars
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const barHeight = (dataArray[dataIndex] / 255) * height * 0.8;
      
      const x = i * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    }
  };

  // Audio level bars component
  const AudioLevelBars = () => {
    const bars = Array.from({ length: 10 }, (_, i) => {
      const threshold = (i + 1) / 10;
      const isActive = audioLevel >= threshold;
      
      let barColor = 'bg-slate-200';
      if (isActive) {
        if (threshold <= 0.6) barColor = 'bg-green-400';
        else if (threshold <= 0.8) barColor = 'bg-yellow-400';
        else barColor = 'bg-red-400';
      }
      
      return (
        <div
          key={i}
          className={cn(
            'w-3 rounded-full transition-all duration-100',
            barColor,
            isActive ? 'opacity-100' : 'opacity-30'
          )}
          style={{ height: `${(i + 1) * 10}%` }}
        />
      );
    });

    return (
      <div className="flex items-end space-x-1 h-16">
        {bars}
      </div>
    );
  };

  const getAudioLevelText = () => {
    if (audioLevel < 0.1) return 'Silêncio';
    if (audioLevel < 0.3) return 'Baixo';
    if (audioLevel < 0.6) return 'Médio';
    if (audioLevel < 0.8) return 'Alto';
    return 'Muito Alto';
  };

  const getAudioLevelColor = () => {
    if (audioLevel < 0.1) return 'text-slate-500';
    if (audioLevel < 0.3) return 'text-blue-500';
    if (audioLevel < 0.6) return 'text-green-500';
    if (audioLevel < 0.8) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card variant="soft" className={cn("w-full", className)}>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            Visualização do Áudio
          </h3>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isRecording && isActive ? "bg-green-400 animate-pulse" : "bg-slate-300"
            )} />
            <span className="text-xs text-slate-500">
              {isRecording && isActive ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {isRecording && isActive ? (
          <div className="space-y-4">
            {/* Waveform Canvas */}
            <div className="bg-slate-900 rounded-xl p-4 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={320}
                height={80}
                className="w-full h-20"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* Audio Level Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AudioLevelBars />
                <div className="text-sm">
                  <p className={cn("font-medium", getAudioLevelColor())}>
                    {getAudioLevelText()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {Math.round(audioLevel * 100)}% do máximo
                  </p>
                </div>
              </div>
            </div>

            {/* Audio Quality Tips */}
            <div className="text-xs text-slate-600 space-y-1">
              {audioLevel < 0.1 && (
                <p className="text-red-600">⚠️ Nível muito baixo - aproxime o microfone</p>
              )}
              {audioLevel > 0.9 && (
                <p className="text-red-600">⚠️ Nível muito alto - afaste o microfone</p>
              )}
              {audioLevel >= 0.2 && audioLevel <= 0.8 && (
                <p className="text-green-600">✓ Nível de áudio ideal</p>
              )}
            </div>
          </div>
        ) : (
          /* Inactive State */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 mb-2">Visualização inativa</p>
            <p className="text-xs text-slate-400">
              Inicie a gravação para ver a forma de onda do áudio
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}