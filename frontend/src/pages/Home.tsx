import React, { useEffect, useMemo, useState } from 'react'
import { emissionSummaryByDay, getWeeklyGoals, listCommutes, WeeklyGoalResponse } from '../lib/api'

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
  // ---- Name (must be inside component) ----
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>(() => resolveUserEmail())
  const isGuest = userEmail === FALLBACK_EMAIL

  useEffect(() => {
    const n = localStorage.getItem('name') || ''
    setUserName(n)
    setUserEmail(resolveUserEmail())
  }, [])

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
      msgs.push(`You've already hit ${stats.goalsHit} of your weekly goals. Amazing progress!`)
    } else {
      msgs.push(`You're getting started — keep logging commutes to hit your goals!`)
    }

    msgs.push(`You've emitted only ${stats.totalEmissions.toFixed(2)} kg CO₂e in the last 7 days.`)

    if (stats.zeroKm > 0) {
      msgs.push(
        `You've traveled ${stats.zeroKm.toFixed(1)} km using zero-emission modes this week.`
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
    <div style={container}>
      <div style={headerSection}>
        <h1 style={title}>
          {userName
            ? `Welcome back, ${userName}!`
            : 'Welcome to VerdeGO'}
        </h1>
        <p style={subtitle}>
          Track your weekly impact and celebrate the positive changes you're making.
        </p>
      </div>

      {/* ---------------- Impact Affirmer ---------------- */}
      <section style={affirmerCard}>
        <div style={affirmerHeader}>
          <span style={affirmerLabel}>Positive Impact Affirmer</span>
        </div>

        {loading ? (
          <div style={loadingText}>
            <div style={spinner} />
            Loading your recent impact…
          </div>
        ) : (
          <>
            <div style={affirmerMessage} className="animate-fade-in">
              {currentMessage}
            </div>

            <div style={affirmerControls}>
              <button
                onClick={() =>
                  setCurrentIdx((currentIdx - 1 + affirmations.length) % affirmations.length)
                }
                style={navButton}
                aria-label="Previous affirmation"
              >
                <span>◀</span>
              </button>
              <div style={affirmerDots}>
                {affirmations.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    style={{
                      ...dot,
                      ...(idx === currentIdx ? dotActive : {})
                    }}
                    aria-label={`Go to affirmation ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setCurrentIdx((currentIdx + 1) % affirmations.length)
                }
                style={navButton}
                aria-label="Next affirmation"
              >
                <span>▶</span>
              </button>
            </div>
          </>
        )}
      </section>

      {/* ---------------- Snapshot Stats ---------------- */}
      <section style={statsGrid}>
        <StatCard
          label="Weekly emissions"
          value={`${stats.totalEmissions.toFixed(1)}`}
          unit="kg CO₂e"
          hint={`Goal: ≤ ${goals.weeklyEmissionCapKg} kg`}
          progress={Math.min(100, (stats.totalEmissions / goals.weeklyEmissionCapKg) * 100)}
          variant={stats.totalEmissions <= goals.weeklyEmissionCapKg ? 'success' : 'warning'}
        />
        <StatCard
          label="Zero-emission distance"
          value={`${stats.zeroKm.toFixed(1)}`}
          unit="km"
          hint={`Goal: ≥ ${goals.weeklyZeroKm} km`}
          progress={Math.min(100, (stats.zeroKm / goals.weeklyZeroKm) * 100)}
          variant={stats.zeroKm >= goals.weeklyZeroKm ? 'success' : 'default'}
        />
        <StatCard
          label="Commutes logged"
          value={`${stats.commuteCount}`}
          unit="trips"
          hint={`Goal: ≥ ${goals.weeklyCommuteCount}`}
          progress={Math.min(100, (stats.commuteCount / goals.weeklyCommuteCount) * 100)}
          variant={stats.commuteCount >= goals.weeklyCommuteCount ? 'success' : 'default'}
        />
      </section>
    </div>
  )
}

/* ----- Stat Card ----- */
function StatCard(props: {
  label: string
  value: string
  unit?: string
  hint?: string
  progress?: number
  variant?: 'success' | 'warning' | 'default'
}) {
  const variantColors = {
    success: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
    warning: { bg: '#FFF3E0', border: '#FB8C00', text: '#E65100' },
    default: { bg: '#F5F5F5', border: '#E0E0E0', text: '#666' }
  }
  
  const colors = variantColors[props.variant || 'default']
  
  return (
    <div style={{
      ...statCard,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    }} className="animate-fade-in">
      <div style={statCardLabel}>{props.label}</div>
      <div style={statCardValue}>
        <span style={statCardNumber}>{props.value}</span>
        {props.unit && <span style={statCardUnit}> {props.unit}</span>}
      </div>
      {props.progress !== undefined && (
        <div style={progressBar}>
          <div
            style={{
              ...progressFill,
              width: `${props.progress}%`,
              backgroundColor: colors.border,
            }}
          />
        </div>
      )}
      {props.hint && (
        <div style={statCardHint}>{props.hint}</div>
      )}
    </div>
  )
}

/* ----- Styles ----- */
const container: React.CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto',
  padding: 'var(--spacing-lg)',
}

const headerSection: React.CSSProperties = {
  marginBottom: 'var(--spacing-xl)',
}

const title: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: 'var(--spacing-sm)',
  background: 'linear-gradient(135deg, var(--verdego-green), var(--verdego-dark))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const subtitle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: 'var(--text-secondary)',
  marginBottom: 0,
}

const affirmerCard: React.CSSProperties = {
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--spacing-xl)',
  background: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
  boxShadow: 'var(--shadow-lg)',
  marginBottom: 'var(--spacing-xl)',
  border: '1px solid rgba(76, 175, 80, 0.2)',
}

const affirmerHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--verdego-dark)',
  marginBottom: 'var(--spacing-md)',
}

const affirmerLabel: React.CSSProperties = {
  fontSize: '11px',
}

const loadingText: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
  opacity: 0.7,
  color: 'var(--text-secondary)',
}

const spinner: React.CSSProperties = {
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  border: '2px solid rgba(0,0,0,0.1)',
  borderTopColor: 'var(--color-primary)',
  animation: 'spin 0.8s linear infinite',
}

const affirmerMessage: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  fontSize: '1.25rem',
  fontWeight: 600,
  lineHeight: 1.5,
  color: 'var(--text-primary)',
  minHeight: '60px',
}

const affirmerControls: React.CSSProperties = {
  marginTop: 'var(--spacing-lg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--spacing-md)',
}

const navButton: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--radius-full)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  background: 'rgba(255, 255, 255, 0.9)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--verdego-dark)',
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-sm)',
}

// Add hover effect via inline style with onMouseEnter/onMouseLeave would require component changes
// For now, the CSS transition handles basic hover

const affirmerDots: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-xs)',
  alignItems: 'center',
}

const dot: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255, 255, 255, 0.5)',
  cursor: 'pointer',
  padding: 0,
  transition: 'all var(--transition-fast)',
}

const dotActive: React.CSSProperties = {
  background: 'var(--verdego-dark)',
  width: '10px',
  height: '10px',
}

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 'var(--spacing-lg)',
}

const statCard: React.CSSProperties = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid',
  padding: 'var(--spacing-lg)',
  background: 'var(--bg-white)',
  boxShadow: 'var(--shadow-md)',
  transition: 'all var(--transition-base)',
  position: 'relative',
  overflow: 'hidden',
}

const statCardLabel: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 'var(--spacing-xs)',
  fontWeight: 600,
  letterSpacing: '0.5px',
}

const statCardValue: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 'var(--spacing-sm)',
}

const statCardNumber: React.CSSProperties = {
  fontSize: '2.5rem',
}

const statCardUnit: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 500,
  opacity: 0.8,
}

const progressBar: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: 'var(--radius-full)',
  overflow: 'hidden',
  marginBottom: 'var(--spacing-sm)',
}

const progressFill: React.CSSProperties = {
  height: '100%',
  borderRadius: 'var(--radius-full)',
  transition: 'width var(--transition-base)',
}

const statCardHint: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  marginTop: 'var(--spacing-xs)',
}
