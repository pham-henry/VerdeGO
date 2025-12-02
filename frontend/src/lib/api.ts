// lib/api.ts
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const DEFAULT_TIMEOUT = 7000 // ms

export type Commute = {
  id?: number | string
  user_email?: string // Optional - backend gets it from token
  date: string // YYYY-MM-DD
  mode: string
  distance_km: number
  duration_min?: number
  notes?: string
}

export type DayPoint = { label: string; value: number }
export type EmissionByMode = { by_mode_kg: Record<string, number> }
export type EmissionByDay  = { series: DayPoint[] }
export type WeeklyGoalResponse = {
  user_email: string
  weeklyZeroKm: number
  weeklyEmissionCapKg: number
  weeklyCommuteCount: number
  updatedAt?: string
}
export type WeeklyGoalPayload = {
  user_email: string
  weeklyZeroKm: number
  weeklyEmissionCapKg: number
  weeklyCommuteCount: number
}

type FetchOpts = { signal?: AbortSignal; timeoutMs?: number }

// Callback to notify AuthContext when tokens are refreshed
let onTokenRefresh: ((tokens: AuthResponse) => void) | null = null

export function setTokenRefreshCallback(callback: (tokens: AuthResponse) => void) {
  onTokenRefresh = callback
}

// Helper to get access token from localStorage
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

// Helper to get refresh token from localStorage
function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

// Global promise to handle concurrent refresh attempts (race condition prevention)
let refreshPromise: Promise<AuthResponse | null> | null = null

// Refresh the access token using the refresh token
async function refreshAccessToken(): Promise<AuthResponse | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  // Create the refresh promise
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        // Refresh failed - clear tokens and notify
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        if (onTokenRefresh) {
          onTokenRefresh({
            accessToken: '',
            refreshToken: '',
            email: '',
            name: null
          })
        }
        return null
      }

      const data: AuthResponse = await response.json()
      
      // Update localStorage
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      if (data.email) {
        localStorage.setItem('email', data.email)
      }
      if (data.name) {
        localStorage.setItem('name', data.name)
      }

      // Notify AuthContext
      if (onTokenRefresh) {
        onTokenRefresh(data)
      }

      return data
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Clear tokens on error
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      if (onTokenRefresh) {
        onTokenRefresh({
          accessToken: '',
          refreshToken: '',
          email: '',
          name: null
        })
      }
      return null
    } finally {
      // Clear the promise so future requests can refresh again
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function fetchJSON<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { signal, timeoutMs = DEFAULT_TIMEOUT }: FetchOpts = {},
  isRetry = false
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new Error(`Timeout ${timeoutMs}ms`)),
    timeoutMs
  )

  const onAbort = (reason?: any) => controller.abort(reason)
  if (signal) {
    if (signal.aborted) onAbort(signal.reason)
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  // Automatically include Authorization header if token is available
  const token = getAccessToken()
  const headers = new Headers(init.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const res = await fetch(input, { 
      ...init, 
      headers,
      signal: controller.signal 
    })
    
    // Handle 401 Unauthorized - token expired
    if (res.status === 401 && !isRetry) {
      // Don't try to refresh if this is already a retry or if it's an auth endpoint
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/')) {
        // Don't refresh on auth endpoints (login, register, refresh)
        let detail: any = null
        try { detail = await res.json() } catch {}
        const msg = detail?.message || `HTTP ${res.status} ${res.statusText}`
        throw new Error(msg)
      }

      // Try to refresh the token
      const refreshed = await refreshAccessToken()
      
      if (refreshed && refreshed.accessToken) {
        // Retry the original request with the new token
        const newHeaders = new Headers(init.headers || {})
        newHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`)
        
        // Retry the request (recursive call with isRetry flag)
        return fetchJSON<T>(input, {
          ...init,
          headers: newHeaders
        }, { signal, timeoutMs }, true)
      } else {
        // Refresh failed - user needs to log in again
        // Don't try to read response body as it may have been consumed
        throw new Error('Session expired. Please log in again.')
      }
    }
    
    if (!res.ok) {
      let detail: any = null
      try { detail = await res.json() } catch {}
      const msg = detail?.message || `HTTP ${res.status} ${res.statusText}`
      throw new Error(msg)
    }
    
    if (res.status === 204) return undefined as unknown as T
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort as any)
  }
}


function qs(params: Record<string, any>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

function todayISO() { return new Date().toISOString().slice(0, 10) }
function daysAgoISO(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/* ---------- API surface ---------- */

export async function createCommute(c: Omit<Commute, 'user_email'>, opts: FetchOpts = {}) {
  return fetchJSON(`${API}/api/commutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  }, opts)
}

export async function deleteCommute(
  id: string | number,
  opts: FetchOpts = {}
) {
  return fetchJSON(
    `${API}/api/commutes/${id}`,
    {
      method: 'DELETE'
    },
    opts
  )
}


type ListParams = { from?: string, to?: string }
export async function listCommutes(params: ListParams = {}, opts: FetchOpts = {}) {
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()
  return fetchJSON<Commute[]>(`${API}/api/commutes${qs({ from, to })}`, {}, opts)
}

type SummaryBase = { from?: string, to?: string }

/** Strongly-typed helpers (no generics) */
export async function emissionSummaryByMode(
  params: SummaryBase & { groupBy?: 'mode' },
  opts: FetchOpts = {}
): Promise<EmissionByMode> {
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()
  return fetchJSON<EmissionByMode>(`${API}/api/emissions/summary${qs({ ...params, groupBy: 'mode', from, to })}`, {}, opts)
}

export async function emissionSummaryByDay(
  params: SummaryBase & { groupBy?: 'day' },
  opts: FetchOpts = {}
): Promise<EmissionByDay> {
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()
  return fetchJSON<EmissionByDay>(`${API}/api/emissions/summary${qs({ ...params, groupBy: 'day', from, to })}`, {}, opts)
}

export async function recommendRoute(payload: any, opts: FetchOpts = {}) {
  return fetchJSON(`${API}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, opts)
}

export async function getWeeklyGoals(opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals`, {}, opts)
}

export async function saveWeeklyGoals(payload: Omit<WeeklyGoalPayload, 'user_email'>, opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, opts)
}

export async function resetWeeklyGoals(opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }, opts)
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  email: string
  name?: string | null
}

type RegisterBody = {
  name: string
  email: string
  password: string
}

type LoginBody = { email: string; password: string }

// Login
export async function loginUser(body: LoginBody ): Promise<AuthResponse> {
  return fetchJSON(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Register
export async function registerUser(body: RegisterBody): Promise<AuthResponse> {
  return fetchJSON<AuthResponse>(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Refresh token (exposed for manual refresh if needed)
export async function refreshToken(): Promise<AuthResponse | null> {
  return refreshAccessToken()
}