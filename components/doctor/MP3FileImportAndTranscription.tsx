'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  Button,
  AnimatedAlert
} from '../index';
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

interface MP3FileImportAndTranscriptionProps {
  selectedPatient: PatientProfile | null;
  selectedTemplate: ConsultationTemplate | null;
  onProntuarioGenerated: (prontuario: string) => void;
  onClearProntuario?: () => void;
  className?: string;
}

interface AudioChunk {
  chunk_number: number;
  audio_blob: Blob;
  start_time: number;
  end_time: number;
  duration: number;
}

interface ChunkedTranscriptionResult {
  chunk_number: number;
  transcript: string;
  confidence: number;
  session_id: string;
  is_final_chunk: boolean;
  processing_time: number;
  quality_warning?: string;
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

export function MP3FileImportAndTranscription({ 
  selectedPatient, 
  selectedTemplate,
  onProntuarioGenerated,
  onClearProntuario,
  className 
}: MP3FileImportAndTranscriptionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingProntuario, setIsGeneratingProntuario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [prontuarioText, setProntuarioText] = useState('');
  const [isEditingProntuario, setIsEditingProntuario] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProcessingCompleteAlert, setShowProcessingCompleteAlert] = useState(false);
  const [processingTime, setProcessingTime] = useState<{ transcription?: number; prontuario?: number }>({});
  
  // Chunked processing state
  const [currentSession, setCurrentSession] = useState<{ session_id: string } | null>(null);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [chunkedResults, setChunkedResults] = useState<ChunkedTranscriptionResult[]>([]);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isChunking, setIsChunking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleError = useErrorHandler();

  // Constants for chunking (reduced from 4 to 2 minutes for faster processing)
  const CHUNK_DURATION_MS = 2 * 60 * 1000; // 2 minutes in milliseconds
  const CHUNK_DURATION_SECONDS = 2 * 60; // 2 minutes in seconds

