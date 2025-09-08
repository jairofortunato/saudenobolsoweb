import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '../../../../types/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const patientId = searchParams.get('patient_id')
    const search = searchParams.get('search')

    console.log('🔧 [PRONTUARIOS API] GET request received');

    // Check for Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    let supabase;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🔄 [PRONTUARIOS API] Using Bearer token authentication for GET');
      
      // Create client with Bearer token
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      );
      
      try {
        const { data: { user: bearerUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.log('🚨 [PRONTUARIOS API] Bearer auth error in GET:', error);
        } else {
          user = bearerUser;
          console.log('✅ [PRONTUARIOS API] Bearer auth successful in GET:', user?.id);
        }
      } catch (error) {
        console.log('🚨 [PRONTUARIOS API] Bearer auth exception in GET:', error);
      }
    }
    
    // Fallback to cookie-based auth if Bearer token failed
    if (!user) {
      console.log('🔄 [PRONTUARIOS API] Trying cookie-based authentication for GET');
      try {
        const cookieStore = cookies()
        supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.log('🚨 [PRONTUARIOS API] Cookie auth error in GET:', authError);
        } else {
          user = authUser;
          console.log('✅ [PRONTUARIOS API] Cookie auth successful in GET:', user?.id);
        }
      } catch (cookieError) {
        console.log('🚨 [PRONTUARIOS API] Cookie parsing error in GET:', cookieError);
      }
    }
    
    if (!user) {
      console.log('🚨 [PRONTUARIOS API] No authenticated user found for GET');
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }
    
    let query = supabase!
      .from('prontuarios')
      .select(`
        id,
        content,
        summary,
        created_at,
        user_id,
        appointment_id,
        version,
        meta,
        title,
        patient_name,
        template_name,
        specialty
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (patientId) {
      query = query.eq('user_id', patientId)
    }

    if (search) {
      query = query.textSearch('content', search)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ [PRONTUARIOS API] Database error in GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ [PRONTUARIOS API] GET successful, found', data?.length || 0, 'prontuários');
    return NextResponse.json({ prontuarios: data })
    
  } catch (err) {
    console.error('❌ [PRONTUARIOS API] Unexpected error in GET:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log('🔧 [PRONTUARIOS API] POST request received');
    
    const body = await request.json()
    console.log('📦 [PRONTUARIOS API] Request body:', JSON.stringify(body, null, 2));
    
    // Check for Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    let supabase;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🔄 [PRONTUARIOS API] Using Bearer token authentication');
      
      // Create client with Bearer token
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          },
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      );
      
      try {
        const { data: { user: bearerUser }, error } = await supabase.auth.getUser();
        if (error) {
          console.log('🚨 [PRONTUARIOS API] Bearer auth error:', error);
        } else {
          user = bearerUser;
          console.log('✅ [PRONTUARIOS API] Bearer auth successful:', user?.id);
        }
      } catch (error) {
        console.log('🚨 [PRONTUARIOS API] Bearer auth exception:', error);
      }
    }
    
    // Fallback to cookie-based auth if Bearer token failed
    if (!user) {
      console.log('🔄 [PRONTUARIOS API] Trying cookie-based authentication');
      try {
        const cookieStore = cookies()
        supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.log('🚨 [PRONTUARIOS API] Cookie auth error:', authError);
        } else {
          user = authUser;
          console.log('✅ [PRONTUARIOS API] Cookie auth successful:', user?.id);
        }
      } catch (cookieError) {
        console.log('🚨 [PRONTUARIOS API] Cookie parsing error:', cookieError);
      }
    }
    
    if (!user) {
      console.log('🚨 [PRONTUARIOS API] No authenticated user found with either method');
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }
    
    console.log('✅ [PRONTUARIOS API] Authenticated user found:', user.id);

    // Get the user's profile_id for foreign key relationships
    let userProfileId = null;
    try {
      const { data: profileData, error: profileError } = await supabase!
        .from('profiles')
        .select('profile_id')
        .eq('user_id', user.id)
        .single();
        
      if (profileError) {
        console.log('⚠️ [PRONTUARIOS API] Could not find profile for user:', user.id);
        // We'll allow insertion without profile relationship
      } else {
        userProfileId = profileData.profile_id;
        console.log('✅ [PRONTUARIOS API] Found profile_id:', userProfileId);
      }
    } catch (profileErr) {
      console.log('⚠️ [PRONTUARIOS API] Profile lookup error:', profileErr);
    }

    // Prepare data for insertion with required fields matching actual schema
    const insertData = {
      content: body.content || '',
      summary: body.title || body.summary || '',
      user_id: user.id,
      appointment_id: body.appointment_id,
      version: 1,
      // New columns from our migration
      title: body.title || null,
      patient_id: body.patient_id || null, // Allow null for cases without patient
      created_by: userProfileId, // Use profile_id instead of user_id
      patient_name: body.patient_name || null,
      template_name: body.template_name || null,
      specialty: body.specialty || null,
      is_deleted: false,
      meta: {
        title: body.title,
        patient_name: body.patient_name,
        template_name: body.template_name,
        specialty: body.specialty,
        patient_id: body.patient_id,
        created_by: userProfileId,
        ...body.meta
      }
    }
    
    console.log('💾 [PRONTUARIOS API] Inserting data:', insertData);
    
    const { data, error } = await supabase!
      .from('prontuarios')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ [PRONTUARIOS API] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ [PRONTUARIOS API] Successfully saved:', data);
    return NextResponse.json({ prontuario: data })
    
  } catch (err) {
    console.error('❌ [PRONTUARIOS API] Unexpected error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}