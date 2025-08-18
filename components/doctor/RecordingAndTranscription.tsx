'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Button,
  AnimatedAlert
} from '../index';
import { AudioVisualizer } from '../prontodoc/AudioVisualizer';
import { ProntuarioModal } from '../prontodoc/ProntuarioModal';
import { TranscriptionDisplay } from '../prontodoc/TranscriptionDisplay';
import { useErrorHandler } from '../ErrorBoundary';
import { ChunkedRecordingManager } from './ChunkedRecordingManager';
import { SessionStateManager } from './SessionStateManager';

interface PatientProfile {
  id: string;
  name: string;
  cpf: string;
  pin: string;
  isExisting: boolean;
}

interface ConsultationTemplate {
  id: string;
  name: string;
  specialty: string;
  template_structure: {
    sections: Array<{
      name: string;
      required: boolean;
    }>;
  };
  ai_prompt_template: string;
  is_default: boolean;
  is_public: boolean;
}

interface RecordingAndTranscriptionProps {
  selectedPatient: PatientProfile | null;
  selectedTemplate: ConsultationTemplate | null;
  onProntuarioGenerated: (prontuario: string) => void;
  onClearProntuario?: () => void;
  className?: string;
}

interface TranscriptionResult {
  success: boolean;
  transcript: string;
  confidence: number;
  duration: number;
  word_count: number;
  provider: string;
}

interface ProntuarioResult {
  success: boolean;
  prontuario: string;
  model: string;
  processing_time: number;
}

