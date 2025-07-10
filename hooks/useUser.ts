'use client'

import { useAuth } from './useAuth'
import { createClient } from '../lib/supabase'
import type { Profile } from '../types/database'
import type { PatientSearchData, PatientSearchResult } from '../types/auth'
import type { UserRole } from '../types/database'

export function useUser() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const supabase = createClient()
  
  // Check if user is authenticated
  const isAuthenticated = !!user && !!profile
  
  // Check user role
  const isPatient = profile?.role === 'patient'
  const isDoctor = profile?.role === 'doctor'
  
  // Get user role
  const userRole: UserRole | null = profile?.role || null
  
  // Search for patient by CPF + PIN (for doctors)
  const searchPatient = async (searchData: PatientSearchData): Promise<PatientSearchResult> => {
    try {
      if (!isDoctor) {
        return { success: false, error: 'Only doctors can search for patients' }
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', searchData.cpf)
        .eq('pin', searchData.pin)
        .eq('role', 'patient')
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Patient not found with provided CPF and PIN' }
        }
        return { success: false, error: error.message }
      }
      
      return { success: true, patient: data }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
  
  // Get patient emergency information
  const getPatientEmergencyInfo = async (patientId: string) => {
    try {
      if (!isDoctor && profile?.id !== patientId) {
        throw new Error('Unauthorized access to patient information')
      }
      
      // Get patient profile
      const { data: patientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single()
      
      if (profileError) throw profileError
      
      // Get critical medical information in parallel
      const [medicationsResult, allergiesResult, diseasesResult] = await Promise.all([
        supabase
          .from('medications')
          .select('*')
          .eq('patient_id', patientId)
          .eq('is_active', true),
        supabase
          .from('allergies')
          .select('*')
          .eq('patient_id', patientId),
        supabase
          .from('diseases')
          .select('*')
          .eq('patient_id', patientId)
          .eq('status', 'active')
      ])
      
      return {
        patient: patientProfile,
        medications: medicationsResult.data || [],
        allergies: allergiesResult.data || [],
        diseases: diseasesResult.data || []
      }
    } catch (error) {
      console.error('Error getting emergency info:', error)
      throw error
    }
  }
  
  // Update user profile
  const updateUserProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single()
      
      if (error) throw error
      
      // Refresh the profile in auth context
      await refreshProfile()
      
      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }
  
  // Check if user has permission for specific action
  const hasPermission = (action: string): boolean => {
    if (!profile) return false
    
    switch (action) {
      case 'search_patients':
        return isDoctor
      case 'view_own_records':
        return isAuthenticated
      case 'edit_own_records':
        return isPatient
      case 'view_patient_records':
        return isDoctor || isPatient
      case 'create_patient_records':
        return isDoctor
      default:
        return false
    }
  }
  
  // Get user display name
  const getDisplayName = (): string => {
    if (!profile) return 'User'
    return profile.full_name || profile.email || 'User'
  }
  
  // Get user initials for avatars
  const getUserInitials = (): string => {
    if (!profile?.full_name) return 'U'
    
    const names = profile.full_name.split(' ')
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
  }
  
  // Format CPF for display
  const getFormattedCPF = (): string => {
    if (!profile?.cpf) return ''
    
    const cpf = profile.cpf.replace(/\D/g, '')
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  
  // Check if profile is complete
  const isProfileComplete = (): boolean => {
    if (!profile) return false
    
    const requiredFields = ['full_name', 'cpf', 'pin', 'role', 'email']
    return requiredFields.every(field => profile[field as keyof Profile])
  }
  
  return {
    // User state
    user,
    profile,
    loading,
    isAuthenticated,
    
    // Role checks
    isPatient,
    isDoctor,
    userRole,
    
    // Actions
    searchPatient,
    getPatientEmergencyInfo,
    updateUserProfile,
    refreshProfile,
    
    // Utilities
    hasPermission,
    getDisplayName,
    getUserInitials,
    getFormattedCPF,
    isProfileComplete
  }
} 