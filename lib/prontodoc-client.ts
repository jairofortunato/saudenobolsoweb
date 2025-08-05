/**
 * ProntoDoc WebSocket Client
 * Real-time audio streaming and transcription client for medical consultations
 */

export interface SessionDetails {
  sessionId: string;
  patientId: string;
  doctorId: string;
  options?: TranscriptionOptions;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  interim_results?: boolean;
  smart_format?: boolean;
  diarize?: boolean;
  endpointing?: number;
}

export interface InterimResult {
  type: 'interim_result';
  sessionId: string;
  content: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speakerId?: string;
  speakerLabel?: string;
}

export interface FinalResult {
  type: 'final_result';
  sessionId: string;
  content: string;
  confidence: number;
  startTime: number;
  endTime: number;
  speakerId?: string;
  speakerLabel?: string;
  wordsCount: number;
}

export interface SessionStatus {
  sessionId: string;
  status: string;
  recordingId: string;
  startedAt: string;
  totalWords: number;
  averageConfidence: number;
  speakerCount: number;
  durationSeconds: number;
}

export interface SessionSummary {
  recordingId: string;
  durationSeconds: number;
  totalWords: number;
  averageConfidence: number;
  speakerCount: number;
  status: string;
  errorMessage?: string;
}

export type ProntoDocEventType = 
  | 'session_started'
  | 'interim_result' 
  | 'final_result'
  | 'status_update'
  | 'session_ended'
  | 'error'
  | 'keepalive_ack';

export interface ProntoDocEvent {
  type: ProntoDocEventType;
  sessionId?: string;
  recordingId?: string;
  message?: string;
  data?: any;
}

export class ProntoDocClient {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private sessionDetails: SessionDetails | null = null;
  private isRecording = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  
  // Event callbacks
  private eventListeners: Map<ProntoDocEventType, ((event: ProntoDocEvent) => void)[]> = new Map();
  
  constructor(private apiBaseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production.up.railway.app') {
    console.log('🏗️ ProntoDoc: Initializing client with API base URL:', apiBaseUrl);
    console.log('📋 ProntoDoc: Client configuration:');
    console.log('  - API Base URL:', this.apiBaseUrl);
    console.log('  - Max reconnect attempts:', this.maxReconnectAttempts);
    console.log('  - Initial recording state:', this.isRecording);
    
    this.initializeEventListeners();
    console.log('✅ ProntoDoc: Client initialized successfully');
  }

  private initializeEventListeners() {
    this.eventListeners.set('session_started', []);
    this.eventListeners.set('interim_result', []);
    this.eventListeners.set('final_result', []);
    this.eventListeners.set('status_update', []);
    this.eventListeners.set('session_ended', []);
    this.eventListeners.set('error', []);
    this.eventListeners.set('keepalive_ack', []);
  }

