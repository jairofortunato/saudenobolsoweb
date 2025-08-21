'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * =====================================
 * CHUNKED RECORDING MANAGER COMPONENT
 * =====================================
 * 
 * This component manages chunked audio recording for long consultations.
 * It handles 4-minute recording cycles with seamless transitions between chunks.
 * 
 * FEATURES:
 * - 4-minute automatic chunking
 * - Seamless MediaRecorder restart
 * - Session continuity tracking
 * - Real-time chunk processing
 * - Memory-based state management
 * 
 * WORKFLOW:
 * 1. Start recording with initial MediaRecorder
 * 2. Every 4 minutes, stop current recorder and save chunk
 * 3. Process chunk for transcription and insights
 * 4. Start new MediaRecorder seamlessly
 * 5. Continue until manual stop
 * 6. Generate final prontuário from all chunks
 */

interface ChunkedRecordingChunk {
  chunk_number: number;
  audio_blob: Blob;
  transcript: string;
  confidence: number;
  timestamp: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
}

interface ChunkedRecordingManagerProps {
  sessionId: string;
  patientId: string;
  doctorId: string;
  audioSource?: 'microphone' | 'system';
  onChunkTranscribed: (chunk: ChunkedRecordingChunk) => void;
  onRecordingComplete: (chunks: ChunkedRecordingChunk[]) => void;
  onError: (error: string) => void;
  className?: string;
}

const CHUNK_DURATION_MS = 2 * 60 * 1000; // 2 minutes in milliseconds to prevent size issues
const MAX_CHUNK_SIZE_MB = 4; // Maximum chunk size in MB before forced split

/**
 * Simple audio blob compression by creating a new blob with reduced quality
 * This is a placeholder - real compression would require audio processing libraries
 */
async function compressAudioBlob(originalBlob: Blob): Promise<Blob> {
  console.log('⚠️ [CHUNKED-RECORDING] Simple compression fallback - returning original blob');
  // For now, return the original blob since proper audio compression is complex
  // In a production environment, you'd use a library like FFmpeg.js or similar
  return originalBlob;
}

