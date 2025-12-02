import React, { useEffect, useMemo, useState } from 'react'
import { emissionSummaryByDay, getWeeklyGoals, listCommutes, WeeklyGoalResponse } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const FALLBACK_EMAIL = 'demo@user.com'

// ---- Goal Storage ----
const GOAL_STORAGE_KEY = (email: string) => `verdego:goals:${email}`

type WeeklyGoals = {
  weeklyZeroKm: number
  weeklyEmissionCapKg: number
  weeklyCommuteCount: number
}

const defaultGoals: WeeklyGoals = {
  weeklyZeroKm: 15,
  weeklyEmissionCapKg: 25,
  weeklyCommuteCount: 10
}

function loadGoals(email: string): WeeklyGoals {
  try {
    const raw = localStorage.getItem(GOAL_STORAGE_KEY(email))
    if (!raw) return defaultGoals
    return { ...defaultGoals, ...JSON.parse(raw) }
  } catch {
    return defaultGoals
  }
}

function saveGoals(email: string, goals: WeeklyGoals) {
  localStorage.setItem(GOAL_STORAGE_KEY(email), JSON.stringify(goals))
}

function resolveUserEmail() {
  return localStorage.getItem('email')?.trim() || FALLBACK_EMAIL
}

function normalizeGoalResponse(resp?: WeeklyGoalResponse | null): WeeklyGoals {
  if (!resp) return defaultGoals
  return {
    weeklyZeroKm: resp.weeklyZeroKm ?? defaultGoals.weeklyZeroKm,
    weeklyEmissionCapKg: resp.weeklyEmissionCapKg ?? defaultGoals.weeklyEmissionCapKg,
    weeklyCommuteCount: resp.weeklyCommuteCount ?? defaultGoals.weeklyCommuteCount
  }
}