export function RecordingAndTranscription({ 
  selectedPatient, 
  selectedTemplate,
  onProntuarioGenerated,
  onClearProntuario,
  className 
}: RecordingAndTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingProntuario, setIsGeneratingProntuario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [prontuarioText, setProntuarioText] = useState('');
  const [isEditingProntuario, setIsEditingProntuario] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRecordingCompleteAlert, setShowRecordingCompleteAlert] = useState(false);
  
  // Chunked recording state (now default mode)
  const [currentSession, setCurrentSession] = useState(null);
  const [chunkedRecordingChunks, setChunkedRecordingChunks] = useState([]);
  const [isGeneratingFinalProntuario, setIsGeneratingFinalProntuario] = useState(false);
  const [isChunkedRecordingActive, setIsChunkedRecordingActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const handleError = useErrorHandler();
  
  // Refs for chunked recording components
  const sessionManagerRef = useRef(null);
  const chunkedRecordingRef = useRef(null);

  const handleStartRecording = useCallback(async () => {
    console.log('🎙️ [RECORDING] Starting recording process with chunked recording backend');
    
    try {
      setError(null);
      
      // Clear ALL previous state
      setProntuarioText('');
      setIsEditingProntuario(false);
      setTranscriptionResult(null);
      setRecordedBlob(null);
      setIsTranscribing(false);
      setIsGeneratingProntuario(false);
      setIsModalOpen(false);
      setShowRecordingCompleteAlert(false);
      setChunkedRecordingChunks([]);
      
      if (onClearProntuario) {
        onClearProntuario();
      }
      
      // Start chunked recording session first
      if ((window as any).sessionManager) {
        console.log('📊 [RECORDING] Starting session manager...');
        (window as any).sessionManager.startSession();
      } else {
        console.warn('⚠️ [RECORDING] Session manager not found on window');
      }
      
      // Start the chunked recording manager using ref
      if (chunkedRecordingRef.current && (chunkedRecordingRef.current as any).startRecording) {
        console.log('🎤 [RECORDING] Starting chunked recording manager...');
        await (chunkedRecordingRef.current as any).startRecording();
      } else {
        console.warn('⚠️ [RECORDING] Chunked recording ref not available');
      }
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer for UI
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('✅ [RECORDING] Recording started successfully');
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [RECORDING] Error starting recording:', error);
      handleError(errorObj, 'Recording start failed');
      setError('Erro ao acessar o microfone. Verifique as permissões.');
    }
  }, [selectedPatient, selectedTemplate, handleError, onClearProntuario]);

  const handleStopRecording = useCallback(() => {
    console.log('⏹️ [RECORDING] Stopping recording process');
    
    // Immediately set loading states for instant UI feedback
    setIsRecording(false);
    setIsTranscribing(true);
    setIsGeneratingFinalProntuario(true);
    
    // Stop the chunked recording manager using ref
    if (chunkedRecordingRef.current && (chunkedRecordingRef.current as any).stopRecording) {
      (chunkedRecordingRef.current as any).stopRecording();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    console.log('✅ [RECORDING] Recording stopped successfully');
    
    // The chunked recording complete handler will take care of the rest
  }, []);

  const handleTranscribeAudio = useCallback(async (audioBlob: Blob) => {
    console.log('🎤 [TRANSCRIPTION] Starting audio transcription process');
    console.log('🎤 [TRANSCRIPTION] Audio blob info:', {
      size: audioBlob?.size || 0,
      type: audioBlob?.type || 'unknown'
    });

    if (!audioBlob) {
      console.error('❌ [TRANSCRIPTION] No audio blob provided');
      setError('Nenhum áudio para transcrever.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📋 [TRANSCRIPTION] Generated session ID:', sessionId);
      
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);
      formData.append('patient_id', selectedPatient?.id || 'test-patient-001');
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');

      console.log('📤 [TRANSCRIPTION] FormData prepared with fields:', {
        audio_file_size: audioBlob.size,
        session_id: sessionId,
        patient_id: selectedPatient?.id || 'test-patient-001',
        doctor_id: 'temp_doctor_id',
        language: 'pt',
        model: 'whisper-1'
      });

      console.log('📡 [TRANSCRIPTION] Sending request to /api/doctor/transcribe-audio');
      const startTime = Date.now();

      // Create AbortController for timeout handling (10 minutes for long audio files)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏰ [TRANSCRIPTION] Request timeout - taking longer than 10 minutes');
        abortController.abort();
      }, 10 * 60 * 1000); // 10 minutes timeout for long audio transcription

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      const requestTime = Date.now() - startTime;
      console.log('📥 [TRANSCRIPTION] API response received:', {
        status: response.status,
        statusText: response.statusText,
        requestTime: `${requestTime}ms`,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [TRANSCRIPTION] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const result: TranscriptionResult = await response.json();
      console.log('✅ [TRANSCRIPTION] Transcription result:', {
        success: result.success,
        transcript_length: result.transcript?.length || 0,
        confidence: result.confidence,
        duration: result.duration,
        word_count: result.word_count,
        provider: result.provider,
        transcript_preview: result.transcript?.substring(0, 100) + '...'
      });
      
      setTranscriptionResult(result);
      setIsTranscribing(false);
      
      console.log('🔄 [TRANSCRIPTION] Moving to prontuario generation phase');
      await handleGenerateProntuario(result.transcript);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [TRANSCRIPTION] Unexpected error:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      });
      
      // Handle timeout errors specifically
      if (errorObj.name === 'AbortError') {
        setError('Timeout na transcrição - o áudio é muito longo. Tente gravar em segmentos menores.');
        console.error('⏰ [TRANSCRIPTION] Request timed out after 10 minutes');
      } else {
        setError(errorObj.message);
      }
      
      handleError(errorObj, 'Audio transcription failed');
      setIsTranscribing(false);
    }
  }, [selectedPatient, handleError]);

  const handleGenerateProntuario = useCallback(async (transcript: string) => {
    console.log('📝 [PRONTUARIO] Starting prontuario generation process');
    console.log('📝 [PRONTUARIO] Input validation:', {
      transcript_length: transcript?.length || 0,
      transcript_preview: transcript?.substring(0, 150) + '...',
      patient_name: selectedPatient?.name || 'Paciente de Teste',
      template_selected: !!selectedTemplate,
      template_name: selectedTemplate?.name || 'None'
    });

    if (!transcript.trim()) {
      console.error('❌ [PRONTUARIO] No transcript provided');
      setError('Nenhuma transcrição disponível.');
      return;
    }

    // For testing mode, we'll skip template validation - API will use default template
    // if (!selectedTemplate) {
    //   setError('Nenhum template selecionado.');
    //   return;
    // }

    setIsGeneratingProntuario(true);
    setError(null);

    try {
      const requestBody: any = {
        transcript,
        patient_name: selectedPatient?.name || 'Paciente de Teste'
      };

      // Only include template data if a template is selected
      if (selectedTemplate) {
        requestBody.template_id = selectedTemplate.id;
        requestBody.template = {
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          template_structure: selectedTemplate.template_structure,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        };
        console.log('📋 [PRONTUARIO] Using selected template:', {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          has_prompt_template: !!selectedTemplate.ai_prompt_template
        });
      } else {
        console.log('📋 [PRONTUARIO] No template selected - using default clinical format');
      }

      console.log('📤 [PRONTUARIO] Request body prepared:', {
        transcript_length: requestBody.transcript.length,
        patient_name: requestBody.patient_name,
        has_template: !!requestBody.template,
        template_id: requestBody.template_id || 'default'
      });

      console.log('📡 [PRONTUARIO] Sending request to /api/doctor/generate-prontuario');
      const startTime = Date.now();

      // Create AbortController for timeout handling (5 minutes for long consultations)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏰ [PRONTUARIO] Request timeout - taking longer than 5 minutes');
        abortController.abort();
      }, 5 * 60 * 1000); // 5 minutes timeout for long transcriptions

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      const requestTime = Date.now() - startTime;
      console.log('📥 [PRONTUARIO] API response received:', {
        status: response.status,
        statusText: response.statusText,
        requestTime: `${requestTime}ms`,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [PRONTUARIO] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Prontuário generation failed: ${response.status} ${errorText}`);
      }

      const result: ProntuarioResult = await response.json();
      console.log('✅ [PRONTUARIO] Prontuario generation result:', {
        success: result.success,
        prontuario_length: result.prontuario?.length || 0,
        model: result.model,
        processing_time: result.processing_time,
        prontuario_preview: result.prontuario?.substring(0, 200) + '...'
      });
      
      setProntuarioText(result.prontuario);
      setIsGeneratingProntuario(false);
      setIsEditingProntuario(true);
      
      console.log('📊 [PRONTUARIO] State updated and callback invoked');
      onProntuarioGenerated(result.prontuario);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [PRONTUARIO] Unexpected error:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      });
      
      // Handle timeout errors specifically
      if (errorObj.name === 'AbortError') {
        setError('Timeout na geração do prontuário - a transcrição é muito longa. Tente resumir ou dividir em partes.');
        console.error('⏰ [PRONTUARIO] Request timed out after 5 minutes');
      } else {
        setError(errorObj.message);
      }
      
      handleError(errorObj, 'Prontuario generation failed');
      setIsGeneratingProntuario(false);
    }
  }, [selectedPatient, selectedTemplate, onProntuarioGenerated, handleError]);

  const handleClearResults = useCallback(() => {
    setRecordedBlob(null);
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setError(null);
    setRecordingTime(0);
    setIsModalOpen(false);
    setShowRecordingCompleteAlert(false);
    setChunkedRecordingChunks([]);
    setCurrentSession(null);
    setIsChunkedRecordingActive(false);
  }, []);

  const handleSaveProntuario = useCallback(async () => {
    if (!prontuarioText.trim()) {
      setError('Prontuário não pode estar vazio.');
      return;
    }

    try {
      const response = await fetch('/api/doctor/save-prontuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient?.id || 'test-patient-001',
          prontuario_text: prontuarioText,
          consultation_id: null,
          reviewed_by_doctor: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha ao salvar prontuário: ${response.status} ${errorText}`);
      }

      setIsEditingProntuario(false);
      alert('Prontuário salvo com sucesso!');
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [SAVE-PRONTUARIO] Error saving prontuario:', {
        name: errorObj.name,
        message: errorObj.message
      });
      handleError(errorObj, 'Prontuario save failed');
      setError('Erro ao salvar prontuário.');
    }
  }, [prontuarioText, selectedPatient, handleError]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleCopyProntuario = useCallback(async () => {
    if (!prontuarioText.trim()) {
      setError('Nenhum prontuário para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(prontuarioText);
      // Show temporary success feedback
      const originalError = error;
      setError('✅ Prontuário copiado para a área de transferência!');
      setTimeout(() => {
        setError(originalError);
      }, 2000);
    } catch (err) {
      setError('Erro ao copiar prontuário. Tente novamente.');
    }
  }, [prontuarioText, error]);


  const handleHideAlert = useCallback(() => {
    setShowRecordingCompleteAlert(false);
  }, []);

  // Listen for audio stream from chunked recording manager
  useEffect(() => {
    const handleAudioStream = (event) => {
      console.log('🎧 [RECORDING] Audio stream event received:', event.detail);
      const { audioStream: stream, isRecording: recording } = event.detail;
      setAudioStream(stream);
      console.log('🎧 [RECORDING] Audio stream set for AudioVisualizer:', !!stream);
    };
    
    window.addEventListener('audio-stream-available', handleAudioStream);
    
    return () => {
      window.removeEventListener('audio-stream-available', handleAudioStream);
    };
  }, []);

  // Also get audio stream directly from chunked recording ref
  useEffect(() => {
    if (chunkedRecordingRef.current && (chunkedRecordingRef.current as any).audioStream) {
      const stream = (chunkedRecordingRef.current as any).audioStream;
      console.log('🎧 [RECORDING] Getting audio stream directly from chunked recording ref:', !!stream);
      setAudioStream(stream);
    }
  }, [isRecording, chunkedRecordingRef.current]);

  // Chunked recording handlers
  const handleChunkTranscribed = useCallback((chunk) => {
    console.log('🔄 [CHUNKED] Chunk transcribed:', chunk.chunk_number);
    console.log('🔄 [CHUNKED] Chunk data:', {
      chunk_number: chunk.chunk_number,
      transcript_length: chunk.transcript?.length || 0,
      confidence: chunk.confidence,
      status: chunk.processing_status
    });
    
    setChunkedRecordingChunks(prev => {
      const updated = prev.map(c => c.chunk_number === chunk.chunk_number ? chunk : c);
      if (!updated.find(c => c.chunk_number === chunk.chunk_number)) {
        updated.push(chunk);
      }
      console.log('📦 [CHUNKED] Updated chunks array, total chunks:', updated.length);
      return updated;
    });
    
    // Set processing state for UI
    setIsTranscribing(true);
    
    // Update session manager
    if ((window as any).sessionManager) {
      (window as any).sessionManager.addChunkToSession(chunk);
    }
    
    // Reset processing state
    setTimeout(() => setIsTranscribing(false), 1000);
  }, []);
  
  const handleChunkedRecordingComplete = useCallback(async (chunks) => {
    console.log('🏁 [CHUNKED] Recording complete with', chunks.length, 'chunks');
    
    // If no chunks were recorded, show error
    if (!chunks || chunks.length === 0) {
      console.error('❌ [CHUNKED] No audio chunks recorded');
      setError('Nenhum áudio foi gravado. Tente novamente.');
      
      // Complete session anyway
      if ((window as any).sessionManager) {
        (window as any).sessionManager.completeSession();
      }
      return;
    }
    
    setIsGeneratingFinalProntuario(true);
    
    try {
      // For single chunk (short recording), use regular prontuário generation
      if (chunks.length === 1) {
        console.log('📝 [SINGLE-CHUNK] Using regular prontuário generation for single chunk');
        setIsGeneratingProntuario(true);
        await handleGenerateProntuario(chunks[0].transcript);
        setIsGeneratingProntuario(false);
      } else {
        // For multiple chunks, use final prontuário generation
        console.log('📚 [MULTI-CHUNK] Using final prontuário generation for', chunks.length, 'chunks');
        
        const requestBody = {
          transcription_chunks: chunks.map(chunk => ({
            chunk_number: chunk.chunk_number,
            transcript: chunk.transcript,
            timestamp: chunk.timestamp,
            confidence: chunk.confidence
          })),
          session_id: currentSession?.session_id || 'unknown',
          patient_context: {
            name: selectedPatient?.name,
            age: null,
            gender: null
          },
          template: selectedTemplate ? {
            name: selectedTemplate.name,
            specialty: selectedTemplate.specialty,
            ai_prompt_template: selectedTemplate.ai_prompt_template
          } : undefined
        };
        
        console.log('📤 [FINAL-PRONTUARIO] Sending request for final prontuário');
        const response = await fetch('/api/doctor/generate-final-prontuario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ [FINAL-PRONTUARIO] Final prontuário generated successfully');
        
        setProntuarioText(result.final_prontuario);
        setIsEditingProntuario(true);
        onProntuarioGenerated(result.final_prontuario);
      }
      
      // Complete session
      if ((window as any).sessionManager) {
        (window as any).sessionManager.completeSession();
      }
      
    } catch (error) {
      console.error('❌ [FINAL-PRONTUARIO] Error generating final prontuário:', error);
      setError(`Erro ao gerar prontuário final: ${error.message}`);
    } finally {
      setIsGeneratingFinalProntuario(false);
      setIsTranscribing(false);
    }
  }, [currentSession, selectedPatient, selectedTemplate, onProntuarioGenerated, handleGenerateProntuario]);
  
  const handleSessionCreated = useCallback((session) => {
    console.log('📊 [SESSION] Session created:', session.session_id);
    setCurrentSession(session);
  }, []);
  
  const handleSessionUpdated = useCallback((session) => {
    setCurrentSession(session);
  }, []);
  
  const handleSessionCompleted = useCallback((session) => {
    console.log('🏁 [SESSION] Session completed:', session.session_id);
    setIsChunkedRecordingActive(false);
    setAudioStream(null);
    setShowRecordingCompleteAlert(true);
  }, []);
  
  const handleErrorChunked = useCallback((error) => {
    console.error('❌ [ERROR]', error);
    setError(error);
  }, []);

  useEffect(() => {
    console.log('🔄 [EFFECT] recordedBlob/isRecording effect triggered:', {
      hasRecordedBlob: !!recordedBlob,
      recordedBlobSize: recordedBlob?.size || 0,
      isRecording,
      shouldTriggerTranscription: !!(recordedBlob && !isRecording)
    });

    if (recordedBlob && !isRecording) {
      console.log('🚀 [EFFECT] Triggering transcription process');
      handleTranscribeAudio(recordedBlob);
    } else {
      console.log('⏸️ [EFFECT] Transcription not triggered - waiting for recording to complete');
    }
  }, [recordedBlob, isRecording, handleTranscribeAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Removed patient validation - component now works in test mode without patient selection
  // if (!selectedPatient) {
  //   return null;
  // }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Recording Complete Alert */}
      <AnimatedAlert
        isVisible={showRecordingCompleteAlert}
        message={`Pronto doctor ${selectedPatient?.name || 'Doutor'}!`}
        type="success"
        duration={4000}
        onHide={handleHideAlert}
      />

      {error && (
        <div className="text-center text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-col items-center gap-3">
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-mono text-sm text-gray-900">{formatTime(recordingTime)}</span>
          </div>
        )}

        <AudioVisualizer 
          audioStream={audioStream}
          isRecording={isRecording}
          isProcessing={isTranscribing || isGeneratingProntuario || isGeneratingFinalProntuario}
          onToggleRecording={isRecording ? handleStopRecording : handleStartRecording}
          className="w-full max-w-5xl"
        />

        {(isTranscribing || isGeneratingProntuario || isGeneratingFinalProntuario) && (
          <div className="flex flex-col items-center space-y-2">
            <div className="text-xs text-blue-700">
              {isTranscribing && 'Transcrevendo áudio... Isso pode levar alguns minutos para gravações longas.'}
              {isGeneratingProntuario && 'Gerando prontuário... Analisando transcrição e estruturando documento médico.'}
              {isGeneratingFinalProntuario && 'Gerando prontuário final... Combinando todos os segmentos da consulta.'}
            </div>
            {/* Progress bar for long operations */}
            <div className="w-64 bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
            </div>
            <div className="text-xs text-gray-500">
              {isTranscribing && 'Processamento de áudio em andamento...'}
              {isGeneratingProntuario && 'Geração de prontuário em andamento...'}
              {isGeneratingFinalProntuario && `Processando ${chunkedRecordingChunks.length} segmentos de consulta...`}
            </div>
          </div>
        )}
      </div>
      
      {/* Hidden Background Components - Chunked Recording System */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
        <SessionStateManager
          patientId={selectedPatient?.id || 'test-patient-001'}
          doctorId="temp_doctor_id"
          patientContext={{
            name: selectedPatient?.name,
            age: undefined,
            gender: undefined
          }}
          templateInfo={selectedTemplate ? {
            name: selectedTemplate.name,
            specialty: selectedTemplate.specialty
          } : undefined}
          onSessionCreated={handleSessionCreated}
          onSessionUpdated={handleSessionUpdated}
          onSessionCompleted={handleSessionCompleted}
          onError={handleErrorChunked}
        />
        
        <ChunkedRecordingManager
          ref={chunkedRecordingRef}
          sessionId={currentSession?.session_id || 'no-session'}
          patientId={selectedPatient?.id || 'test-patient-001'}
          doctorId="temp_doctor_id"
          onChunkTranscribed={handleChunkTranscribed}
          onRecordingComplete={handleChunkedRecordingComplete}
          onError={handleErrorChunked}
        />
      </div>
      

      {prontuarioText && (
        <div className="max-w-4xl mx-auto space-y-3">
          {isEditingProntuario && (
            <h2 className="text-3xl text-center font-bold text-gray-900 m-8 mt-32">
              Prontuário da consulta
            </h2>
          )}

          {/* Copy Button - Show above textarea */}
          <div className="flex justify-end">
            <Button 
              onClick={handleCopyProntuario}
              variant="outline"
              className="px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </Button>
          </div>

          {isEditingProntuario ? (
            <textarea
              value={prontuarioText}
              onChange={(e) => setProntuarioText(e.target.value)}
              className={`w-full p-4 border rounded text-base font-mono resize-y focus:ring-1 focus:ring-blue-500 focus:border-blue-500 leading-relaxed ${
                prontuarioText.length > 3000 ? 'h-80' : 'h-200'
              }`}
              placeholder="Prontuário aqui..."
            />
          ) : (
            <div className={`p-4 bg-gray-50 border rounded overflow-y-auto text-base whitespace-pre-wrap font-mono text-left leading-relaxed ${
              prontuarioText.length > 3000 ? 'h-80' : 'h-56'
            }`}>
              {prontuarioText}
              
              {/* Show processing note if the prontuario was generated from a chunked transcript */}
              {prontuarioText.includes('foi processada em seções') && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-blue-700 text-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transcrição muito longa foi processada em seções para garantir qualidade.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transcription Display - Show below prontuario after recording ends */}
      {transcriptionResult && !isRecording && (
        <TranscriptionDisplay 
          transcriptionResult={transcriptionResult}
          className="max-w-4xl mx-auto mt-8"
        />
      )}
      
      {/* Chunked Transcription Display - Show combined transcription for chunked recordings */}
      {chunkedRecordingChunks.length > 0 && !isRecording && prontuarioText && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Transcrição da Consulta
            </h3>
            
            {/* Combined transcription from all chunks */}
            <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {chunkedRecordingChunks
                  .sort((a, b) => a.chunk_number - b.chunk_number)
                  .map(chunk => chunk.transcript)
                  .join(' ')
                }
              </div>
            </div>
            
            {/* Transcription metadata */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500">Segmentos</span>
                <span className="font-medium text-gray-900">{chunkedRecordingChunks.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Palavras</span>
                <span className="font-medium text-gray-900">
                  {chunkedRecordingChunks
                    .reduce((total, chunk) => total + (chunk.transcript?.split(' ').length || 0), 0)
                  }
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Confiança Média</span>
                <span className="font-medium text-gray-900">
                  {chunkedRecordingChunks.length > 0 
                    ? ((chunkedRecordingChunks.reduce((sum, chunk) => sum + (chunk.confidence || 0), 0) / chunkedRecordingChunks.length) * 100).toFixed(1)
                    : 0
                  }%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Processamento</span>
                <span className="font-medium text-green-600">Segmentado</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProntuarioModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        prontuarioText={prontuarioText}
        patientName={selectedPatient?.name || 'Paciente de Teste'}
        templateName={selectedTemplate?.name}
      />

      <div className="flex items-center justify-center gap-2">
      </div>
    </div>
  );
}