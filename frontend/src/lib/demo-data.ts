/**
 * Demo mode data storage and utilities
 * 
 * This module provides in-memory/localStorage storage for demo mode,
 * simulating backend behavior without network calls.
 */

import type { Commute, EmissionByMode, EmissionByDay, WeeklyGoalResponse, WeeklyGoalPayload } from './api'
import { DEMO_USER } from '../config/demo'

// Storage keys
const DEMO_COMMUTES_KEY = 'verdego:demo:commutes'
const DEMO_GOALS_KEY = 'verdego:demo:goals'

// Emission factors (kg CO₂ per km)
const EMISSION_FACTORS: Record<string, number> = {
  walk: 0,
  bike: 0,
  walking: 0,
  biking: 0,
  bicycle: 0,
  scooter: 0.021,
  bus: 0.105,
  'car (gas)': 0.192,
  'car(gas)': 0.192,
  car_gas: 0.192,
  'car (hybrid)': 0.120,
  'car(hybrid)': 0.120,
  car_hybrid: 0.120,
  'car (ev)': 0.050,
  'car(ev)': 0.050,
  car_ev: 0.050,
  other: 0.15
}

function normalizeMode(mode: string): string {
  if (!mode) return 'other'
  const normalized = mode.trim().toLowerCase()
  if (normalized.includes('walk')) return 'walk'
  if (normalized.includes('bike') || normalized.includes('bicycle')) return 'bike'
  if (normalized.includes('scooter')) return 'scooter'
  if (normalized.includes('bus')) return 'bus'
  if (normalized.includes('hybrid')) return 'car_hybrid'
  if (normalized.includes('ev') || normalized.includes('electric')) return 'car_ev'
  if (normalized.includes('gas') || normalized.includes('drive') || normalized.includes('car')) return 'car_gas'
  return normalized
}

function calculateEmission(mode: string, distance_km: number): number {
  const normMode = normalizeMode(mode)
  const factor = EMISSION_FACTORS[normMode] ?? EMISSION_FACTORS.other
  return factor * distance_km
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Get all commutes from localStorage
function getDemoCommutes(): Commute[] {
  try {
    const raw = localStorage.getItem(DEMO_COMMUTES_KEY)
    if (!raw) {
      // Initialize with some sample data
      const samples: Commute[] = [
        {
          id: 1,
          user_email: DEMO_USER.email,
          date: daysAgoISO(2),
          mode: 'Bike',
          distance_km: 5.2,
          duration_min: 20,
          notes: 'Morning commute'
        },
        {
          id: 2,
          user_email: DEMO_USER.email,
          date: daysAgoISO(1),
          mode: 'Bus',
          distance_km: 8.5,
          duration_min: 35,
          notes: 'Afternoon return'
        },
        {
          id: 3,
          user_email: DEMO_USER.email,
          date: todayISO(),
          mode: 'Walk',
          distance_km: 2.1,
          duration_min: 25,
          notes: 'Lunch break walk'
        },
        {
          id: 4,
          user_email: DEMO_USER.email,
          date: daysAgoISO(5),
          mode: 'Car (Gas)',
          distance_km: 12.3,
          duration_min: 30,
          notes: 'Rainy day commute'
        },
        {
          id: 5,
          user_email: DEMO_USER.email,
          date: daysAgoISO(3),
          mode: 'Bike',
          distance_km: 4.8,
          duration_min: 18
        }
      ]
      localStorage.setItem(DEMO_COMMUTES_KEY, JSON.stringify(samples))
      return samples
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveDemoCommutes(commutes: Commute[]) {
  localStorage.setItem(DEMO_COMMUTES_KEY, JSON.stringify(commutes))
}

// Demo API implementations

export async function demoListCommutes(params: { from?: string; to?: string }): Promise<Commute[]> {
  const commutes = getDemoCommutes()
  const from = params.from ?? daysAgoISO(60)
  const to = params.to ?? todayISO()

  // Filter by date range
  return commutes.filter(c => {
    const date = c.date
    return date >= from && date <= to
  })
}

export async function demoCreateCommute(commute: Omit<Commute, 'user_email'>): Promise<Commute> {
  const commutes = getDemoCommutes()
  const newId = Math.max(0, ...commutes.map(c => Number(c.id) || 0)) + 1
  
  const newCommute: Commute = {
    ...commute,
    id: newId,
    user_email: DEMO_USER.email
  }
  
  commutes.push(newCommute)
  saveDemoCommutes(commutes)
  return newCommute
}

export async function demoDeleteCommute(id: string | number): Promise<void> {
  const commutes = getDemoCommutes()
  const filtered = commutes.filter(c => String(c.id) !== String(id))
  saveDemoCommutes(filtered)
}

export async function demoEmissionSummaryByMode(params: { from?: string; to?: string }): Promise<EmissionByMode> {
  const commutes = await demoListCommutes(params)
  const byMode: Record<string, number> = {}

  for (const c of commutes) {
    const mode = normalizeMode(c.mode)
    const emission = calculateEmission(c.mode, c.distance_km || 0)
    if (emission > 0) {
      byMode[mode] = (byMode[mode] || 0) + emission
    }
  }

  return { by_mode_kg: byMode }
}

export async function demoEmissionSummaryByDay(params: { from?: string; to?: string }): Promise<EmissionByDay> {
  const commutes = await demoListCommutes(params)
  const byDay: Record<string, number> = {}

  for (const c of commutes) {
    const date = c.date
    const emission = calculateEmission(c.mode, c.distance_km || 0)
    byDay[date] = (byDay[date] || 0) + emission
  }

  // Convert to series format
  const series = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value: Number(value.toFixed(3)) }))

  return { series }
}

export async function demoGetWeeklyGoals(): Promise<WeeklyGoalResponse> {
  try {
    const raw = localStorage.getItem(DEMO_GOALS_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}

  // Default goals
  const defaultGoals: WeeklyGoalResponse = {
    user_email: DEMO_USER.email,
    weeklyZeroKm: 15,
    weeklyEmissionCapKg: 25,
    weeklyCommuteCount: 10,
    updatedAt: new Date().toISOString()
  }
  
  localStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(defaultGoals))
  return defaultGoals
}

export async function demoSaveWeeklyGoals(payload: Omit<WeeklyGoalPayload, 'user_email'>): Promise<WeeklyGoalResponse> {
  const goals: WeeklyGoalResponse = {
    user_email: DEMO_USER.email,
    ...payload,
    updatedAt: new Date().toISOString()
  }
  localStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(goals))
  return goals
}

