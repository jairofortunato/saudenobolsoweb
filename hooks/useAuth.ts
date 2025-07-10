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
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null
  })
  
  const supabase = createClient()
  
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
          return
        }
        
        if (session?.user) {
          // Fetch user profile
          const profile = await fetchUserProfile(session.user.id)
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            error: null
          })
        } else {
          setState((prev: AuthState) => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setState((prev: AuthState) => ({ 
          ...prev, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }))
      }
    }
    
    getInitialSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            error: null
          })
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            error: null
          })
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])
  
  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      return null
    }
  }
  
  const signUp = async (signUpData: SignUpData): Promise<AuthResult> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      // Sign up user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
            cpf: signUpData.cpf,
            role: signUpData.role
          }
        }
      })
      
      if (error) {
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        // Create profile in our profiles table
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
            emergency_contact_phone: signUpData.emergencyContactPhone || null
          })
        
        if (profileError) {
          console.error('Error creating profile:', profileError)
          setState((prev: AuthState) => ({ ...prev, loading: false, error: profileError.message }))
          return { success: false, error: profileError.message }
        }
        
        setState((prev: AuthState) => ({ ...prev, loading: false }))
        return { success: true, user: data.user }
      }
      
      setState((prev: AuthState) => ({ ...prev, loading: false }))
      return { success: false, error: 'Failed to create user' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState((prev: AuthState) => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }
  
  const signIn = async (signInData: SignInData): Promise<AuthResult> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      })
      
      if (error) {
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id)
        setState({
          user: data.user,
          session: data.session,
          profile,
          loading: false,
          error: null
        })
        return { success: true, user: data.user, profile: profile || undefined }
      }
      
      setState((prev: AuthState) => ({ ...prev, loading: false }))
      return { success: false, error: 'Failed to sign in' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState((prev: AuthState) => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }
  
  const signOut = async (): Promise<void> => {
    try {
      setState((prev: AuthState) => ({ ...prev, loading: true }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return
      }
      
      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error in signOut:', error)
      setState((prev: AuthState) => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }))
    }
  }
  
  const updateProfile = async (profileData: Partial<Profile>): Promise<AuthResult> => {
    try {
      if (!state.user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      setState((prev: AuthState) => ({ ...prev, loading: true, error: null }))
      
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', state.user.id)
        .select()
        .single()
      
      if (error) {
        setState((prev: AuthState) => ({ ...prev, loading: false, error: error.message }))
        return { success: false, error: error.message }
      }
      
      setState((prev: AuthState) => ({ 
        ...prev, 
        profile: data, 
        loading: false 
      }))
      
      return { success: true, profile: data }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState((prev: AuthState) => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }
  
  const refreshProfile = async (): Promise<void> => {
    if (!state.user) return
    
    try {
      const profile = await fetchUserProfile(state.user.id)
      setState((prev: AuthState) => ({ ...prev, profile }))
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
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