import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthResponse } from '../lib/api'
import { setTokenRefreshCallback } from '../lib/api'
import { IS_DEMO, DEMO_USER } from '../config/demo'

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
  // In demo mode, always return authenticated demo user
  if (IS_DEMO) {
    return {
      user: { email: DEMO_USER.email, name: DEMO_USER.name },
      accessToken: 'demo-token',
      refreshToken: 'demo-refresh-token',
      isAuthenticated: true
    }
  }

  // Normal mode: check localStorage for tokens
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

  // Keep localStorage in sync when state changes (skip in demo mode)
  useEffect(() => {
    if (IS_DEMO) {
      // In demo mode, always keep demo user info in localStorage for compatibility
      localStorage.setItem('accessToken', 'demo-token')
      localStorage.setItem('refreshToken', 'demo-refresh-token')
      localStorage.setItem('email', DEMO_USER.email)
      localStorage.setItem('name', DEMO_USER.name)
      return
    }

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
      // In demo mode, just set the demo user without backend calls
      if (IS_DEMO) {
        const user = { email: DEMO_USER.email, name: DEMO_USER.name }
        localStorage.setItem('accessToken', 'demo-token')
        localStorage.setItem('refreshToken', 'demo-refresh-token')
        localStorage.setItem('email', DEMO_USER.email)
        localStorage.setItem('name', DEMO_USER.name)
        setState({
          user,
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh-token',
          isAuthenticated: true
        })
        return
      }

      // Normal mode: use real backend response
      // Prefer backend name, fall back to previously stored name
      const existingName =
        payload.name ??
        state.user?.name ??
        localStorage.getItem('name') ??
        undefined

      const user = { email: payload.email, name: existingName }

      // 🔹 Write immediately to localStorage so fetchJSON sees it right away
      localStorage.setItem('accessToken', payload.accessToken)
      localStorage.setItem('email', user.email)
      if (payload.refreshToken) {
        localStorage.setItem('refreshToken', payload.refreshToken)
      }
      if (user.name) {
        localStorage.setItem('name', user.name)
      }

      setState({
        user,
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        isAuthenticated: true
      })
    },
    logout: () => {
      // In demo mode, reset to demo user instead of logging out
      if (IS_DEMO) {
        const user = { email: DEMO_USER.email, name: DEMO_USER.name }
        localStorage.setItem('accessToken', 'demo-token')
        localStorage.setItem('refreshToken', 'demo-refresh-token')
        localStorage.setItem('email', DEMO_USER.email)
        localStorage.setItem('name', DEMO_USER.name)
        setState({
          user,
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh-token',
          isAuthenticated: true
        })
        return
      }

      // Normal mode: clear everything
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('email')
      localStorage.removeItem('name')

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


