'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

/**
 * =====================================
 * SESSION STATE MANAGER COMPONENT
 * =====================================
 * 
 * This component manages consultation session state across chunks.
 * It tracks consultation context, manages memory-based state,
 * and coordinates between chunked recording and real-time insights.
 * 
 * FEATURES:
 * - Session context tracking
 * - Memory-based state management
 * - Consultation progress monitoring
 * - Inter-component coordination
 * - Session metadata handling
 * - Error state management
 */

interface ChunkedRecordingChunk {
  chunk_number: number;
  audio_blob: Blob;
  transcript: string;
  confidence: number;
  timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
}

interface MedicalInsights {
  diagnostic_hypotheses: string[];
  key_symptoms: string[];
  risk_factors: string[];
  suggested_questions: string[];
  treatment_considerations: string[];
  urgency_level: 'low' | 'medium' | 'high' | 'urgent';
}

interface InsightEntry {
  chunk_number: number;
  timestamp: string;
  insights: MedicalInsights;
  processing_time: number;
}

interface ConsultationSession {
  session_id: string;
  patient_id: string;
  doctor_id: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  chunks: ChunkedRecordingChunk[];
  insights: InsightEntry[];
  total_duration: number;
  metadata: {
    patient_context?: {
      name?: string;
      age?: number;
      gender?: string;
    };
    template_info?: {
      name: string;
      specialty: string;
    };
  };
}

interface SessionStateManagerProps {
  patientId: string;
  doctorId: string;
  patientContext?: {
    name?: string;
    age?: number;
    gender?: string;
  };
  templateInfo?: {
    name: string;
    specialty: string;
  };
  onSessionCreated: (session: ConsultationSession) => void;
  onSessionUpdated: (session: ConsultationSession) => void;
  onSessionCompleted: (session: ConsultationSession) => void;
  onError: (error: string) => void;
  className?: string;
}

