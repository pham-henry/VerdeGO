import React, { useEffect, useMemo, useState } from 'react'
import { getWeeklyGoals, resetWeeklyGoals, saveWeeklyGoals, WeeklyGoalResponse } from '../lib/api'

const FALLBACK_EMAIL = 'demo@user.com'
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
    const parsed = JSON.parse(raw)
    return { ...defaultGoals, ...parsed }
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

export default function WeeklyGoals() {
  const [userEmail, setUserEmail] = useState<string>(() => resolveUserEmail())
  const [goals, setGoals] = useState<WeeklyGoals>(() => loadGoals(resolveUserEmail()))
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isGuest = userEmail === FALLBACK_EMAIL

  useEffect(() => {
    setUserEmail(resolveUserEmail())
  }, [])

  useEffect(() => {
    let cancelled = false
    if (isGuest) {
      setGoals(loadGoals(userEmail))
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    getWeeklyGoals(userEmail)
      .then(resp => {
        if (cancelled) return
        const normalized = normalizeGoalResponse(resp)
        setGoals(normalized)
        saveGoals(userEmail, normalized)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to fetch weekly goals', err)
        setError(err?.message || 'Failed to fetch weekly goals')
        setGoals(loadGoals(userEmail))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userEmail, isGuest])

  function onSliderChange(field: keyof WeeklyGoals, val: number) {
    setGoals(prev => ({ ...prev, [field]: val }))
  }

  async function persistGoals(next: WeeklyGoals) {
    if (isGuest) {
      setGoals(next)
      saveGoals(userEmail, next)
      setSavedAt(new Date().toLocaleTimeString())
      return
    }

    setSaving(true)
    setError(null)
    try {
      const resp = await saveWeeklyGoals({
        user_email: userEmail,
        weeklyZeroKm: next.weeklyZeroKm,
        weeklyEmissionCapKg: next.weeklyEmissionCapKg,
        weeklyCommuteCount: next.weeklyCommuteCount
      })
      const normalized = normalizeGoalResponse(resp)
      setGoals(normalized)
      saveGoals(userEmail, normalized)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err: any) {
      console.error('Failed to save weekly goals', err)
      setError(err?.message || 'Save failed, please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function onSave() {
    await persistGoals(goals)
  }

  async function onReset() {
    if (isGuest) {
      setGoals(defaultGoals)
      saveGoals(userEmail, defaultGoals)
      setSavedAt(new Date().toLocaleTimeString())
      return
    }

    setSaving(true)
    setError(null)
    try {
      const resp = await resetWeeklyGoals(userEmail)
      const normalized = normalizeGoalResponse(resp)
      setGoals(normalized)
      saveGoals(userEmail, normalized)
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err: any) {
      console.error('Failed to reset weekly goals', err)
      setError(err?.message || 'Reset failed, please try again.')
    } finally {
      setSaving(false)
    }
  }

  const status = useMemo(() => {
    if (loading) return 'Loading your saved goals...'
    if (saving) return 'Saving goals...'
    if (savedAt) return `Goals last saved at ${savedAt}.`
    return null
  }, [loading, saving, savedAt])

  return (
    <div style={container}>
      <div style={headerSection}>
        <h2 style={title}>Weekly Goal Setter</h2>
        <p style={subtitle}>
          Customize your weekly eco-commute goals using the sliders below. VerdeGO will use these targets to
          affirm your impact on the home page.
        </p>
      </div>

      {/* Zero-emission distance */}
      <GoalBlock
        title="Zero-emission distance (km)"
        description="How many kilometers per week would you like to travel using walk or bike?"
      >
        <SliderRow
          min={0}
          max={100}
          step={1}
          value={goals.weeklyZeroKm}
          onChange={v => onSliderChange('weeklyZeroKm', v)}
          unit="km"
        />
      </GoalBlock>

      {/* Emission cap */}
      <GoalBlock
        title="Weekly emission cap (kg CO₂e)"
        description="What is the maximum amount of commuting emissions you'd like to stay under each week?"
      >
        <SliderRow
          min={5}
          max={100}
          step={1}
          value={goals.weeklyEmissionCapKg}
          onChange={v => onSliderChange('weeklyEmissionCapKg', v)}
          unit="kg"
        />
      </GoalBlock>

      {/* Commute count */}
      <GoalBlock
        title="Commutes logged per week"
        description="How many total commutes would you like to consistently log each week?"
      >
        <SliderRow
          min={1}
          max={30}
          step={1}
          value={goals.weeklyCommuteCount}
          onChange={v => onSliderChange('weeklyCommuteCount', v)}
          unit="trips"
        />
      </GoalBlock>

      {/* Actions */}
      <div style={actions}>
        <button type="button" style={primaryBtn} onClick={onSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
        <button type="button" style={secondaryBtn} onClick={onReset} disabled={saving || loading}>
          Reset to Default
        </button>
      </div>

      {error && (
        <div style={errorBox}>
          {error}
        </div>
      )}

      {status && !error && (
        <div style={statusBox}>
          {status}
        </div>
      )}
    </div>
  )
}

function GoalBlock(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={goalBlock}>
      <h3 style={goalBlockTitle}>{props.title}</h3>
      <p style={goalBlockDescription}>{props.description}</p>
      {props.children}
    </section>
  )
}

function SliderRow(props: {
  min: number
  max: number
  step: number
  value: number
  unit?: string
  onChange: (v: number) => void
}) {
  const percentage = ((props.value - props.min) / (props.max - props.min)) * 100
  
  return (
    <div style={sliderContainer}>
      <div style={sliderWrapper}>
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step}
          value={props.value}
          onChange={e => props.onChange(Number(e.target.value))}
          style={slider}
        />
      </div>
      <div style={sliderValue}>
        <span style={sliderValueNumber}>{props.value}</span>
        <span style={sliderValueUnit}> {props.unit}</span>
      </div>
    </div>
  )
}

const container: React.CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: 'var(--spacing-lg)',
}

const headerSection: React.CSSProperties = {
  marginBottom: 'var(--spacing-xl)',
}

const title: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: 'var(--spacing-sm)',
  background: 'linear-gradient(135deg, var(--verdego-green), var(--verdego-dark))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const subtitle: React.CSSProperties = {
  fontSize: '1rem',
  color: 'var(--text-secondary)',
  marginBottom: 0,
  lineHeight: 1.6,
}

const goalBlock: React.CSSProperties = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-light)',
  padding: 'var(--spacing-lg)',
  marginBottom: 'var(--spacing-lg)',
  background: 'var(--bg-white)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all var(--transition-base)',
}

