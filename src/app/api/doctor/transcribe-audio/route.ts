import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * AUDIO TRANSCRIPTION API ROUTE
 * =====================================
 * 
 * This API route handles audio transcription for the ProntoDoc recording feature.
 * It forwards audio files to the AI processor using OpenAI Whisper model.
 * 
 * WORKFLOW:
 * 1. Receives audio file from RecordingAndTranscription component
 * 2. Forwards to AI processor /api/prontodoc/prerecorded/transcribe-openai-whisper
 * 3. Returns transcription results with confidence scores
 * 
 * AI PROCESSOR INTEGRATION:
 * - Endpoint: /api/prontodoc/prerecorded/transcribe-openai-whisper
 * - Model: OpenAI Whisper (whisper-1)
 * - Language: Portuguese (pt)
 * - Provider: openai-whisper
 * 
 * REQUEST FORMAT:
 * - Content-Type: multipart/form-data
 * - audio_file: Blob (WebM format from MediaRecorder)
 * - session_id: Unique session identifier
 * - patient_id: Patient profile ID
 * - doctor_id: Doctor profile ID
 * - language: 'pt' for Portuguese
 * - model: 'whisper-1' for OpenAI Whisper Large v3
 * 
 * RESPONSE FORMAT:
 * {
 *   success: boolean,
 *   transcript: string,
 *   confidence: number,
 *   duration: number,
 *   word_count: number,
 *   provider: 'openai-whisper'
 * }
 */

export async function POST(request: NextRequest) {
  console.log('🚀 [TRANSCRIBE-AUDIO] Starting audio transcription request');
  
  try {
    // Get form data from request
    const formData = await request.formData();
    
    // Extract form fields
    const audioFile = formData.get('audio_file') as File;
    const sessionId = formData.get('session_id') as string;
    const patientId = formData.get('patient_id') as string;
    const doctorId = formData.get('doctor_id') as string;
    const language = formData.get('language') as string || 'pt';
    const model = formData.get('model') as string || 'whisper-1';

    console.log('📋 [TRANSCRIBE-AUDIO] Request parameters:');
    console.log('  - session_id:', sessionId);
    console.log('  - patient_id:', patientId);
    console.log('  - doctor_id:', doctorId);
    console.log('  - language:', language);
    console.log('  - model:', model);
    
    if (!audioFile) {
      console.error('❌ [TRANSCRIBE-AUDIO] No audio file provided');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('📁 [TRANSCRIBE-AUDIO] Audio file info:');
    console.log('  - filename:', audioFile.name);
    console.log('  - size:', audioFile.size, 'bytes');
    console.log('  - type:', audioFile.type);

    // Validate required fields
    if (!sessionId || !patientId || !doctorId) {
      console.error('❌ [TRANSCRIBE-AUDIO] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: session_id, patient_id, doctor_id' },
        { status: 400 }
      );
    }

    // Prepare form data for AI processor
    const aiProcessorFormData = new FormData();
    aiProcessorFormData.append('audio_file', audioFile);
    aiProcessorFormData.append('session_id', sessionId);
    aiProcessorFormData.append('patient_id', patientId);
    aiProcessorFormData.append('doctor_id', doctorId);
    aiProcessorFormData.append('language', language);
    aiProcessorFormData.append('model', model);

    // Get AI processor URL from environment
    const aiProcessorUrl = process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 
                          process.env.NEXT_PUBLIC_API_BASE_URL || 
                          'https://saude-ai-processor-production-bebd.up.railway.app';
    
    const transcriptionUrl = `${aiProcessorUrl.replace(/\/$/, '')}/api/prontodoc/prerecorded/transcribe-openai-whisper`;
    
    console.log('🌐 [TRANSCRIBE-AUDIO] AI Processor configuration:');
    console.log('  - NEXT_PUBLIC_AI_PROCESSOR_URL:', process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'Not set');
    console.log('  - NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL || 'Not set');
    console.log('  - Final Base URL:', aiProcessorUrl);
    console.log('  - Transcription URL:', transcriptionUrl);

    console.log('📤 [TRANSCRIBE-AUDIO] Forwarding to AI processor...');
    const startRequestTime = Date.now();
    
    // Forward request to AI processor
    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      body: aiProcessorFormData
    });

    const requestDuration = Date.now() - startRequestTime;

    console.log('📥 [TRANSCRIBE-AUDIO] AI processor response:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Request Duration:', requestDuration + 'ms');
    console.log('  - Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TRANSCRIBE-AUDIO] AI processor error:');
      console.error('  - Status:', response.status);
      console.error('  - Error:', errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `AI processor error: ${response.status} ${errorText}` 
        },
        { status: response.status }
      );
    }

    // Parse successful response
    const result = await response.json();
    
    console.log('✅ [TRANSCRIBE-AUDIO] Transcription successful:');
    console.log('  - Success:', result.success);
    console.log('  - Transcript length:', result.transcript?.length || 0);
    console.log('  - Confidence:', result.confidence);
    console.log('  - Duration:', result.duration);
    console.log('  - Word count:', result.word_count);
    console.log('  - Provider:', result.provider);

    // Return standardized response
    return NextResponse.json({
      success: result.success,
      transcript: result.transcript || '',
      confidence: result.confidence || 0,
      duration: result.duration || 0,
      word_count: result.word_count || 0,
      provider: result.provider || 'openai-whisper'
    });

  } catch (error) {
    console.error('❌ [TRANSCRIBE-AUDIO] Unexpected error:', error);
    console.error('❌ [TRANSCRIBE-AUDIO] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}