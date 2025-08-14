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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const handleError = useErrorHandler();

  const handleStartRecording = useCallback(async () => {
    console.log('🎙️ [RECORDING] Starting recording process');
    console.log('🎙️ [RECORDING] Current state:', {
      isRecording,
      hasExistingProntuario: !!prontuarioText,
      hasExistingTranscription: !!transcriptionResult,
      selectedPatient: selectedPatient?.name || 'None',
      selectedTemplate: selectedTemplate?.name || 'None'
    });

    // For testing mode, we'll skip patient validation
    // if (!selectedPatient) {
    //   setError('Selecione um paciente.');
    //   return;
    // }

    // For testing mode, we'll skip template validation
    // if (!selectedTemplate) {
    //   setError('Selecione um template.');
    //   return;
    // }

    try {
      setError(null);
      
      console.log('🧹 [RECORDING] Clearing all previous state');
      // Clear ALL previous state when starting new recording
      setProntuarioText('');
      setIsEditingProntuario(false);
      setTranscriptionResult(null);
      setRecordedBlob(null);
      setIsTranscribing(false);
      setIsGeneratingProntuario(false);
      setIsModalOpen(false);
      setShowRecordingCompleteAlert(false);
      
      // Clear parent component's prontuario state as well
      if (onClearProntuario) {
        console.log('🧹 [RECORDING] Clearing parent component state');
        onClearProntuario();
      }
      
      console.log('🎤 [RECORDING] Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ [RECORDING] Microphone access granted');
      console.log('🎤 [RECORDING] Audio stream info:', {
        active: stream.active,
        id: stream.id,
        tracks: stream.getAudioTracks().length
      });
      
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      console.log('📹 [RECORDING] MediaRecorder created:', {
        mimeType: mediaRecorder.mimeType,
        state: mediaRecorder.state
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 [RECORDING] Data chunk received:', {
            size: event.data.size,
            type: event.data.type,
            totalChunks: audioChunksRef.current.length + 1
          });
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🛑 [RECORDING] Recording stopped, blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          totalChunks: audioChunksRef.current.length
        });
        setRecordedBlob(audioBlob);
      };
      
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      
      console.log('▶️ [RECORDING] Recording started');
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [RECORDING] Error starting recording:', {
        name: errorObj.name,
        message: errorObj.message
      });
      handleError(errorObj, 'Recording start failed');
      setError('Erro ao acessar o microfone. Verifique as permissões.');
    }
  }, [selectedPatient, selectedTemplate, handleError]);

  const handleStopRecording = useCallback(() => {
    console.log('⏹️ [RECORDING] Stopping recording process');
    console.log('⏹️ [RECORDING] Current state:', {
      isRecording,
      recordingTime,
      hasMediaRecorder: !!mediaRecorderRef.current,
      hasAudioStream: !!audioStream,
      audioChunksCount: audioChunksRef.current.length
    });

    if (mediaRecorderRef.current && isRecording) {
      console.log('📹 [RECORDING] Stopping MediaRecorder');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (audioStream) {
      console.log('🎤 [RECORDING] Stopping audio stream tracks');
      audioStream.getTracks().forEach(track => {
        console.log('🛑 [RECORDING] Stopping track:', {
          kind: track.kind,
          label: track.label,
          enabled: track.enabled
        });
        track.stop();
      });
      setAudioStream(null);
    }
    
    if (timerRef.current) {
      console.log('⏰ [RECORDING] Clearing timer');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    
    console.log('✅ [RECORDING] Recording stopped successfully');
    console.log('📊 [RECORDING] Final recording stats:', {
      duration: recordingTime,
      audioChunks: audioChunksRef.current.length
    });
    
    // Show the "Pronto doctor!" alert after recording stops
    setShowRecordingCompleteAlert(true);
  }, [isRecording, audioStream, recordingTime]);

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

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData
      });

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
      handleError(errorObj, 'Audio transcription failed');
      setError(errorObj.message);
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

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

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
      handleError(errorObj, 'Prontuario generation failed');
      setError(errorObj.message);
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
          isProcessing={isTranscribing || isGeneratingProntuario}
          onToggleRecording={isRecording ? handleStopRecording : handleStartRecording}
          className="w-full max-w-5xl"
        />

        {(isTranscribing || isGeneratingProntuario) && (
          <div className="text-xs text-blue-700">
            {isTranscribing && 'Transcrevendo...'}
            {isGeneratingProntuario && 'Gerando prontuário...'}
          </div>
        )}
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
              className="w-full h-200 p-4 border rounded text-base font-mono resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
              placeholder="Prontuário aqui..."
            />
          ) : (
            <div className="p-4 bg-gray-50 border rounded h-56 overflow-y-auto text-base whitespace-pre-wrap font-mono text-left leading-relaxed">
              {prontuarioText}
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