  /**
   * Split audio file into 2-minute chunks using Web Audio API
   * This simulates the same chunking process as live recording but with smaller chunks for faster processing
   */
  const splitAudioIntoChunks = useCallback(async (audioFile: File): Promise<AudioChunk[]> => {
    console.log('🔧 [MP3-CHUNKING] Starting audio file chunking process');
    
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert file to array buffer
      const arrayBuffer = await audioFile.arrayBuffer();
      console.log('📁 [MP3-CHUNKING] File loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const numberOfChannels = audioBuffer.numberOfChannels;
      
      console.log('🎵 [MP3-CHUNKING] Audio decoded:', {
        duration: `${duration.toFixed(1)}s`,
        sampleRate: `${sampleRate}Hz`,
        channels: numberOfChannels
      });
      
      // Calculate number of chunks needed
      const totalChunks = Math.ceil(duration / CHUNK_DURATION_SECONDS);
      console.log('📊 [MP3-CHUNKING] Will create', totalChunks, 'chunks of', CHUNK_DURATION_SECONDS, 'seconds each');
      
      const chunks: AudioChunk[] = [];
      
      // Create each chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startTime = chunkIndex * CHUNK_DURATION_SECONDS;
        const endTime = Math.min((chunkIndex + 1) * CHUNK_DURATION_SECONDS, duration);
        const chunkDuration = endTime - startTime;
        
        // Calculate samples
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const chunkLength = endSample - startSample;
        
        console.log(`🎬 [MP3-CHUNKING] Creating chunk ${chunkIndex}:`, {
          startTime: `${startTime.toFixed(1)}s`,
          endTime: `${endTime.toFixed(1)}s`,
          duration: `${chunkDuration.toFixed(1)}s`,
          samples: `${startSample}-${endSample} (${chunkLength})`
        });
        
        // Create new audio buffer for this chunk
        const chunkBuffer = audioContext.createBuffer(
          numberOfChannels,
          chunkLength,
          sampleRate
        );
        
        // Copy audio data for each channel
        console.log(`🔄 [MP3-CHUNKING] Copying audio data for chunk ${chunkIndex}, ${numberOfChannels} channels, ${chunkLength} samples`);
        for (let channel = 0; channel < numberOfChannels; channel++) {
          console.log(`📊 [MP3-CHUNKING] Processing channel ${channel + 1}/${numberOfChannels} for chunk ${chunkIndex}`);
          
          // Yield to browser before each channel to prevent hanging
          await new Promise(resolve => setTimeout(resolve, 1));
          
          const sourceData = audioBuffer.getChannelData(channel);
          const chunkData = chunkBuffer.getChannelData(channel);
          
          console.log(`🎯 [MP3-CHUNKING] Channel data retrieved for chunk ${chunkIndex}, channel ${channel}`);
          
          // Use more aggressive batching for large chunks
          const batchSize = chunkLength > 5000000 ? 50000 : 100000; // Smaller batches for very large chunks
          console.log(`📦 [MP3-CHUNKING] Using batch size: ${batchSize} for ${chunkLength} samples`);
          
          for (let batchStart = 0; batchStart < chunkLength; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, chunkLength);
            
            // Use subarray for faster copying
            const sourceSlice = sourceData.subarray(startSample + batchStart, startSample + batchEnd);
            chunkData.set(sourceSlice, batchStart);
            
            // Log progress more frequently for large chunks
            if (chunkLength > 5000000 && (batchStart % batchSize === 0)) {
              console.log(`📈 [MP3-CHUNKING] Chunk ${chunkIndex} channel ${channel}: ${((batchEnd / chunkLength) * 100).toFixed(1)}% complete (${batchEnd}/${chunkLength} samples)`);
            }
            
            // Yield to event loop every batch to prevent UI freeze
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          console.log(`✅ [MP3-CHUNKING] Channel ${channel} completed for chunk ${chunkIndex}`);
        }
        
        console.log(`🎵 [MP3-CHUNKING] Audio data copied for chunk ${chunkIndex}, converting to WAV...`);
        
        // Convert buffer to WAV blob
        const chunkBlob = await audioBufferToWav(chunkBuffer);
        
        console.log(`💾 [MP3-CHUNKING] WAV conversion completed for chunk ${chunkIndex}, blob size: ${(chunkBlob.size / 1024).toFixed(1)}KB`);
        
        chunks.push({
          chunk_number: chunkIndex,
          audio_blob: chunkBlob,
          start_time: startTime,
          end_time: endTime,
          duration: chunkDuration
        });
        
        console.log(`✅ [MP3-CHUNKING] Chunk ${chunkIndex} created:`, {
          blobSize: `${(chunkBlob.size / 1024).toFixed(1)}KB`,
          duration: `${chunkDuration.toFixed(1)}s`
        });
      }
      
      console.log('🎉 [MP3-CHUNKING] Audio chunking completed:', {
        originalFile: audioFile.name,
        originalSize: `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`,
        totalChunks: chunks.length,
        totalDuration: `${duration.toFixed(1)}s`,
        chunksSize: `${(chunks.reduce((sum, chunk) => sum + chunk.audio_blob.size, 0) / 1024 / 1024).toFixed(1)}MB`
      });
      
      return chunks;
      
    } catch (error) {
      console.error('❌ [MP3-CHUNKING] Audio chunking failed:', error);
      throw new Error(`Falha ao dividir arquivo de áudio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);

  /**
   * Convert AudioBuffer to WAV Blob
   * This creates a WAV file from the audio buffer for API transmission
   */
  const audioBufferToWav = useCallback(async (buffer: AudioBuffer): Promise<Blob> => {
    console.log(`🎼 [WAV-CONVERT] Starting WAV conversion:`, {
      numberOfChannels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
      length: buffer.length,
      duration: `${buffer.duration.toFixed(1)}s`
    });

    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    console.log(`📊 [WAV-CONVERT] WAV parameters:`, {
      bitDepth,
      blockAlign,
      byteRate,
      dataSize: `${(dataSize / 1024).toFixed(1)}KB`,
      bufferSize: `${(bufferSize / 1024).toFixed(1)}KB`
    });
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    console.log(`💾 [WAV-CONVERT] ArrayBuffer created, writing header...`);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    console.log(`🔢 [WAV-CONVERT] Header written, converting audio data to 16-bit PCM...`);
    
    // Convert audio data to 16-bit PCM with batching for large buffers
    let offset = 44;
    const totalSamples = buffer.length;
    const batchSize = totalSamples > 5000000 ? 25000 : 50000; // Smaller batches for large buffers
    
    console.log(`🔄 [WAV-CONVERT] Processing ${totalSamples} samples in batches of ${batchSize}`);
    
    // Pre-fetch channel data to avoid repeated calls
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      channelData.push(buffer.getChannelData(channel));
    }
    
    for (let batchStart = 0; batchStart < totalSamples; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalSamples);
      
      // Process batch
      for (let i = batchStart; i < batchEnd; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }
      
      // Log progress and yield to event loop after each batch
      const progress = ((batchEnd / totalSamples) * 100).toFixed(1);
      console.log(`📈 [WAV-CONVERT] PCM conversion progress: ${progress}% (${batchEnd}/${totalSamples} samples)`);
      
      // Yield to event loop to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    console.log(`✅ [WAV-CONVERT] PCM conversion completed, creating blob...`);
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    console.log(`🎯 [WAV-CONVERT] WAV blob created: ${(blob.size / 1024).toFixed(1)}KB`);
    
    return blob;
  }, []);

  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm'];
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Check both MIME type and file extension
    const isValidMimeType = validTypes.includes(fileType);
    const isValidExtension = fileName.endsWith('.mp3') || fileName.endsWith('.wav') || 
                           fileName.endsWith('.m4a') || fileName.endsWith('.ogg') || 
                           fileName.endsWith('.webm');

    if (!isValidMimeType && !isValidExtension) {
      setError('Formato de arquivo não suportado. Use MP3, WAV, M4A, OGG ou WEBM.');
      return;
    }

    // Validate file size (max 25MB)
    const maxSizeBytes = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSizeBytes) {
      setError('Arquivo muito grande. O tamanho máximo é 25MB.');
      return;
    }

    // Validate file has content
    if (file.size === 0) {
      setError('Arquivo está vazio. Selecione um arquivo de áudio válido.');
      return;
    }

    console.log('📁 [MP3-IMPORT] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    setSelectedFile(file);
    setError(null);
    
    // Clear previous results
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setProcessingTime({});
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setTranscriptionResult(null);
    setProntuarioText('');
    setIsEditingProntuario(false);
    setError(null);
    setProcessingTime({});
    
    // Clear chunked processing state
    setCurrentSession(null);
    setAudioChunks([]);
    setChunkedResults([]);
    setProcessingProgress({ current: 0, total: 0 });
    setIsChunking(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (onClearProntuario) {
      onClearProntuario();
    }
  }, [onClearProntuario]);

  const handleProcessFile = useCallback(async () => {
    if (!selectedFile) {
      setError('Nenhum arquivo selecionado.');
      return;
    }

    console.log('🚀 [MP3-IMPORT] Starting chunked file processing:', selectedFile.name);
    
    try {
      setError(null);
      setIsChunking(true);
      setIsTranscribing(true);
      
      // Clear previous results
      setTranscriptionResult(null);
      setProntuarioText('');
      setIsEditingProntuario(false);
      setChunkedResults([]);
      setProcessingProgress({ current: 0, total: 0 });

      // Step 1: Create session for chunked processing
      const sessionId = `mp3_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📋 [MP3-IMPORT] Created session ID:', sessionId);
      setCurrentSession({ session_id: sessionId });

      // Step 2: Split audio file into chunks
      console.log('🔧 [MP3-IMPORT] Splitting audio into 4-minute chunks...');
      const chunks = await splitAudioIntoChunks(selectedFile);
      setAudioChunks(chunks);
      setProcessingProgress({ current: 0, total: chunks.length });
      setIsChunking(false);
      
      console.log(`📊 [MP3-IMPORT] Created ${chunks.length} chunks, starting transcription...`);

      // Step 3: Process each chunk using chunked transcription API
      await processChunkedTranscription(chunks, sessionId);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [MP3-IMPORT] Error processing file:', error);
      handleError(errorObj, 'Chunked file processing failed');
      setError(`Erro ao processar arquivo: ${errorObj.message}`);
      setIsChunking(false);
      setIsTranscribing(false);
    }
  }, [selectedFile, handleError, splitAudioIntoChunks]);

