'use client';

/**
 * =====================================
 * RCR-30 RESILIENT RECORDING MANAGER
 * =====================================
 * 
 * Handles audio recording with 30-second chunking and final blob aggregation.
 * Implements the core recording logic as specified in the RCR-30 PRD.
 * 
 * FEATURES:
 * - MediaRecorder with 30-second chunks per PRD specs
 * - Final blob aggregation (competitor behavior)
 * - Safari/iOS fallback to WAV format
 * - Real-time recording status and progress
 * - Cross-browser compatibility handling
 * - Memory-efficient chunk buffering
 * 
 * PRD COMPLIANCE:
 * - mimeType: "audio/webm;codecs=opus"
 * - audioBitsPerSecond: 16000  
 * - numberOfAudioChannels: 1
 * - timeSlice: 30000 (30 seconds)
 */

import { useState, useEffect } from 'react';
import { 
  RecordingStatus, 
  RCR30Error, 
  BrowserCapabilities,
  DEFAULT_RCR30_CONFIG 
} from '../../types/rcr30';

// Recording state enum
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopping' | 'stopped' | 'error';

// Event callbacks
interface RecordingCallbacks {
  onStatusChange?: (status: RecordingStatus) => void;
  onError?: (error: RCR30Error) => void;
  onChunkReceived?: (chunkIndex: number, size: number) => void;
  onRecordingComplete?: (blob: Blob) => void;
}