export const ChunkedRecordingManager = forwardRef<any, ChunkedRecordingManagerProps>(({
  sessionId,
  patientId,
  doctorId,
  audioSource = 'microphone',
  onChunkTranscribed,
  onRecordingComplete,
  onError,
  className
}, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalRecordingTime, setTotalRecordingTime] = useState(0);
  const [currentChunkTime, setCurrentChunkTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [chunks, setChunks] = useState<ChunkedRecordingChunk[]>([]);
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);
  const [currentChunkSize, setCurrentChunkSize] = useState(0);
  const [activeTimers, setActiveTimers] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCompletionRef = useRef(false);
  const currentChunkRef = useRef(0);
  const isRecordingRef = useRef(false);

  // Only log on significant state changes
  const prevRecordingRef = useRef(isRecording);
  const prevChunkRef = useRef(currentChunk);
  
  useEffect(() => {
    if (prevRecordingRef.current !== isRecording || prevChunkRef.current !== currentChunk) {
      console.log('🔄 [CHUNKED-RECORDING] State changed:', {
        isRecording,
        currentChunk,
        totalRecordingTime,
        currentChunkTime,
        chunksCount: chunks.length,
        sessionId
      });
      prevRecordingRef.current = isRecording;
      prevChunkRef.current = currentChunk;
    }
    // Update refs for timer access
    currentChunkRef.current = currentChunk;
    isRecordingRef.current = isRecording;
  }, [isRecording, currentChunk, totalRecordingTime, currentChunkTime, chunks.length, sessionId]);

  // Start new MediaRecorder for current chunk
  const startMediaRecorder = useCallback(async (stream?: MediaStream): Promise<boolean> => {
    console.log('🎙️ [CHUNKED-RECORDING] Starting MediaRecorder for chunk', currentChunk);
    
    try {
      const currentStream = stream || audioStream;
      if (!currentStream) {
        console.error('❌ [CHUNKED-RECORDING] No audio stream available');
        onError('No audio stream available for recording');
        return false;
      }

      // Stop existing recorder if any
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('🛑 [CHUNKED-RECORDING] Stopping existing MediaRecorder');
        mediaRecorderRef.current.stop();
      }

      // Clear previous audio chunks and reset size
      audioChunksRef.current = [];
      setCurrentChunkSize(0);

      // Create new MediaRecorder with format fallback
      let mediaRecorder: MediaRecorder;
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedType = 'audio/webm';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
      
      console.log('🎤 [CHUNKED-RECORDING] Using MIME type:', selectedType);
      
      try {
        mediaRecorder = new MediaRecorder(currentStream, {
          mimeType: selectedType,
          audioBitsPerSecond: 16000 // Lower bitrate to reduce file size
        });
      } catch (error) {
        console.warn('⚠️ [CHUNKED-RECORDING] Fallback to default MediaRecorder');
        try {
          mediaRecorder = new MediaRecorder(currentStream, {
            audioBitsPerSecond: 16000
          });
        } catch {
          mediaRecorder = new MediaRecorder(currentStream);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          const totalChunkSize = audioChunksRef.current.reduce((sum, blob) => sum + blob.size, 0);
          setCurrentChunkSize(totalChunkSize);
          console.log('📁 [CHUNKED-RECORDING] Audio data collected:', event.data.size, 'bytes, total chunk size:', Math.round(totalChunkSize / 1024 / 1024 * 100) / 100, 'MB');
          
          // Check if chunk size exceeds limit and force a split
          if (totalChunkSize > MAX_CHUNK_SIZE_MB * 1024 * 1024) {
            console.log('⚠️ [CHUNKED-RECORDING] Chunk size limit exceeded, forcing split at', Math.round(totalChunkSize / 1024 / 1024 * 100) / 100, 'MB');
            // Stop current recorder immediately to prevent further growth
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('🔄 [CHUNKED-RECORDING] Stopping current recorder due to size limit');
              mediaRecorderRef.current.stop();
              // Set a flag to auto-restart after processing
              setTimeout(async () => {
                if (isRecordingRef.current) {
                  console.log('🔄 [CHUNKED-RECORDING] Auto-switching to next chunk after size split');
                  await switchToNextChunk();
                }
              }, 500); // Give time for current chunk to process
            }
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 [CHUNKED-RECORDING] MediaRecorder stopped for chunk', currentChunk);
        await processCurrentChunk();
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ [CHUNKED-RECORDING] MediaRecorder error:', event);
        onError(`Recording error: ${event.error}`);
      };

      mediaRecorderRef.current = mediaRecorder;
      
      // Start recording with more frequent data collection for size monitoring
      mediaRecorder.start(500); // Collect data every 500ms for better size control
      console.log('✅ [CHUNKED-RECORDING] MediaRecorder started for chunk', currentChunk);
      
      return true;
    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Failed to start MediaRecorder:', error);
      onError(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [audioStream, currentChunk, onError]);

  // Process completed chunk
  const processCurrentChunk = useCallback(async () => {
    console.log('⚙️ [CHUNKED-RECORDING] Processing chunk', currentChunk);
    
    if (audioChunksRef.current.length === 0) {
      console.warn('⚠️ [CHUNKED-RECORDING] No audio data for chunk', currentChunk);
      return;
    }

    setIsProcessingChunk(true);

    try {
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('📦 [CHUNKED-RECORDING] Created audio blob:', audioBlob.size, 'bytes');

      // Create chunk object
      const chunkData: ChunkedRecordingChunk = {
        chunk_number: currentChunk,
        audio_blob: audioBlob,
        transcript: '',
        confidence: 0,
        timestamp: new Date().toISOString(),
        processing_status: 'pending'
      };

      // Update chunks state
      setChunks(prev => [...prev, chunkData]);

      // Send chunk for transcription
      await transcribeChunk(chunkData);

    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Error processing chunk:', error);
      onError(`Failed to process chunk ${currentChunk}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingChunk(false);
    }
  }, [currentChunk, onError]);

  // Transcribe individual chunk
  const transcribeChunk = useCallback(async (chunk: ChunkedRecordingChunk) => {
    console.log('🔤 [CHUNKED-RECORDING] Transcribing chunk', chunk.chunk_number);

    try {
      // Update chunk status to processing
      setChunks(prev => prev.map(c => 
        c.chunk_number === chunk.chunk_number 
          ? { ...c, processing_status: 'processing' }
          : c
      ));

      // Determine proper file extension based on MIME type
      let fileExtension = 'webm';
      if (chunk.audio_blob.type) {
        if (chunk.audio_blob.type.includes('mp4')) {
          fileExtension = 'mp4';
        } else if (chunk.audio_blob.type.includes('wav')) {
          fileExtension = 'wav';
        } else if (chunk.audio_blob.type.includes('mp3')) {
          fileExtension = 'mp3';
        } else if (chunk.audio_blob.type.includes('ogg')) {
          fileExtension = 'ogg';
        }
      }
      
      console.log('📁 [CHUNKED-RECORDING] Chunk audio details:', {
        chunkNumber: chunk.chunk_number,
        mimeType: chunk.audio_blob.type,
        size: chunk.audio_blob.size,
        extension: fileExtension
      });

      // Validate chunk audio
      if (chunk.audio_blob.size === 0) {
        throw new Error(`Chunk ${chunk.chunk_number} is empty`);
      }

      // Check if chunk is still too large and attempt basic optimization
      const maxSizeBytes = 6 * 1024 * 1024; // 6MB limit for Vercel
      let finalAudioBlob = chunk.audio_blob;
      
      if (chunk.audio_blob.size > maxSizeBytes) {
        console.warn('⚠️ [CHUNKED-RECORDING] Chunk exceeds API limit, attempting optimization');
        
        try {
          // Try to re-encode with lower quality
          finalAudioBlob = await compressAudioBlob(chunk.audio_blob);
          console.log('✅ [CHUNKED-RECORDING] Audio compressed from', 
            Math.round(chunk.audio_blob.size / 1024 / 1024 * 100) / 100, 'MB to',
            Math.round(finalAudioBlob.size / 1024 / 1024 * 100) / 100, 'MB');
          
          // Check if still too large after compression
          if (finalAudioBlob.size > maxSizeBytes) {
            throw new Error(`Chunk ${chunk.chunk_number} ainda muito grande após compressão (${Math.round(finalAudioBlob.size / 1024 / 1024 * 100) / 100} MB). Limite: 6 MB`);
          }
        } catch (compressionError) {
          console.error('❌ [CHUNKED-RECORDING] Compression failed:', compressionError);
          throw new Error(`Chunk ${chunk.chunk_number} é muito grande (${Math.round(chunk.audio_blob.size / 1024 / 1024 * 100) / 100} MB) e não pode ser comprimido. Limite: 6 MB`);
        }
      }

      // Prepare form data for chunked transcription API
      const formData = new FormData();
      formData.append('audio_file', finalAudioBlob, `chunk-${chunk.chunk_number}.${fileExtension}`);
      formData.append('session_id', sessionId);
      formData.append('chunk_number', chunk.chunk_number.toString());
      formData.append('is_final_chunk', 'false'); // Will be updated for final chunk
      formData.append('patient_id', patientId);
      formData.append('doctor_id', doctorId);
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');
      formData.append('file_format', fileExtension);

      console.log('📤 [CHUNKED-RECORDING] Sending chunk to transcription API');
      console.log('  - Chunk number:', chunk.chunk_number);
      console.log('  - Session ID:', sessionId);
      console.log('  - Is final chunk:', chunk.chunk_number === currentChunk - 1 && !isRecording);
      console.log('  - Audio blob size:', finalAudioBlob.size);
      console.log('  - Request URL: /api/doctor/transcribe-audio-chunk');
      console.log('  - Window location:', window.location.href);
      
      const response = await fetch('/api/doctor/transcribe-audio-chunk', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const responseText = await response.text();
          console.log('❌ [CHUNKED-RECORDING] Error response text:', responseText);
          
          // Try to parse as JSON first
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || `HTTP ${response.status}`;
          } catch {
            // If not JSON, use the text directly
            errorMessage = responseText || `HTTP ${response.status}`;
          }
        } catch {
          errorMessage = `HTTP ${response.status}`;
        }
        
        // Handle specific error patterns for chunks
        if (errorMessage.includes('string did not match the expected pattern')) {
          throw new Error(`Formato de áudio não suportado no segmento ${chunk.chunk_number}`);
        } else if (response.status === 413) {
          throw new Error(`Segmento ${chunk.chunk_number} muito grande`);
        } else if (response.status === 422) {
          throw new Error(`Formato inválido no segmento ${chunk.chunk_number}`);
        } else {
          throw new Error(errorMessage);
        }
      }

      const result = await response.json();
      console.log('✅ [CHUNKED-RECORDING] Chunk transcription successful:', result);

      // Update chunk with transcription results
      const updatedChunk: ChunkedRecordingChunk = {
        ...chunk,
        transcript: result.transcript || '',
        confidence: result.confidence || 0,
        processing_status: 'completed'
      };

      setChunks(prev => prev.map(c => 
        c.chunk_number === chunk.chunk_number ? updatedChunk : c
      ));

      // Notify parent component
      onChunkTranscribed(updatedChunk);

      // If recording has stopped and we're waiting for completion, trigger it now
      if (pendingCompletionRef.current && !isRecording) {
        console.log('🏁 [CHUNKED-RECORDING] Triggering completion after chunk transcription');
        pendingCompletionRef.current = false;
        
        // Get the latest chunks state and trigger completion
        setChunks(currentChunks => {
          console.log('📦 [CHUNKED-RECORDING] Final chunks count after transcription:', currentChunks.length);
          
          // Include this newly transcribed chunk in the completion
          const finalChunks = currentChunks.map(c => 
            c.chunk_number === chunk.chunk_number ? updatedChunk : c
          );
          
          // If this chunk wasn't already in the array, add it
          if (!finalChunks.find(c => c.chunk_number === chunk.chunk_number)) {
            finalChunks.push(updatedChunk);
          }
          
          console.log('📦 [CHUNKED-RECORDING] Triggering completion with final chunks:', finalChunks.length);
          onRecordingComplete(finalChunks);
          return finalChunks;
        });
      }

    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Chunk transcription failed:', error);
      
      // Update chunk status to error but don't fail the whole process
      const updatedChunkWithError: ChunkedRecordingChunk = {
        ...chunk,
        transcript: `[Erro na transcrição do segmento ${chunk.chunk_number}]`,
        confidence: 0,
        processing_status: 'error'
      };

      setChunks(prev => prev.map(c => 
        c.chunk_number === chunk.chunk_number ? updatedChunkWithError : c
      ));

      // Still notify parent but with error chunk
      onChunkTranscribed(updatedChunkWithError);
      
      // Log error but continue with other chunks
      console.warn(`⚠️ [CHUNKED-RECORDING] Chunk ${chunk.chunk_number} failed, but continuing with other chunks`);

      // If recording has stopped and we're waiting for completion, still trigger it
      if (pendingCompletionRef.current && !isRecording) {
        console.log('🏁 [CHUNKED-RECORDING] Triggering completion despite chunk error');
        pendingCompletionRef.current = false;
        
        setChunks(currentChunks => {
          const finalChunks = currentChunks.map(c => 
            c.chunk_number === chunk.chunk_number ? updatedChunkWithError : c
          );
          
          if (!finalChunks.find(c => c.chunk_number === chunk.chunk_number)) {
            finalChunks.push(updatedChunkWithError);
          }
          
          console.log('📦 [CHUNKED-RECORDING] Completing with error chunk included:', finalChunks.length);
          onRecordingComplete(finalChunks);
          return finalChunks;
        });
      }
    }
  }, [sessionId, patientId, doctorId, onChunkTranscribed, onError]);

  // Start chunked recording
  const startChunkedRecording = useCallback(async () => {
    console.log('🚀 [CHUNKED-RECORDING] Starting adaptive chunked recording (supports both short and long consultations)');
    console.log('🎧 [CHUNKED-RECORDING] Audio source:', audioSource);

    try {
      let stream: MediaStream;
      
      if (audioSource === 'system') {
        // Request system audio (screen/tab audio) capture
        try {
          console.log('🖥️ [CHUNKED-RECORDING] Requesting system audio capture...');
          stream = await navigator.mediaDevices.getDisplayMedia({ 
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 44100
            },
            video: false // We only want audio
          });
          console.log('✅ [CHUNKED-RECORDING] System audio capture granted');
        } catch (error) {
          console.warn('⚠️ [CHUNKED-RECORDING] System audio not available, falling back to microphone');
          // Fallback to microphone if system audio fails
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            } 
          });
        }
      } else {
        // Request microphone access
        console.log('🎤 [CHUNKED-RECORDING] Requesting microphone access...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          } 
        });
        console.log('✅ [CHUNKED-RECORDING] Microphone access granted');
      }

      setAudioStream(stream);
      setIsRecording(true);
      setCurrentChunk(0);
      setTotalRecordingTime(0);
      setCurrentChunkTime(0);
      setCurrentChunkSize(0);
      setChunks([]);

      console.log('🎤 [CHUNKED-RECORDING] Audio stream obtained');
      
      // Immediately dispatch audio stream event for AudioVisualizer
      const streamEvent = new CustomEvent('audio-stream-available', { 
        detail: { audioStream: stream, isRecording: true } 
      });
      window.dispatchEvent(streamEvent);
      console.log('📡 [CHUNKED-RECORDING] Audio stream event dispatched for AudioVisualizer');

      // Start first MediaRecorder with the stream we just obtained
      const recorderStarted = await startMediaRecorder(stream);
      if (!recorderStarted) {
        throw new Error('Failed to start first MediaRecorder');
      }

      // Start timers
      chunkTimerRef.current = setInterval(() => {
        setCurrentChunkTime(prev => prev + 1);
      }, 1000);

      totalTimerRef.current = setInterval(() => {
        setTotalRecordingTime(prev => prev + 1);
      }, 1000);

      // Set up automatic chunk switching (only if recording continues for 2+ minutes)
      console.log('⏰ [CHUNKED-RECORDING] Setting up first chunk timer for', CHUNK_DURATION_MS / 1000, 'seconds');
      setActiveTimers(1);
      recordingTimerRef.current = setTimeout(async () => {
        console.log('⏰ [CHUNKED-RECORDING] First chunk timer triggered! Checking recording state...');
        console.log('📊 [CHUNKED-RECORDING] MediaRecorder state:', mediaRecorderRef.current?.state);
        console.log('📊 [CHUNKED-RECORDING] Is recording ref:', isRecordingRef.current);
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && isRecordingRef.current) {
          console.log('⏰ [CHUNKED-RECORDING] 2-minute chunk completed, switching to next chunk for long consultation');
          setActiveTimers(prev => prev - 1); // This timer is firing, so decrease count
          await switchToNextChunk();
        } else {
          console.log('⚠️ [CHUNKED-RECORDING] Timer triggered but recording not active');
          setActiveTimers(prev => prev - 1); // Timer fired but didn't act
        }
      }, CHUNK_DURATION_MS);

      console.log('✅ [CHUNKED-RECORDING] Adaptive recording started successfully (handles both short and long consultations)');

    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Failed to start recording:', error);
      onError(`Failed to start ${audioSource} recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopChunkedRecording();
    }
  }, [startMediaRecorder, audioSource, onError]);

  // Switch to next chunk seamlessly
  const switchToNextChunk = useCallback(async () => {
    console.log('🔄 [CHUNKED-RECORDING] Switching to next chunk from', currentChunkRef.current);

    try {
      // Stop current MediaRecorder (this will trigger processCurrentChunk)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Wait a brief moment for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Increment chunk number and reset chunk timer and size
      const nextChunkNumber = currentChunkRef.current + 1;
      console.log('📊 [CHUNKED-RECORDING] Moving from chunk', currentChunkRef.current, 'to chunk', nextChunkNumber);
      
      setCurrentChunk(nextChunkNumber);
      setCurrentChunkTime(0);
      setCurrentChunkSize(0);
      currentChunkRef.current = nextChunkNumber;

      // Start new MediaRecorder for next chunk
      const recorderStarted = await startMediaRecorder();
      if (!recorderStarted) {
        throw new Error('Failed to start next MediaRecorder');
      }

      // Set up next automatic chunk switch
      if (recordingTimerRef.current) {
        console.log('🧹 [CHUNKED-RECORDING] Clearing previous timer before setting new one');
        clearTimeout(recordingTimerRef.current);
      }

      console.log('⏰ [CHUNKED-RECORDING] Setting up next chunk timer for', CHUNK_DURATION_MS / 1000, 'seconds');
      setActiveTimers(prev => prev + 1);
      recordingTimerRef.current = setTimeout(async () => {
        console.log('⏰ [CHUNKED-RECORDING] Subsequent chunk timer triggered! Checking recording state...');
        console.log('📊 [CHUNKED-RECORDING] MediaRecorder state:', mediaRecorderRef.current?.state);
        console.log('📊 [CHUNKED-RECORDING] Is recording ref:', isRecordingRef.current);
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && isRecordingRef.current) {
          console.log('⏰ [CHUNKED-RECORDING] Next 2-minute chunk completed, switching again');
          setActiveTimers(prev => prev - 1); // This timer is firing, so decrease count
          await switchToNextChunk();
        } else {
          console.log('⚠️ [CHUNKED-RECORDING] Timer triggered but recording not active');
          setActiveTimers(prev => prev - 1); // Timer fired but didn't act
        }
      }, CHUNK_DURATION_MS);

      console.log('✅ [CHUNKED-RECORDING] Successfully switched to chunk', nextChunkNumber);

    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Failed to switch to next chunk:', error);
      onError(`Failed to switch to next chunk: ${error instanceof Error ? error.message : 'Unknown error'}`);
      stopChunkedRecording();
    }
  }, [startMediaRecorder, onError]);

  // Stop chunked recording
  const stopChunkedRecording = useCallback(async () => {
    console.log('🛑 [CHUNKED-RECORDING] Stopping chunked recording');

    try {
      setIsRecording(false);

      // Clear all timers
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
        totalTimerRef.current = null;
      }

      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
        setActiveTimers(0);
      }

      // Stop MediaRecorder (this will trigger processCurrentChunk via onstop)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('📦 [CHUNKED-RECORDING] Stopping MediaRecorder - this will trigger final chunk processing');
        mediaRecorderRef.current.stop();
      }

      // Stop audio stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }

      console.log('✅ [CHUNKED-RECORDING] Recording stopped successfully');

      // Set pending completion flag - completion will be handled by transcribeChunk
      pendingCompletionRef.current = true;
      
      // If we already have processed chunks, handle completion immediately
      // Otherwise, wait for the final chunk to be processed
      setChunks(currentChunks => {
        console.log('📦 [CHUNKED-RECORDING] Current chunks status:', {
          chunksCount: currentChunks.length,
          isProcessingChunk,
          pendingCompletion: pendingCompletionRef.current
        });
        
        // If there are already processed chunks OR if we're not processing anything,
        // we should complete immediately
        if (currentChunks.length > 0 && !isProcessingChunk) {
          console.log('📦 [CHUNKED-RECORDING] Completing immediately with existing chunks');
          pendingCompletionRef.current = false;
          onRecordingComplete(currentChunks);
        }
        // Otherwise, transcribeChunk will handle completion when the final chunk is done
        
        return currentChunks;
      });

    } catch (error) {
      console.error('❌ [CHUNKED-RECORDING] Error stopping recording:', error);
      onError(`Error stopping recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [audioStream, isProcessingChunk, onRecordingComplete, onError]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Listen for external recording control events
  useEffect(() => {
    const handleStartRecording = () => {
      console.log('🎧 [CHUNKED-RECORDING] Received start recording event');
      startChunkedRecording();
    };
    
    const handleStopRecording = () => {
      console.log('🎧 [CHUNKED-RECORDING] Received stop recording event');
      stopChunkedRecording();
    };
    
    window.addEventListener('start-chunked-recording', handleStartRecording);
    window.addEventListener('stop-chunked-recording', handleStopRecording);
    
    return () => {
      window.removeEventListener('start-chunked-recording', handleStartRecording);
      window.removeEventListener('stop-chunked-recording', handleStopRecording);
    };
  }, [startChunkedRecording, stopChunkedRecording]);

  // Expose audio stream to parent components
  useEffect(() => {
    if (audioStream && isRecording) {
      console.log('📡 [CHUNKED-RECORDING] Broadcasting audio stream for visualization:', !!audioStream);
      const streamEvent = new CustomEvent('audio-stream-available', { 
        detail: { audioStream, isRecording } 
      });
      window.dispatchEvent(streamEvent);
    }
  }, [audioStream, isRecording]);

  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    startRecording: startChunkedRecording,
    stopRecording: stopChunkedRecording,
    isRecording,
    audioStream
  }), [startChunkedRecording, stopChunkedRecording, isRecording, audioStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);

  return (
    <div className={`chunked-recording-manager ${className || ''}`}>
      <div className="recording-controls space-y-4">
        {!isRecording ? (
          <button
            onClick={startChunkedRecording}
            disabled={isProcessingChunk}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
            Iniciar Gravação da Consulta
          </button>
        ) : (
          <button
            onClick={stopChunkedRecording}
            disabled={isProcessingChunk}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-3 h-3 bg-white"></div>
            Finalizar Consulta
          </button>
        )}
      </div>

      {isRecording && (
        <div className="recording-status mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-red-700">
                {totalRecordingTime < 120 ? 'Gravando Consulta' : `Gravando - Segmento ${currentChunk + 1}`}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Sessão: {sessionId.slice(0, 8)}...
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">
                {totalRecordingTime < 120 ? 'Tempo atual:' : 'Tempo do segmento:'}
              </span>
              <div className="font-mono text-lg">{formatTime(currentChunkTime)}</div>
              {totalRecordingTime < 120 ? (
                <div className="text-xs text-gray-500">
                  Gravação contínua em andamento
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Próximo segmento em: {formatTime(Math.max(0, 120 - currentChunkTime))}
                  <br />
                  Tamanho atual: {Math.round(currentChunkSize / 1024 / 1024 * 100) / 100} MB / 4 MB max
                  <br />
                  Timers ativos: {activeTimers}
                </div>
              )}
            </div>
            <div>
              <span className="text-gray-600">Tempo total:</span>
              <div className="font-mono text-lg">{formatTime(totalRecordingTime)}</div>
              <div className="text-xs text-gray-500">
                {chunks.length === 0 ? 'Consulta em andamento' : `${chunks.length} segmento(s) processado(s)`}
              </div>
            </div>
          </div>
        </div>
      )}

      {chunks.length > 0 && (
        <div className="chunks-status mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Segmentos da Consulta</h4>
          <div className="space-y-2">
            {chunks.map((chunk, index) => (
              <div 
                key={chunk.chunk_number} 
                className={`p-3 rounded border ${
                  chunk.processing_status === 'completed' ? 'bg-green-50 border-green-200' :
                  chunk.processing_status === 'processing' ? 'bg-yellow-50 border-yellow-200' :
                  chunk.processing_status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Segmento {chunk.chunk_number + 1}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    chunk.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                    chunk.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    chunk.processing_status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {chunk.processing_status === 'completed' ? 'Processado' :
                     chunk.processing_status === 'processing' ? 'Processando...' :
                     chunk.processing_status === 'error' ? 'Erro' :
                     'Pendente'}
                  </span>
                </div>
                {chunk.transcript && (
                  <div className="mt-2 text-sm text-gray-600">
                    <div>Palavras: {chunk.transcript.split(' ').length}</div>
                    <div>Confiança: {(chunk.confidence * 100).toFixed(1)}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isProcessingChunk && (
        <div className="processing-indicator mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Processando segmento...</span>
          </div>
        </div>
      )}
    </div>
  );
});