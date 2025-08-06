/**
 * AssemblyAI Streaming Client
 * WebSocket client for real-time speech-to-text transcription
 */

export interface StreamingConfig {
  sample_rate: number;
  format_turns: boolean;
}

export interface StreamingMessage {
  type: string;
  timestamp: string;
  [key: string]: any;
}

export interface TranscriptMessage extends StreamingMessage {
  type: 'transcript';
  transcript: string;
  end_of_turn: boolean;
  turn_is_formatted: boolean;
}

export interface SessionStartedMessage extends StreamingMessage {
  type: 'session_started';
  assemblyai_session_id: string;
}

export interface ErrorMessage extends StreamingMessage {
  type: 'error';
  error: string;
}

export type StreamingEventHandler = (message: StreamingMessage) => void;

export class AssemblyAIStreamingClient {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private baseUrl: string;
  private eventHandlers: Map<string, StreamingEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(baseUrl: string = 'ws://localhost:8000') {
    this.baseUrl = baseUrl;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public on(event: string, handler: StreamingEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler?: StreamingEventHandler): void {
    if (!this.eventHandlers.has(event)) return;
    
    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.set(event, []);
    }
  }

  private emit(event: string, message: StreamingMessage): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });

    // Also emit to 'message' event for all messages
    if (event !== 'message') {
      const messageHandlers = this.eventHandlers.get('message') || [];
      messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl}/api/assemblyai/ws/streaming/${this.sessionId}`;
        console.log('Connecting to:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connected', {
            type: 'connected',
            timestamp: new Date().toISOString()
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: StreamingMessage = JSON.parse(event.data);
            console.log('Received message:', message);
            
            // Emit specific event type
            this.emit(message.type, message);
            
            // Emit general message event
            this.emit('message', message);
            
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.emit('error', {
              type: 'error',
              error: 'Failed to parse message',
              timestamp: new Date().toISOString()
            });
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.emit('disconnected', {
            type: 'disconnected',
            code: event.code,
            reason: event.reason,
            timestamp: new Date().toISOString()
          });

          // Attempt reconnection if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', {
            type: 'error',
            error: 'WebSocket connection error',
            timestamp: new Date().toISOString()
          });
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('error', {
            type: 'error',
            error: 'Max reconnection attempts reached',
            timestamp: new Date().toISOString()
          });
        }
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public async startStreaming(config: StreamingConfig = { sample_rate: 16000, format_turns: true }): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'start_streaming',
      config
    };

    this.ws!.send(JSON.stringify(message));
  }

  public async stopStreaming(): Promise<void> {
    if (!this.isConnected()) {
      return;
    }

    const message = {
      type: 'stop_streaming'
    };

    this.ws!.send(JSON.stringify(message));
  }

  public async sendAudioData(audioData: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      type: 'audio_data',
      data: audioData
    };

    this.ws!.send(JSON.stringify(message));
  }

  public async sendMessage(message: any): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    this.ws!.send(JSON.stringify(message));
  }
}

// Utility function to test backend connection
export async function testBackendConnection(baseUrl: string = 'http://localhost:8000'): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const response = await fetch(`${baseUrl}/api/assemblyai/streaming/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.status === 'success',
      message: result.message || 'Connection test completed',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Audio utilities
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private onDataCallback?: (audioData: string) => void;

  constructor(onDataCallback?: (audioData: string) => void) {
    this.onDataCallback = onDataCallback;
  }

  public async startRecording(constraints: MediaStreamConstraints = {
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  }): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onDataCallback) {
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && this.onDataCallback) {
              const base64Audio = (reader.result as string).split(',')[1];
              this.onDataCallback(base64Audio);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      this.mediaRecorder.start(100); // Send data every 100ms
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
  }

  public isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}