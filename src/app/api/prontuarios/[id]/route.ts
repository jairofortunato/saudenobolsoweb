import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔧 [PRONTUARIOS API] GET individual request received for ID:', params.id);

    // Check for Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization');
    let supabase;
    let user = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🔄 [PRONTUARIOS API] Using Bearer token authentication for individual GET');
      
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
          console.log('🚨 [PRONTUARIOS API] Bearer auth error in individual GET:', error);
        } else {
          user = bearerUser;
          console.log('✅ [PRONTUARIOS API] Bearer auth successful in individual GET:', user?.id);
        }
      } catch (error) {
        console.log('🚨 [PRONTUARIOS API] Bearer auth exception in individual GET:', error);
      }
    }
    
    // Fallback to cookie-based auth if Bearer token failed
    if (!user) {
      console.log('🔄 [PRONTUARIOS API] Trying cookie-based authentication for individual GET');
      try {
        const cookieStore = cookies()
        supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.log('🚨 [PRONTUARIOS API] Cookie auth error in individual GET:', authError);
        } else {
          user = authUser;
          console.log('✅ [PRONTUARIOS API] Cookie auth successful in individual GET:', user?.id);
        }
      } catch (cookieError) {
        console.log('🚨 [PRONTUARIOS API] Cookie parsing error in individual GET:', cookieError);
      }
    }
    
    if (!user) {
      console.log('🚨 [PRONTUARIOS API] No authenticated user found for individual GET');
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }
    
    // Try prontuarios table first
    const { data: prontuarioData, error: prontuarioError } = await supabase!
      .from('prontuarios')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (prontuarioData) {
      console.log('✅ [PRONTUARIOS API] Found in prontuarios table:', params.id);
      return NextResponse.json({ prontuario: prontuarioData })
    }

    // If not found in prontuarios, try appointments table
    const { data: appointmentData, error: appointmentError } = await supabase!
      .from('appointments')
      .select('id, prontuario, patient_name, created_at, meta')
      .eq('id', params.id)
      .maybeSingle()

    if (appointmentError) {
      console.error('❌ [PRONTUARIOS API] Database error in appointments:', appointmentError);
      return NextResponse.json({ error: appointmentError.message }, { status: 500 })
    }

    if (!appointmentData) {
      console.log('🚨 [PRONTUARIOS API] Prontuário not found in either table:', params.id);
      return NextResponse.json({ error: 'Prontuário not found' }, { status: 404 })
    }

    // Extract prontuario text from JSONB field
    const prontuarioText = appointmentData.prontuario?.prontuario_text ||
                           appointmentData.prontuario?.content ||
                           appointmentData.prontuario?.text ||
                           JSON.stringify(appointmentData.prontuario, null, 2);

    // Format response to match expected structure
    const formattedProntuario = {
      id: appointmentData.id,
      content: prontuarioText,
      patient_name: appointmentData.patient_name,
      created_at: appointmentData.created_at,
      title: appointmentData.meta?.title || null,
      template_name: appointmentData.meta?.template_name || null,
      specialty: appointmentData.meta?.specialty || null,
      summary: appointmentData.meta?.summary || null,
      meta: appointmentData.meta
    };

    console.log('✅ [PRONTUARIOS API] Found in appointments table:', params.id);
    return NextResponse.json({ prontuario: formattedProntuario })
    
  } catch (err) {
    console.error('❌ [PRONTUARIOS API] Unexpected error in individual GET:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
  
  const { data, error } = await supabase
    .from('prontuarios')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ prontuario: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
  
  const { error } = await supabase
    .from('prontuarios')
    .update({ is_deleted: true })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}