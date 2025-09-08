import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../lib/supabase-server';

/**
 * =====================================
 * RCR-30 UPLOAD COMPLETE API ROUTE
 * =====================================
 * 
 * This API route handles post-upload processing for RCR-30 appointments.
 * It updates the appointment with upload metadata and triggers backend processing.
 * 
 * WORKFLOW:
 * 1. Validates user authentication and appointment ownership
 * 2. Updates appointment with audio file metadata
 * 3. Changes status from 'uploading' to 'processing'
 * 4. Triggers Railway backend processing (optional webhook)
 * 
 * REQUEST FORMAT:
 * - audioPath: Storage path of uploaded file
 * - audioMimeType: MIME type of uploaded file
 * - audioSizeBytes: File size in bytes
 * - durationSeconds: Recording duration
 * 
 * RESPONSE FORMAT:
 * - success: Boolean indicating completion
 * - status: Updated appointment status
 * - processingTriggered: Whether backend processing was initiated
 */

interface RouteContext {
  params: { id: string };
}

// POST /api/appointments/[id]/upload-complete - Mark upload as complete and trigger processing
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    console.log('🔍 DEBUG: Upload complete request received');
    const supabase = await createClient();
    const { id } = await params;
    const appointmentId = id;
    console.log('🔍 DEBUG: Processing appointment:', appointmentId);

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

    // Parse request body
    const body = await request.json();
    const { audioPath, audioMimeType, audioSizeBytes, durationSeconds } = body;

    // Validate required fields
    if (!audioPath) {
      return NextResponse.json(
        { error: 'Audio path is required' },
        { status: 400 }
      );
    }

    // Verify appointment exists and belongs to user
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('user_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or access denied' },
        { status: 404 }
      );
    }

    // Verify appointment is in correct status
    if (appointment.status !== 'recording' && appointment.status !== 'uploading') {
      return NextResponse.json(
        { error: `Cannot complete upload for appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // Use the RPC function to update appointment securely
    const { error: updateError } = await supabase
      .rpc('set_appointment_uploading', {
        _id: appointmentId,
        _audio_path: audioPath,
        _audio_mime: audioMimeType || 'audio/webm;codecs=opus',
        _audio_size: audioSizeBytes || null
      });

    if (updateError) {
      console.error('🚨 DETAILED UPDATE ERROR:', {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        appointmentId: appointmentId,
        audioPath: audioPath
      });
      return NextResponse.json(
        { 
          error: 'Failed to update appointment',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }

    // Update status to processing and add duration if provided
    const updateData: any = { 
      status: 'processing'
    };
    
    if (durationSeconds) {
      updateData.duration_seconds = durationSeconds;
    }

    // Add processing metadata
    updateData.meta = {
      ...appointment.meta,
      upload_completed_at: new Date().toISOString(),
      processing_started_at: new Date().toISOString()
    };

    let { data: updatedAppointment, error: statusUpdateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (statusUpdateError) {
      console.error('Error updating appointment status:', statusUpdateError);
      return NextResponse.json(
        { error: 'Failed to update appointment status' },
        { status: 500 }
      );
    }

    // Trigger backend processing (Railway webhook)
    let processingTriggered = false;
    
    try {
      const railwayBackendUrl = process.env.AI_PROCESSOR_URL;
      console.log('🚀 [UPLOAD-COMPLETE] Preparing to trigger AI processing...');
      console.log('   📍 Backend URL:', railwayBackendUrl);
      
      if (railwayBackendUrl) {
        const webhookPayload = {
          appointmentId: appointmentId,
          userId: user.id,
          audioPath: audioPath,
          audioMimeType: audioMimeType,
          audioSizeBytes: audioSizeBytes,
          durationSeconds: durationSeconds,
          language: appointment.language || 'pt-BR',
          patientName: appointment.patient_name
        };

        console.log('📦 [UPLOAD-COMPLETE] Webhook payload:', {
          appointmentId,
          audioPath,
          audioSizeBytes,
          durationSeconds,
          language: appointment.language || 'pt-BR'
        });

        console.log('🔗 [UPLOAD-COMPLETE] Calling AI processor endpoint...');
        const webhookResponse = await fetch(`${railwayBackendUrl}/api/rcr30/process-appointment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AI_PROCESSOR_API_KEY || 'default-key'}`
          },
          body: JSON.stringify(webhookPayload)
        });

        console.log(`📡 [UPLOAD-COMPLETE] AI processor response: ${webhookResponse.status} ${webhookResponse.statusText}`);

        if (webhookResponse.ok) {
          processingTriggered = true;
          const responseData = await webhookResponse.json();
          console.log('✅ [UPLOAD-COMPLETE] Backend processing triggered successfully!', responseData);
          
          // CRITICAL FIX: If processing completed immediately with results, update the appointment
          if (responseData.status === 'prontuario_ready' && responseData.transcript && responseData.prontuario) {
            console.log('🎯 [UPLOAD-COMPLETE] Backend completed immediately! Updating appointment with results...');
            
            const immediateUpdateData = {
              status: 'prontuario_ready',
              transcript: responseData.transcript,
              prontuario: responseData.prontuario,
              meta: {
                ...updatedAppointment.meta,
                processing_completed_at: new Date().toISOString(),
                ai_processing_time: responseData.processingTime
              }
            };
            
            const { data: immediatelyUpdatedAppointment, error: immediateUpdateError } = await supabase
              .from('appointments')
              .update(immediateUpdateData)
              .eq('id', appointmentId)
              .select()
              .single();
              
            if (!immediateUpdateError && immediatelyUpdatedAppointment) {
              console.log('✅ [UPLOAD-COMPLETE] Appointment updated with immediate results!');
              // Update the response to include the completed data
              updatedAppointment = immediatelyUpdatedAppointment;
            } else {
              console.error('❌ [UPLOAD-COMPLETE] Failed to update appointment with immediate results:', immediateUpdateError);
            }
          }
        } else {
          const errorText = await webhookResponse.text();
          console.error(`❌ [UPLOAD-COMPLETE] Failed to trigger backend processing: ${webhookResponse.status}`, errorText);
        }
      } else {
        console.warn('⚠️  [UPLOAD-COMPLETE] AI_PROCESSOR_URL not configured, backend processing not triggered');
      }
    } catch (webhookError) {
      console.error('Error triggering backend processing:', webhookError);
      // Don't fail the request if webhook fails - processing can be triggered manually
    }

    console.log('🎯 [UPLOAD-COMPLETE] Final response being sent to frontend:', {
      appointmentId,
      status: updatedAppointment.status,
      hasTranscript: !!updatedAppointment.transcript,
      hasProntuario: !!updatedAppointment.prontuario,
      processingTriggered
    });

    const response = {
      success: true,
      appointmentId: appointmentId,
      status: updatedAppointment.status,
      processingTriggered: processingTriggered,
      audioInfo: {
        path: audioPath,
        mimeType: audioMimeType,
        sizeBytes: audioSizeBytes,
        durationSeconds: durationSeconds
      },
      message: processingTriggered 
        ? 'Upload completed and backend processing triggered' 
        : 'Upload completed, backend processing will be handled separately'
    };

    // Include completed data if available
    if (updatedAppointment.transcript) {
      response.transcript = updatedAppointment.transcript;
    }
    if (updatedAppointment.prontuario) {
      response.prontuario = updatedAppointment.prontuario;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('🚨 UPLOAD COMPLETE GENERAL ERROR:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      appointmentId: appointmentId
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}