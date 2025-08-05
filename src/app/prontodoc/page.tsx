'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Loading
} from '../../../components';

// ProntoDoc Components
import { RecordingController } from '../../../components/prontodoc/RecordingController';
import { TranscriptDisplay, TranscriptSegment } from '../../../components/prontodoc/TranscriptDisplay';
import { AudioVisualizer } from '../../../components/prontodoc/AudioVisualizer';
import { SessionInfo, SessionDetails, SessionParticipant } from '../../../components/prontodoc/SessionInfo';
import { ExportModal } from '../../../components/prontodoc/ExportModal';

// ProntoDoc Client
import { ProntoDocClient, ProntoDocEvent } from '../../../lib/prontodoc-client';

export default function ProntoDocPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  
  // State management
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [transcriptSegments, setTranscriptSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState('');
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Refs
  const prontodocClientRef = useRef<ProntoDocClient | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Initialize ProntoDoc client
  useEffect(() => {
    if (!authLoading && user) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production-bebd.up.railway.app';
      console.log('🔧 ProntoDoc Page: Initializing ProntoDoc with API base URL:', apiBaseUrl);
      console.log('🌍 ProntoDoc Page: Environment variables:');
      console.log('  - NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
      console.log('  - NODE_ENV:', process.env.NODE_ENV);
      
      prontodocClientRef.current = new ProntoDocClient(apiBaseUrl);
      console.log('✅ ProntoDoc Page: Client initialization complete');
      
      // Setup event listeners
      setupEventListeners();
      setIsInitialized(true);

      return () => {
        console.log('🧹 ProntoDoc Page: Cleaning up client...');
        if (prontodocClientRef.current) {
          prontodocClientRef.current.dispose();
        }
      };
    }
  }, [authLoading, user]);

  // Setup ProntoDoc event listeners
  const setupEventListeners = useCallback(() => {
    const client = prontodocClientRef.current;
    if (!client) return;

    client.on('session_started', (event: ProntoDocEvent) => {
      console.log('Session started:', event);
      setSessionDetails(prev => prev ? {
        ...prev,
        recordingId: event.recordingId,
        status: 'active',
        startedAt: new Date()
      } : null);
    });

    client.on('interim_result', (event: ProntoDocEvent) => {
      if (event.data?.content) {
        setInterimText(event.data.content);
      }
    });

    client.on('final_result', (event: ProntoDocEvent) => {
      if (event.data?.content) {
        const segment: TranscriptSegment = {
          id: `${Date.now()}-${Math.random()}`,
          content: event.data.content,
          confidence: event.data.confidence || 0,
          startTime: event.data.startTime || 0,
          endTime: event.data.endTime || 0,
          speakerId: event.data.speakerId,
          speakerLabel: event.data.speakerLabel || (event.data.speakerId ? `Pessoa ${event.data.speakerId}` : undefined),
          isFinal: true,
          timestamp: new Date()
        };

        setTranscriptSegments(prev => [...prev, segment]);
        setInterimText(''); // Clear interim text
      }
    });

    client.on('session_ended', (event: ProntoDocEvent) => {
      console.log('Session ended:', event);
      setSessionDetails(prev => prev ? {
        ...prev,
        status: 'completed'
      } : null);
      stopDurationTimer();
    });

    client.on('error', (event: ProntoDocEvent) => {
      console.error('ProntoDoc error:', event);
      setError(event.message || 'Erro desconhecido');
      setIsRecording(false);
      setIsPaused(false);
      stopDurationTimer();
    });
  }, []);

  // Duration timer
  const startDurationTimer = useCallback(() => {
    sessionStartTimeRef.current = new Date();
    durationIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const elapsed = (Date.now() - sessionStartTimeRef.current.getTime()) / 1000;
        setDuration(elapsed);
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    sessionStartTimeRef.current = null;
  }, []);

  // Recording controls
  const handleStartRecording = useCallback(async () => {
    console.log('🎬 ProntoDoc Page: Starting recording process...');
    console.log('🔍 ProntoDoc Page: Client exists:', !!prontodocClientRef.current);
    console.log('🔍 ProntoDoc Page: User exists:', !!user);
    console.log('🔍 ProntoDoc Page: User role:', userRole);
    
    if (!prontodocClientRef.current || !user) {
      console.error('❌ ProntoDoc Page: Missing client or user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 ProntoDoc Page: Generated session ID:', sessionId);

      // Create session details
      const session: SessionDetails = {
        sessionId,
        patient: {
          id: userRole === 'patient' ? user.id : 'temp_patient_id', // TODO: Get from patient selection
          name: userRole === 'patient' ? user.user_metadata?.name || 'Paciente' : 'Paciente Selecionado',
          role: 'patient'
        },
        doctor: {
          id: userRole === 'doctor' ? user.id : 'temp_doctor_id', // TODO: Get from doctor selection
          name: userRole === 'doctor' ? user.user_metadata?.name || 'Médico' : 'Médico Responsável',
          role: 'doctor'
        },
        status: 'inactive',
        consultationType: 'ProntoDoc',
        specialty: 'Consulta Geral'
      };
      console.log('📋 ProntoDoc Page: Created session details:', session);

      setSessionDetails(session);

      // Start recording
      console.log('🚀 ProntoDoc Page: Starting recording with client...');
      await prontodocClientRef.current.startRecording({
        sessionId,
        patientId: session.patient.id,
        doctorId: session.doctor.id,
        options: {
          language: 'pt-BR',
          model: 'nova-3',
          interim_results: true,
          smart_format: true,
          diarize: true,
          endpointing: 300
        }
      });
      console.log('✅ ProntoDoc Page: Recording started successfully');

      // Get audio stream reference
      if (prontodocClientRef.current) {
        // Access private audioStream through type assertion (for visualization)
        const client = prontodocClientRef.current as any;
        if (client.audioStream) {
          setAudioStream(client.audioStream);
        }
      }

      setIsRecording(true);
      setIsPaused(false);
      startDurationTimer();

    } catch (error) {
      console.error('❌ ProntoDoc Page: Error starting recording:', error);
      console.error('❌ ProntoDoc Page: Error type:', typeof error);
      console.error('❌ ProntoDoc Page: Error constructor:', error?.constructor?.name);
      setError(error instanceof Error ? error.message : 'Erro ao iniciar gravação');
    } finally {
      console.log('🏁 ProntoDoc Page: Recording start process finished');
      setLoading(false);
    }
  }, [user, userRole, startDurationTimer]);

  const handleStopRecording = useCallback(async () => {
    if (!prontodocClientRef.current) return;

    setLoading(true);

    try {
      await prontodocClientRef.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);
      setAudioStream(null);
      stopDurationTimer();
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError(error instanceof Error ? error.message : 'Erro ao parar gravação');
    } finally {
      setLoading(false);
    }
  }, [stopDurationTimer]);

  const handlePauseRecording = useCallback(() => {
    setIsPaused(true);
    stopDurationTimer();
  }, [stopDurationTimer]);

  const handleResumeRecording = useCallback(() => {
    setIsPaused(false);
    startDurationTimer();
  }, [startDurationTimer]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Export modal handlers
  const handleOpenExportModal = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  // Redirect if not authenticated
  if (authLoading) {
    return <Loading />;
  }

  if (!user) {
    router.push('/signin');
    return <Loading />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ProntoDoc</h1>
            <p className="text-slate-600 mt-1">
              Transcrição de consultas médicas em tempo real
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Card variant="pink" className="border-red-200">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
                </svg>
                <span className="text-red-800 font-medium">Erro:</span>
                <span className="text-red-700">{error}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={clearError}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Session Info & Controls */}
          <div className="space-y-6">
            {/* Session Information */}
            {sessionDetails && (
              <SessionInfo 
                session={sessionDetails}
                showDetails={true}
              />
            )}

            {/* Recording Controller */}
            <RecordingController
              isRecording={isRecording}
              isPaused={isPaused}
              duration={duration}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onPauseRecording={handlePauseRecording}
              onResumeRecording={handleResumeRecording}
              disabled={loading || !isInitialized}
            />

            {/* Audio Visualizer */}
            <AudioVisualizer
              audioStream={audioStream}
              isRecording={isRecording && !isPaused}
            />
          </div>

          {/* Right Column - Transcript Display */}
          <div className="lg:col-span-2">
            <TranscriptDisplay
              segments={transcriptSegments}
              isRecording={isRecording}
              interimText={interimText}
              autoScroll={true}
              showConfidence={true}
              showTimestamps={true}
              showSpeakers={true}
              onExport={handleOpenExportModal}
              className="h-[800px]"
            />
          </div>
        </div>

        {/* Instructions Card */}
        {!isRecording && transcriptSegments.length === 0 && (
          <Card variant="blue" className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Como usar o ProntoDoc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h3 className="font-medium text-slate-900">Configurar Sessão</h3>
                  <p className="text-sm text-slate-600">
                    As informações do paciente e médico são configuradas automaticamente
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h3 className="font-medium text-slate-900">Iniciar Gravação</h3>
                  <p className="text-sm text-slate-600">
                    Clique em "Iniciar Gravação" e permita o acesso ao microfone
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h3 className="font-medium text-slate-900">Acompanhar Transcrição</h3>
                  <p className="text-sm text-slate-600">
                    Veja a transcrição em tempo real com identificação de falantes
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-900 mb-2">Dicas importantes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Mantenha o microfone próximo e evite ruídos de fundo</li>
                  <li>• Fale de forma clara e pausada para melhor precisão</li>
                  <li>• A transcrição é processada em tempo real com IA médica</li>
                  <li>• Todas as gravações são seguras e criptografadas</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={handleCloseExportModal}
          segments={transcriptSegments}
          sessionDetails={sessionDetails}
        />
      </div>
    </DashboardLayout>
  );
}