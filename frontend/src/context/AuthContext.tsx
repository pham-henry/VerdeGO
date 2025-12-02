import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react'
import type { AuthResponse } from '../lib/api'

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
  updateUser: (partial: Partial<AuthUser>) => void // 👈 new
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
    user: { email, name: name ?? null },
    accessToken,
    refreshToken,
    isAuthenticated: true
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => readInitialState())

  // Keep localStorage in sync with *state*
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      localStorage.setItem('accessToken', state.accessToken || '')
      localStorage.setItem('email', state.user.email)

      if (state.refreshToken) {
        localStorage.setItem('refreshToken', state.refreshToken)
      } else {
        localStorage.removeItem('refreshToken')
      }

      if (state.user.name) {
        localStorage.setItem('name', state.user.name)
      } else {
        localStorage.removeItem('name')
      }
    } else {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('email')
      localStorage.removeItem('name')
    }
  }, [state])

  const login = useCallback((payload: AuthResponse) => {
    const user: AuthUser = {
      email: payload.email,
      name: payload.name ?? null
    }

    setState({
      user,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? null,
      isAuthenticated: true
    })
  }, [])

  const logout = useCallback(() => {
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false
    })
  }, [])

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setState(prev => {
      if (!prev.user) return prev
      const user: AuthUser = { ...prev.user, ...partial }
      return { ...prev, user }
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      updateUser
    }),
    [state, login, logout, updateUser]
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