const goalBlockTitle: React.CSSProperties = {
  margin: '0 0 var(--spacing-xs)',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const goalBlockDescription: React.CSSProperties = {
  margin: '0 0 var(--spacing-md)',
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
}

const sliderContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
}

const sliderWrapper: React.CSSProperties = {
  flex: 1,
  position: 'relative',
}

const slider: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: 'var(--radius-full)',
  background: 'var(--border-light)',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
}

const sliderValue: React.CSSProperties = {
  minWidth: '80px',
  textAlign: 'right',
  fontSize: '1.25rem',
  fontWeight: 700,
  color: 'var(--color-primary)',
}

const sliderValueNumber: React.CSSProperties = {
  fontSize: '1.5rem',
}

const sliderValueUnit: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 500,
  opacity: 0.8,
}

const actions: React.CSSProperties = {
  marginTop: 'var(--spacing-xl)',
  display: 'flex',
  gap: 'var(--spacing-md)',
  flexWrap: 'wrap',
}

const primaryBtn: React.CSSProperties = {
  padding: 'var(--spacing-md) var(--spacing-xl)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '15px',
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)',
}

const secondaryBtn: React.CSSProperties = {
  padding: 'var(--spacing-md) var(--spacing-xl)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-white)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 500,
  transition: 'all var(--transition-fast)',
}

const errorBox: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  fontSize: '14px',
  color: '#B71C1C',
  background: '#FFEBEE',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid #EF5350',
}

const statusBox: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  fontSize: '14px',
  color: 'var(--text-secondary)',
  padding: 'var(--spacing-sm)',
}

