'use client'

import { ReactNode } from 'react'
import { useAuthState, AuthContext } from '../../hooks/useAuth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authState = useAuthState()
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext } 