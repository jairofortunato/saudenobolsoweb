import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/doctor/prontodoc-rcr30'

  console.log('🔧 Auth callback hit:', { code: !!code, next })

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Handle cookie setting errors in Server Component
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Handle cookie removal errors in Server Component
            }
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('❌ Error exchanging code for session:', error)
        return NextResponse.redirect(`${requestUrl.origin}/signin?error=${encodeURIComponent(error.message)}`)
      }

      console.log('✅ OAuth session created:', data.user?.email)

      // Check if user has a profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (profileError) {
        console.log('⚠️ Profile not found (will be created by trigger)')
      } else {
        console.log('✅ Profile found:', profile.role)
      }

      // Redirect to ProntoDoc for doctors, dashboard for patients
      const redirectPath = profile?.role === 'patient' ? '/dashboard' : '/doctor/prontodoc-rcr30'
      return NextResponse.redirect(`${requestUrl.origin}${next || redirectPath}`)
    } catch (error) {
      console.error('❌ Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/signin?error=authentication_failed`)
    }
  }

  // If no code, redirect to signin with error
  console.error('❌ No code in callback')
  return NextResponse.redirect(`${requestUrl.origin}/signin?error=no_code`)
}