// ---- Component ----
export default function Home() {
  // ---- Name ----
  const {user} = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>(() => resolveUserEmail())
  const isGuest = userEmail === FALLBACK_EMAIL

  useEffect(() => {
    if (user?.name) {
      // prefer the server/auth value
      setUserName(user.name)
      localStorage.setItem('name', user.name)
    } else {
      // fallback to whatever was stored previously
      const stored = localStorage.getItem('name') || ''
      setUserName(stored)
    }

    setUserEmail(resolveUserEmail())
  }, [user])

  const [goals, setGoals] = useState<WeeklyGoals>(() => loadGoals(resolveUserEmail()))
  const [weeklyEmissions, setWeeklyEmissions] = useState<{ label: string; value: number }[]>([])
  const [commutes, setCommutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [affirmations, setAffirmations] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)

  // compute {from, to} = last 7 days
  const { from, to } = useMemo(() => {
    const today = new Date()
    const end = today.toISOString().slice(0, 10)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 6)
    const start = startDate.toISOString().slice(0, 10)
    return { from: start, to: end }
  }, [])

  // fetch last 7 days of emissions + commutes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      emissionSummaryByDay({ user_email: userEmail, from, to }),
      listCommutes({ user_email: userEmail, from, to })
    ])
      .then(([emRes, commuteRes]) => {
        if (cancelled) return

        const series = (emRes?.series ?? []).map((d: any) => ({
          label: String(d.label),
          value: Number(d.value || 0)
        }))
        setWeeklyEmissions(series)
        setCommutes(Array.isArray(commuteRes) ? commuteRes : [])
      })
      .catch(err => console.error('Home prefetch failed:', err))
      .finally(() => !cancelled && setLoading(false))

    // load goals again on mount
    setGoals(loadGoals(userEmail))

    return () => {
      cancelled = true
    }
  }, [from, to, userEmail])

  useEffect(() => {
    if (isGuest) {
      setGoals(loadGoals(userEmail))
      return
    }

    let cancelled = false
    getWeeklyGoals(userEmail)
      .then(resp => {
        if (cancelled) return
        const normalized = normalizeGoalResponse(resp)
        setGoals(normalized)
        saveGoals(userEmail, normalized)
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to sync weekly goals for home', err)
      })
    return () => {
      cancelled = true
    }
  }, [userEmail, isGuest])

  // ---- Derived Stats ----
  const stats = useMemo(() => {
    const totalEmissions = weeklyEmissions.reduce((acc, p) => acc + p.value, 0)

    const ZERO = ['walk', 'bike']
    let zeroKm = 0
    let commuteCount = 0
    let zeroTrips = 0

    for (const c of commutes) {
      const km = Number(c.distance_km || 0)
      if (!Number.isFinite(km) || km <= 0) continue
      commuteCount++
      if (ZERO.includes(c.mode)) {
        zeroKm += km
        zeroTrips++
      }
    }

    let goalsHit = 0
    if (zeroKm >= goals.weeklyZeroKm) goalsHit++
    if (totalEmissions <= goals.weeklyEmissionCapKg) goalsHit++
    if (commuteCount >= goals.weeklyCommuteCount) goalsHit++

    return {
      totalEmissions,
      zeroKm,
      commuteCount,
      zeroTrips,
      goalsHit
    }
  }, [weeklyEmissions, commutes, goals])

  // ---- Affirmation Messages ----
  useEffect(() => {
    const msgs: string[] = []

    if (stats.goalsHit > 0) {
      msgs.push(`You've already hit ${stats.goalsHit} of your weekly goals. Amazing progress! 💚`)
    } else {
      msgs.push(`You're getting started — keep logging commutes to hit your goals!`)
    }

    msgs.push(`You've emitted only ${stats.totalEmissions.toFixed(2)} kg CO₂e in the last 7 days.`)

    if (stats.zeroKm > 0) {
      msgs.push(
        `You've traveled ${stats.zeroKm.toFixed(1)} km using zero-emission modes this week. 🌱`
      )
    }

    if (stats.zeroTrips > 0) {
      msgs.push(
        `You're making sustainable choices — ${stats.zeroTrips} of your trips had no emissions.`
      )
    }

    msgs.push(`You've logged ${stats.commuteCount} total commutes this week. Keep it up!`)

    setAffirmations(msgs)
    setCurrentIdx(0)
  }, [stats])

  // cycle affirmations
  useEffect(() => {
    if (!affirmations.length) return
    const id = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % affirmations.length)
    }, 7000)
    return () => clearInterval(id)
  }, [affirmations])

  const currentMessage =
    affirmations[currentIdx] || 'Log your first commute to see your environmental impact!'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 20px' }}>
      <h1 style={{ marginBottom: 8 }}>
        {userName
          ? `Welcome to VerdeGO, ${userName} 🌿`
          : 'Welcome back to VerdeGO 🌿'}
      </h1>
      <p style={{ marginBottom: 24, color: '#555' }}>
        Track your weekly impact and celebrate the positive changes you're making.
      </p>

      {/* ---------------- Impact Affirmer ---------------- */}
      <section
        style={{
          borderRadius: 16,
          padding: 20,
          background: 'linear-gradient(135deg, #E8F5E9, #E3F2FD)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          marginBottom: 32
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#388E3C'
          }}
        >
          Positive Impact Affirmer
        </div>

        {loading ? (
          <div style={{ marginTop: 16, opacity: 0.7 }}>Loading your recent impact…</div>
        ) : (
          <>
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 600 }}>
              {currentMessage}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() =>
                  setCurrentIdx((currentIdx - 1 + affirmations.length) % affirmations.length)
                }
                style={pillButtonStyle}
              >
                ◀ Prev
              </button>
              <button
                onClick={() =>
                  setCurrentIdx((currentIdx + 1) % affirmations.length)
                }
                style={pillButtonStyle}
              >
                Next ▶
              </button>
            </div>
          </>
        )}
      </section>

      {/* ---------------- Snapshot Stats ---------------- */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard
          label="Weekly emissions"
          value={`${stats.totalEmissions.toFixed(1)} kg CO₂e`}
          hint={`Goal: ≤ ${goals.weeklyEmissionCapKg} kg`}
        />
        <StatCard
          label="Zero-emission distance"
          value={`${stats.zeroKm.toFixed(1)} km`}
          hint={`Goal: ≥ ${goals.weeklyZeroKm} km`}
        />
        <StatCard
          label="Commutes logged"
          value={`${stats.commuteCount}`}
          hint={`Goal: ≥ ${goals.weeklyCommuteCount}`}
        />
      </section>
    </div>
  )
}

/* ----- Stat Card ----- */
function StatCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid #E0E0E0', padding: 14, background: '#FFFFFF' }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#777', marginBottom: 4 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{props.value}</div>
      {props.hint && (
        <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 4 }}>{props.hint}</div>
      )}
    </div>
  )
}

/* ----- Reusable button style ----- */
const pillButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid #A5D6A7',
  background: '#FFFFFF',
  cursor: 'pointer',
  fontSize: 12
}
