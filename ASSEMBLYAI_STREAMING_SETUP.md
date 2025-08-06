# AssemblyAI Streaming Implementation

This document describes the AssemblyAI streaming implementation for real-time speech-to-text transcription.

## Architecture

```
[Browser UI - Next.js]
      |
      | 1. User clicks "Start Recording"
      |
      V
[WebSocket Connection to Python Backend]
      |
      | 2. Python handles audio, sends to AssemblyAI
      |
      V
[AssemblyAI Streaming Session]
      |
      | 3. Receive transcription
      |
      V
[Python backend sends results back via WebSocket]
      |
      V
[Next.js displays real-time transcript]
```

## Components

### Backend (Python)
- **File**: `ai-processor/api/routes_streaming.py`
- **Endpoints**:
  - `WebSocket /api/assemblyai/ws/streaming/{session_id}` - Main streaming endpoint
  - `POST /api/assemblyai/streaming/test` - Test AssemblyAI connection
  - `GET /api/assemblyai/streaming/sessions` - List active sessions
  - `GET /api/assemblyai/streaming/status/{session_id}` - Get session status

### Frontend (Next.js)
- **Page**: `web-saude-no-bolso/src/app/assemblyai-streaming/page.tsx`
- **Client Library**: `web-saude-no-bolso/lib/assemblyai-streaming-client.ts`

## Setup Instructions

### 1. Backend Setup

1. **Install Dependencies** (already included in requirements.txt):
   ```bash
   cd ai-processor
   pip install assemblyai>=0.21.0 websockets>=11.0
   ```

2. **Configure AssemblyAI API Key**:
   - Set environment variable: `ASSEMBLYAI_API_KEY=your_api_key_here`
   - Or update the default key in `routes_streaming.py`

3. **Start Backend**:
   ```bash
   cd ai-processor
   python main.py
   ```

### 2. Frontend Setup

1. **Navigate to the streaming page**:
   ```
   http://localhost:3000/assemblyai-streaming
   ```

2. **Test the connection**:
   - Click "Test Backend" button to verify backend connectivity
   - Click "Connect WebSocket" to establish WebSocket connection

3. **Start streaming**:
   - Click "Start Recording" to begin complete flow
   - Speak into your microphone
   - View real-time transcriptions
   - Click "Stop Recording" to end session

## Testing

### Automated Backend Test
```bash
cd ai-processor
python test_streaming.py
```

This will test:
- Main API connectivity
- HTTP endpoints
- WebSocket connection
- Message flow

### Manual Testing Steps

1. **Backend Test**:
   ```bash
   curl -X POST http://localhost:8000/api/assemblyai/streaming/test
   ```

2. **Frontend Test**:
   - Open browser to `http://localhost:3000/assemblyai-streaming`
   - Click "Test Backend" - should show success
   - Click "Connect WebSocket" - should show "Connected" status
   - Click "Start Recording" - should show "Recording" status
   - Speak into microphone - should see interim transcripts
   - Wait for pause - should see formatted final transcripts
   - Click "Stop Recording" - should stop cleanly

## Features

### Real-time Transcription
- **Interim Results**: Shows partial transcriptions as you speak
- **Final Results**: Formatted transcriptions with punctuation and capitalization
- **Turn Detection**: Automatically detects when you stop speaking

### Audio Processing
- **Sample Rate**: Configurable (8kHz, 16kHz, 44.1kHz)
- **Format**: WebM with Opus codec
- **Processing**: Echo cancellation, noise suppression, auto gain control

### Session Management
- **Unique Sessions**: Each connection gets a unique session ID
- **Status Tracking**: Real-time connection and streaming status
- **Cleanup**: Automatic resource cleanup on disconnect

### Error Handling
- **Connection Errors**: Automatic reconnection attempts
- **Audio Errors**: Graceful microphone access error handling
- **API Errors**: AssemblyAI error reporting and display

## Configuration

### Backend Configuration
```python
# In routes_streaming.py
ASSEMBLYAI_API_KEY = "your_api_key_here"
```

### Frontend Configuration
```typescript
// In assemblyai-streaming-client.ts
const client = new AssemblyAIStreamingClient('ws://localhost:8000');
```

### Audio Configuration
```typescript
// Sample rate options
const sampleRate = 16000; // 8000, 16000, 44100

// Audio constraints
const constraints = {
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
};
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend is running on port 8000
   - Verify firewall settings
   - Check browser console for CORS errors

2. **No Audio Transcription**
   - Verify microphone permissions
   - Check AssemblyAI API key configuration
   - Ensure sample rate matches between frontend and backend

3. **Backend Errors**
   - Check server logs: `tail -f ai-processor/server.log`
   - Verify AssemblyAI API key is valid
   - Check internet connectivity

### Debug Information

The frontend provides detailed debugging:
- **Connection Status**: Shows current WebSocket and AssemblyAI status
- **Messages Log**: Displays all WebSocket messages
- **Audio Status**: Shows recording duration and status
- **Error Display**: Shows any errors that occur

### Log Files

- Backend logs: `ai-processor/server.log`
- Browser console: Developer tools → Console tab

## API Reference

### WebSocket Messages

#### Client → Server
```json
{
  "type": "start_streaming",
  "config": {
    "sample_rate": 16000,
    "format_turns": true
  }
}
```

```json
{
  "type": "audio_data",
  "data": "base64_encoded_audio"
}
```

```json
{
  "type": "stop_streaming"
}
```

#### Server → Client
```json
{
  "type": "session_started",
  "assemblyai_session_id": "session_123",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

```json
{
  "type": "transcript",
  "transcript": "Hello world",
  "end_of_turn": false,
  "turn_is_formatted": false,
  "timestamp": "2024-01-01T12:00:01Z"
}
```

```json
{
  "type": "error",
  "error": "Error message",
  "timestamp": "2024-01-01T12:00:02Z"
}
```

## Performance Notes

- **Latency**: Typically 200-500ms from speech to transcript
- **Accuracy**: Depends on audio quality and speaking clarity
- **Resource Usage**: Minimal CPU/memory impact on both client and server
- **Scalability**: Each session uses one WebSocket connection

## Security Notes

- **API Key**: Keep AssemblyAI API key secure (use environment variables)
- **Authentication**: Currently disabled for testing (uncomment in production)
- **CORS**: Configure appropriately for production deployment
- **Rate Limiting**: Built-in rate limiting in backend middleware

## Next Steps

1. **Production Deployment**: 
   - Enable authentication
   - Configure HTTPS/WSS
   - Set up proper CORS
   - Add monitoring

2. **Feature Enhancements**:
   - Speaker diarization
   - Custom vocabulary
   - Multiple language support
   - Recording playback

3. **Integration**:
   - Save transcripts to database
   - Connect to medical processing pipeline
   - Add export functionality