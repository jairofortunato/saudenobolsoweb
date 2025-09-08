import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../lib/supabase-server';

/**
 * =====================================
 * RCR-30 SIGNED UPLOAD URL API ROUTE
 * =====================================
 * 
 * This API route generates signed URLs for secure audio file uploads to Supabase Storage.
 * It validates appointment ownership and provides temporary upload access.
 * 
 * WORKFLOW:
 * 1. Validates user authentication and appointment ownership
 * 2. Generates unique file path for audio storage
 * 3. Creates signed URL with expiration (15 minutes)
 * 4. Returns secure upload endpoint and metadata
 * 
 * RESPONSE FORMAT:
 * - signedUrl: Temporary upload URL
 * - uploadPath: Storage path for the file
 * - expiresAt: URL expiration timestamp
 * - maxFileSize: Maximum allowed file size
 */

interface RouteContext {
  params: { id: string };
}

// GET /api/appointments/[id]/upload-url - Generate signed upload URL
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const appointmentId = id;

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

    // Check if appointment is in correct status for upload
    if (appointment.status !== 'recording') {
      return NextResponse.json(
        { error: `Cannot upload for appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uploadPath = `rcr-30/${user.id}/${appointmentId}/${timestamp}.webm`;

    // Generate signed URL for upload (15 minutes expiration)
    console.log('🔍 DEBUG: Attempting to create signed URL for:', uploadPath);
    console.log('🔍 DEBUG: User ID:', user.id);
    console.log('🔍 DEBUG: Appointment ID:', appointmentId);
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('audio-files')
      .createSignedUploadUrl(uploadPath, {
        upsert: true // Allow overwriting if needed
      });

    if (signedUrlError) {
      console.error('🚨 DETAILED STORAGE ERROR:', {
        error: signedUrlError,
        message: signedUrlError.message,
        details: signedUrlError.details,
        hint: signedUrlError.hint,
        code: signedUrlError.code,
        uploadPath: uploadPath,
        bucket: 'audio-files',
        userId: user.id
      });
      return NextResponse.json(
        { 
          error: 'Failed to generate upload URL', 
          details: signedUrlError.message,
          code: signedUrlError.code,
          hint: signedUrlError.hint
        },
        { status: 500 }
      );
    }

    // Calculate expiration time (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      uploadPath: uploadPath,
      token: signedUrlData.token,
      expiresAt: expiresAt.toISOString(),
      maxFileSize: 33554432, // 32MB in bytes
      allowedMimeTypes: [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/wav',
        'audio/mp4',
        'audio/mpeg'
      ]
    });

  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}