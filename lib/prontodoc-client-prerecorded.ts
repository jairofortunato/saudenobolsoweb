/**
 * ProntoDoc Pre-recorded Audio Client
 * 
 * Simplified client for recording audio and uploading to backend for transcription
 * Uses Deepgram REST API instead of complex WebSocket streaming
 */

export interface PrerecordedSessionDetails {
  sessionId: string;
  patientId: string;
  doctorId: string;
  language?: string;
  model?: string;
  provider?: 'deepgram' | 'assemblyai' | 'assemblyai-http' | 'openai-whisper'; // Add provider selection
}

export interface PrerecordedTranscriptionResult {
  success: boolean;
  provider?: string; // 'deepgram', 'assemblyai', 'assemblyai-http', 'openai-whisper'
  session_id: string;
  recording_id?: string;
  transcript: string;
  confidence: number;
  word_count: number;
  language: string;
  model: string;
  duration: number;
  processed_at: string;
  deepgram_metadata?: any;
  assemblyai_metadata?: any;
  openai_whisper_metadata?: any;
  utterances: any[];
}

export type PrerecordedEventType = 
  | 'recording_started'
  | 'recording_stopped' 
  | 'transcription_completed'
  | 'error';

export interface PrerecordedEvent {
  type: PrerecordedEventType;
  data?: any;
  message?: string;
}

export class ProntoDocPrerecordedClient {
  private apiBaseUrl: string;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private sessionDetails: PrerecordedSessionDetails | null = null;
  
  // Event callbacks
  private eventListeners: Map<PrerecordedEventType, ((event: PrerecordedEvent) => void)[]> = new Map();

  constructor(apiBaseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production-bebd.up.railway.app') {
    console.log('🏗️ ProntoDoc Prerecorded: Initializing client with API base URL:', apiBaseUrl);
    this.apiBaseUrl = apiBaseUrl;
    this.initializeEventListeners();
    console.log('✅ ProntoDoc Prerecorded: Client initialized successfully');
  }

  private initializeEventListeners() {
    this.eventListeners.set('recording_started', []);
    this.eventListeners.set('recording_stopped', []);
    this.eventListeners.set('transcription_completed', []);
    this.eventListeners.set('error', []);
  }

