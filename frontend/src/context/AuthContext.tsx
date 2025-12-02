import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthResponse } from '../lib/api'
import { setTokenRefreshCallback } from '../lib/api'

type AuthUser = {
  email: string
  name?: string | null
}

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

type AuthContextValue = AuthState & {
  login: (payload: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readInitialState(): AuthState {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  const email = localStorage.getItem('email')
  const name = localStorage.getItem('name')

  if (!accessToken || !email) {
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false
    }
  }

  return {
    user: { email, name: name ?? undefined },
    accessToken,
    refreshToken,
    isAuthenticated: true
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readInitialState())

  // Register token refresh callback to update state when tokens are refreshed
  useEffect(() => {
    setTokenRefreshCallback((tokens: AuthResponse) => {
      if (tokens.accessToken && tokens.email) {
        // Tokens were refreshed successfully
        setState({
          user: { email: tokens.email, name: tokens.name },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true
        })
      } else {
        // Refresh failed - logout user
        setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })
      }
    })
  }, [])

  // Keep localStorage in sync when state changes
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      localStorage.setItem('accessToken', state.accessToken || '')
      if (state.refreshToken) {
        localStorage.setItem('refreshToken', state.refreshToken)
      }
      localStorage.setItem('email', state.user.email)
      if (state.user.name) {
        localStorage.setItem('name', state.user.name)
      }
    } else {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('email')
      localStorage.removeItem('name')
    }
  }, [state])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (payload: AuthResponse) => {
        setState({
          user: { email: payload.email, name: payload.name },
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          isAuthenticated: true
        })
      },
      logout: () => {
        setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })
      }
    }),
    [state]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}


