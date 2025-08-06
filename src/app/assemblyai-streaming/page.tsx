'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { Loading } from '../../../components/ui/Loading';
import { 
  AssemblyAIStreamingClient, 
  AudioRecorder, 
  testBackendConnection,
  StreamingMessage,
  StreamingConfig
} from '../../../lib/assemblyai-streaming-client';

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: string;
  isFormatted: boolean;
  endOfTurn: boolean;
}

export default function AssemblyAIStreamingPage() {
  const { user, loading: authLoading } = useAuth();
  
  // WebSocket and streaming state
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [assemblyAISessionId, setAssemblyAISessionId] = useState<string>('');
  
  // Audio state
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Transcription state
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Connection and error state
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  
  // Configuration
  const [sampleRate, setSampleRate] = useState(16000);
  const [formatTurns, setFormatTurns] = useState(true);
  
  // Refs
  const clientRef = useRef<AssemblyAIStreamingClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize streaming client and connect
  const connectWebSocket = useCallback(async () => {
    try {
      setError(null);
      
      // Create new client
      const client = new AssemblyAIStreamingClient('ws://localhost:8000');
      clientRef.current = client;
      
      // Set up event handlers
      client.on('connected', () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        setSessionId(client.getSessionId());
      });
      
      client.on('disconnected', () => {
        setIsConnected(false);
        setIsStreaming(false);
        setConnectionStatus('Disconnected');
      });
      
      client.on('session_started', (message) => {
        setAssemblyAISessionId(message.assemblyai_session_id);
        setConnectionStatus('AssemblyAI Session Started');
      });
      
      client.on('streaming_started', () => {
        setIsStreaming(true);
        setConnectionStatus('Streaming Active');
      });
      
      client.on('transcript', (message) => {
        if (message.end_of_turn && message.turn_is_formatted) {
          // Final formatted transcript
          const newTranscript: TranscriptEntry = {
            id: `transcript_${Date.now()}`,
            text: message.transcript,
            timestamp: message.timestamp,
            isFormatted: true,
            endOfTurn: true
          };
          setTranscripts(prev => [...prev, newTranscript]);
          setCurrentTranscript('');
        } else {
          // Interim transcript
          setCurrentTranscript(message.transcript);
        }
      });
      
      client.on('session_terminated', () => {
        setConnectionStatus('Session Terminated');
        setIsStreaming(false);
      });
      
      client.on('error', (message) => {
        setError(message.error);
        setConnectionStatus('Error');
      });
      
      client.on('message', (message) => {
        // Add to messages log
        setMessages(prev => [...prev.slice(-50), message]); // Keep last 50 messages
      });
      
      // Connect
      await client.connect();
      
    } catch (err) {
      console.error('Error connecting WebSocket:', err);
      setError('Failed to connect WebSocket');
    }
  }, []);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
    setConnectionStatus('Disconnected');
  }, []);

  // Start streaming to AssemblyAI
  const startStreaming = useCallback(async () => {
    if (!clientRef.current || !isConnected) {
      setError('WebSocket not connected');
      return;
    }
    
    try {
      const config: StreamingConfig = {
        sample_rate: sampleRate,
        format_turns: formatTurns
      };
      
      await clientRef.current.startStreaming(config);
      setIsProcessing(true);
      
    } catch (err) {
      console.error('Error starting streaming:', err);
      setError('Failed to start streaming');
    }
  }, [isConnected, sampleRate, formatTurns]);

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    if (clientRef.current && isStreaming) {
      await clientRef.current.stopStreaming();
    }
    setIsStreaming(false);
    setIsProcessing(false);
  }, [isStreaming]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Create recorder with callback to send audio data
      const recorder = new AudioRecorder((audioData) => {
        if (clientRef.current && isStreaming) {
          clientRef.current.sendAudioData(audioData).catch(err => {
            console.error('Error sending audio data:', err);
          });
        }
      });
      
      recorderRef.current = recorder;
      
      // Start recording with specified constraints
      await recorder.startRecording({
        audio: {
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone');
    }
  }, [sampleRate, isStreaming]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
      recorderRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  // Complete flow: Connect -> Start Streaming -> Start Recording
  const startCompleteFlow = useCallback(async () => {
    try {
      if (!isConnected) {
        await connectWebSocket();
        // Wait a bit for connection to establish
        setTimeout(async () => {
          await startStreaming();
          setTimeout(async () => {
            await startRecording();
          }, 500);
        }, 1000);
      } else {
        await startStreaming();
        setTimeout(async () => {
          await startRecording();
        }, 500);
      }
    } catch (err) {
      console.error('Error in complete flow:', err);
      setError('Failed to start complete flow');
    }
  }, [isConnected, connectWebSocket, startStreaming, startRecording]);

  // Stop complete flow
  const stopCompleteFlow = useCallback(async () => {
    await stopRecording();
    await stopStreaming();
  }, [stopRecording, stopStreaming]);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setCurrentTranscript('');
    setMessages([]);
  }, []);

  // Test backend connection
  const testConnection = useCallback(async () => {
    try {
      const result = await testBackendConnection('http://localhost:8000');
      if (result.success) {
        setError(null);
        alert('Backend connection test successful!');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      setError('Failed to test backend connection');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      disconnectWebSocket();
    };
  }, [stopRecording, disconnectWebSocket]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AssemblyAI Streaming Test
        </h1>
        <p className="text-gray-600">
          Real-time speech-to-text transcription using AssemblyAI streaming API
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Connection Status:</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus}
                </span>
              </div>
              
              {sessionId && (
                <div className="text-xs text-gray-600 mb-1">
                  Session: {sessionId}
                </div>
              )}
              
              {assemblyAISessionId && (
                <div className="text-xs text-gray-600">
                  AssemblyAI: {assemblyAISessionId}
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sample Rate
                </label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(Number(e.target.value))}
                  disabled={isStreaming}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={8000}>8000 Hz</option>
                  <option value={16000}>16000 Hz</option>
                  <option value={44100}>44100 Hz</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="formatTurns"
                  checked={formatTurns}
                  onChange={(e) => setFormatTurns(e.target.checked)}
                  disabled={isStreaming}
                  className="mr-2"
                />
                <label htmlFor="formatTurns" className="text-sm font-medium text-gray-700">
                  Format Turns (punctuation & capitalization)
                </label>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={connectWebSocket}
                  disabled={isConnected}
                  variant="outline"
                  size="sm"
                >
                  Connect WebSocket
                </Button>
                <Button
                  onClick={disconnectWebSocket}
                  disabled={!isConnected}
                  variant="outline"
                  size="sm"
                >
                  Disconnect
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={startCompleteFlow}
                  disabled={isRecording || !isConnected}
                  className="flex-1"
                >
                  {isRecording ? 'Recording...' : 'Start Recording'}
                </Button>
                <Button
                  onClick={stopCompleteFlow}
                  disabled={!isRecording}
                  variant="danger"
                  className="flex-1"
                >
                  Stop Recording
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testConnection}
                  variant="outline"
                  size="sm"
                >
                  Test Backend
                </Button>
                <Button
                  onClick={clearTranscripts}
                  variant="outline"
                  size="sm"
                >
                  Clear Transcripts
                </Button>
              </div>
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-800">
                    🔴 Recording
                  </span>
                  <span className="text-sm text-red-600">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcription Results */}
        <Card>
          <CardHeader>
            <CardTitle>Live Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current (interim) transcript */}
              {currentTranscript && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Current (interim):</div>
                  <div className="text-gray-800 italic">
                    {currentTranscript}
                  </div>
                </div>
              )}

              {/* Final transcripts */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {transcripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="text-xs text-green-600 mb-1">
                      {new Date(transcript.timestamp).toLocaleTimeString()} 
                      {transcript.isFormatted && ' (formatted)'}
                    </div>
                    <div className="text-gray-800">
                      {transcript.text}
                    </div>
                  </div>
                ))}
                
                {transcripts.length === 0 && !currentTranscript && (
                  <div className="text-center text-gray-500 py-8">
                    Start recording to see transcriptions appear here...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Log */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>WebSocket Messages Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg font-mono text-xs">
            {messages.map((message, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                <span className="ml-2 font-semibold text-blue-600">
                  {message.type}:
                </span>
                <span className="ml-1">
                  {JSON.stringify(message, null, 2).substring(0, 200)}
                  {JSON.stringify(message).length > 200 && '...'}
                </span>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-gray-500">
                No messages yet. Connect and start streaming to see activity...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}