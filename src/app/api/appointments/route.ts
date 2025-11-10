import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';

/**
 * =====================================
 * RCR-30 APPOINTMENTS API ROUTE
 * =====================================
 * 
 * This API route handles appointment creation for the RCR-30 (Resilient Chunked Recording) system.
 * It creates new appointment records with 'recording' status for tracking consultation sessions.
 * 
 * WORKFLOW:
 * 1. Validates user authentication and doctor role
 * 2. Creates new appointment record in database
 * 3. Returns appointmentId for frontend tracking
 * 
 * REQUEST FORMAT:
 * - Content-Type: application/json
 * - patient_name: Optional patient name
 * - language: Recording language (default: 'pt-BR')
 * - template_id: Optional consultation template ID for prontuário generation
 * 
 * RESPONSE FORMAT:
 * - appointmentId: UUID for tracking
 * - status: Initial status ('recording')
 * - createdAt: Timestamp
 */

// POST /api/appointments - Create a new appointment record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to verify doctor role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Access denied. Only doctors can create appointments.' },
        { status: 403 }
      );
    }

    // Check consultation limit for free tier users
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, prontuarios_limit, current_period_start, current_period_end')
      .eq('user_id', user.id)
      .single();

    // Treat users with no subscription as free tier (default)
    // Only professional tier gets unlimited consultations
    const isProfessional = subscription?.tier === 'professional';

    if (!isProfessional) {
      // Get current period's usage
      const { data: usage } = await supabase
        .from('usage_tracking')
        .select('consultations_count')
        .eq('user_id', user.id)
        .gte('period_end', new Date().toISOString())
        .lte('period_start', new Date().toISOString())
        .single();

      const consultationsUsed = usage?.consultations_count || 0;
      const limit = subscription?.prontuarios_limit || 5; // Default to 5 if no subscription

      if (consultationsUsed >= limit) {
        return NextResponse.json(
          {
            error: 'Consultation limit reached',
            message: `You have used all ${limit} free consultations. Please upgrade to Professional for unlimited consultations.`,
            consultations_used: consultationsUsed,
            consultations_limit: limit,
            upgrade_required: true
          },
          { status: 402 } // Payment Required
        );
      }
    }
    // Professional tier: unlimited consultations, no check needed

    // Parse request body
    const body = await request.json();
    const { patient_name, language = 'pt-BR', template_id } = body;

    // Validate template if provided
    let templateData = null;
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('consultation_templates')
        .select('id, name, specialty, ai_prompt_template, is_public, created_by')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Invalid template ID or template not found' },
          { status: 400 }
        );
      }

      // Check if user has access to this template
      const hasAccess = template.is_public || template.created_by === profile.profile_id;
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied to the specified template' },
          { status: 403 }
        );
      }

      templateData = template;
    }

    // Create appointment record
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        patient_name: patient_name || null,
        status: 'recording',
        language: language,
        template_id: template_id || null, // NEW: Store selected template
        meta: {
          doctor_id: profile.profile_id,
          doctor_name: profile.name,
          created_via: 'rcr-30',
          template_name: templateData?.name || null,
          template_specialty: templateData?.specialty || null
        }
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
      createdAt: appointment.created_at,
      patientName: appointment.patient_name,
      template: templateData ? {
        id: templateData.id,
        name: templateData.name,
        specialty: templateData.specialty
      } : null
    });

  } catch (error) {
    console.error('Appointment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/appointments - List user's appointments (optional for dashboard)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch user's appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointments: appointments || [],
      pagination: {
        limit,
        offset,
        total: appointments?.length || 0
      }
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}