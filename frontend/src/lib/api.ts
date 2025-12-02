// lib/api.ts
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const DEFAULT_TIMEOUT = 7000 // ms

export type Commute = {
  id?: number | string
  user_email: string
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

export async function fetchJSON<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { signal, timeoutMs = DEFAULT_TIMEOUT }: FetchOpts = {}
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

  try {
    // ----- inject Authorization header if we have an access token -----
    let headers: Headers

    if (init.headers instanceof Headers) {
      headers = new Headers(init.headers)
    } else {
      headers = new Headers(init.headers || {})
    }

    try {
      // guard for SSR, though in Vite this is usually fine
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('accessToken')
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
      }
    } catch {
      // if localStorage is unavailable for any reason, just skip auth header
    }

    const res = await fetch(input, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail: any = null
      try {
        detail = await res.json()
      } catch {
        // ignore body parse errors
      }
      const msg = detail?.message || `HTTP ${res.status} ${res.statusText}`
      throw new Error(msg)
    }

    if (res.status === 204) {
      return undefined as unknown as T
    }

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

export async function createCommute(c: Commute, opts: FetchOpts = {}) {
  return fetchJSON(`${API}/api/commutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  }, opts)
}

export async function deleteCommute(
  id: string | number,
  user_email: string,
  opts: FetchOpts = {}
) {
  return fetchJSON(
    `${API}/api/commutes/${id}?user_email=${encodeURIComponent(user_email)}`,
    {
      method: 'DELETE'
    },
    opts
  )
}


type ListParams = { user_email: string, from?: string, to?: string }
export async function listCommutes(params: ListParams, opts: FetchOpts = {}) {
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()
  return fetchJSON<Commute[]>(`${API}/api/commutes${qs({ ...params, from, to })}`, {}, opts)
}

type SummaryBase = { user_email: string, from?: string, to?: string }

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

export async function getWeeklyGoals(user_email: string, opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals${qs({ user_email })}`, {}, opts)
}

export async function saveWeeklyGoals(payload: WeeklyGoalPayload, opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, opts)
}

export async function resetWeeklyGoals(user_email: string, opts: FetchOpts = {}) {
  return fetchJSON<WeeklyGoalResponse>(`${API}/api/goals/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_email })
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