  /**
   * Add event listener
   */
  on(eventType: PrerecordedEventType, callback: (event: PrerecordedEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove event listener
   */
  off(eventType: PrerecordedEventType, callback: (event: PrerecordedEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: PrerecordedEventType, data: any = {}) {
    const listeners = this.eventListeners.get(eventType) || [];
    const event: PrerecordedEvent = {
      type: eventType,
      ...data
    };
    
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  /**
   * Start recording audio
   */
  async startRecording(sessionDetails: PrerecordedSessionDetails): Promise<void> {
    console.log('🎯 ProntoDoc Prerecorded: Starting recording with details:', sessionDetails);
    
    if (this.isRecording) {
      console.error('❌ ProntoDoc Prerecorded: Recording already in progress');
      throw new Error('Recording already in progress');
    }

    this.sessionDetails = sessionDetails;
    this.recordedChunks = [];

    try {
      console.log('🎤 ProntoDoc Prerecorded: Setting up audio stream...');
      // Request microphone permission and setup audio stream
      await this.setupAudioStream();
      console.log('✅ ProntoDoc Prerecorded: Audio stream setup complete');
      
      console.log('🎙️ ProntoDoc Prerecorded: Starting MediaRecorder...');
      // Start recording
      this.mediaRecorder!.start();
      this.isRecording = true;
      
      console.log('🎉 ProntoDoc Prerecorded: Recording started successfully!');
      this.emit('recording_started', { sessionDetails });
      
    } catch (error) {
      console.error('❌ ProntoDoc Prerecorded: Error during startup:', error);
      await this.cleanup();
      this.emit('error', { message: 'Failed to start recording', data: error });
      throw error;
    }
  }

  /**
   * Stop recording and upload for transcription
   */
  async stopRecording(): Promise<PrerecordedTranscriptionResult> {
    console.log('🛑 ProntoDoc Prerecorded: Stopping recording...');
    
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      // Set up one-time event listener for when recording stops
      const onDataAvailable = (event: BlobEvent) => {
        console.log('📦 ProntoDoc Prerecorded: Final data chunk received, size:', event.data.size);
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      const onStop = async () => {
        console.log('🔴 ProntoDoc Prerecorded: MediaRecorder stopped');
        this.isRecording = false;
        
        try {
          // Create final audio blob
          const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm;codecs=opus' });
          console.log('🎵 ProntoDoc Prerecorded: Created audio blob, size:', audioBlob.size);
          
          this.emit('recording_stopped', { audioSize: audioBlob.size });
          
          // Upload for transcription
          console.log('☁️ ProntoDoc Prerecorded: Uploading for transcription...');
          const result = await this.uploadForTranscription(audioBlob);
          
          console.log('✅ ProntoDoc Prerecorded: Transcription completed!');
          this.emit('transcription_completed', { result });
          
          // Cleanup
          await this.cleanup();
          
          resolve(result);
          
        } catch (error) {
          console.error('❌ ProntoDoc Prerecorded: Error during transcription:', error);
          await this.cleanup();
          this.emit('error', { message: 'Transcription failed', data: error });
          reject(error);
        }
      };

      // Set up event listeners
      this.mediaRecorder!.addEventListener('dataavailable', onDataAvailable);
      this.mediaRecorder!.addEventListener('stop', onStop);

      // Stop the recorder
      this.mediaRecorder!.stop();
    });
  }

  /**
   * Setup audio stream from microphone
   */
  private async setupAudioStream(): Promise<void> {
    console.log('🎤 ProntoDoc Prerecorded Audio: Starting audio stream setup...');
    
    try {
      console.log('🔐 ProntoDoc Prerecorded Audio: Requesting microphone permission...');
      
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      console.log('📋 ProntoDoc Prerecorded Audio: Using constraints:', constraints);

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ ProntoDoc Prerecorded Audio: Microphone permission granted');
      console.log('📊 ProntoDoc Prerecorded Audio: Audio stream tracks:', this.audioStream.getTracks().length);
      
      // Setup MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };
      console.log('📋 ProntoDoc Prerecorded Audio: Using MediaRecorder options:', options);

      console.log('🎙️ ProntoDoc Prerecorded Audio: Creating MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      console.log('✅ ProntoDoc Prerecorded Audio: MediaRecorder created');

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('📦 ProntoDoc Prerecorded Audio: Data chunk available, size:', event.data.size);
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ ProntoDoc Prerecorded Audio: MediaRecorder error:', event);
        this.emit('error', { 
          message: 'Audio recording error',
          data: event 
        });
      };

      console.log('✅ ProntoDoc Prerecorded Audio: Audio stream setup complete');

    } catch (error) {
      console.error('❌ ProntoDoc Prerecorded Audio: Failed to setup audio stream:', error);
      throw new Error(`Failed to setup audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload audio for transcription
   */
  private async uploadForTranscription(audioBlob: Blob): Promise<PrerecordedTranscriptionResult> {
    if (!this.sessionDetails) {
      throw new Error('No session details available');
    }

    console.log('☁️ ProntoDoc Prerecorded: Preparing upload...');
    
    const provider = this.sessionDetails.provider || 'deepgram';
    
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'recording.webm');
    formData.append('session_id', this.sessionDetails.sessionId);
    formData.append('patient_id', this.sessionDetails.patientId);
    formData.append('doctor_id', this.sessionDetails.doctorId);
    
    // Set language and model based on provider
    if (provider === 'deepgram') {
      formData.append('language', this.sessionDetails.language || 'pt-BR');
      formData.append('model', this.sessionDetails.model || 'nova-3');
    } else if (provider === 'assemblyai' || provider === 'assemblyai-http') {
      formData.append('language', this.sessionDetails.language || 'pt');
      formData.append('model', this.sessionDetails.model || 'best');
    } else if (provider === 'openai-whisper') {
      formData.append('language', this.sessionDetails.language || 'pt');
      formData.append('model', this.sessionDetails.model || 'whisper-1');
    }

    // Choose endpoint based on provider
    let endpoint = '/api/prontodoc/prerecorded/transcribe'; // Default to Deepgram
    if (provider === 'assemblyai') {
      endpoint = '/api/prontodoc/prerecorded/transcribe-assemblyai';
    } else if (provider === 'assemblyai-http') {
      endpoint = '/api/prontodoc/prerecorded/transcribe-assemblyai-http';
    } else if (provider === 'openai-whisper') {
      endpoint = '/api/prontodoc/prerecorded/transcribe-openai-whisper';
    }

    const uploadUrl = `${this.apiBaseUrl}${endpoint}`;
    console.log(`📤 ProntoDoc Prerecorded: Uploading to ${provider} at:`, uploadUrl);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ProntoDoc Prerecorded: Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result: PrerecordedTranscriptionResult = await response.json();
      console.log('✅ ProntoDoc Prerecorded: Upload successful, transcript length:', result.transcript.length);
      
      return result;

    } catch (error) {
      console.error('❌ ProntoDoc Prerecorded: Upload error:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 ProntoDoc Prerecorded: Cleaning up resources...');
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Stop audio tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
      });
      this.audioStream = null;
    }

    // Reset state
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.sessionDetails = null;
    
    console.log('✅ ProntoDoc Prerecorded: Cleanup complete');
  }

  /**
   * Dispose of the client
   */
  dispose(): void {
    this.cleanup();
    this.eventListeners.clear();
  }

  /**
   * Get current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      hasAudioStream: !!this.audioStream,
      hasMediaRecorder: !!this.mediaRecorder,
      recordedChunks: this.recordedChunks.length,
      sessionId: this.sessionDetails?.sessionId
    };
  }
}