  /**
   * Process audio chunks using the same chunked transcription API as live recording
   */
  const processChunkedTranscription = useCallback(async (chunks: AudioChunk[], sessionId: string) => {
    console.log('🎬 [MP3-CHUNKED] Starting chunked transcription for', chunks.length, 'chunks');
    
    const results: ChunkedTranscriptionResult[] = [];
    const startTime = Date.now();
    
    try {
      // Process each chunk sequentially (same as live recording)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const isLastChunk = i === chunks.length - 1;
        
        console.log(`🎯 [MP3-CHUNKED] Processing chunk ${chunk.chunk_number}/${chunks.length}`, {
          startTime: chunk.start_time,
          endTime: chunk.end_time,
          duration: chunk.duration,
          size: `${(chunk.audio_blob.size / 1024).toFixed(1)}KB`,
          isLastChunk
        });
        
        setProcessingProgress({ current: i + 1, total: chunks.length });
        
        try {
          // Prepare form data exactly like chunked recording
          const formData = new FormData();
          formData.append('audio_file', chunk.audio_blob, `chunk_${chunk.chunk_number}.wav`);
          formData.append('session_id', sessionId);
          formData.append('chunk_number', chunk.chunk_number.toString());
          formData.append('is_final_chunk', isLastChunk.toString());
          formData.append('patient_id', selectedPatient?.id || 'test-patient-001');
          formData.append('doctor_id', 'temp_doctor_id');
          formData.append('language', 'pt');
          formData.append('model', 'whisper-1');
          formData.append('file_format', 'wav');

          console.log('📤 [MP3-CHUNKED] Sending chunk to /api/doctor/transcribe-audio-chunk');
          console.log('📋 [MP3-CHUNKED] Request details:', {
            url: '/api/doctor/transcribe-audio-chunk',
            method: 'POST',
            chunk_number: chunk.chunk_number,
            session_id: sessionId,
            is_final_chunk: isLastChunk,
            audio_size: `${(chunk.audio_blob.size / 1024).toFixed(1)}KB`,
            patient_id: selectedPatient?.id || 'test-patient-001'
          });

          const requestStartTime = Date.now();
          
          // Send to chunked transcription API (same as live recording)
          const response = await fetch('/api/doctor/transcribe-audio-chunk', {
            method: 'POST',
            body: formData
          });

          const requestTime = Date.now() - requestStartTime;
          console.log('📥 [MP3-CHUNKED] Response received from /api/doctor/transcribe-audio-chunk:', {
            status: response.status,
            statusText: response.statusText,
            requestTime: `${requestTime}ms`,
            ok: response.ok
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chunk ${chunk.chunk_number} transcription failed: ${response.status} ${errorText}`);
          }

          const result = await response.json();
          
          // Check for quality issues (same detection as improved chunked recording)
          let qualityWarning: string | undefined;
          if (result.transcript && isRepetitiveContent(result.transcript)) {
            qualityWarning = 'Repetitive content detected - check audio quality';
            console.warn('⚠️ [MP3-CHUNKED] Quality warning for chunk', chunk.chunk_number);
          }

          const chunkResult: ChunkedTranscriptionResult = {
            chunk_number: chunk.chunk_number,
            transcript: result.transcript || '',
            confidence: result.confidence || 0,
            session_id: sessionId,
            is_final_chunk: isLastChunk,
            processing_time: result.processing_time || 0,
            quality_warning: qualityWarning
          };

          results.push(chunkResult);
          setChunkedResults(prev => [...prev, chunkResult]);

          console.log(`✅ [MP3-CHUNKED] Chunk ${chunk.chunk_number} completed:`, {
            transcript_length: result.transcript?.length || 0,
            confidence: result.confidence,
            processing_time: result.processing_time
          });

        } catch (chunkError) {
          console.error(`❌ [MP3-CHUNKED] Chunk ${chunk.chunk_number} failed:`, chunkError);
          
          // Add failed chunk to results (same as live recording error handling)
          const failedChunkResult: ChunkedTranscriptionResult = {
            chunk_number: chunk.chunk_number,
            transcript: `[Erro: Chunk ${chunk.chunk_number} - ${chunkError instanceof Error ? chunkError.message : String(chunkError)}]`,
            confidence: 0,
            session_id: sessionId,
            is_final_chunk: isLastChunk,
            processing_time: 0,
            quality_warning: 'Chunk processing failed'
          };
          
          results.push(failedChunkResult);
          setChunkedResults(prev => [...prev, failedChunkResult]);
        }
      }

      const totalTime = Date.now() - startTime;
      setProcessingTime(prev => ({ ...prev, transcription: totalTime }));
      
      console.log('🎉 [MP3-CHUNKED] All chunks processed:', {
        totalChunks: chunks.length,
        successfulChunks: results.filter(r => !r.quality_warning?.includes('failed')).length,
        failedChunks: results.filter(r => r.quality_warning?.includes('failed')).length,
        totalTime: `${(totalTime / 1000).toFixed(1)}s`
      });

      // Step 4: Generate final prontuário using chunked results
      setIsTranscribing(false);
      setIsGeneratingProntuario(true);
      await handleGenerateFinalProntuario(results, sessionId);

    } catch (error) {
      console.error('❌ [MP3-CHUNKED] Chunked transcription failed:', error);
      throw error;
    }
  }, [selectedPatient]);

  /**
   * Detect repetitive content that indicates poor audio quality
   * (Same function as improved ChunkedRecordingManager)
   */
  const isRepetitiveContent = useCallback((transcript: string): boolean => {
    if (!transcript || transcript.length < 50) return false;
    
    const cleanText = transcript.toLowerCase().replace(/[.,!?;:\s]+/g, ' ').trim();
    const words = cleanText.split(' ').filter(word => word.length > 0);
    
    if (words.length < 10) return false;
    
    // Check for excessive repetition of the same phrase
    const phrases: { [key: string]: number } = {};
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words.slice(i, i + 3).join(' ');
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
    
    // Check if any phrase repeats more than 30% of the total phrases
    const totalPhrases = words.length - 2;
    for (const [phrase, count] of Object.entries(phrases)) {
      if (count / totalPhrases > 0.3) {
        console.warn('🔍 [MP3-QUALITY] Repetitive phrase detected:', phrase, 'appears', count, 'times');
        return true;
      }
    }
    
    // Check for single word repetition
    const wordCounts: { [key: string]: number } = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    for (const [word, count] of Object.entries(wordCounts)) {
      if (count > words.length * 0.4 && word.length > 2) {
        console.warn('🔍 [MP3-QUALITY] Repetitive word detected:', word, 'appears', count, 'times');
        return true;
      }
    }
    
    return false;
  }, []);

  /**
   * Generate final prontuário from chunked transcription results
   * Uses the same API as live recording: /api/doctor/generate-final-prontuario
   */
  const handleGenerateFinalProntuario = useCallback(async (chunkResults: ChunkedTranscriptionResult[], sessionId: string) => {
    console.log('📝 [MP3-FINAL-PRONTUARIO] Starting final prontuário generation');
    console.log('📝 [MP3-FINAL-PRONTUARIO] Input:', {
      totalChunks: chunkResults.length,
      sessionId,
      patient_name: selectedPatient?.name || 'Paciente de Teste',
      template_selected: !!selectedTemplate,
      template_name: selectedTemplate?.name || 'None'
    });

    const startTime = Date.now();

    try {
      // Prepare request body exactly like RecordingAndTranscription.tsx
      const requestBody = {
        transcription_chunks: chunkResults.map(chunk => ({
          chunk_number: chunk.chunk_number,
          transcript: chunk.transcript,
          timestamp: new Date().toISOString(), // Current time for MP3 imports
          confidence: chunk.confidence
        })),
        session_id: sessionId,
        patient_context: {
          name: selectedPatient?.name,
          age: null, // MP3 imports don't have patient age
          gender: null
        },
        template: selectedTemplate ? {
          name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          ai_prompt_template: selectedTemplate.ai_prompt_template
        } : undefined
      };

      console.log('📤 [MP3-FINAL-PRONTUARIO] Sending request to /api/doctor/generate-final-prontuario');
      console.log('📊 [MP3-FINAL-PRONTUARIO] Request summary:', {
        chunks_count: requestBody.transcription_chunks.length,
        total_transcript_length: requestBody.transcription_chunks.reduce((sum, c) => sum + (c.transcript?.length || 0), 0),
        has_template: !!requestBody.template,
        template_name: requestBody.template?.name || 'default'
      });

      const response = await fetch('/api/doctor/generate-final-prontuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const prontuarioTime = Date.now() - startTime;
      
      console.log('✅ [MP3-FINAL-PRONTUARIO] Final prontuário generated successfully:', {
        prontuario_length: result.final_prontuario?.length || 0,
        processing_time: `${(prontuarioTime / 1000).toFixed(1)}s`,
        model: result.model
      });

      setProntuarioText(result.final_prontuario);
      setIsGeneratingProntuario(false);
      setIsEditingProntuario(true);
      setProcessingTime(prev => ({ ...prev, prontuario: prontuarioTime }));
      setShowProcessingCompleteAlert(true);

      console.log('📊 [MP3-FINAL-PRONTUARIO] State updated and callback invoked');
      onProntuarioGenerated(result.final_prontuario);

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [MP3-FINAL-PRONTUARIO] Final prontuário generation failed:', {
        name: errorObj.name,
        message: errorObj.message,
        sessionId,
        chunksCount: chunkResults.length
      });

      setError(`Erro ao gerar prontuário final: ${errorObj.message}`);
      setIsGeneratingProntuario(false);
      handleError(errorObj, 'MP3 final prontuário generation failed');
    }
  }, [selectedPatient, selectedTemplate, onProntuarioGenerated, handleError]);

  const handleTranscribeAudio = useCallback(async (audioFile: File) => {
    console.log('🎤 [MP3-TRANSCRIPTION] Starting audio transcription process');
    console.log('🎤 [MP3-TRANSCRIPTION] Audio file info:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    const startTime = Date.now();
    
    try {
      const sessionId = `mp3_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('📋 [MP3-TRANSCRIPTION] Generated session ID:', sessionId);
      
      // Determine proper file extension based on file name and MIME type
      let fileExtension = 'mp3';
      let fileName = audioFile.name;
      
      if (audioFile.type) {
        if (audioFile.type.includes('wav')) {
          fileExtension = 'wav';
        } else if (audioFile.type.includes('m4a')) {
          fileExtension = 'm4a';
        } else if (audioFile.type.includes('ogg')) {
          fileExtension = 'ogg';
        } else if (audioFile.type.includes('webm')) {
          fileExtension = 'webm';
        }
      }
      
      // If no extension detected from MIME type, try to get from filename
      if (fileExtension === 'mp3' && fileName.includes('.')) {
        const nameParts = fileName.split('.');
        const nameExtension = nameParts[nameParts.length - 1].toLowerCase();
        if (['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(nameExtension)) {
          fileExtension = nameExtension;
        }
      }
      
      console.log('📁 [MP3-TRANSCRIPTION] File details:', {
        originalName: fileName,
        mimeType: audioFile.type,
        detectedExtension: fileExtension,
        fileSize: audioFile.size
      });

      const formData = new FormData();
      formData.append('audio_file', audioFile, fileName);
      formData.append('session_id', sessionId);
      formData.append('patient_id', selectedPatient?.id || 'test-patient-001');
      formData.append('doctor_id', 'temp_doctor_id');
      formData.append('language', 'pt');
      formData.append('model', 'whisper-1');
      formData.append('file_format', fileExtension);

      console.log('📤 [MP3-TRANSCRIPTION] FormData prepared with fields:', {
        audio_file_size: audioFile.size,
        session_id: sessionId,
        patient_id: selectedPatient?.id || 'test-patient-001',
        doctor_id: 'temp_doctor_id',
        language: 'pt',
        model: 'whisper-1',
        file_format: fileExtension
      });

      console.log('📡 [MP3-TRANSCRIPTION] Sending request to /api/doctor/transcribe-audio');

      // Create AbortController for timeout handling (15 minutes for large audio files)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏰ [MP3-TRANSCRIPTION] Request timeout - taking longer than 15 minutes');
        abortController.abort();
      }, 15 * 60 * 1000); // 15 minutes timeout for large audio files

      const response = await fetch('/api/doctor/transcribe-audio', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      const transcriptionTime = Date.now() - startTime;
      console.log('📥 [MP3-TRANSCRIPTION] API response received:', {
        status: response.status,
        statusText: response.statusText,
        requestTime: `${transcriptionTime}ms`,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MP3-TRANSCRIPTION] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        
        // Handle specific error patterns
        if (errorText.includes('string did not match the expected pattern')) {
          throw new Error('Formato de áudio não suportado. Tente converter para MP3 ou WAV.');
        } else if (response.status === 413) {
          throw new Error('Arquivo de áudio muito grande. Tente um arquivo menor que 25MB.');
        } else if (response.status === 422) {
          throw new Error('Formato de áudio inválido. Verifique se o arquivo não está corrompido.');
        } else {
          throw new Error(`Falha na transcrição: ${response.status} ${errorText}`);
        }
      }

      const result: TranscriptionResult = await response.json();
      console.log('✅ [MP3-TRANSCRIPTION] Transcription result:', {
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
      setProcessingTime(prev => ({ ...prev, transcription: transcriptionTime }));
      
      console.log('🔄 [MP3-TRANSCRIPTION] Moving to prontuario generation phase');
      await handleGenerateProntuario(result.transcript);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [MP3-TRANSCRIPTION] Unexpected error:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      });
      
      // Handle timeout errors specifically
      if (errorObj.name === 'AbortError') {
        setError('Timeout na transcrição - o arquivo de áudio é muito longo. Tente um arquivo menor.');
        console.error('⏰ [MP3-TRANSCRIPTION] Request timed out after 15 minutes');
      } else {
        setError(errorObj.message);
      }
      
      handleError(errorObj, 'MP3 transcription failed');
      setIsTranscribing(false);
    }
  }, [selectedPatient, handleError]);

  const handleGenerateProntuario = useCallback(async (transcript: string) => {
    console.log('📝 [MP3-PRONTUARIO] Starting prontuario generation process');
    console.log('📝 [MP3-PRONTUARIO] Input validation:', {
      transcript_length: transcript?.length || 0,
      transcript_preview: transcript?.substring(0, 150) + '...',
      patient_name: selectedPatient?.name || 'Paciente de Teste',
      template_selected: !!selectedTemplate,
      template_name: selectedTemplate?.name || 'None'
    });

    if (!transcript.trim()) {
      console.error('❌ [MP3-PRONTUARIO] No transcript provided');
      setError('Nenhuma transcrição disponível.');
      return;
    }

    setIsGeneratingProntuario(true);
    setError(null);

    const startTime = Date.now();

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
        console.log('📋 [MP3-PRONTUARIO] Using selected template:', {
          template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          specialty: selectedTemplate.specialty,
          has_prompt_template: !!selectedTemplate.ai_prompt_template
        });
      } else {
        console.log('📋 [MP3-PRONTUARIO] No template selected - using default clinical format');
      }

      console.log('📤 [MP3-PRONTUARIO] Request body prepared:', {
        transcript_length: requestBody.transcript.length,
        patient_name: requestBody.patient_name,
        has_template: !!requestBody.template,
        template_id: requestBody.template_id || 'default'
      });

      console.log('📡 [MP3-PRONTUARIO] Sending request to /api/doctor/generate-prontuario');

      // Create AbortController for timeout handling (5 minutes for prontuario generation)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏰ [MP3-PRONTUARIO] Request timeout - taking longer than 5 minutes');
        abortController.abort();
      }, 5 * 60 * 1000); // 5 minutes timeout

      const response = await fetch('/api/doctor/generate-prontuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      const prontuarioTime = Date.now() - startTime;
      console.log('📥 [MP3-PRONTUARIO] API response received:', {
        status: response.status,
        statusText: response.statusText,
        requestTime: `${prontuarioTime}ms`,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MP3-PRONTUARIO] API error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Falha na geração do prontuário: ${response.status} ${errorText}`);
      }

      const result: ProntuarioResult = await response.json();
      console.log('✅ [MP3-PRONTUARIO] Prontuario generation result:', {
        success: result.success,
        prontuario_length: result.prontuario?.length || 0,
        model: result.model,
        processing_time: result.processing_time,
        prontuario_preview: result.prontuario?.substring(0, 200) + '...'
      });
      
      setProntuarioText(result.prontuario);
      setIsGeneratingProntuario(false);
      setIsEditingProntuario(true);
      setProcessingTime(prev => ({ ...prev, prontuario: prontuarioTime }));
      setShowProcessingCompleteAlert(true);
      
      console.log('📊 [MP3-PRONTUARIO] State updated and callback invoked');
      onProntuarioGenerated(result.prontuario);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error('❌ [MP3-PRONTUARIO] Unexpected error:', {
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack
      });
      
      // Handle timeout errors specifically
      if (errorObj.name === 'AbortError') {
        setError('Timeout na geração do prontuário - a transcrição é muito longa. Tente um arquivo menor.');
        console.error('⏰ [MP3-PRONTUARIO] Request timed out after 5 minutes');
      } else {
        setError(errorObj.message);
      }
      
      handleError(errorObj, 'MP3 prontuario generation failed');
      setIsGeneratingProntuario(false);
    }
  }, [selectedPatient, selectedTemplate, onProntuarioGenerated, handleError]);

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

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleHideAlert = useCallback(() => {
    setShowProcessingCompleteAlert(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Processing Complete Alert */}
      <AnimatedAlert
        isVisible={showProcessingCompleteAlert}
        message={`Prontuário gerado com sucesso para ${selectedPatient?.name || 'Paciente'}!`}
        type="success"
        duration={4000}
        onHide={handleHideAlert}
      />

      {error && (
        <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* File Selection Section */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Importar Arquivo de Áudio
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecione um arquivo MP3, WAV, M4A, OGG ou WEBM da consulta médica
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm"
                onChange={handleFileSelection}
                className="hidden"
                disabled={isTranscribing || isGeneratingProntuario}
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isTranscribing || isGeneratingProntuario}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Selecionar Arquivo
              </Button>
              
              <p className="text-xs text-gray-500 mt-2">
                Tamanho máximo: 25MB | Formatos: MP3, WAV, M4A, OGG, WEBM
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Tipo desconhecido'}
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!prontuarioText && (
                  <Button
                    onClick={handleProcessFile}
                    disabled={isTranscribing || isGeneratingProntuario}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                  >
                    {isTranscribing ? 'Transcrevendo...' : isGeneratingProntuario ? 'Gerando Prontuário...' : 'Processar'}
                  </Button>
                )}
                
                <Button
                  onClick={handleClearFile}
                  disabled={isTranscribing || isGeneratingProntuario}
                  variant="outline"
                  className="px-4 py-2"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Status */}
      {(isChunking || isTranscribing || isGeneratingProntuario) && (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-700">
                {isChunking && 'Dividindo áudio em segmentos de 4 minutos...'}
                {isTranscribing && !isChunking && 'Transcrevendo segmentos de áudio... Usando o mesmo sistema da gravação ao vivo.'}
                {isGeneratingProntuario && 'Gerando prontuário final... Combinando todos os segmentos transcritos.'}
              </span>
            </div>
          </div>
          
          {/* Progress bar with actual progress for chunked processing */}
          <div className="w-64 bg-gray-200 rounded-full h-2">
            {processingProgress.total > 0 && isTranscribing && !isChunking ? (
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{width: `${(processingProgress.current / processingProgress.total) * 100}%`}}
              ></div>
            ) : (
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            {isChunking && selectedFile && (
              <span>Analisando {selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
            )}
            {isTranscribing && !isChunking && processingProgress.total > 0 && (
              <span>
                Processando segmento {processingProgress.current} de {processingProgress.total}
                {audioChunks.length > 0 && ` • ${audioChunks.length} chunks criados`}
              </span>
            )}
            {isGeneratingProntuario && (
              <span>
                Combinando {chunkedResults.length} segmentos transcritos em prontuário estruturado
              </span>
            )}
          </div>

          {/* Chunked processing details */}
          {audioChunks.length > 0 && (
            <div className="max-w-md text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Processamento em Segmentos</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>Total de segmentos: {audioChunks.length} (4 min cada)</div>
                  <div>Duração total: ~{(audioChunks.length * 4).toFixed(0)} minutos</div>
                  {processingProgress.total > 0 && (
                    <div>Progresso: {processingProgress.current}/{processingProgress.total}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Processing Time Stats */}
      {(processingTime.transcription || processingTime.prontuario) && (
        <div className="max-w-md mx-auto bg-gray-50 border rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Tempo de Processamento</h4>
          <div className="space-y-1 text-xs text-gray-600">
            {processingTime.transcription && (
              <div className="flex justify-between">
                <span>Transcrição:</span>
                <span className="font-mono">{formatTime(processingTime.transcription)}</span>
              </div>
            )}
            {processingTime.prontuario && (
              <div className="flex justify-between">
                <span>Prontuário:</span>
                <span className="font-mono">{formatTime(processingTime.prontuario)}</span>
              </div>
            )}
            {processingTime.transcription && processingTime.prontuario && (
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="font-medium">Total:</span>
                <span className="font-mono font-medium">
                  {formatTime(processingTime.transcription + processingTime.prontuario)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prontuario Display */}
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
            </div>
          )}
        </div>
      )}

      {/* Chunked Transcription Display - Show combined transcription for chunked recordings */}
      {chunkedResults.length > 0 && prontuarioText && (
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Transcrição dos Segmentos de Áudio
            </h3>
            
            {/* Combined transcription from all chunks */}
            <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {chunkedResults
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
                <span className="font-medium text-gray-900">{chunkedResults.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Palavras</span>
                <span className="font-medium text-gray-900">
                  {chunkedResults
                    .reduce((total, chunk) => total + (chunk.transcript?.split(' ').length || 0), 0)
                  }
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Confiança Média</span>
                <span className="font-medium text-gray-900">
                  {chunkedResults.length > 0 
                    ? ((chunkedResults.reduce((sum, chunk) => sum + (chunk.confidence || 0), 0) / chunkedResults.length) * 100).toFixed(1)
                    : 0
                  }%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Método</span>
                <span className="font-medium text-green-600">Segmentos de 4min</span>
              </div>
            </div>

            {/* Quality warnings summary */}
            {chunkedResults.some(chunk => chunk.quality_warning) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Avisos de Qualidade</h4>
                <div className="space-y-1 text-xs text-amber-700">
                  {chunkedResults
                    .filter(chunk => chunk.quality_warning)
                    .map(chunk => (
                      <div key={chunk.chunk_number}>
                        Segmento {chunk.chunk_number + 1}: {chunk.quality_warning}
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Individual chunk details (collapsible) */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                Ver detalhes dos segmentos individuais ({chunkedResults.length} segmentos)
              </summary>
              <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                {chunkedResults
                  .sort((a, b) => a.chunk_number - b.chunk_number)
                  .map(chunk => (
                    <div 
                      key={chunk.chunk_number} 
                      className="bg-white border rounded p-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Segmento {chunk.chunk_number + 1}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Confiança: {(chunk.confidence * 100).toFixed(1)}%</span>
                          {chunk.quality_warning && (
                            <span className="text-amber-600">⚠️ Aviso</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 font-mono">
                        {chunk.transcript || '[Transcrição vazia]'}
                      </div>
                    </div>
                  ))
                }
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Transcription Display - Fallback for single file processing (legacy) */}
      {transcriptionResult && prontuarioText && chunkedResults.length === 0 && (
        <TranscriptionDisplay 
          transcriptionResult={transcriptionResult}
          className="max-w-4xl mx-auto mt-8"
        />
      )}

      {/* Prontuario Modal */}
      <ProntuarioModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        prontuarioText={prontuarioText}
        patientName={selectedPatient?.name || 'Paciente de Teste'}
        templateName={selectedTemplate?.name}
      />
    </div>
  );
}