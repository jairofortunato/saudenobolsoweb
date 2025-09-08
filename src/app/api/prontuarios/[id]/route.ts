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
    
    const { data, error } = await supabase!
      .from('prontuarios')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('❌ [PRONTUARIOS API] Database error in individual GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      console.log('🚨 [PRONTUARIOS API] Prontuário not found:', params.id);
      return NextResponse.json({ error: 'Prontuário not found' }, { status: 404 })
    }

    console.log('✅ [PRONTUARIOS API] Individual GET successful for:', params.id);
    return NextResponse.json({ prontuario: data })
    
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