export function SessionStateManager({
  patientId,
  doctorId,
  patientContext,
  templateInfo,
  onSessionCreated,
  onSessionUpdated,
  onSessionCompleted,
  onError,
  className
}: SessionStateManagerProps) {
  const [session, setSession] = useState<ConsultationSession | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Only log on state changes, not every render
  const prevSessionRef = useRef(session?.session_id);
  const prevStatusRef = useRef(session?.status);
  
  useEffect(() => {
    if (prevSessionRef.current !== session?.session_id || prevStatusRef.current !== session?.status) {
      console.log('📊 [SESSION-MANAGER] Component state changed:', {
        hasSession: !!session,
        sessionId: session?.session_id,
        status: session?.status,
        chunksCount: session?.chunks.length || 0,
        insightsCount: session?.insights.length || 0,
        isSessionActive
      });
      prevSessionRef.current = session?.session_id;
      prevStatusRef.current = session?.status;
    }
  }, [session?.session_id, session?.status, session?.chunks.length, session?.insights.length, isSessionActive]);

  // Generate unique session ID
  const generateSessionId = useCallback((): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }, []);

  // Create new consultation session
  const createSession = useCallback((): ConsultationSession => {
    const sessionId = generateSessionId();
    const newSession: ConsultationSession = {
      session_id: sessionId,
      patient_id: patientId,
      doctor_id: doctorId,
      start_time: new Date().toISOString(),
      status: 'active',
      chunks: [],
      insights: [],
      total_duration: 0,
      metadata: {
        patient_context: patientContext,
        template_info: templateInfo
      }
    };

    console.log('🆕 [SESSION-MANAGER] Created new session:', sessionId);
    return newSession;
  }, [generateSessionId, patientId, doctorId, patientContext, templateInfo]);

  // Start consultation session
  const startSession = useCallback(() => {
    console.log('🚀 [SESSION-MANAGER] Starting consultation session');

    try {
      const newSession = createSession();
      setSession(newSession);
      setIsSessionActive(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setSession(prev => {
          if (!prev) return prev;
          const updatedSession = {
            ...prev,
            total_duration: prev.total_duration + 1
          };
          // Use setTimeout to avoid setState during render
          setTimeout(() => onSessionUpdated(updatedSession), 0);
          return updatedSession;
        });
      }, 1000);

      onSessionCreated(newSession);
      console.log('✅ [SESSION-MANAGER] Session started successfully:', newSession.session_id);

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to start session:', error);
      onError(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [createSession, onSessionCreated, onSessionUpdated, onError]);

  // Add chunk to session
  const addChunkToSession = useCallback((chunk: ChunkedRecordingChunk) => {
    console.log('📦 [SESSION-MANAGER] Adding chunk to session:', chunk.chunk_number);

    setSession(prev => {
      if (!prev) {
        console.warn('⚠️ [SESSION-MANAGER] No active session to add chunk to');
        return prev;
      }

      // Check if chunk already exists
      const existingChunkIndex = prev.chunks.findIndex(c => c.chunk_number === chunk.chunk_number);
      
      let updatedChunks: ChunkedRecordingChunk[];
      if (existingChunkIndex !== -1) {
        // Update existing chunk
        updatedChunks = prev.chunks.map((c, index) => 
          index === existingChunkIndex ? chunk : c
        );
        console.log('🔄 [SESSION-MANAGER] Updated existing chunk:', chunk.chunk_number);
      } else {
        // Add new chunk
        updatedChunks = [...prev.chunks, chunk];
        console.log('➕ [SESSION-MANAGER] Added new chunk:', chunk.chunk_number);
      }

      const updatedSession = {
        ...prev,
        chunks: updatedChunks
      };

      // Use setTimeout to avoid setState during render
      setTimeout(() => onSessionUpdated(updatedSession), 0);
      return updatedSession;
    });
  }, [onSessionUpdated]);

  // Add insights to session
  const addInsightsToSession = useCallback((insights: InsightEntry) => {
    console.log('🧠 [SESSION-MANAGER] Adding insights to session:', insights.chunk_number);

    setSession(prev => {
      if (!prev) {
        console.warn('⚠️ [SESSION-MANAGER] No active session to add insights to');
        return prev;
      }

      // Check if insights already exist for this chunk
      const existingInsightIndex = prev.insights.findIndex(i => i.chunk_number === insights.chunk_number);
      
      let updatedInsights: InsightEntry[];
      if (existingInsightIndex !== -1) {
        // Update existing insights
        updatedInsights = prev.insights.map((i, index) => 
          index === existingInsightIndex ? insights : i
        );
        console.log('🔄 [SESSION-MANAGER] Updated existing insights:', insights.chunk_number);
      } else {
        // Add new insights
        updatedInsights = [...prev.insights, insights];
        console.log('➕ [SESSION-MANAGER] Added new insights:', insights.chunk_number);
      }

      const updatedSession = {
        ...prev,
        insights: updatedInsights
      };

      // Use setTimeout to avoid setState during render
      setTimeout(() => onSessionUpdated(updatedSession), 0);
      return updatedSession;
    });
  }, [onSessionUpdated]);

  // Complete consultation session
  const completeSession = useCallback(() => {
    console.log('🏁 [SESSION-MANAGER] Completing consultation session');

    if (!session) {
      console.warn('⚠️ [SESSION-MANAGER] No active session to complete');
      return;
    }

    try {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsSessionActive(false);

      const completedSession: ConsultationSession = {
        ...session,
        status: 'completed',
        end_time: new Date().toISOString()
      };

      setSession(completedSession);
      onSessionCompleted(completedSession);

      console.log('✅ [SESSION-MANAGER] Session completed successfully:', {
        sessionId: completedSession.session_id,
        duration: completedSession.total_duration,
        chunks: completedSession.chunks.length,
        insights: completedSession.insights.length
      });

    } catch (error) {
      console.error('❌ [SESSION-MANAGER] Failed to complete session:', error);
      onError(`Failed to complete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [session, onSessionCompleted, onError]);

  // Pause session (for future use)
  const pauseSession = useCallback(() => {
    console.log('⏸️ [SESSION-MANAGER] Pausing consultation session');

    if (!session || session.status !== 'active') {
      console.warn('⚠️ [SESSION-MANAGER] No active session to pause');
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsSessionActive(false);

    const pausedSession: ConsultationSession = {
      ...session,
      status: 'paused'
    };

    setSession(pausedSession);
    onSessionUpdated(pausedSession);

    console.log('⏸️ [SESSION-MANAGER] Session paused:', session.session_id);
  }, [session, onSessionUpdated]);

  // Resume session (for future use)
  const resumeSession = useCallback(() => {
    console.log('▶️ [SESSION-MANAGER] Resuming consultation session');

    if (!session || session.status !== 'paused') {
      console.warn('⚠️ [SESSION-MANAGER] No paused session to resume');
      return;
    }

    setIsSessionActive(true);

    // Restart timer
    timerRef.current = setInterval(() => {
      setSession(prev => {
        if (!prev) return prev;
        const updatedSession = {
          ...prev,
          total_duration: prev.total_duration + 1
        };
        // Use setTimeout to avoid setState during render
        setTimeout(() => onSessionUpdated(updatedSession), 0);
        return updatedSession;
      });
    }, 1000);

    const resumedSession: ConsultationSession = {
      ...session,
      status: 'active'
    };

    setSession(resumedSession);
    onSessionUpdated(resumedSession);

    console.log('▶️ [SESSION-MANAGER] Session resumed:', session.session_id);
  }, [session, onSessionUpdated]);

  // Get session statistics
  const getSessionStats = useCallback(() => {
    if (!session) return null;

    const completedChunks = session.chunks.filter(c => c.processing_status === 'completed').length;
    const totalTranscriptLength = session.chunks.reduce((sum, c) => sum + c.transcript.length, 0);
    const averageConfidence = session.chunks.length > 0 
      ? session.chunks.reduce((sum, c) => sum + c.confidence, 0) / session.chunks.length 
      : 0;
    const latestInsights = session.insights.length > 0 
      ? session.insights[session.insights.length - 1] 
      : null;

    return {
      session_id: session.session_id,
      status: session.status,
      duration: session.total_duration,
      total_chunks: session.chunks.length,
      completed_chunks: completedChunks,
      total_insights: session.insights.length,
      total_transcript_length: totalTranscriptLength,
      average_confidence: averageConfidence,
      latest_urgency: latestInsights?.insights.urgency_level || 'low',
      estimated_minutes: Math.floor(session.total_duration / 60)
    };
  }, [session]);

  // Format duration display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Expose public methods for external components
  useEffect(() => {
    (window as any).sessionManager = {
      startSession,
      completeSession,
      pauseSession,
      resumeSession,
      addChunkToSession,
      addInsightsToSession,
      getSessionStats,
      getCurrentSession: () => session,
      isActive: () => isSessionActive
    };

    return () => {
      delete (window as any).sessionManager;
    };
  }, [startSession, completeSession, pauseSession, resumeSession, addChunkToSession, addInsightsToSession, getSessionStats, session, isSessionActive]);

  const stats = getSessionStats();

  return (
    <div className={`session-state-manager ${className || ''}`}>
      {session && (
        <div className="session-info p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                session.status === 'active' ? 'bg-green-500 animate-pulse' :
                session.status === 'paused' ? 'bg-yellow-500' :
                session.status === 'completed' ? 'bg-blue-500' :
                'bg-red-500'
              }`}></div>
              <h4 className="font-semibold text-gray-800">Sessão de Consulta</h4>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              session.status === 'active' ? 'bg-green-100 text-green-800' :
              session.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              session.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {session.status === 'active' ? 'ATIVA' :
               session.status === 'paused' ? 'PAUSADA' :
               session.status === 'completed' ? 'CONCLUÍDA' :
               'ERRO'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Duração:</span>
              <div className="font-mono text-lg">{formatDuration(session.total_duration)}</div>
            </div>
            <div>
              <span className="text-gray-600">Segmentos:</span>
              <div className="font-mono text-lg">{stats?.completed_chunks || 0}/{stats?.total_chunks || 0}</div>
            </div>
            <div>
              <span className="text-gray-600">Insights:</span>
              <div className="font-mono text-lg">{stats?.total_insights || 0}</div>
            </div>
            <div>
              <span className="text-gray-600">Confiança:</span>
              <div className="font-mono text-lg">{((stats?.average_confidence || 0) * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            <div>ID: {session.session_id}</div>
            <div>Início: {new Date(session.start_time).toLocaleString('pt-BR')}</div>
            {session.end_time && (
              <div>Fim: {new Date(session.end_time).toLocaleString('pt-BR')}</div>
            )}
          </div>

          {session.metadata.patient_context && (
            <div className="mt-3 text-xs text-gray-600">
              <div>Paciente: {session.metadata.patient_context.name || 'Nome não informado'}</div>
              {session.metadata.template_info && (
                <div>Template: {session.metadata.template_info.name} ({session.metadata.template_info.specialty})</div>
              )}
            </div>
          )}

          {stats?.latest_urgency && stats.latest_urgency !== 'low' && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <strong>Última urgência detectada:</strong> {
                stats.latest_urgency === 'urgent' ? 'URGENTE' :
                stats.latest_urgency === 'high' ? 'ALTO' :
                stats.latest_urgency === 'medium' ? 'MÉDIO' : 'BAIXO'
              }
            </div>
          )}
        </div>
      )}

      {!session && (
        <div className="no-session p-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="mb-2">📊</div>
          <div className="font-medium">Nenhuma sessão ativa</div>
          <div className="text-sm">A sessão será criada automaticamente ao iniciar a gravação</div>
        </div>
      )}
    </div>
  );
}