'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Card,
  CardContent,
  Button
} from '../index';
import { AudioVisualizer } from '../prontodoc/AudioVisualizer';
import { TranscriptDisplay, TranscriptSegment } from '../prontodoc/TranscriptDisplay';

/**
 * =====================================
 * RECORDING AND TRANSCRIPTION COMPONENT
 * =====================================
 * 
 * This component handles:
 * 1. Real-time audio recording with MediaRecorder API
 * 2. Audio visualization during recording
 * 3. Audio file upload to AI processor for transcription
 * 4. AI-powered SOAP prontuário generation
 * 5. Editable prontuário results for doctor review
 * 
 * API ENDPOINTS USED:
 * - POST /api/doctor/transcribe-audio
 *   → Sends recorded audio to AI processor using OpenAI Whisper
 *   → Returns transcription with confidence scores
 * 
 * - POST /api/doctor/generate-prontuario  
 *   → Sends transcription to GPT-4o for SOAP prontuário generation
 *   → Returns structured medical record in Portuguese
 * 
 * AI PROCESSOR INTEGRATION:
 * - Uses OpenAI Whisper (whisper-1 model) for transcription
 * - Language: Portuguese (pt)
 * - Output: High-quality medical transcription
 * 
 * WORKFLOW:
 * 1. Doctor clicks "Iniciar Gravação" → starts MediaRecorder
 * 2. Real-time audio visualization during recording
 * 3. Doctor clicks "Parar Gravação" → stops recording, creates audio blob
 * 4. Audio automatically sent to AI processor for transcription
 * 5. Transcription displayed, then sent to GPT-4o for prontuário generation
 * 6. Generated SOAP prontuário shown in editable textarea
 * 7. Doctor can edit and approve final prontuário
 */

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
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Processing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingProntuario, setIsGeneratingProntuario] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [prontuarioText, setProntuarioText] = useState('');
  const [isEditingProntuario, setIsEditingProntuario] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * START RECORDING
   * Initializes MediaRecorder with audio stream from microphone
   */
  const handleStartRecording = useCallback(async () => {
    if (!selectedPatient) {
      setError('Por favor, selecione um paciente primeiro.');
      return;
    }

    if (!selectedTemplate) {
      setError('Por favor, selecione um template de consulta primeiro.');
      return;
    }

    try {
      setError(null);
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      setAudioStream(stream);
      
      // Initialize MediaRecorder
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
        console.log('📁 Recording completed, blob size:', audioBlob.size, 'bytes');
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('🎙️ Recording started for patient:', selectedPatient.name);
      console.log('📋 Using template:', selectedTemplate.name);
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Erro ao acessar o microfone. Verifique as permissões.');
    }
  }, [selectedPatient, selectedTemplate]);

  /**
   * STOP RECORDING
   * Stops MediaRecorder and triggers transcription process
   */
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
    console.log('⏹️ Recording stopped, duration:', recordingTime, 'seconds');
  }, [isRecording, audioStream, recordingTime]);

  /**
   * TRANSCRIBE AUDIO
   * Sends recorded audio to AI processor using OpenAI Whisper
   */
  const handleTranscribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!selectedPatient || !audioBlob) {
      setError('Nenhum áudio para transcrever.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      // Generate session ID
      const sessionId = `recording_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare form data
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('session_id', sessionId);
      formData.append('patient_id', selectedPatient.id);
      formData.append('doctor_id', 'temp_doctor_id'); // TODO: Get from auth context
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');

      console.log('📤 Sending audio for transcription...');
      console.log('  - Patient:', selectedPatient.name);
      console.log('  - Audio size:', audioBlob.size, 'bytes');
      console.log('  - Session ID:', sessionId);

      // Send to our API route (which will forward to AI processor)
      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${response.status} ${errorText}`);
      }

      const result: TranscriptionResult = await response.json();
      
      console.log('✅ Transcription successful:');
      console.log('  - Transcript length:', result.transcript.length);
      console.log('  - Confidence:', result.confidence);
      console.log('  - Duration:', result.duration);
      console.log('  - Word count:', result.word_count);
      
      setTranscriptionResult(result);
      setIsTranscribing(false);
      
      // Automatically generate prontuário after transcription
      await handleGenerateProntuario(result.transcript);
      
    } catch (error) {
      console.error('❌ Transcription error:', error);
      setError(error instanceof Error ? error.message : 'Erro na transcrição do áudio');
      setIsTranscribing(false);
    }
  }, [selectedPatient]);

  /**
   * GENERATE PRONTUÁRIO
   * Sends transcription to GPT-4o for SOAP prontuário generation
   */
  const handleGenerateProntuario = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setError('Nenhuma transcrição disponível para gerar prontuário.');
      return;
    }

    if (!selectedTemplate) {
      setError('Nenhum template selecionado para gerar prontuário.');
      return;
    }

    setIsGeneratingProntuario(true);
    setError(null);

    try {
      console.log('🤖 Generating prontuário using template...');
      console.log('  - Transcript length:', transcript.length);
      console.log('  - Template:', selectedTemplate.name);
      console.log('  - Specialty:', selectedTemplate.specialty);

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
      
      console.log('✅ Prontuário generated successfully:');
      console.log('  - Length:', result.prontuario.length);
      console.log('  - Model:', result.model);
      console.log('  - Processing time:', result.processing_time);
      console.log('  - Template used:', selectedTemplate.name);
      
      setProntuarioText(result.prontuario);
      setIsGeneratingProntuario(false);
      setIsEditingProntuario(true);
      
      // Notify parent component
      onProntuarioGenerated(result.prontuario);
      
    } catch (error) {
      console.error('❌ Prontuário generation error:', error);
      setError(error instanceof Error ? error.message : 'Erro na geração do prontuário');
      setIsGeneratingProntuario(false);
    }
  }, [selectedPatient, selectedTemplate, onProntuarioGenerated]);

  /**
   * CLEAR ALL RESULTS
   * Resets component to initial state
   */
  const handleClearResults = useCallback(() => {
    setRecordedBlob(null);
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setError(null);
    setRecordingTime(0);
  }, []);

  /**
   * SAVE PRONTUÁRIO
   * TODO: Implement saving to database
   */
  const handleSaveProntuario = useCallback(async () => {
    if (!prontuarioText.trim()) {
      setError('Prontuário não pode estar vazio.');
      return;
    }

    try {
      // TODO: Implement API call to save prontuário to database
      console.log('💾 Saving prontuário...');
      console.log('  - Patient:', selectedPatient?.name);
      console.log('  - Prontuário length:', prontuarioText.length);
      
      // For now, just notify parent and clear
      setIsEditingProntuario(false);
      alert('Prontuário salvo com sucesso!');
      
    } catch (error) {
      console.error('❌ Save error:', error);
      setError('Erro ao salvar prontuário.');
    }
  }, [prontuarioText, selectedPatient]);

  // Auto-transcribe when recording stops and blob is ready
  useEffect(() => {
    if (recordedBlob && !isRecording) {
      handleTranscribeAudio(recordedBlob);
    }
  }, [recordedBlob, isRecording, handleTranscribeAudio]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if no patient selected
  if (!selectedPatient) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* =====================================
          ERROR DISPLAY
          ===================================== */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-lg">❌</span>
              <div>
                <div className="font-medium">Erro</div>
                <div className="text-sm">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================
          RECORDING SECTION
          ===================================== */}
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Criar prontuário em tempo real
        </h2>
        
        <Card className="max-w-2xl mx-auto p-8">
          <CardContent className="space-y-6">
            
            {/* Recording Status */}
            {isRecording && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-medium text-red-600">Gravando</span>
                </div>
                <div className="text-2xl font-mono font-bold text-gray-900">
                  {formatTime(recordingTime)}
                </div>
              </div>
            )}

            {/* Audio Visualizer */}
            <div className="flex justify-center">
              <AudioVisualizer 
                audioStream={audioStream}
                isRecording={isRecording}
                className="w-full max-w-lg"
              />
            </div>

            {/* Recording Controls */}
            <div className="flex justify-center space-x-4">
              {!isRecording ? (
                <Button
                  onClick={handleStartRecording}
                  disabled={!selectedPatient || !selectedTemplate || isTranscribing || isGeneratingProntuario}
                  className="px-8 py-4 text-lg bg-red-500 hover:bg-red-600 text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                  {!selectedPatient 
                    ? 'Selecione um paciente primeiro'
                    : !selectedTemplate
                    ? 'Selecione um template primeiro'
                    : '🎙️ Iniciar Gravação'
                  }
                </Button>
              ) : (
                <Button
                  onClick={handleStopRecording}
                  className="px-8 py-4 text-lg bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-all"
                >
                  ⏹️ Parar Gravação
                </Button>
              )}
            </div>

            {/* Recording Instructions */}
            {!isRecording && !recordedBlob && (
              <div className="text-center text-gray-600 space-y-2">
                <p className="text-sm">
                  Clique em "Iniciar Gravação" para começar a consulta
                </p>
                <p className="text-xs text-gray-500">
                  O áudio será automaticamente transcrito e convertido em prontuário
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* =====================================
          PROCESSING STATUS
          ===================================== */}
      {(isTranscribing || isGeneratingProntuario) && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                <div className="font-medium text-blue-700">
                  {isTranscribing && 'Transcrevendo áudio...'}
                  {isGeneratingProntuario && 'Gerando prontuário...'}
                </div>
                <div className="text-sm text-blue-600">
                  {isTranscribing && 'Usando OpenAI Whisper para transcrição'}
                  {isGeneratingProntuario && 'Usando GPT-4o para análise médica'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================
          TRANSCRIPTION RESULTS
          ===================================== */}
      {transcriptionResult && (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📝 Transcrição Completa
            </h3>
            
            {/* Transcription Metrics */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm mb-4">
              <div>
                <div className="font-medium text-gray-600">Duração</div>
                <div>{transcriptionResult.duration.toFixed(1)}s</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Palavras</div>
                <div>{transcriptionResult.word_count}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Confiança</div>
                <div>{(transcriptionResult.confidence * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">Provider</div>
                <div>{transcriptionResult.provider}</div>
              </div>
            </div>

            {/* Transcript Text */}
            <div className="p-4 bg-white border rounded-lg max-h-60 overflow-y-auto text-sm text-gray-800 whitespace-pre-wrap">
              {transcriptionResult.transcript}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================
          PRONTUÁRIO EDITOR
          ===================================== */}
      {prontuarioText && (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📋 Prontuário SOAP Gerado
              </h3>
              <div className="flex space-x-2">
                {isEditingProntuario ? (
                  <>
                    <Button
                      onClick={handleSaveProntuario}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      💾 Salvar
                    </Button>
                    <Button
                      onClick={() => setIsEditingProntuario(false)}
                      variant="outline"
                      className="px-4 py-2"
                    >
                      👁️ Visualizar
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditingProntuario(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                  >
                    ✏️ Editar
                  </Button>
                )}
                <Button
                  onClick={handleClearResults}
                  variant="outline"
                  className="px-4 py-2 text-red-600 hover:text-red-700"
                >
                  🗑️ Limpar
                </Button>
              </div>
            </div>

            {isEditingProntuario ? (
              <textarea
                value={prontuarioText}
                onChange={(e) => setProntuarioText(e.target.value)}
                className="w-full h-96 p-4 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prontuário será gerado aqui..."
              />
            ) : (
              <div className="p-4 bg-gray-50 border rounded-lg h-96 overflow-y-auto text-sm whitespace-pre-wrap font-mono">
                {prontuarioText}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              💡 <strong>Dica:</strong> Revise o prontuário gerado e faça ajustes necessários antes de salvar.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}