  /**
   * Add event listener for ProntoDoc events
   */
  on(eventType: ProntoDocEventType, callback: (event: ProntoDocEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove event listener
   */
  off(eventType: ProntoDocEventType, callback: (event: ProntoDocEvent) => void) {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: ProntoDocEventType, data: any = {}) {
    const listeners = this.eventListeners.get(eventType) || [];
    const event: ProntoDocEvent = {
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
   * Start recording session
   */
  async startRecording(sessionDetails: SessionDetails): Promise<void> {
    console.log('🎯 ProntoDoc: Starting recording with details:', sessionDetails);
    
    if (this.isRecording) {
      console.error('❌ ProntoDoc: Recording already in progress');
      throw new Error('Recording already in progress');
    }

    this.sessionDetails = sessionDetails;
    console.log('✅ ProntoDoc: Session details set');

    try {
      console.log('🎤 ProntoDoc: Setting up audio stream...');
      // Request microphone permission and setup audio stream
      await this.setupAudioStream();
      console.log('✅ ProntoDoc: Audio stream setup complete');
      
      console.log('🔌 ProntoDoc: Setting up WebSocket connection...');
      // Setup WebSocket connection
      await this.setupWebSocket();
      console.log('✅ ProntoDoc: WebSocket setup complete');
      
      console.log('🚀 ProntoDoc: Initializing session...');
      // Start the recording session
      await this.initializeSession();
      console.log('✅ ProntoDoc: Session initialization complete');
      
      this.isRecording = true;
      console.log('🎉 ProntoDoc: Recording started successfully!');
      
    } catch (error) {
      console.error('❌ ProntoDoc: Error during startup:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording session
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Send stop message to WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'stop_recording',
          sessionId: this.sessionDetails?.sessionId
        }));
      }

      // Wait a bit for final messages
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('Error stopping recording:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Get current session status
   */
  async getSessionStatus(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionDetails) {
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'get_status',
      sessionId: this.sessionDetails.sessionId
    }));
  }

  /**
   * Setup audio stream from microphone
   */
  private async setupAudioStream(): Promise<void> {
    try {
      console.log('🎤 ProntoDoc Audio: Starting audio stream setup...');
      
      const constraints: MediaStreamConstraints = {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      console.log('📋 ProntoDoc Audio: Using constraints:', constraints);

      console.log('🔐 ProntoDoc Audio: Requesting microphone permission...');
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ ProntoDoc Audio: Microphone permission granted');
      console.log('📊 ProntoDoc Audio: Audio stream tracks:', this.audioStream.getTracks().length);
      
      // Setup MediaRecorder
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };
      console.log('📋 ProntoDoc Audio: Using MediaRecorder options:', options);

      console.log('🎙️ ProntoDoc Audio: Creating MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      console.log('✅ ProntoDoc Audio: MediaRecorder created');

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('📦 ProntoDoc Audio: Data available, size:', event.data.size);
        if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('📤 ProntoDoc Audio: Sending audio data to WebSocket');
          // Send audio data to WebSocket
          this.ws.send(event.data);
        } else {
          console.warn('⚠️ ProntoDoc Audio: Skipping audio data - WebSocket not ready or no data');
          console.log('🔍 ProntoDoc Audio: WebSocket state:', this.ws?.readyState);
          console.log('🔍 ProntoDoc Audio: Data size:', event.data.size);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ ProntoDoc Audio: MediaRecorder error:', event);
        this.emit('error', { 
          message: 'Audio recording error',
          data: event 
        });
      };

      console.log('✅ ProntoDoc Audio: Audio stream setup complete');

    } catch (error) {
      console.error('❌ ProntoDoc Audio: Failed to setup audio stream:', error);
      throw new Error(`Failed to setup audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup WebSocket connection
   */
  private async setupWebSocket(): Promise<void> {
    console.log('🔌 ProntoDoc WebSocket: Starting setup...');
    
    if (!this.sessionDetails) {
      console.error('❌ ProntoDoc WebSocket: No session details provided');
      throw new Error('Session details not provided');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.apiBaseUrl.replace('http', 'ws')}/ws/prontodoc/${this.sessionDetails!.sessionId}`;
      console.log('🌐 ProntoDoc WebSocket: Connecting to:', wsUrl);
      console.log('📋 ProntoDoc WebSocket: API Base URL:', this.apiBaseUrl);
      console.log('🆔 ProntoDoc WebSocket: Session ID:', this.sessionDetails!.sessionId);
      
      try {
        this.ws = new WebSocket(wsUrl);
        console.log('✅ ProntoDoc WebSocket: WebSocket object created');
        console.log('📊 ProntoDoc WebSocket: Initial readyState:', this.ws.readyState);
      } catch (error) {
        console.error('❌ ProntoDoc WebSocket: Failed to create WebSocket:', error);
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        console.log('🎉 ProntoDoc WebSocket: Connection opened!');
        console.log('📊 ProntoDoc WebSocket: readyState on open:', this.ws?.readyState);
        console.log('🔍 ProntoDoc WebSocket: WebSocket.OPEN constant:', WebSocket.OPEN);
        
        this.reconnectAttempts = 0;
        
        // Ensure WebSocket is truly ready before resolving
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('✅ ProntoDoc WebSocket: State verified as OPEN, resolving...');
          resolve();
        } else {
          console.log('⚠️ ProntoDoc WebSocket: State not OPEN, using fallback...');
          // Small delay as fallback
          setTimeout(() => {
            console.log('🔍 ProntoDoc WebSocket: Fallback check - readyState:', this.ws?.readyState);
            if (this.ws?.readyState === WebSocket.OPEN) {
              console.log('✅ ProntoDoc WebSocket: Fallback success, resolving...');
              resolve();
            } else {
              console.error('❌ ProntoDoc WebSocket: Fallback failed, rejecting...');
              reject(new Error('WebSocket failed to open properly'));
            }
          }, 100);
        }
      };

      this.ws.onmessage = (event) => {
        console.log('📨 ProntoDoc WebSocket: Message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📋 ProntoDoc WebSocket: Parsed message:', data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ ProntoDoc WebSocket: Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔴 ProntoDoc WebSocket: Connection closed');
        console.log('📊 ProntoDoc WebSocket: Close code:', event.code);
        console.log('📝 ProntoDoc WebSocket: Close reason:', event.reason);
        console.log('🔍 ProntoDoc WebSocket: Was clean:', event.wasClean);
        
        this.stopKeepAlive();
        
        if (this.isRecording && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('🔄 ProntoDoc WebSocket: Attempting reconnect...');
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ ProntoDoc WebSocket: Error occurred');
        console.error('🔍 ProntoDoc WebSocket: Error details:', error);
        console.error('📊 ProntoDoc WebSocket: readyState on error:', this.ws?.readyState);
        console.error('🌐 ProntoDoc WebSocket: URL on error:', wsUrl);
        
        this.emit('error', { 
          message: 'WebSocket connection error',
          data: error 
        });
        reject(error);
      };

      // Connection timeout
      console.log('⏰ ProntoDoc WebSocket: Setting 10s connection timeout...');
      setTimeout(() => {
        console.log('⏰ ProntoDoc WebSocket: Timeout check - readyState:', this.ws?.readyState);
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error('❌ ProntoDoc WebSocket: Connection timeout reached');
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Initialize recording session
   */
  private async initializeSession(): Promise<void> {
    console.log('🚀 ProntoDoc Session: Starting initialization...');
    
    if (!this.ws || !this.sessionDetails) {
      console.error('❌ ProntoDoc Session: Missing WebSocket or session details');
      console.log('🔍 ProntoDoc Session: WebSocket exists:', !!this.ws);
      console.log('🔍 ProntoDoc Session: Session details exist:', !!this.sessionDetails);
      throw new Error('WebSocket or session details not available');
    }

    console.log('📊 ProntoDoc Session: WebSocket readyState:', this.ws.readyState);
    console.log('🔍 ProntoDoc Session: WebSocket.OPEN constant:', WebSocket.OPEN);
    
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ ProntoDoc Session: WebSocket is not open');
      throw new Error('WebSocket is not open');
    }

    return new Promise((resolve, reject) => {
      console.log('⏰ ProntoDoc Session: Setting 10s initialization timeout...');
      const timeout = setTimeout(() => {
        console.error('❌ ProntoDoc Session: Initialization timeout reached');
        reject(new Error('Session initialization timeout'));
      }, 10000);

      // Listen for session_started event
      const onSessionStarted = (event: ProntoDocEvent) => {
        console.log('🎉 ProntoDoc Session: Received session_started event:', event);
        clearTimeout(timeout);
        this.off('session_started', onSessionStarted);
        this.off('error', onError);
        
        console.log('💓 ProntoDoc Session: Starting keep-alive...');
        // Start keep-alive
        this.startKeepAlive();
        
        console.log('🎤 ProntoDoc Session: Starting media recorder...');
        // Start media recorder
        if (this.mediaRecorder) {
          this.mediaRecorder.start(250); // Send audio chunks every 250ms
          console.log('✅ ProntoDoc Session: Media recorder started');
        } else {
          console.warn('⚠️ ProntoDoc Session: No media recorder available');
        }
        
        console.log('✅ ProntoDoc Session: Initialization complete!');
        resolve();
      };

      const onError = (event: ProntoDocEvent) => {
        console.error('❌ ProntoDoc Session: Received error event:', event);
        clearTimeout(timeout);
        this.off('session_started', onSessionStarted);
        this.off('error', onError);
        reject(new Error(event.message || 'Session initialization failed'));
      };

      console.log('👂 ProntoDoc Session: Setting up event listeners...');
      this.on('session_started', onSessionStarted);
      this.on('error', onError);

      // Send initialization message
      try {
        const initMessage = {
          type: 'start_recording',
          patient_id: this.sessionDetails!.patientId,
          doctor_id: this.sessionDetails!.doctorId,
          options: this.sessionDetails!.options || {}
        };
        console.log('📤 ProntoDoc Session: Sending start_recording message:', initMessage);
        console.log('📊 ProntoDoc Session: WebSocket readyState before send:', this.ws!.readyState);
        
        this.ws!.send(JSON.stringify(initMessage));
        console.log('✅ ProntoDoc Session: Message sent successfully');
        
      } catch (error) {
        console.error('❌ ProntoDoc Session: Failed to send initialization message:', error);
        clearTimeout(timeout);
        this.off('session_started', onSessionStarted);
        this.off('error', onError);
        reject(new Error(`Failed to send initialization message: ${error}`));
      }
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(data: any) {
    const eventType = data.type as ProntoDocEventType;
    
    switch (eventType) {
      case 'session_started':
        this.emit('session_started', {
          sessionId: data.session_id,
          recordingId: data.recording_id,
          data
        });
        break;

      case 'interim_result':
        this.emit('interim_result', {
          sessionId: data.session_id,
          data: {
            content: data.content,
            confidence: data.confidence,
            startTime: data.start_time,
            endTime: data.end_time,
            speakerId: data.speaker_id,
            speakerLabel: data.speaker_label
          }
        });
        break;

      case 'final_result':
        this.emit('final_result', {
          sessionId: data.session_id,
          data: {
            content: data.content,
            confidence: data.confidence,
            startTime: data.start_time,
            endTime: data.end_time,
            speakerId: data.speaker_id,
            speakerLabel: data.speaker_label,
            wordsCount: data.words_count
          }
        });
        break;

      case 'status_update':
        this.emit('status_update', {
          sessionId: data.session_id,
          data: {
            status: data.status,
            recordingId: data.recording_id,
            startedAt: data.started_at,
            totalWords: data.total_words,
            averageConfidence: data.average_confidence,
            speakerCount: data.speaker_count,
            durationSeconds: data.duration_seconds
          }
        });
        break;

      case 'session_ended':
        this.emit('session_ended', {
          sessionId: data.session_id,
          data: data.summary
        });
        break;

      case 'error':
        this.emit('error', {
          sessionId: data.session_id,
          message: data.message,
          data
        });
        break;

      case 'keepalive_ack':
        // Keep-alive acknowledged
        break;

      default:
        console.warn('Unknown WebSocket message type:', eventType);
    }
  }

  /**
   * Start keep-alive mechanism
   */
  private startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'keepalive',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // Send keep-alive every 30 seconds
  }

  /**
   * Stop keep-alive mechanism
   */
  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnect() {
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    try {
      await this.setupWebSocket();
      await this.initializeSession();
      console.log('Successfully reconnected');
    } catch (error) {
      console.error('Reconnection failed:', error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('error', { 
          message: 'Max reconnection attempts reached',
          data: error 
        });
        await this.cleanup();
      } else {
        this.attemptReconnect();
      }
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup() {
    this.isRecording = false;
    
    // Stop keep-alive
    this.stopKeepAlive();
    
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    
    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.sessionDetails = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Get current recording status
   */
  get isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get current session ID
   */
  get currentSessionId(): string | null {
    return this.sessionDetails?.sessionId || null;
  }

  /**
   * Dispose of the client and cleanup all resources
   */
  async dispose() {
    await this.cleanup();
    this.eventListeners.clear();
  }
}