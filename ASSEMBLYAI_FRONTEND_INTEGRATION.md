# AssemblyAI Frontend Integration Guide

This document explains how to test the AssemblyAI integration in the ProntoDoc Pre-recorded frontend.

## Overview

The frontend now supports **both Deepgram and AssemblyAI** transcription providers:

- **Row 1**: Uses **Deepgram** (original implementation)
- **Row 2**: Uses **AssemblyAI** (new implementation)  
- **Row 3**: Uses **Deepgram** (for additional testing)

## Updated Components

### 1. Page Layout Changes

| Row | Provider | Title | Endpoint | Language | Models |
|-----|----------|-------|----------|----------|---------|
| **Row 1** | **Deepgram** | "🎤 Audio Input #1 - DEEPGRAM" | `/transcribe` | `pt-BR` | nova-3, nova-2, enhanced, base |
| **Row 2** | **AssemblyAI** | "🎤 Audio Input #2 - ASSEMBLYAI" | `/transcribe-assemblyai` | `pt` | best, nano |
| **Row 3** | **Deepgram** | "🎤 Audio Input #3" | `/transcribe` | `pt-BR` | nova-3, nova-2, enhanced, base |

### 2. Frontend Code Changes

#### Updated Files:
- `src/app/prontodoc-prerecorded/page.tsx`
- `lib/prontodoc-client-prerecorded.ts`

#### Key Changes:

**Session 2 State Changes:**
```typescript
// Changed from 'nova-3' to 'best'
const [transcriptionModel2, setTranscriptionModel2] = useState('best');
```

**Upload Function Changes:**
```typescript
// Session 2 now uses AssemblyAI endpoint
formData.append('language', 'pt');  // Changed from 'pt-BR'
const uploadUrl = `${apiBaseUrl}/api/prontodoc/prerecorded/transcribe-assemblyai`;
```

**Model Options Updated:**
```jsx
{/* Session 2 - AssemblyAI Models */}
<option value="best">Best (Highest Accuracy)</option>
<option value="nano">Nano (Faster)</option>
```

#### Updated Client Library:
```typescript
// Added provider support
export interface PrerecordedSessionDetails {
  // ... existing fields
  provider?: 'deepgram' | 'assemblyai' | 'assemblyai-http';
}

// Added provider metadata
export interface PrerecordedTranscriptionResult {
  // ... existing fields
  provider?: string;
  assemblyai_metadata?: any;
}
```

## Testing Instructions

### Prerequisites

1. **Backend Setup**: Ensure the AI processor is running with AssemblyAI API key:
   ```env
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key
   ```

2. **Frontend Setup**: Make sure the Next.js app is running:
   ```bash
   cd web-saude-no-bolso
   npm run dev
   ```

3. **Audio Files**: Prepare test audio files (Portuguese medical consultations recommended)

### Step-by-Step Testing

#### 1. Access the Page
Navigate to: `http://localhost:3000/prontodoc-prerecorded`

#### 2. Test Row 1 (Deepgram)
1. **Select Model**: Choose "Nova 3" (or any Deepgram model)
2. **Upload Audio**: Click "📁 Click to select" and choose an audio file
3. **Process**: Click "🚀 Upload" 
4. **Verify**: Check that the response shows Deepgram results

#### 3. Test Row 2 (AssemblyAI)
1. **Select Model**: Choose "Best (Highest Accuracy)" or "Nano (Faster)"
2. **Upload Audio**: Use the **same audio file** from Row 1 for comparison
3. **Process**: Click "🚀 Upload"
4. **Verify**: Check that the response shows AssemblyAI results

#### 4. Compare Results
Look for differences in:
- **Transcript Quality**: Compare accuracy between providers
- **Processing Time**: AssemblyAI may be slower (async processing)
- **Confidence Scores**: Different scoring systems
- **Speaker Diarization**: Both support speaker separation
- **Metadata**: Different provider-specific information

### Expected Response Differences

#### Deepgram Response (Row 1):
```json
{
  "success": true,
  "provider": "deepgram", // May not be present in older versions
  "transcript": "Olá, como você está se sentindo hoje?",
  "confidence": 0.95,
  "language": "pt-BR",
  "model": "nova-3",
  "deepgram_metadata": { ... }
}
```

#### AssemblyAI Response (Row 2):
```json
{
  "success": true,
  "provider": "assemblyai",
  "transcript": "Olá, como você está se sentindo hoje?",
  "confidence": 0.92,
  "language": "pt",
  "model": "best",
  "assemblyai_metadata": { ... }
}
```

### Troubleshooting

#### Common Issues:

1. **AssemblyAI API Key Missing**:
   ```
   Error: AssemblyAI speech-to-text service not configured
   ```
   **Solution**: Add `ASSEMBLYAI_API_KEY` to your backend `.env` file

2. **Slower Processing in Row 2**:
   - **Expected**: AssemblyAI uses async processing (upload → queue → process → poll)
   - **Normal**: May take 20-60 seconds vs Deepgram's 2-5 seconds

3. **Language Code Mismatch**:
   - **Deepgram**: Uses `pt-BR` (Brazilian Portuguese)
   - **AssemblyAI**: Uses `pt` (Portuguese)
   - Both should work for Portuguese audio

4. **Model Not Found Error**:
   - **Deepgram**: Ensure model exists (nova-3, nova-2, enhanced, base)
   - **AssemblyAI**: Ensure model exists (best, nano)

#### Debug Steps:

1. **Check Network Tab**: Look for API calls to different endpoints
2. **Console Logs**: Check browser console for detailed error messages
3. **Backend Logs**: Monitor `ai-processor/backend.log` for server-side errors

### Performance Comparison

| Metric | Deepgram (Row 1) | AssemblyAI (Row 2) |
|--------|------------------|-------------------|
| **Speed** | ⚡ Fast (2-5s) | 🐌 Slower (20-60s) |
| **Accuracy** | ✅ Excellent | ✅ Excellent |
| **Portuguese Support** | 🇧🇷 pt-BR | 🇵🇹 pt |
| **Speaker Diarization** | ✅ Real-time | ✅ Post-processing |
| **Cost** | 💰 Per minute | 💰 Per hour |

### Next Steps

1. **Test with Medical Audio**: Use actual Portuguese medical consultation recordings
2. **Compare Accuracy**: Evaluate which provider performs better for your use case
3. **Performance Testing**: Test with longer audio files (5-10 minutes)
4. **Cost Analysis**: Monitor usage and compare pricing between providers
5. **Integration Decision**: Choose the best provider based on your requirements

## Code Integration

If you want to use the client programmatically:

```typescript
import { ProntoDocPrerecordedClient } from '../lib/prontodoc-client-prerecorded';

const client = new ProntoDocPrerecordedClient();

// For Deepgram
await client.startRecording({
  sessionId: 'test_1',
  patientId: 'patient_123',
  doctorId: 'doctor_123',
  language: 'pt-BR',
  model: 'nova-3',
  provider: 'deepgram'
});

// For AssemblyAI
await client.startRecording({
  sessionId: 'test_2',
  patientId: 'patient_123',
  doctorId: 'doctor_123',
  language: 'pt',
  model: 'best',
  provider: 'assemblyai'
});
```

## Conclusion

You now have a complete comparison setup where:
- **Row 1** = Deepgram (fast, real-time)
- **Row 2** = AssemblyAI (accurate, feature-rich)
- **Row 3** = Deepgram (additional testing)

This allows for direct A/B testing of transcription quality and performance between the two leading speech-to-text providers.