export async function demoResetWeeklyGoals(): Promise<WeeklyGoalResponse> {
  const defaultGoals: WeeklyGoalResponse = {
    user_email: DEMO_USER.email,
    weeklyZeroKm: 15,
    weeklyEmissionCapKg: 25,
    weeklyCommuteCount: 10,
    updatedAt: new Date().toISOString()
  }
  localStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(defaultGoals))
  return defaultGoals
}

export async function demoRecommendRoute(payload: {
  origin: string | { lat: number; lng: number }
  destination: string | { lat: number; lng: number }
  prefs?: { ecoPriority?: number; speedPriority?: number; costPriority?: number }
}): Promise<{ options: Array<{
  type?: string
  summary?: string
  duration_min?: number
  transfers?: number
  co2_kg?: number
  mode?: string
}> }> {
  // Generate realistic demo route options based on typical distances
  // Assume ~10km distance for demo purposes
  const distanceKm = 10
  const ecoPriority = payload.prefs?.ecoPriority ?? 2
  const speedPriority = payload.prefs?.speedPriority ?? 2
  const costPriority = payload.prefs?.costPriority ?? 2

  const options = [
    {
      type: 'walking',
      summary: 'Walking route',
      duration_min: Math.round(distanceKm * 12), // ~12 min/km walking
      transfers: 0,
      co2_kg: 0,
      mode: 'walk'
    },
    {
      type: 'bicycling',
      summary: 'Bicycle route',
      duration_min: Math.round(distanceKm * 4), // ~4 min/km biking
      transfers: 0,
      co2_kg: 0,
      mode: 'bike'
    },
    {
      type: 'transit',
      summary: 'Bus route with 1 transfer',
      duration_min: Math.round(distanceKm * 2.5 + 15), // bus time + transfer
      transfers: 1,
      co2_kg: Number((distanceKm * 0.105).toFixed(3)),
      mode: 'bus'
    },
    {
      type: 'driving',
      summary: 'Driving route via main roads',
      duration_min: Math.round(distanceKm * 1.5), // ~1.5 min/km driving
      transfers: 0,
      co2_kg: Number((distanceKm * 0.192).toFixed(3)),
      mode: 'car_gas'
    },
    {
      type: 'driving',
      summary: 'Driving route (Hybrid)',
      duration_min: Math.round(distanceKm * 1.5),
      transfers: 0,
      co2_kg: Number((distanceKm * 0.120).toFixed(3)),
      mode: 'car_hybrid'
    },
    {
      type: 'driving',
      summary: 'Driving route (EV)',
      duration_min: Math.round(distanceKm * 1.5),
      transfers: 0,
      co2_kg: Number((distanceKm * 0.050).toFixed(3)),
      mode: 'car_ev'
    }
  ]

  // Sort based on priorities (simple demo sorting)
  options.sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    // Eco score (lower is better)
    if (ecoPriority === 1) {
      scoreA += (a.co2_kg || 0) * 10
      scoreB += (b.co2_kg || 0) * 10
    } else if (ecoPriority === 2) {
      scoreA += (a.co2_kg || 0) * 5
      scoreB += (b.co2_kg || 0) * 5
    }

    // Speed score (lower duration is better)
    if (speedPriority === 1) {
      scoreA += (a.duration_min || 999) * 0.1
      scoreB += (b.duration_min || 999) * 0.1
    } else if (speedPriority === 2) {
      scoreA += (a.duration_min || 999) * 0.05
      scoreB += (b.duration_min || 999) * 0.05
    }

    return scoreA - scoreB
  })

  return { options }
}

