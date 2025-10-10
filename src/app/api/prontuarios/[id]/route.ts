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

async function updateProntuario(
  request: Request,
  params: { id: string }
) {
  try {
    const prontuarioId = params.id
    console.log('🔧 [PRONTUARIO UPDATE] Update request for ID:', prontuarioId)

    const body = await request.json()
    console.log('📦 [PRONTUARIO UPDATE] Request body:', JSON.stringify(body, null, 2))

    // Check for Authorization header first (Bearer token)
    const authHeader = request.headers.get('authorization')
    let supabase
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🔄 [PRONTUARIO UPDATE] Using Bearer token authentication')

      // Create client with Bearer token
      const { createClient } = await import('@supabase/supabase-js')
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
      )

      try {
        const { data: { user: bearerUser }, error } = await supabase.auth.getUser()
        if (error) {
          console.log('🚨 [PRONTUARIO UPDATE] Bearer auth error:', error)
        } else {
          user = bearerUser
          console.log('✅ [PRONTUARIO UPDATE] Bearer auth successful:', user?.id)
        }
      } catch (error) {
        console.log('🚨 [PRONTUARIO UPDATE] Bearer auth exception:', error)
      }
    }

    // Fallback to cookie-based auth if Bearer token failed
    if (!user) {
      console.log('🔄 [PRONTUARIO UPDATE] Trying cookie-based authentication')
      try {
        const cookieStore = await cookies()
        supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          console.log('🚨 [PRONTUARIO UPDATE] Cookie auth error:', authError)
        } else {
          user = authUser
          console.log('✅ [PRONTUARIO UPDATE] Cookie auth successful:', user?.id)
        }
      } catch (cookieError) {
        console.log('🚨 [PRONTUARIO UPDATE] Cookie parsing error:', cookieError)
      }
    }

    if (!user) {
      console.log('🚨 [PRONTUARIO UPDATE] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized - No user found' }, { status: 401 })
    }

    console.log('✅ [PRONTUARIO UPDATE] Authenticated user found:', user.id)

    // Validate patient_id is a valid UUID or set to null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validPatientId = body.patient_id && uuidRegex.test(body.patient_id)
      ? body.patient_id
      : null

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.content !== undefined) updateData.content = body.content
    if (body.title !== undefined) updateData.title = body.title
    if (body.summary !== undefined) updateData.summary = body.summary
    if (body.patient_id !== undefined) updateData.patient_id = validPatientId
    if (body.patient_name !== undefined) updateData.patient_name = body.patient_name
    if (body.template_name !== undefined) updateData.template_name = body.template_name
    if (body.specialty !== undefined) updateData.specialty = body.specialty

    // Update meta if provided
    if (body.meta !== undefined) {
      updateData.meta = body.meta
    }

    console.log('💾 [PRONTUARIO UPDATE] Updating with data:', updateData)

    // Update the prontuário
    const { data, error } = await supabase!
      .from('prontuarios')
      .update(updateData)
      .eq('id', prontuarioId)
      .eq('user_id', user.id) // Ensure user owns this prontuário
      .select()
      .single()

    if (error) {
      console.error('❌ [PRONTUARIO UPDATE] Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      console.error('❌ [PRONTUARIO UPDATE] Prontuário not found or user not authorized')
      return NextResponse.json({ error: 'Prontuário not found or unauthorized' }, { status: 404 })
    }

    console.log('✅ [PRONTUARIO UPDATE] Successfully updated:', data.id)
    return NextResponse.json({ prontuario: data })

  } catch (err) {
    console.error('❌ [PRONTUARIO UPDATE] Unexpected error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return updateProntuario(request, params)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  return updateProntuario(request, params)
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