export class ResilientRecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: RecordingState = 'idle';
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedDuration: number = 0;
  public callbacks: RecordingCallbacks = {};
  private updateStatusInterval: NodeJS.Timeout | null = null;

  // Browser capabilities
  private capabilities: BrowserCapabilities = {
    supportsMediaRecorder: false,
    supportsWebMOpus: false,
    supportsIndexedDB: false,
    recommendedMimeType: 'audio/wav',
    maxFileSize: 32 * 1024 * 1024 // 32MB default
  };

  constructor(callbacks?: RecordingCallbacks) {
    this.callbacks = callbacks || {};
    this.detectCapabilities();
  }

  /**
   * Detect browser capabilities and set optimal configuration
   */
  private detectCapabilities(): void {
    // Check MediaRecorder support
    this.capabilities.supportsMediaRecorder = typeof MediaRecorder !== 'undefined';
    
    if (!this.capabilities.supportsMediaRecorder) {
      return;
    }

    // Check WebM/Opus support (PRD preference)
    const webmOpusSupport = MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
    const webmSupport = MediaRecorder.isTypeSupported('audio/webm');
    const wavSupport = MediaRecorder.isTypeSupported('audio/wav');
    const mp4Support = MediaRecorder.isTypeSupported('audio/mp4');

    this.capabilities.supportsWebMOpus = webmOpusSupport;

    // Set recommended mime type (PRD compliant fallbacks)
    if (webmOpusSupport) {
      this.capabilities.recommendedMimeType = 'audio/webm;codecs=opus';
    } else if (webmSupport) {
      this.capabilities.recommendedMimeType = 'audio/webm';
    } else if (mp4Support) {
      this.capabilities.recommendedMimeType = 'audio/mp4';
    } else if (wavSupport) {
      this.capabilities.recommendedMimeType = 'audio/wav';
    }

    // Check IndexedDB support
    this.capabilities.supportsIndexedDB = typeof indexedDB !== 'undefined';

    // Adjust max file size for mobile Safari (more conservative)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isSafari || isMobile) {
      this.capabilities.maxFileSize = 25 * 1024 * 1024; // 25MB for mobile
    }

    console.log('Browser capabilities detected:', this.capabilities);
  }

  /**
   * Get browser capabilities
   */
  getCapabilities(): BrowserCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Start recording with PRD-compliant settings
   */
  async startRecording(): Promise<void> {
    try {
      if (this.state === 'recording') {
        throw new Error('Recording already in progress');
      }

      // Check browser support
      if (!this.capabilities.supportsMediaRecorder) {
        throw this.createError('recording', 'MEDIARECORDER_UNSUPPORTED', 
          'MediaRecorder not supported in this browser');
      }

      // Request microphone access
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: DEFAULT_RCR30_CONFIG.numberOfAudioChannels,
          sampleRate: DEFAULT_RCR30_CONFIG.audioBitsPerSecond * 8, // Convert to Hz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create MediaRecorder with PRD-compliant settings
      const options: MediaRecorderOptions = {
        mimeType: this.capabilities.recommendedMimeType,
        audioBitsPerSecond: DEFAULT_RCR30_CONFIG.audioBitsPerSecond
      };

      this.mediaRecorder = new MediaRecorder(this.audioStream, options);

      // Set up event handlers
      this.setupMediaRecorderEvents();

      // Clear previous chunks
      this.chunks = [];
      this.startTime = Date.now();
      this.totalPausedDuration = 0;

      // Start recording with 30-second time slicing (PRD requirement)
      this.mediaRecorder.start(DEFAULT_RCR30_CONFIG.timeSlice);
      this.state = 'recording';

      // Start status updates
      this.startStatusUpdates();

      console.log('Recording started with settings:', {
        mimeType: this.capabilities.recommendedMimeType,
        audioBitsPerSecond: DEFAULT_RCR30_CONFIG.audioBitsPerSecond,
        timeSlice: DEFAULT_RCR30_CONFIG.timeSlice,
        capabilities: this.capabilities,
        audioStreamTracks: this.audioStream.getAudioTracks().map(track => ({
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          label: track.label
        }))
      });

    } catch (error) {
      this.state = 'error';
      const rcr30Error = error instanceof Error && error.message.includes('MEDIARECORDER') 
        ? error as unknown as RCR30Error
        : this.createError('recording', 'START_RECORDING_FAILED', 
            `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      this.callbacks.onError?.(rcr30Error);
      throw rcr30Error;
    }
  }

  /**
   * Stop recording and aggregate final blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (this.state !== 'recording' && this.state !== 'paused') {
        const error = this.createError('recording', 'INVALID_STATE', 
          `Cannot stop recording from state: ${this.state}`);
        reject(error);
        return;
      }

      if (!this.mediaRecorder) {
        const error = this.createError('recording', 'NO_RECORDER', 
          'MediaRecorder not initialized');
        reject(error);
        return;
      }

      this.state = 'stopping';

      // Set up one-time event handler for stop event
      const handleStop = () => {
        this.mediaRecorder?.removeEventListener('stop', handleStop);
        
        // Aggregate all chunks into final blob (PRD requirement)
        const finalBlob = new Blob(this.chunks, { 
          type: this.capabilities.recommendedMimeType 
        });

        console.log('Recording stopped. Final blob created:', {
          size: finalBlob.size,
          chunks: this.chunks.length,
          mimeType: finalBlob.type,
          duration: this.getRecordingDuration()
        });

        this.state = 'stopped';
        this.stopStatusUpdates();
        this.cleanup();

        this.callbacks.onRecordingComplete?.(finalBlob);
        resolve(finalBlob);
      };

      this.mediaRecorder.addEventListener('stop', handleStop);
      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.state !== 'recording') {
      throw this.createError('recording', 'INVALID_STATE', 
        `Cannot pause recording from state: ${this.state}`);
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseTime = Date.now();
      this.state = 'paused';
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.state !== 'paused') {
      throw this.createError('recording', 'INVALID_STATE', 
        `Cannot resume recording from state: ${this.state}`);
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.totalPausedDuration += Date.now() - this.pauseTime;
      this.state = 'recording';
    }
  }

  /**
   * Get current recording status
   */
  getRecordingStatus(): RecordingStatus {
    const duration = this.getRecordingDuration();
    const totalSize = this.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const averageChunkSize = this.chunks.length > 0 ? totalSize / this.chunks.length : 0;

    return {
      isRecording: this.state === 'recording',
      isPaused: this.state === 'paused',
      duration,
      chunks: this.chunks.length,
      size: totalSize,
      currentChunkSize: this.chunks.length > 0 ? this.chunks[this.chunks.length - 1].size : 0,
      averageChunkSize: Math.round(averageChunkSize)
    };
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (this.state === 'idle' || this.startTime === 0) {
      return 0;
    }

    const currentTime = this.state === 'paused' ? this.pauseTime : Date.now();
    return Math.round((currentTime - this.startTime - this.totalPausedDuration) / 1000);
  }

  /**
   * Setup MediaRecorder event handlers
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) return;

    // Handle data available (30-second chunks)
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
        
        console.log(`Chunk ${this.chunks.length} received:`, {
          size: event.data.size,
          totalChunks: this.chunks.length,
          totalSize: this.chunks.reduce((sum, chunk) => sum + chunk.size, 0)
        });

        this.callbacks.onChunkReceived?.(this.chunks.length, event.data.size);
      }
    };

    // Handle errors
    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error event:', event);
      console.error('MediaRecorder error details:', {
        error: (event as any).error,
        message: (event as any).error?.message,
        name: (event as any).error?.name,
        mediaRecorderState: this.mediaRecorder?.state,
        audioStreamActive: this.audioStream?.active,
        audioStreamTracks: this.audioStream?.getAudioTracks().map(track => ({
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted
        }))
      });
      this.state = 'error';
      
      const errorMessage = (event as any).error?.message || 'MediaRecorder encountered an error';
      const error = this.createError('recording', 'MEDIARECORDER_ERROR', errorMessage);
      this.callbacks.onError?.(error);
    };

    // Handle state changes
    this.mediaRecorder.onstart = () => {
      console.log('MediaRecorder started');
    };

    this.mediaRecorder.onpause = () => {
      console.log('MediaRecorder paused');
    };

    this.mediaRecorder.onresume = () => {
      console.log('MediaRecorder resumed');
    };
  }

  /**
   * Start periodic status updates
   */
  private startStatusUpdates(): void {
    this.updateStatusInterval = setInterval(() => {
      if (this.state === 'recording' || this.state === 'paused') {
        this.callbacks.onStatusChange?.(this.getRecordingStatus());
      }
    }, 1000); // Update every second
  }

  /**
   * Stop status updates
   */
  private stopStatusUpdates(): void {
    if (this.updateStatusInterval) {
      clearInterval(this.updateStatusInterval);
      this.updateStatusInterval = null;
    }
  }

  /**
   * Create standardized RCR30Error
   */
  private createError(type: RCR30Error['type'], code: string, message: string): RCR30Error {
    return {
      type,
      code,
      message,
      retryable: type === 'network' || code.includes('FAILED'),
      details: {
        state: this.state,
        capabilities: this.capabilities
      }
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
      });
      this.audioStream = null;
    }

    // Clear MediaRecorder
    this.mediaRecorder = null;
    
    this.stopStatusUpdates();
  }

  /**
   * Reset manager to initial state
   */
  reset(): void {
    this.cleanup();
    this.chunks = [];
    this.state = 'idle';
    this.startTime = 0;
    this.pauseTime = 0;
    this.totalPausedDuration = 0;
  }

  /**
   * Get current state
   */
  getState(): RecordingState {
    return this.state;
  }
}

// React hook for easier component integration
export function useResilientRecording(callbacks?: RecordingCallbacks) {
  const [recordingManager] = useState(() => new ResilientRecordingManager(callbacks));
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    chunks: 0,
    size: 0,
    currentChunkSize: 0,
    averageChunkSize: 0
  });

  // Update callbacks when component provides new ones
  useEffect(() => {
    if (callbacks) {
      recordingManager.callbacks = {
        ...recordingManager.callbacks,
        ...callbacks,
        onStatusChange: (status) => {
          setRecordingStatus(status);
          callbacks.onStatusChange?.(status);
        }
      };
    }
  }, [callbacks, recordingManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recordingManager.reset();
    };
  }, [recordingManager]);

  return {
    recordingManager,
    recordingStatus,
    capabilities: recordingManager.getCapabilities(),
    startRecording: () => recordingManager.startRecording(),
    stopRecording: () => recordingManager.stopRecording(),
    pauseRecording: () => recordingManager.pauseRecording(),
    resumeRecording: () => recordingManager.resumeRecording(),
    reset: () => recordingManager.reset(),
    state: recordingManager.getState()
  };
}