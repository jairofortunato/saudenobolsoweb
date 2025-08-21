'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../index';
import { AudioVisualizer } from '../prontodoc/AudioVisualizer';
import { TranscriptionDisplay } from '../prontodoc/TranscriptionDisplay';
import { ProntuarioModal } from '../prontodoc/ProntuarioModal';

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

interface SimpleRecordingAndTranscriptionProps {
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

export function SimpleRecordingAndTranscription({ 
  selectedPatient, 
  selectedTemplate,
  onProntuarioGenerated,
  onClearProntuario,
  className 
}: SimpleRecordingAndTranscriptionProps) {
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = useCallback(async () => {
    console.log('🎙️ [SIMPLE-RECORDING] Starting simple recording process');
    
    try {
      setError(null);
      
      // Clear previous state
      setProntuarioText('');
      setIsEditingProntuario(false);
      setTranscriptionResult(null);
      setRecordedBlob(null);
      setIsTranscribing(false);
      setIsGeneratingProntuario(false);
      setIsModalOpen(false);
      
      if (onClearProntuario) {
        onClearProntuario();
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      setAudioStream(stream);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('🎵 [SIMPLE-RECORDING] Audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('⏹️ [SIMPLE-RECORDING] MediaRecorder stopped');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('🎵 [SIMPLE-RECORDING] Final audio blob created:', audioBlob.size, 'bytes');
        setRecordedBlob(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('✅ [SIMPLE-RECORDING] Recording started successfully');
      
    } catch (error) {
      console.error('❌ [SIMPLE-RECORDING] Error starting recording:', error);
      setError('Erro ao iniciar gravação: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [onClearProntuario]);

  const handleStopRecording = useCallback(() => {
    console.log('⏹️ [SIMPLE-RECORDING] Stopping recording');
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
      
      console.log('✅ [SIMPLE-RECORDING] Recording stopped');
    }
  }, [isRecording, audioStream]);

  const handleTranscribeAudio = useCallback(async () => {
    if (!recordedBlob) {
      console.error('❌ [SIMPLE-RECORDING] No recorded audio blob available');
      return;
    }

    console.log('🤖 [SIMPLE-RECORDING] Starting transcription via AI processor');
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', recordedBlob, 'recording.webm');

      console.log('📤 [SIMPLE-RECORDING] Sending audio to AI processor:', {
        audioSize: recordedBlob.size,
        audioType: recordedBlob.type
      });

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      console.log('📥 [SIMPLE-RECORDING] Transcription response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Falha na transcrição');
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha na transcrição');
      }

      const transcriptionData: TranscriptionResult = {
        success: result.success,
        transcript: result.transcript,
        confidence: result.confidence || 0,
        duration: result.duration || 0,
        word_count: result.word_count || 0,
        provider: result.provider || 'unknown'
      };

      setTranscriptionResult(transcriptionData);
      console.log('✅ [SIMPLE-RECORDING] Transcription completed successfully');

    } catch (error) {
      console.error('❌ [SIMPLE-RECORDING] Transcription error:', error);
      setError('Erro na transcrição: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsTranscribing(false);
    }
  }, [recordedBlob]);

  const handleGenerateProntuario = useCallback(async () => {
    if (!transcriptionResult?.transcript) {
      console.error('❌ [SIMPLE-RECORDING] No transcription available for prontuário generation');
      return;
    }

    console.log('📋 [SIMPLE-RECORDING] Starting prontuário generation');
    setIsGeneratingProntuario(true);
    setError(null);

    try {
      const requestBody = {
        transcript: transcriptionResult.transcript,
        patient_name: selectedPatient?.name,
        template: selectedTemplate ? {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          template_structure: selectedTemplate.template_structure,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        } : undefined
      };

      console.log('📤 [SIMPLE-RECORDING] Sending prontuário generation request:', {
        transcriptLength: transcriptionResult.transcript.length,
        patientName: selectedPatient?.name,
        templateName: selectedTemplate?.name
      });

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      console.log('📥 [SIMPLE-RECORDING] Prontuário generation response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Falha na geração do prontuário');
      }

      if (!result.success) {
        throw new Error(result.error || 'Falha na geração do prontuário');
      }

      setProntuarioText(result.prontuario);
      onProntuarioGenerated(result.prontuario);
      console.log('✅ [SIMPLE-RECORDING] Prontuário generated successfully');

    } catch (error) {
      console.error('❌ [SIMPLE-RECORDING] Prontuário generation error:', error);
      setError('Erro na geração do prontuário: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsGeneratingProntuario(false);
    }
  }, [transcriptionResult, selectedPatient, selectedTemplate, onProntuarioGenerated]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🎙️ Gravação e Transcrição Simples
          </h2>
          <p className="text-gray-600">
            Grave a consulta em um único arquivo e processe com a arquitetura original
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <div className="text-center space-y-4">
          {!isRecording && !recordedBlob && (
            <Button
              onClick={handleStartRecording}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
              disabled={isTranscribing || isGeneratingProntuario}
            >
              🎙️ Iniciar Gravação
            </Button>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="text-3xl font-mono text-red-600">
                {formatTime(recordingTime)}
              </div>
              <Button
                onClick={handleStopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
              >
                ⏹️ Parar Gravação
              </Button>
            </div>
          )}

          {recordedBlob && !transcriptionResult && (
            <div className="space-y-4">
              <div className="text-green-600 font-semibold">
                ✅ Gravação finalizada ({Math.round(recordedBlob.size / 1024)} KB)
              </div>
              <Button
                onClick={handleTranscribeAudio}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
                disabled={isTranscribing}
              >
                {isTranscribing ? '🤖 Transcrevendo...' : '🤖 Transcrever Áudio'}
              </Button>
            </div>
          )}
        </div>

        {/* Audio Visualizer */}
        {audioStream && (
          <div className="flex justify-center">
            <AudioVisualizer audioStream={audioStream} />
          </div>
        )}

        {/* Transcription Display */}
        {transcriptionResult && (
          <div className="space-y-4">
            <TranscriptionDisplay 
              transcriptionResult={transcriptionResult}
              isTranscribing={isTranscribing}
            />
            
            {!prontuarioText && (
              <div className="text-center">
                <Button
                  onClick={handleGenerateProntuario}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
                  disabled={isGeneratingProntuario}
                >
                  {isGeneratingProntuario ? '📋 Gerando Prontuário...' : '📋 Gerar Prontuário'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Prontuário Display */}
        {prontuarioText && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                📋 Prontuário Gerado
              </h3>
              <div className="bg-white rounded border p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{prontuarioText}</pre>
              </div>
            </div>
            
            <div className="text-center space-x-4">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                ✏️ Editar Prontuário
              </Button>
              <Button
                onClick={() => {
                  setProntuarioText('');
                  setTranscriptionResult(null);
                  setRecordedBlob(null);
                  if (onClearProntuario) onClearProntuario();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded"
              >
                🔄 Nova Gravação
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Prontuário Modal */}
      {isModalOpen && (
        <ProntuarioModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          prontuarioText={prontuarioText}
          onSave={(newProntuario) => {
            setProntuarioText(newProntuario);
            onProntuarioGenerated(newProntuario);
            setIsModalOpen(false);
          }}
          selectedPatient={selectedPatient}
          selectedTemplate={selectedTemplate}
        />
      )}
    </div>
  );
}