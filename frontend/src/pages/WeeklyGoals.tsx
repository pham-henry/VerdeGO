import React, { useEffect, useState } from 'react'

const defaultEmail = 'demo@user.com'
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

export default function WeeklyGoals() {
  const [goals, setGoals] = useState<WeeklyGoals>(() => loadGoals(defaultEmail))
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    // sync with any external changes (e.g. other tabs/pages)
    const current = loadGoals(defaultEmail)
    setGoals(current)
  }, [])

  function onSliderChange(field: keyof WeeklyGoals, val: number) {
    setGoals(prev => ({ ...prev, [field]: val }))
  }

  function onSave() {
    saveGoals(defaultEmail, goals)
    setSavedAt(new Date().toLocaleTimeString())
  }

  function onReset() {
    setGoals(defaultGoals)
    saveGoals(defaultEmail, defaultGoals)
    setSavedAt(new Date().toLocaleTimeString())
  }

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
        <button type="button" style={primaryBtn} onClick={onSave}>
          Save goals
        </button>
        <button type="button" style={secondaryBtn} onClick={onReset}>
          Reset to suggested
        </button>
      </div>

      {savedAt && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#777' }}>
          Goals last saved at {savedAt}.
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

