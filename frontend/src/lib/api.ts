// lib/api.ts
const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'
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

type FetchOpts = { signal?: AbortSignal; timeoutMs?: number }

async function fetchJSON<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { signal, timeoutMs = DEFAULT_TIMEOUT }: FetchOpts = {}
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`Timeout ${timeoutMs}ms`)), timeoutMs)

  const onAbort = (reason?: any) => controller.abort(reason)
  if (signal) {
    if (signal.aborted) onAbort(signal.reason)
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
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

export async function createCommute(c: Commute, opts: FetchOpts = {}) {
  return fetchJSON(`${API}/api/commutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  }, opts)
}

type ListParams = { user_email: string, from?: string, to?: string }
export async function listCommutes(params: ListParams, opts: FetchOpts = {}) {
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()
  return fetchJSON<Commute[]>(`${API}/api/commutes${qs({ ...params, from, to })}`, {}, opts)
}

export async function deleteCommute(id: number | string, opts: FetchOpts = {}) {
  return fetchJSON(`${API}/api/commutes/${id}?user_email=demo@user`, { method: 'DELETE' }, opts)
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

