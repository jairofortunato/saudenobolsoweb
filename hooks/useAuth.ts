'use client'

import { useContext, useEffect, useState, createContext } from 'react'
import { createClient } from '../lib/supabase'
import type { 
  AuthState, 
  AuthResult, 
  SignUpData, 
  SignInData,
  AuthContextType
} from '../types/auth'
import type { Profile } from '../types/database'

// Create the context here to avoid circular imports
export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export function useAuthState(): AuthContextType {
  console.log('🔧 useAuthState: Initializing')
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null
  })
  
  console.log('🔧 useAuthState: Creating Supabase client')
  const supabase = createClient()
  console.log('🔧 useAuthState: Supabase client created')
  
  useEffect(() => {
    console.log('🔧 useAuth: useEffect triggered')
    
    // Get initial session - SIMPLE VERSION
    const getInitialSession = async () => {
      console.log('🔧 useAuth: Getting initial session...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔧 useAuth: Session result:', { session: session?.user?.email, error })

        // Ignore refresh token errors - just treat as no session
        if (error) {
          if (error.message?.includes('refresh_token_not_found') || error.message?.includes('Invalid Refresh Token')) {
            console.log('ℹ️ useAuth: No valid session (refresh token not found)')
            setState({ user: null, session: null, profile: null, loading: false, error: null })
            return
          }
          console.error('❌ useAuth: Error getting session:', error)
          setState({ user: null, session: null, profile: null, loading: false, error: error.message })
          return
        }

        if (session?.user) {
          console.log('🔧 useAuth: User found, setting state immediately')
          // Set user immediately - don't wait for profile
          setState({
            user: session.user,
            session,
            profile: null, // Will be loaded separately
            loading: false, // ✅ STOP LOADING IMMEDIATELY
            error: null
          })

          // Fetch profile in background - don't block UI
          fetchUserProfileInBackground(session.user.id)
        } else {
          console.log('🔧 useAuth: No user session')
          setState({ user: null, session: null, profile: null, loading: false, error: null })
        }
      } catch (error: any) {
        // Catch refresh token errors and treat as no session
        if (error?.message?.includes('refresh_token_not_found') || error?.message?.includes('Invalid Refresh Token')) {
          console.log('ℹ️ useAuth: No valid session (caught refresh token error)')
          setState({ user: null, session: null, profile: null, loading: false, error: null })
          return
        }
        console.error('❌ useAuth: Error in getInitialSession:', error)
        setState({ user: null, session: null, profile: null, loading: false, error: 'Erro de conexão' })
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes - SIMPLE VERSION
    console.log('🔧 useAuth: Setting up auth state change listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔧 useAuth: Auth state changed:', event, session?.user?.email)

        try {
          if (session?.user) {
            console.log('🔧 useAuth: Auth change - user found, setting state immediately')
            setState({
              user: session.user,
              session,
              profile: null, // Will be loaded separately
              loading: false, // ✅ STOP LOADING IMMEDIATELY
              error: null
            })

            // Fetch profile in background
            fetchUserProfileInBackground(session.user.id)
          } else {
            console.log('🔧 useAuth: Auth change - no user')
            setState({ user: null, session: null, profile: null, loading: false, error: null })
          }
        } catch (error: any) {
          // Ignore refresh token errors in auth state change
          if (error?.message?.includes('refresh_token_not_found') || error?.message?.includes('Invalid Refresh Token')) {
            console.log('ℹ️ useAuth: Auth state change - ignoring refresh token error')
            setState({ user: null, session: null, profile: null, loading: false, error: null })
          } else {
            console.error('❌ useAuth: Auth state change error:', error)
          }
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])
  
  // Background profile fetch - NO TIMEOUTS, NO RETRIES, NO BLOCKING
  const fetchUserProfileInBackground = async (userId: string) => {
    console.log('🔧 fetchUserProfile: Background fetch for userId:', userId)
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ fetchUserProfile: Profile not found (normal for new users)')
        } else {
          console.error('❌ fetchUserProfile: Error:', error)
        }
        return // Don't update state on error - just ignore
      }
      
      console.log('✅ fetchUserProfile: Profile fetched successfully')
      // Update state with profile - but keep everything else the same
      setState(prev => ({ ...prev, profile: data }))
      
    } catch (error) {
      console.error('❌ fetchUserProfile: Background fetch failed:', error)
      // Don't update state on error - just ignore
    }
  }
  
  const signUp = async (signUpData: SignUpData): Promise<AuthResult> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      console.log('🔧 Starting signup process for role:', signUpData.role)

      // Sign up user with Supabase Auth - pass metadata for trigger
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            role: signUpData.role,
            full_name: signUpData.fullName
          }
        }
      })
      
      console.log('🔧 Signup response:', { 
        user: data.user ? { id: data.user.id, email: data.user.email, email_confirmed_at: data.user.email_confirmed_at } : null,
        session: data.session ? 'Present' : 'Null',
        error: error
      })
      
      if (error) {
        console.error('❌ Auth signup error:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        console.log('🔧 User created, checking if confirmed:', data.user.email_confirmed_at)
        
        // Check if email confirmation is required
        if (!data.user.email_confirmed_at && !data.session) {
          console.log('📧 Email confirmation required')
          setState((prev: AuthState) => ({ ...prev, loading: false }))
          return { 
            success: true, 
            user: data.user,
            requiresEmailConfirmation: true
          }
        }
        
        console.log('🔧 Profile creation handled by database trigger')

        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        if (data.user) {
          console.log('✅ Profile created successfully')
          // Fetch profile in background after creation
          fetchUserProfileInBackground(data.user.id)
          setState((prev: AuthState) => ({ ...prev, loading: false }))
          return { success: true, user: data.user }
        }
      }
      
      setState((prev: AuthState) => ({ ...prev, loading: false, error: 'Unexpected error during signup' }))
      return { success: false, error: 'Unexpected error during signup' }
    } catch (error) {
      console.error('❌ Signup error:', error)
      setState((prev: AuthState) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }))
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
  
  const signIn = async (signInData: SignInData): Promise<AuthResult> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      console.log('🔧 Starting signin process...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      })
      
      console.log('🔧 Signin response:', { user: data.user?.email, error })
      
      if (error) {
        console.error('❌ Signin error:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        console.log('✅ Signin successful')
        // Profile will be fetched automatically by onAuthStateChange
        setState((prev: AuthState) => ({ ...prev, loading: false }))
        return { success: true, user: data.user }
      }
      
      setState((prev: AuthState) => ({ ...prev, loading: false, error: 'Signin failed' }))
      return { success: false, error: 'Signin failed' }
    } catch (error) {
      console.error('❌ Signin error:', error)
      setState((prev: AuthState) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }))
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
  
  const signInWithGoogle = async (): Promise<AuthResult> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))

      console.log('🔧 Starting Google OAuth signin...')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('❌ Google signin error:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }

      console.log('✅ Google OAuth initiated - redirecting to Google...')
      // Note: User will be redirected to Google for authentication
      // They will return to /auth/callback which exchanges code for session
      return { success: true }
    } catch (error) {
      console.error('❌ Google signin error:', error)
      setState((prev: AuthState) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }))
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('❌ Signout error:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        throw new Error(error.message)
      }

      console.log('✅ Signout successful')
      setState({ user: null, session: null, profile: null, loading: false, error: null })
    } catch (error) {
      console.error('❌ Signout error:', error)
      setState((prev: AuthState) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Signout failed' }))
      throw error
    }
  }
  
  const updateProfile = async (profileData: Partial<Profile>): Promise<AuthResult> => {
    if (!state.user) {
      return { success: false, error: 'No user found' }
    }
    
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      console.log('🔧 Updating profile...')
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', state.user.id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Profile update error:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      console.log('✅ Profile updated successfully')
      setState((prev: AuthState) => ({ ...prev, profile: data, loading: false }))
      return { success: true, profile: data }
    } catch (error) {
      console.error('❌ Update profile error:', error)
      setState((prev: AuthState) => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Unknown error' }))
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
  
  const refreshProfile = async (): Promise<void> => {
    if (!state.user?.id) {
      console.log('⚠️ No user to refresh profile for')
      return
    }
    
    console.log('🔧 Refreshing profile...')
    // Use background fetch - no need to wait or handle errors
    fetchUserProfileInBackground(state.user.id)
  }
  
  return {
    ...state,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile
  }
} 