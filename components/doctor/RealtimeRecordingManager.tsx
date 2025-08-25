'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '../index';
import { AudioVisualizer } from '../prontodoc/AudioVisualizer';
import { RealtimeProntuarioGenerator } from './RealtimeProntuarioGenerator';

/**
 * =====================================
 * REALTIME RECORDING MANAGER COMPONENT
 * =====================================
 * 
 * This component manages real-time transcription with 4-minute chunks.
 * Unlike the chunked recording system, this focuses on immediate transcription
 * feedback without prontuário generation.
 * 
 * FEATURES:
 * - 4-minute automatic chunking
 * - Immediate transcription of each chunk
 * - Real-time display of transcription results
 * - Continuous recording until manual stop
 * - No prontuário generation - transcription only
 * 
 * WORKFLOW:
 * 1. Start recording with MediaRecorder
 * 2. Every 4 minutes, stop current recorder and process chunk
 * 3. Send chunk for transcription via simple API
 * 4. Display transcription result immediately
 * 5. Start new MediaRecorder seamlessly
 * 6. Continue until manual stop
 */

interface TranscriptionChunk {
  chunk_number: number;
  transcript: string;
  confidence: number;
  duration: number;
  word_count: number;
  provider: string;
  timestamp: string;
  processing_status: 'processing' | 'completed' | 'error';
  error_message?: string;
}

// Production: 4 minutes per chunk - tested and working
const CHUNK_DURATION_MS = 4 * 60 * 1000; // 4 minutes in milliseconds
// For testing: use 30 * 1000 (30 seconds)
const TEST_CHUNK_DURATION_MS = 30 * 1000; // 30 seconds for testing

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

interface RealtimeRecordingManagerProps {
  selectedPatient?: PatientProfile | null;
  selectedTemplate?: ConsultationTemplate | null;
  className?: string;
}

