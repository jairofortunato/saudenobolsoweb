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
        
        if (error) {
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
      } catch (error) {
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
      
      console.log('🔧 Starting signup process...')
      
      // Sign up user with Supabase Auth - include CPF and PIN for trigger
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
            cpf: signUpData.cpf,
            pin: signUpData.pin,
            role: signUpData.role
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
        
        console.log('🔧 Checking if profile was linked by trigger for user:', data.user.id)
        
        // Wait a moment for trigger to complete, then check for linked profile
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // First, check if the trigger already linked a doctor-created profile
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('profile_id, cpf, linked')
          .eq('user_id', data.user.id)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
          console.log('⚠️ Profile check error (might be RLS):', checkError.message)
          // Don't fail here - might be RLS timing issue, try to create profile
        }
        
        if (existingProfile) {
          console.log('✅ SUCCESS: Trigger automatically linked doctor-created profile!')
          console.log('   - Profile ID:', existingProfile.profile_id)
          console.log('   - CPF matched:', existingProfile.cpf)
          console.log('   - Linked status:', existingProfile.linked)
          console.log('   - Patient now has access to all medical data added by doctor')
        } else {
          console.log('🔧 No doctor-created profile found for this CPF, creating new profile')
          
          // Create new profile for this patient (no doctor created them)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: data.user.id,
              email: signUpData.email,
              cpf: signUpData.cpf,
              pin: signUpData.pin,
              role: signUpData.role,
              full_name: signUpData.fullName,
              phone: signUpData.phone || null,
              birth_date: signUpData.birthDate || null,
              address: signUpData.address || null,
              emergency_contact_name: signUpData.emergencyContactName || null,
              emergency_contact_phone: signUpData.emergencyContactPhone || null,
              linked: true // This is a direct signup, so it's immediately linked
            })
          
          if (profileError) {
            // If duplicate CPF error, it means trigger already linked the profile - that's success!
            if (profileError.code === '23505' && profileError.message.includes('profiles_cpf_key')) {
              console.log('✅ Profile was already linked by trigger (duplicate CPF error is expected)')
              console.log('   - CPF:', signUpData.cpf)
              console.log('   - This means a doctor created this patient and trigger linked it successfully')
            } else {
              console.error('❌ Error creating new profile:', profileError)
              setState((prev: AuthState) => ({ ...prev, loading: false, error: profileError.message }))
              return { success: false, error: profileError.message }
            }
          } else {
            console.log('✅ New profile created successfully')
          }
        }
        
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
    signOut,
    updateProfile,
    refreshProfile
  }
} 