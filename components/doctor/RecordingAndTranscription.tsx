'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Button
} from '../index';
import { AudioVisualizer } from '../prontodoc/AudioVisualizer';
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

interface RecordingAndTranscriptionProps {
  selectedPatient: PatientProfile | null;
  selectedTemplate: ConsultationTemplate | null;
  onProntuarioGenerated: (prontuario: string) => void;
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = useCallback(async () => {
    if (!selectedPatient) {
      setError('Selecione um paciente.');
      return;
    }

    if (!selectedTemplate) {
      setError('Selecione um template.');
      return;
    }

    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
      };
      
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      setError('Erro ao acessar o microfone. Verifique as permissões.');
    }
  }, [selectedPatient, selectedTemplate]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
  }, [isRecording, audioStream, recordingTime]);

  const handleTranscribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!selectedPatient || !audioBlob) {
      setError('Nenhum áudio para transcrever.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);
      formData.append('patient_id', selectedPatient.id);
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const result: TranscriptionResult = await response.json();
      
      setTranscriptionResult(result);
      setIsTranscribing(false);
      
      await handleGenerateProntuario(result.transcript);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro na transcrição do áudio');
      setIsTranscribing(false);
    }
  }, [selectedPatient]);

  const handleGenerateProntuario = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setError('Nenhuma transcrição disponível.');
      return;
    }

    if (!selectedTemplate) {
      setError('Nenhum template selecionado.');
      return;
    }

    setIsGeneratingProntuario(true);
    setError(null);

    try {
      const requestBody = {
        transcript,
        patient_name: selectedPatient?.name,
        template_id: selectedTemplate.id,
        template: {
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          template_structure: selectedTemplate.template_structure,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        }
      };

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Prontuário generation failed: ${response.status} ${errorText}`);
      }

      const result: ProntuarioResult = await response.json();
      
      setProntuarioText(result.prontuario);
      setIsGeneratingProntuario(false);
      setIsEditingProntuario(true);
      
      onProntuarioGenerated(result.prontuario);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro na geração do prontuário');
      setIsGeneratingProntuario(false);
    }
  }, [selectedPatient, selectedTemplate, onProntuarioGenerated]);

  const handleClearResults = useCallback(() => {
    setRecordedBlob(null);
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setError(null);
    setRecordingTime(0);
    setIsModalOpen(false);
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
          patient_id: selectedPatient?.id,
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
      setError('Erro ao salvar prontuário.');
    }
  }, [prontuarioText, selectedPatient]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  useEffect(() => {
    if (recordedBlob && !isRecording) {
      handleTranscribeAudio(recordedBlob);
    }
  }, [recordedBlob, isRecording, handleTranscribeAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedPatient) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
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

          {isEditingProntuario ? (
            <textarea
              value={prontuarioText}
              onChange={(e) => setProntuarioText(e.target.value)}
              className="w-full h-200 p-3 border rounded text-sm font-mono resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Prontuário aqui..."
            />
          ) : (
            <div className="p-3 bg-gray-50 border rounded h-56 overflow-y-auto text-sm whitespace-pre-wrap font-mono text-left">
              {prontuarioText}
            </div>
          )}
        </div>
      )}

      <ProntuarioModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        prontuarioText={prontuarioText}
        patientName={selectedPatient?.name}
        templateName={selectedTemplate?.name}
      />

      <div className="flex items-center justify-center gap-2">
        <Button onClick={handleSaveProntuario} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm">Salvar</Button>
        <Button onClick={handleOpenModal} variant="outline" className="px-3 py-2 text-sm">Visualizar</Button>
        <Button onClick={handleClearResults} variant="outline" className="px-3 py-2 text-sm text-red-600 hover:text-red-700">Limpar</Button>
      </div>
    </div>
  );
}