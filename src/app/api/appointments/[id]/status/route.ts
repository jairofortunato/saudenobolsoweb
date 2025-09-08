import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../lib/supabase-server';

/**
 * =====================================
 * RCR-30 STATUS POLLING API ROUTE
 * =====================================
 * 
 * This API route provides real-time status updates for appointment processing.
 * It supports the 6-state progression and returns relevant data for each state.
 * 
 * STATUS PROGRESSION:
 * recording → uploading → processing → transcribed → prontuario_ready → [failed]
 * 
 * WORKFLOW:
 * 1. Validates user authentication and appointment ownership
 * 2. Returns current status and relevant data
 * 3. Includes transcript and prontuário when available
 * 
 * RESPONSE FORMAT:
 * - status: Current appointment status
 * - transcript: Available when status >= 'transcribed'
 * - prontuario: Available when status = 'prontuario_ready'
 * - template: Template information when available
 * - updatedAt: Last status update timestamp
 * - processingInfo: Additional processing details
 */

interface RouteContext {
  params: { id: string };
}

// GET /api/appointments/[id]/status - Get appointment status
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID format' },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch appointment with status and template information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        consultation_templates (
          id,
          name,
          specialty,
          ai_prompt_template
        )
      `)
      .eq('id', appointmentId)
      .eq('user_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // Build response based on status
    const response: any = {
      appointmentId: appointment.id,
      status: appointment.status,
      createdAt: appointment.created_at,
      patientName: appointment.patient_name,
      language: appointment.language,
      durationSeconds: appointment.duration_seconds || 0
    };

    // Add transcript if available (status >= 'transcribed')
    if (appointment.transcript && ['transcribed', 'prontuario_ready'].includes(appointment.status)) {
      response.transcript = appointment.transcript;
    }

    // Add prontuário if ready
    if (appointment.prontuario && appointment.status === 'prontuario_ready') {
      response.prontuario = appointment.prontuario;
    }

    // Add audio info if uploaded
    if (appointment.audio_path) {
      response.audioInfo = {
        path: appointment.audio_path,
        mimeType: appointment.audio_mime,
        sizeBytes: appointment.audio_size_bytes
      };
    }

    // Add template information if available
    if (appointment.consultation_templates) {
      response.template = {
        id: appointment.consultation_templates.id,
        name: appointment.consultation_templates.name,
        specialty: appointment.consultation_templates.specialty,
        ai_prompt_template: appointment.consultation_templates.ai_prompt_template
      };
    } else if (appointment.meta?.template_name) {
      // Fallback to template info stored in meta
      response.template = {
        id: appointment.template_id || 'unknown',
        name: appointment.meta.template_name,
        specialty: appointment.meta.template_specialty || 'Clínica Geral',
        ai_prompt_template: null // Not available in meta
      };
    }

    // Add processing metadata
    if (appointment.meta) {
      response.meta = appointment.meta;
    }

    // Add status-specific information
    switch (appointment.status) {
      case 'recording':
        response.message = 'Recording in progress...';
        break;
      case 'uploading':
        response.message = 'Uploading audio file...';
        break;
      case 'processing':
        response.message = 'Processing audio and generating transcript...';
        break;
      case 'transcribed':
        response.message = 'Transcript ready, generating medical record...';
        break;
      case 'prontuario_ready':
        response.message = 'Medical record is ready!';
        break;
      case 'failed':
        response.message = 'Processing failed. Please try again.';
        response.error = appointment.meta?.error || 'Unknown error occurred';
        break;
    }

    console.log(`🔍 [STATUS API] Returning response for appointment ${appointment.id}:`, {
      status: response.status,
      hasTranscript: !!response.transcript,
      hasProntuario: !!response.prontuario,
      message: response.message
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status polling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments/[id]/status - Update appointment status (for backend use)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // This endpoint is primarily for backend services
    // In production, you might want to add API key authentication here
    
    // Get request body
    const body = await request.json();
    const { status, transcript, prontuario, duration_seconds, meta } = body;

    // Validate status
    const validStatuses = ['recording', 'uploading', 'processing', 'transcribed', 'prontuario_ready', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update appointment
    const updateData: any = { status };
    
    if (transcript) updateData.transcript = transcript;
    if (prontuario) updateData.prontuario = prontuario;
    if (duration_seconds) updateData.duration_seconds = duration_seconds;
    if (meta) updateData.meta = { ...updateData.meta, ...meta };

    const { data: appointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}