import { NextRequest, NextResponse } from 'next/server';

/**
 * =====================================
 * CHUNKED AUDIO TRANSCRIPTION API ROUTE
 * =====================================
 * 
 * This API route handles chunked audio transcription for long consultations.
 * It processes 4-minute audio segments and maintains session continuity.
 * 
 * WORKFLOW:
 * 1. Receives audio chunk from ChunkedRecordingManager
 * 2. Forwards to AI processor with chunk metadata
 * 3. Returns partial transcription for real-time processing
 * 4. Maintains session state across chunks
 * 
 * CHUNKED RECORDING FEATURES:
 * - 4-minute audio segments for long consultations
 * - Session continuity tracking
 * - Chunk sequence ordering
 * - Seamless recording continuation
 * - Memory-based processing (no database writes)
 * 
 * REQUEST FORMAT:
 * - Content-Type: multipart/form-data
 * - audio_file: Blob (WebM format, 4-minute chunk)
 * - session_id: Unique session identifier
 * - chunk_number: Sequential chunk number (0, 1, 2...)
 * - is_final_chunk: Boolean indicating last chunk
 * - patient_id: Patient profile ID
 * - doctor_id: Doctor profile ID
 * 
 * RESPONSE FORMAT:
 * {
 *   success: boolean,
 *   transcript: string,
 *   chunk_number: number,
 *   session_id: string,
 *   is_final_chunk: boolean,
 *   confidence: number,
 *   duration: number,
 *   word_count: number
 * }
 */

export async function POST(request: NextRequest) {
  console.log('🚀 [TRANSCRIBE-AUDIO-CHUNK] Starting chunked audio transcription request');
  
  try {
    // Get form data from request
    const formData = await request.formData();
    
    // Extract form fields
    const audioFile = formData.get('audio_file') as File;
    const sessionId = formData.get('session_id') as string;
    const chunkNumber = parseInt(formData.get('chunk_number') as string || '0');
    const isFinalChunk = formData.get('is_final_chunk') === 'true';
    const patientId = formData.get('patient_id') as string;
    const doctorId = formData.get('doctor_id') as string;
    const language = formData.get('language') as string || 'pt';
    const model = formData.get('model') as string || 'whisper-1';

    console.log('📋 [TRANSCRIBE-AUDIO-CHUNK] Request parameters:');
    console.log('  - session_id:', sessionId);
    console.log('  - chunk_number:', chunkNumber);
    console.log('  - is_final_chunk:', isFinalChunk);
    console.log('  - patient_id:', patientId);
    console.log('  - doctor_id:', doctorId);
    console.log('  - language:', language);
    console.log('  - model:', model);
    
    if (!audioFile) {
      console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] No audio file provided');
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('📁 [TRANSCRIBE-AUDIO-CHUNK] Audio chunk info:');
    console.log('  - filename:', audioFile.name);
    console.log('  - size:', audioFile.size, 'bytes');
    console.log('  - type:', audioFile.type);
    console.log('  - expected duration: ~4 minutes');

    // Validate required fields
    if (!sessionId || !patientId || !doctorId) {
      console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields: session_id, patient_id, doctor_id' },
        { status: 400 }
      );
    }

    // Validate chunk number
    if (chunkNumber < 0 || isNaN(chunkNumber)) {
      console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] Invalid chunk number');
      return NextResponse.json(
        { success: false, error: 'Invalid chunk number - must be >= 0' },
        { status: 400 }
      );
    }

    // Prepare form data for AI processor with chunk metadata
    const aiProcessorFormData = new FormData();
    aiProcessorFormData.append('audio_file', audioFile);
    aiProcessorFormData.append('session_id', sessionId);
    aiProcessorFormData.append('chunk_number', chunkNumber.toString());
    aiProcessorFormData.append('is_final_chunk', isFinalChunk.toString());
    aiProcessorFormData.append('patient_id', patientId);
    aiProcessorFormData.append('doctor_id', doctorId);
    aiProcessorFormData.append('language', language);
    aiProcessorFormData.append('model', model);

    // Get AI processor URL from environment
    const aiProcessorUrl = process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 
                          process.env.NEXT_PUBLIC_API_BASE_URL || 
                          'http://localhost:8000';
    
    // Use regular transcription endpoint for now (chunked endpoint not implemented yet)
    const transcriptionUrl = `${aiProcessorUrl.replace(/\/$/, '')}/api/prontodoc/prerecorded/transcribe-openai-whisper`;
    
    console.log('🌐 [TRANSCRIBE-AUDIO-CHUNK] AI Processor configuration:');
    console.log('  - Base URL:', aiProcessorUrl);
    console.log('  - Chunked Transcription URL:', transcriptionUrl);

    console.log('📤 [TRANSCRIBE-AUDIO-CHUNK] Forwarding chunk to AI processor...');
    const startRequestTime = Date.now();
    
    // Forward request to AI processor with extended timeout for 4-minute chunks
    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      body: aiProcessorFormData,
      signal: AbortSignal.timeout(300000) // 5 minute timeout for 4-minute chunks
    });

    const requestDuration = Date.now() - startRequestTime;

    console.log('📥 [TRANSCRIBE-AUDIO-CHUNK] AI processor response:');
    console.log('  - Status:', response.status);
    console.log('  - Status Text:', response.statusText);
    console.log('  - Request Duration:', requestDuration + 'ms');
    console.log('  - Processing chunk:', chunkNumber);
    console.log('  - Is final chunk:', isFinalChunk);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] AI processor error:');
      console.error('  - Status:', response.status);
      console.error('  - Error:', errorText);
      console.error('  - Chunk number:', chunkNumber);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `AI processor error for chunk ${chunkNumber}: ${response.status} ${errorText}`,
          chunk_number: chunkNumber,
          session_id: sessionId
        },
        { status: response.status }
      );
    }

    // Parse successful response
    const result = await response.json();
    
    console.log('✅ [TRANSCRIBE-AUDIO-CHUNK] Chunk transcription successful:');
    console.log('  - Success:', result.success);
    console.log('  - Chunk number:', chunkNumber);
    console.log('  - Session ID:', sessionId);
    console.log('  - Transcript length:', result.transcript?.length || 0);
    console.log('  - Confidence:', result.confidence);
    console.log('  - Duration:', result.duration);
    console.log('  - Word count:', result.word_count);
    console.log('  - Is final chunk:', isFinalChunk);

    // Return standardized chunked response
    return NextResponse.json({
      success: result.success,
      transcript: result.transcript || '',
      chunk_number: chunkNumber,
      session_id: sessionId,
      is_final_chunk: isFinalChunk,
      confidence: result.confidence || 0,
      duration: result.duration || 0,
      word_count: result.word_count || 0,
      provider: result.provider || 'openai-whisper',
      processing_time: requestDuration
    });

  } catch (error) {
    console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] Unexpected error:', error);
    console.error('❌ [TRANSCRIBE-AUDIO-CHUNK] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('⏰ [TRANSCRIBE-AUDIO-CHUNK] Request timeout - chunk may be too large');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transcription timeout - audio chunk may be too large or service is busy. Please try again.',
          chunk_number: parseInt(request.formData().then(fd => fd.get('chunk_number') as string).catch(() => '-1')),
          session_id: request.formData().then(fd => fd.get('session_id') as string).catch(() => 'unknown')
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        chunk_number: -1,
        session_id: 'unknown'
      },
      { status: 500 }
    );
  }
}