export function RealtimeRecordingManager({ 
  selectedPatient = null, 
  selectedTemplate = null,
  className 
}: RealtimeRecordingManagerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentChunkTime, setCurrentChunkTime] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0); // Independent session timer
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [transcriptionChunks, setTranscriptionChunks] = useState<TranscriptionChunk[]>([]);
  const [currentChunkNumber, setCurrentChunkNumber] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [generatedProntuario, setGeneratedProntuario] = useState<string>('');
  const [sessionStarted, setSessionStarted] = useState(false);

  // Generate session ID on component mount
  useEffect(() => {
    const newSessionId = `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    console.log('🆔 [REALTIME] Generated session ID:', newSessionId);
  }, []);

  // Get combined transcription from all completed chunks
  const getCombinedTranscription = useCallback(() => {
    const completedChunks = transcriptionChunks
      .filter(chunk => chunk.processing_status === 'completed' && chunk.transcript)
      .sort((a, b) => a.chunk_number - b.chunk_number);
    
    return completedChunks
      .map(chunk => chunk.transcript)
      .join(' ')
      .trim();
  }, [transcriptionChunks]);

  const handleProntuarioGenerated = useCallback((prontuario: string) => {
    setGeneratedProntuario(prontuario);
    console.log('📋 [REALTIME] Prontuário generated and stored');
  }, []);

  // Independent session timer - starts when session begins and continues regardless of recording state
  useEffect(() => {
    let sessionTimerRef: NodeJS.Timeout | null = null;
    
    if (sessionStarted) {
      console.log('⏰ [REALTIME] Starting independent session timer');
      sessionTimerRef = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (sessionTimerRef) {
        console.log('🧹 [REALTIME] Cleaning up session timer');
        clearInterval(sessionTimerRef);
      }
    };
  }, [sessionStarted]);

  // Debug logging for state changes
  useEffect(() => {
    console.log(`🔄 [REALTIME] State change - isRecording: ${isRecording}, currentChunkTime: ${currentChunkTime}, sessionTimer: ${sessionTimer}`);
  }, [isRecording, currentChunkTime, sessionTimer]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const processChunk = useCallback(async (audioBlob: Blob, chunkNumber: number) => {
    console.log(`🎵 [REALTIME] Processing chunk ${chunkNumber + 1}:`, {
      size: audioBlob.size,
      type: audioBlob.type
    });

    // Add chunk to state as processing
    const newChunk: TranscriptionChunk = {
      chunk_number: chunkNumber + 1,
      transcript: '',
      confidence: 0,
      duration: 0,
      word_count: 0,
      provider: '',
      timestamp: new Date().toISOString(),
      processing_status: 'processing'
    };

    setTranscriptionChunks(prev => [...prev, newChunk]);

    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, `chunk_${chunkNumber + 1}.webm`);
      formData.append('session_id', sessionId);
      formData.append('patient_id', selectedPatient?.id || 'test-patient-001');
      formData.append('doctor_id', 'test-doctor-001');
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');

      console.log(`📤 [REALTIME] Sending chunk ${chunkNumber + 1} for transcription:`, {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({ key, value: value instanceof File ? `File(${value.size}b)` : value }))
      });

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      let result;
      try {
        result = await response.json();
        console.log(`📥 [REALTIME] Transcription response for chunk ${chunkNumber + 1}:`, result);
      } catch (jsonError) {
        // Handle non-JSON responses (like 413 HTML error pages)
        console.error(`❌ [REALTIME] Failed to parse response as JSON for chunk ${chunkNumber + 1}:`, jsonError);
        
        if (response.status === 413) {
          throw new Error(`Arquivo muito grande (${Math.round(audioBlob.size / 1024 / 1024 * 100) / 100} MB). Máximo: 10 MB. Tente gravação de menor duração.`);
        } else if (response.status === 408) {
          throw new Error(`Timeout na transcrição. O arquivo pode ser muito grande.`);
        } else {
          // Try to get error text from response
          const errorText = await response.text().catch(() => 'Erro desconhecido');
          throw new Error(`Erro na transcrição (HTTP ${response.status}): ${errorText.substring(0, 100)}`);
        }
      }

      if (!response.ok || !result.success) {
        // Handle specific error types
        if (response.status === 413) {
          throw new Error(`Chunk muito grande para transcrição (${Math.round(audioBlob.size / 1024 / 1024 * 100) / 100} MB). Máximo: 10 MB.`);
        } else if (response.status === 408) {
          throw new Error(`Timeout na transcrição do chunk. O arquivo pode ser muito grande.`);
        } else {
          throw new Error(result.error || `Falha na transcrição (HTTP ${response.status})`);
        }
      }

      // Update chunk with transcription result
      setTranscriptionChunks(prev => prev.map(chunk => 
        chunk.chunk_number === chunkNumber + 1
          ? {
              ...chunk,
              transcript: result.transcript,
              confidence: result.confidence || 0,
              duration: result.duration || 0,
              word_count: result.word_count || 0,
              provider: result.provider || 'unknown',
              processing_status: 'completed'
            }
          : chunk
      ));

      console.log(`✅ [REALTIME] Chunk ${chunkNumber + 1} transcribed successfully`);

    } catch (error) {
      console.error(`❌ [REALTIME] Transcription error for chunk ${chunkNumber + 1}:`, error);
      
      // Update chunk with error
      setTranscriptionChunks(prev => prev.map(chunk => 
        chunk.chunk_number === chunkNumber + 1
          ? {
              ...chunk,
              processing_status: 'error',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido'
            }
          : chunk
      ));
    }
  }, [sessionId, selectedPatient]);

  const startNextChunk = useCallback(async (stream: MediaStream, chunkNum: number) => {
    if (!stream) {
      console.error('❌ [REALTIME] No audio stream available for chunk', chunkNum + 1);
      return;
    }

    try {
      // Reset audio chunks for new chunk
      audioChunksRef.current = [];
      
      console.log(`🎙️ [REALTIME] Starting chunk ${chunkNum + 1} with stream:`, stream.active);
      
      // Create new MediaRecorder for this chunk with compression settings
      let mediaRecorder: MediaRecorder;
      
      // Try different MIME types with very low bitrates for much smaller files
      const recordingOptions = [
        { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 32000 }, // 32kbps - very low for small files
        { mimeType: 'audio/webm', audioBitsPerSecond: 32000 },
        { mimeType: 'audio/mp4', audioBitsPerSecond: 32000 },
        { audioBitsPerSecond: 32000 } // Fallback with just bitrate
      ];

      for (const options of recordingOptions) {
        try {
          if (MediaRecorder.isTypeSupported(options.mimeType || '')) {
            mediaRecorder = new MediaRecorder(stream, options);
            console.log(`✅ [REALTIME] Using MediaRecorder with:`, options);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ [REALTIME] MediaRecorder option failed:`, options, error);
          continue;
        }
      }
      
      // Final fallback - basic MediaRecorder  
      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(stream);
        console.log(`⚠️ [REALTIME] Using fallback MediaRecorder with default settings`);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          const sizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;
          
          console.log(`🎵 [REALTIME] Audio data received for chunk ${chunkNum + 1}:`, event.data.size, 'bytes, total:', sizeMB, 'MB');
          
          // Force chunk split if getting too large (to prevent 413 errors)
          if (totalSize > 6 * 1024 * 1024) { // 6MB threshold - force split early
            console.warn(`⚠️ [REALTIME] Chunk ${chunkNum + 1} reached ${sizeMB} MB - forcing early split to prevent 413 error`);
            
            // Stop recording immediately and process current chunk
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('🔄 [REALTIME] Auto-stopping chunk due to size limit');
              mediaRecorderRef.current.stop();
            }
          } else if (totalSize > 4 * 1024 * 1024) { // 4MB warning threshold
            console.warn(`⚠️ [REALTIME] Chunk ${chunkNum + 1} is getting large (${sizeMB} MB). Will split at 6MB.`);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`⏹️ [REALTIME] MediaRecorder stopped for chunk ${chunkNum + 1}`);
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log(`⏹️ [REALTIME] Chunk ${chunkNum + 1} recording stopped, size:`, audioBlob.size, 'bytes');
          
          // Process this chunk
          await processChunk(audioBlob, chunkNum);
          
          // Increment chunk number and reset chunk timer
          setCurrentChunkNumber(prev => {
            const nextChunkNum = prev + 1;
            console.log(`📈 [REALTIME] Moving to chunk ${nextChunkNum + 1}`);
            return nextChunkNum;
          });
          
          console.log('🔄 [REALTIME] Resetting chunk time to 0');
          setCurrentChunkTime(0);
          
          // If still recording, start next chunk
          setIsRecording(currentRecordingState => {
            if (currentRecordingState && stream.active) {
              console.log(`🔄 [REALTIME] Continuing to next chunk ${chunkNum + 2}`);
              console.log(`🧹 [REALTIME] Current chunk timer will be replaced by next chunk`);
              // Note: Don't clear chunkTimerRef here - let the next chunk handle it
              setTimeout(() => startNextChunk(stream, chunkNum + 1), 100);
            } else {
              console.log(`🛑 [REALTIME] Not continuing - recording stopped or stream inactive`);
            }
            return currentRecordingState;
          });
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms for better size control and smaller individual blobs
      
      console.log(`✅ [REALTIME] Started recording chunk ${chunkNum + 1}, recorder state:`, mediaRecorder.state);

      // Clear any existing chunk timer first
      if (chunkTimerRef.current) {
        console.log(`🧹 [REALTIME] Clearing previous chunk timer before setting new one`);
        clearTimeout(chunkTimerRef.current);
      }
      
      // Set timer for this chunk (30 seconds for testing)
      console.log(`⏰ [REALTIME] Setting ${CHUNK_DURATION_MS/1000}s timer for chunk ${chunkNum + 1}`);
      chunkTimerRef.current = setTimeout(() => {
        console.log(`🚨 [REALTIME] ${CHUNK_DURATION_MS/1000}s timer reached for chunk ${chunkNum + 1}!`);
        console.log(`🔍 [REALTIME] MediaRecorder state:`, mediaRecorderRef.current?.state);
        console.log(`🔍 [REALTIME] MediaRecorder exists:`, !!mediaRecorderRef.current);
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log(`⏹️ [REALTIME] AUTO-STOPPING chunk ${chunkNum + 1} due to timer`);
          mediaRecorderRef.current.stop();
        } else {
          console.log(`⚠️ [REALTIME] Cannot stop chunk ${chunkNum + 1} - recorder not in recording state`);
        }
      }, CHUNK_DURATION_MS);
      
      console.log(`✅ [REALTIME] Chunk timer set with ID:`, chunkTimerRef.current, `for ${CHUNK_DURATION_MS/1000}s`);
      
      // Debug timer to check if chunk timer is still active
      const debugInterval = setInterval(() => {
        console.log(`🔍 [REALTIME] Debug check - Chunk timer active:`, !!chunkTimerRef.current, 
                   `MediaRecorder state:`, mediaRecorderRef.current?.state,
                   `Recording:`, isRecording);
      }, 10000); // Every 10 seconds
      
      // Clear debug interval when chunk stops
      setTimeout(() => {
        clearInterval(debugInterval);
        console.log(`🧹 [REALTIME] Cleared debug interval for chunk ${chunkNum + 1}`);
      }, CHUNK_DURATION_MS + 5000); // 5 seconds after chunk should end

    } catch (error) {
      console.error('❌ [REALTIME] Error starting chunk recording:', error);
      setError('Erro ao iniciar gravação do chunk: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [processChunk]);

  const handleStartRecording = useCallback(async () => {
    console.log('🎙️ [REALTIME] Starting real-time transcription recording');
    
    try {
      setError(null);
      
      // Clear previous state and start session timer
      setTranscriptionChunks([]);
      setCurrentChunkNumber(0);
      setCurrentChunkTime(0);
      setSessionTimer(0);
      setSessionStarted(true); // This will trigger the independent session timer
      
      // Request microphone access with heavily optimized settings for very small file sizes
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 8000,   // Very low sample rate (8kHz - phone quality, but much smaller files)
          channelCount: 1,    // Mono recording (smaller than stereo)
          sampleSize: 8       // Lower bit depth if supported
        } 
      });
      
      console.log('✅ [REALTIME] Microphone access granted, stream active:', stream.active);
      
      setAudioStream(stream);
      setIsRecording(true);
      
      console.log('🎬 [REALTIME] Starting first chunk recording');
      
      // Start first chunk immediately with the stream
      console.log('🚀 [REALTIME] Calling startNextChunk for chunk 1');
      startNextChunk(stream, 0);
      
    } catch (error) {
      console.error('❌ [REALTIME] Error starting recording:', error);
      setError('Erro ao acessar o microfone: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [startNextChunk]);

  const handleStopRecording = useCallback(() => {
    console.log('⏹️ [REALTIME] Stopping real-time transcription recording');
    
    setIsRecording(false);
    
    // Stop current recorder
    if (mediaRecorderRef.current) {
      console.log(`🛑 [REALTIME] MediaRecorder state: ${mediaRecorderRef.current.state}`);
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('⏹️ [REALTIME] Stopping active MediaRecorder');
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    
    // Clear recording-related timers only - keep session timer running
    if (chunkTimerRef.current) {
      console.log('⏰ [REALTIME] Clearing chunk timer during manual stop');
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    
    // Stop audio stream
    if (audioStream) {
      console.log('🎤 [REALTIME] Stopping audio stream tracks');
      audioStream.getTracks().forEach(track => {
        console.log(`🛑 [REALTIME] Stopping track: ${track.kind}, state: ${track.readyState}`);
        track.stop();
      });
      setAudioStream(null);
    }
    
    console.log('✅ [REALTIME] Recording stopped completely');
  }, [audioStream]);

  const handleClearTranscriptions = useCallback(() => {
    setTranscriptionChunks([]);
    setCurrentChunkNumber(0);
    setCurrentChunkTime(0);
    setSessionTimer(0);
    setSessionStarted(false); // Stop the session timer
    setError(null);
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [REALTIME] Component unmounting - cleaning up');
      if (chunkTimerRef.current) {
        console.log('🧹 [REALTIME] Clearing chunk timer on unmount');
        clearTimeout(chunkTimerRef.current);
      }
      if (audioStream) {
        console.log('🧹 [REALTIME] Stopping audio stream on unmount');
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);


  return (
    <div className="space-y-6">
      {/* =====================================
          RECORDING CONTROLS
          ===================================== */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎙️ Gravação em Tempo Real
        </h3>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Recording Status and Controls */}
        <div className="text-center space-y-4">
          {!isRecording ? (
            <div className="space-y-4">
              <Button
                onClick={handleStartRecording}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
              >
                🎙️ Iniciar Transcrição em Tempo Real
              </Button>
              {transcriptionChunks.length > 0 && (
                <Button
                  onClick={handleClearTranscriptions}
                  variant="secondary"
                  className="ml-4"
                >
                  🗑️ Limpar Transcrições
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-mono text-green-600 animate-pulse">
                  🔴 GRAVANDO
                </div>
                <div className="text-lg text-gray-600">
                  Tempo Total: {formatTime(sessionTimer)}
                </div>
              </div>
              <Button
                onClick={handleStopRecording}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full text-lg font-semibold"
              >
                ⏹️ Parar Gravação
              </Button>
            </div>
          )}
        </div>

        {/* Audio Visualizer */}
        {audioStream && (
          <div className="flex justify-center mt-6">
            <AudioVisualizer audioStream={audioStream} isRecording={isRecording} />
          </div>
        )}
      </div>

      {/* =====================================
          TRANSCRIPTION RESULTS
          ===================================== */}
      {transcriptionChunks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📝 Transcrições em Tempo Real
          </h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {transcriptionChunks.map((chunk) => (
              <div
                key={chunk.chunk_number}
                className={`border rounded-lg p-4 ${
                  chunk.processing_status === 'processing'
                    ? 'border-yellow-200 bg-yellow-50'
                    : chunk.processing_status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    Parte {chunk.chunk_number}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{new Date(chunk.timestamp).toLocaleTimeString()}</span>
                    {chunk.processing_status === 'processing' && (
                      <span className="text-yellow-600">🔄 Processando...</span>
                    )}
                    {chunk.processing_status === 'completed' && (
                      <span className="text-green-600">✅ Concluído</span>
                    )}
                    {chunk.processing_status === 'error' && (
                      <span className="text-red-600">❌ Erro</span>
                    )}
                  </div>
                </div>

                {chunk.processing_status === 'processing' && (
                  <div className="text-yellow-700">
                    Aguardando transcrição...
                  </div>
                )}

                {chunk.processing_status === 'error' && (
                  <div className="text-red-700">
                    Erro na transcrição: {chunk.error_message}
                  </div>
                )}

                {chunk.processing_status === 'completed' && (
                  <div className="space-y-2">
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {chunk.transcript}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Confiança: {(chunk.confidence * 100).toFixed(1)}%</span>
                      <span>Duração: {chunk.duration}s</span>
                      <span>Palavras: {chunk.word_count}</span>
                      <span>Provedor: {chunk.provider}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>Resumo:</strong> {transcriptionChunks.length} parte(s) processada(s) • 
              {transcriptionChunks.filter(c => c.processing_status === 'completed').length} concluída(s) • 
              {transcriptionChunks.filter(c => c.processing_status === 'processing').length} processando • 
              {transcriptionChunks.filter(c => c.processing_status === 'error').length} com erro
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          PRONTUÁRIO GENERATION
          ===================================== */}
      {transcriptionChunks.length > 0 && transcriptionChunks.some(chunk => chunk.processing_status === 'completed') && (
        <RealtimeProntuarioGenerator
          transcription={getCombinedTranscription()}
          selectedPatient={selectedPatient}
          selectedTemplate={selectedTemplate}
          sessionId={sessionId}
          onProntuarioGenerated={handleProntuarioGenerated}
        />
      )}
    </div>
  );
}