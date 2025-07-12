'use client'

import { ReactNode } from 'react'
import { useAuthState, AuthContext } from '../../hooks/useAuth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('🔧 AuthProvider: Rendering')
  const authState = useAuthState()
  
  console.log('🔧 AuthProvider: Auth state:', {
    hasUser: !!authState.user,
    hasProfile: !!authState.profile,
    loading: authState.loading,
    error: authState.error
  })
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext } 