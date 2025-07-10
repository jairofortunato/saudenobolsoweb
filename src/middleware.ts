import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/signin',
    '/signup',
    '/emergency', // Emergency access might be public
  ]

  // Routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/medications',
    '/allergies', 
    '/exams',
    '/diseases',
    '/consultations',
    '/profile',
  ]

  // Doctor-only routes
  const doctorRoutes = [
    '/doctor',
  ]

  // Patient-only routes
  const patientRoutes = [
    '/patient',
  ]

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if route is doctor-only
  const isDoctorRoute = doctorRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if route is patient-only  
  const isPatientRoute = patientRoutes.some(route => 
    pathname.startsWith(route)
  )

  // If user is not authenticated and trying to access protected route
  if (!user && (isProtectedRoute || isDoctorRoute || isPatientRoute)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/signin'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth pages
  if (user && (pathname === '/signin' || pathname === '/signup')) {
    const redirectUrl = request.nextUrl.clone()
    
    // Get user profile to determine redirect destination
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (profile?.role === 'doctor') {
      redirectUrl.pathname = '/doctor/dashboard'
    } else {
      redirectUrl.pathname = '/dashboard'
    }
    
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based route protection
  if (user && (isDoctorRoute || isPatientRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    // Redirect doctors trying to access patient routes
    if (isDoctorRoute && profile?.role !== 'doctor') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect patients trying to access doctor routes
    if (isPatientRoute && profile?.role !== 'patient') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/doctor/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Handle emergency access with CPF/PIN
  if (pathname.startsWith('/emergency/')) {
    const segments = pathname.split('/')
    const cpf = segments[2]
    const pin = segments[3]
    
    if (cpf && pin) {
      // Verify CPF/PIN combination exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('cpf', cpf)
        .eq('pin', pin)
        .eq('role', 'patient')
        .single()
      
      if (!profile) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/emergency'
        redirectUrl.searchParams.set('error', 'invalid_credentials')
        return NextResponse.redirect(redirectUrl)
      }
      
      // Add patient ID to headers for emergency access
      response.headers.set('x-patient-id', profile.id)
    }
  }

  // Auto-redirect root based on authentication status
  if (pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      
      const redirectUrl = request.nextUrl.clone()
      if (profile?.role === 'doctor') {
        redirectUrl.pathname = '/doctor/dashboard'
      } else {
        redirectUrl.pathname = '/dashboard'
      }
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 