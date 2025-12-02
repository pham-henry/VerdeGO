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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 20px' }}>
      <h2>Weekly Goal Setter</h2>
      <p style={{ marginBottom: 24, color: '#555' }}>
        Tune your weekly eco-commute goals using the sliders below. VerdeGO will use these targets to
        affirm your impact on the home page.
      </p>

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
      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <button type="button" style={primaryBtn} onClick={onSave} disabled={saving || loading}>
          Save goals
        </button>
        <button type="button" style={secondaryBtn} onClick={onReset} disabled={saving || loading}>
          Reset to suggested
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#B71C1C', background: '#FFEBEE', padding: '8px 12px', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {status && !error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
          {status}
        </div>
      )}
    </div>
  )
}

function GoalBlock(props: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid #E0E0E0',
        padding: 16,
        marginBottom: 16,
        background: '#FAFAFA'
      }}
    >
      <h3 style={{ margin: '0 0 4px' }}>{props.title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>{props.description}</p>
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={e => props.onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <div style={{ minWidth: 70, textAlign: 'right', fontWeight: 600 }}>
        {props.value} {props.unit}
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: 'none',
  background: '#4CAF50',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer'
}

const secondaryBtn: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: '1px solid #BDBDBD',
  background: '#FFFFFF',
  color: '#555',
  cursor: 'pointer'
}

