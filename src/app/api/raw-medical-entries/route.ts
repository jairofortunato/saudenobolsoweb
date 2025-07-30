import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role and get profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [Raw Medical Entries GET] Profile not found for user:', user.id, 'Error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let query = supabase
      .from('raw_medical_entries')
      .select(`
        id,
        raw_text,
        category,
        ai_processed,
        processing_success,
        processing_error,
        entries_created,
        created_at,
        patient_id,
        created_by,
        profiles!raw_medical_entries_created_by_fkey(full_name, role)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // If patient, only show their own entries
    if (profile.role === 'patient') {
      const profileId = profile.profile_id || profile.id;
      query = query.eq('patient_id', profileId);
    }
    // Doctors can see all entries (handled by RLS policies)

    const { data: rawEntries, error } = await query;

    if (error) {
      console.error('Error fetching raw medical entries:', error);
      return NextResponse.json({ error: 'Failed to fetch raw medical entries' }, { status: 500 });
    }

    return NextResponse.json({ rawEntries: rawEntries || [] });

  } catch (error) {
    console.error('Raw medical entries GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile (handle both old and new schema)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 [Raw Medical Entries] Profile lookup:', { 
      hasProfile: !!profile, 
      profileError: !!profileError,
      userId: user.id,
      profileFields: profile ? Object.keys(profile) : 'none'
    });

    if (profileError || !profile) {
      console.error('❌ [Raw Medical Entries] Profile not found for user:', user.id, 'Error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      raw_text, 
      category, 
      patient_id, 
      ai_processed = false, 
      processing_success = false,
      processing_error,
      entries_created = 0
    } = body;

    if (!raw_text) {
      return NextResponse.json({ error: 'Raw text is required' }, { status: 400 });
    }

    // Determine patient_id - if not provided, use current user's profile ID (for patients)
    let finalPatientId = patient_id;
    
    // Get the correct profile ID field (handle both schemas)
    const profileId = profile.profile_id || profile.id;
    console.log('🔍 [Raw Medical Entries] Profile ID:', profileId, 'Role:', profile.role);
    
    if (!finalPatientId) {
      // For patients, use their own profile ID
      if (profile.role === 'patient') {
        finalPatientId = profileId;
      } else {
        return NextResponse.json({ error: 'Patient ID is required for doctors' }, { status: 400 });
      }
    }

    // Create the raw medical entry
    console.log('🔍 [Raw Medical Entries] Creating entry for patient:', finalPatientId, 'by:', profileId);
    
    const { data: rawEntry, error } = await supabase
      .from('raw_medical_entries')
      .insert({
        patient_id: finalPatientId,
        created_by: profileId, // Use the correct profile ID field
        raw_text,
        category,
        ai_processed,
        processing_success,
        processing_error,
        entries_created
      })
      .select(`
        id,
        raw_text,
        category,
        ai_processed,
        processing_success,
        processing_error,
        entries_created,
        created_at,
        patient_id,
        created_by
      `)
      .single();

    if (error) {
      console.error('Error creating raw medical entry:', error);
      return NextResponse.json({ error: 'Failed to create raw medical entry' }, { status: 500 });
    }

    return NextResponse.json({ rawEntry });

  } catch (error) {
    console.error('Raw medical entries POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile (handle both schemas)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [Raw Medical Entries PUT] Profile not found for user:', user.id, 'Error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the correct profile ID field
    const profileId = profile.profile_id || profile.id;
    console.log('🔄 [Raw Medical Entries PUT] Profile ID:', profileId, 'Role:', profile.role);

    const body = await request.json();
    const { 
      id,
      ai_processed,
      processing_success,
      processing_error,
      entries_created
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Update the raw medical entry
    console.log('🔄 [Raw Medical Entries PUT] Updating entry:', id, 'created_by:', profileId);
    
    const { data: rawEntry, error } = await supabase
      .from('raw_medical_entries')
      .update({
        ai_processed,
        processing_success,
        processing_error,
        entries_created,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('created_by', profileId) // Only allow updating own entries
      .select()
      .single();

    if (error) {
      console.error('❌ [Raw Medical Entries PUT] Update failed:', error);
      return NextResponse.json({ error: 'Failed to update raw medical entry' }, { status: 500 });
    }

    console.log('✅ [Raw Medical Entries PUT] Entry updated successfully:', rawEntry.id);
    return NextResponse.json({ rawEntry });

  } catch (error) {
    console.error('Raw medical entries PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 