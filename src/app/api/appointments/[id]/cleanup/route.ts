/**
 * Manual Audio File Cleanup Route
 * Provides admin-only endpoint for cleaning up orphaned audio files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface CleanupResponse {
  success: boolean;
  message: string;
  details?: {
    appointmentId: string;
    audioPath?: string;
    deletedFromStorage: boolean;
    updatedDatabase: boolean;
  };
  error?: string;
}

interface AppointmentRecord {
  id: string;
  status: string;
  audio_path: string | null;
  user_id: string;
  created_at: string;
}

/**
 * DELETE /api/appointments/[id]/cleanup
 * Manually clean up audio files for a specific appointment
 * Admin-only access for orphaned file cleanup
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<CleanupResponse>> {
  
  try {
    const appointmentId = params.id;
    
    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        message: 'Appointment ID is required'
      }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user and verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }
    
    // Verify admin role or ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({
        success: false,
        message: 'User profile not found'
      }, { status: 403 });
    }
    
    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, status, audio_path, user_id, created_at')
      .eq('id', appointmentId)
      .single();
    
    if (appointmentError || !appointment) {
      return NextResponse.json({
        success: false,
        message: 'Appointment not found'
      }, { status: 404 });
    }
    
    const appointmentRecord = appointment as AppointmentRecord;
    
    // Check access permissions
    const isAdmin = profile.role === 'admin';
    const isOwner = profile.id === appointmentRecord.user_id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient permissions'
      }, { status: 403 });
    }
    
    // Verify appointment status allows cleanup
    const cleanupAllowedStatuses = ['failed', 'prontuario_ready'];
    const isOldProcessing = 
      appointmentRecord.status === 'processing' && 
      new Date().getTime() - new Date(appointmentRecord.created_at).getTime() > 2 * 60 * 60 * 1000; // 2 hours
    
    if (!cleanupAllowedStatuses.includes(appointmentRecord.status) && !isOldProcessing) {
      return NextResponse.json({
        success: false,
        message: `Cannot cleanup appointment with status: ${appointmentRecord.status}. Only failed, completed, or stuck appointments can be cleaned up.`
      }, { status: 400 });
    }
    
    // Check if there's actually an audio file to cleanup
    if (!appointmentRecord.audio_path) {
      return NextResponse.json({
        success: true,
        message: 'No audio file to cleanup',
        details: {
          appointmentId,
          deletedFromStorage: false,
          updatedDatabase: false
        }
      });
    }
    
    let deletedFromStorage = false;
    let updatedDatabase = false;
    
    try {
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('audio-files')
        .remove([appointmentRecord.audio_path]);
      
      if (storageError) {
        // Log error but don't fail the entire operation
        console.error('Storage deletion failed:', storageError);
        
        // Check if file doesn't exist (404 is considered success)
        if (storageError.message?.includes('not found') || storageError.message?.includes('404')) {
          deletedFromStorage = true;
        }
      } else {
        deletedFromStorage = true;
      }
      
      // Update database to remove audio_path and add cleanup metadata
      const updateData = {
        audio_path: null,
        meta: {
          ...appointmentRecord.meta || {},
          audio_cleanup: {
            cleaned_at: new Date().toISOString(),
            cleaned_by: user.id,
            cleanup_type: 'manual',
            original_path: appointmentRecord.audio_path,
            deleted_from_storage: deletedFromStorage
          }
        }
      };
      
      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);
      
      if (updateError) {
        console.error('Database update failed:', updateError);
      } else {
        updatedDatabase = true;
      }
      
    } catch (cleanupError) {
      console.error('Cleanup operation failed:', cleanupError);
      
      return NextResponse.json({
        success: false,
        message: 'Cleanup operation failed',
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    const success = deletedFromStorage || updatedDatabase;
    
    return NextResponse.json({
      success,
      message: success 
        ? 'Cleanup completed successfully'
        : 'Cleanup partially failed',
      details: {
        appointmentId,
        audioPath: appointmentRecord.audio_path,
        deletedFromStorage,
        updatedDatabase
      }
    });
    
  } catch (error) {
    console.error('Cleanup route error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/appointments/[id]/cleanup
 * Get cleanup status and recommendations for an appointment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  
  try {
    const appointmentId = params.id;
    
    if (!appointmentId) {
      return NextResponse.json({
        error: 'Appointment ID is required'
      }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, status, audio_path, user_id, created_at, meta')
      .eq('id', appointmentId)
      .single();
    
    if (appointmentError || !appointment) {
      return NextResponse.json({
        error: 'Appointment not found'
      }, { status: 404 });
    }
    
    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({
        error: 'User profile not found'
      }, { status: 403 });
    }
    
    const isAdmin = profile.role === 'admin';
    const isOwner = profile.id === appointment.user_id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }
    
    // Analyze cleanup status
    const now = new Date();
    const createdAt = new Date(appointment.created_at);
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    const cleanupStatus = {
      appointmentId,
      currentStatus: appointment.status,
      hasAudioFile: !!appointment.audio_path,
      audioPath: appointment.audio_path,
      ageHours: Math.round(ageHours * 100) / 100,
      canCleanup: false,
      cleanupReason: '',
      alreadyCleaned: false,
      recommendations: [] as string[]
    };
    
    // Check if already cleaned
    const cleanupMeta = appointment.meta?.audio_cleanup;
    if (cleanupMeta) {
      cleanupStatus.alreadyCleaned = true;
      cleanupStatus.cleanupReason = `Cleaned ${cleanupMeta.cleanup_type === 'manual' ? 'manually' : 'automatically'} on ${new Date(cleanupMeta.cleaned_at).toLocaleString()}`;
    }
    
    // Determine if cleanup is recommended
    if (!cleanupStatus.alreadyCleaned && appointment.audio_path) {
      if (appointment.status === 'failed') {
        cleanupStatus.canCleanup = true;
        cleanupStatus.cleanupReason = 'Appointment failed - audio file can be safely removed';
        cleanupStatus.recommendations.push('Clean up failed appointment audio file');
      } else if (appointment.status === 'prontuario_ready') {
        cleanupStatus.canCleanup = true;
        cleanupStatus.cleanupReason = 'Processing completed - audio file no longer needed';
        cleanupStatus.recommendations.push('Clean up completed appointment audio file');
      } else if (appointment.status === 'processing' && ageHours > 2) {
        cleanupStatus.canCleanup = true;
        cleanupStatus.cleanupReason = 'Appointment stuck in processing - likely orphaned';
        cleanupStatus.recommendations.push('Clean up stuck appointment audio file');
      }
      
      if (ageHours > 24) {
        cleanupStatus.recommendations.push('Consider cleanup for old appointment (>24h)');
      }
    }
    
    return NextResponse.json(cleanupStatus);
    
  } catch (error) {
    console.error('Cleanup status error:', error);
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}