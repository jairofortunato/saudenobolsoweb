'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface TranscriptSegment {
  id: string;
  content: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speakerId?: string;
  speakerLabel?: string;
  isFinal: boolean;
  timestamp: Date;
}

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  isRecording: boolean;
  interimText?: string;
  autoScroll?: boolean;
  showConfidence?: boolean;
  showTimestamps?: boolean;
  showSpeakers?: boolean;
  onExport?: () => void;
  className?: string;
}

export function TranscriptDisplay({
  segments,
  isRecording,
  interimText = '',
  autoScroll = true,
  showConfidence = true,
  showTimestamps = false,
  showSpeakers = true,
  onExport,
  className
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Auto-scroll to bottom when new segments are added
  useEffect(() => {
    if (autoScroll && !isUserScrolling && scrollRef.current) {
      const scrollElement = scrollRef.current;
      const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop <= scrollElement.clientHeight + 100;
      
      if (isAtBottom) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        setShowScrollToBottom(false);
      } else {
        setShowScrollToBottom(true);
      }
    }
  }, [segments, interimText, autoScroll, isUserScrolling]);

  // Handle scroll events to detect user scrolling
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const scrollElement = scrollRef.current;
    const isAtBottom = scrollElement.scrollHeight - scrollElement.scrollTop <= scrollElement.clientHeight + 100;
    
    setShowScrollToBottom(!isAtBottom && segments.length > 0);
    
    // Detect if user is actively scrolling
    setIsUserScrolling(true);
    setTimeout(() => setIsUserScrolling(false), 1000);
  };

  // Scroll to bottom manually
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowScrollToBottom(false);
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get speaker color
  const getSpeakerColor = (speakerId?: string): string => {
    if (!speakerId) return 'text-slate-600';
    const colors = [
      'text-blue-600',
      'text-purple-600', 
      'text-green-600',
      'text-orange-600',
      'text-pink-600'
    ];
    const index = parseInt(speakerId) % colors.length;
    return colors[index];
  };

  const ConfidenceIcon = ({ confidence }: { confidence: number }) => (
    <div className="flex space-x-0.5">
      {[1, 2, 3].map((level) => (
        <div
          key={level}
          className={cn(
            "w-1 h-3 rounded-full",
            confidence >= (level * 0.33) ? getConfidenceColor(confidence) : "bg-slate-200"
          )}
        />
      ))}
    </div>
  );

  return (
    <Card variant="elevated" className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Transcrição da Consulta
            {isRecording && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-1" />
                Gravando
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              {segments.length > 0 && (
                <span>{segments.length} segmentos</span>
              )}
              {showConfidence && (
                <div className="flex items-center space-x-1">
                  <span>Confiança:</span>
                  <ConfidenceIcon confidence={segments.length > 0 ? segments.reduce((acc, s) => acc + s.confidence, 0) / segments.length : 0} />
                </div>
              )}
            </div>
            
            {/* Export Button */}
            {segments.length > 0 && onExport && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExport}
                className="flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto px-6 pb-6 space-y-3"
        >
          {segments.length === 0 && !interimText ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <svg className="w-12 h-12 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-lg font-medium mb-2">Aguardando transcrição</p>
              <p className="text-sm">Inicie a gravação para ver a transcrição em tempo real</p>
            </div>
          ) : (
            <>
              {/* Final transcript segments */}
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className={cn(
                    "p-4 rounded-2xl transition-all duration-200",
                    segment.isFinal 
                      ? "bg-white border border-slate-200 shadow-sm" 
                      : "bg-blue-50 border border-blue-200"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {/* Speaker indicator */}
                    {showSpeakers && segment.speakerId && (
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
                        getSpeakerColor(segment.speakerId).replace('text-', 'bg-')
                      )}>
                        {segment.speakerLabel ? segment.speakerLabel.charAt(0) : segment.speakerId}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Header with metadata */}
                      <div className="flex items-center space-x-3 mb-2">
                        {showSpeakers && segment.speakerLabel && (
                          <span className={cn(
                            "text-sm font-medium",
                            getSpeakerColor(segment.speakerId)
                          )}>
                            {segment.speakerLabel}
                          </span>
                        )}
                        
                        {showTimestamps && (
                          <span className="text-xs text-slate-500">
                            {formatTime(segment.startTime)}
                          </span>
                        )}
                        
                        {showConfidence && (
                          <div className="flex items-center space-x-1">
                            <ConfidenceIcon confidence={segment.confidence} />
                            <span className="text-xs text-slate-500">
                              {Math.round(segment.confidence * 100)}%
                            </span>
                          </div>
                        )}
                        
                        {!segment.isFinal && (
                          <span className="text-xs text-blue-600 font-medium">
                            Processando...
                          </span>
                        )}
                      </div>
                      
                      {/* Content */}
                      <p className="text-slate-800 leading-relaxed">
                        {segment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Interim text */}
              {interimText && (
                <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="text-xs text-yellow-700 font-medium">
                      Transcrevendo...
                    </span>
                  </div>
                  <p className="text-slate-800 leading-relaxed opacity-75">
                    {interimText}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <div className="absolute bottom-4 right-4">
            <Button
              size="sm"
              variant="outline"
              onClick={scrollToBottom}
              className="rounded-full shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}