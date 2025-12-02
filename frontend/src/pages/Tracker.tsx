import { useEffect, useMemo, useRef, useState } from 'react'
import {
  emissionSummaryByMode,
  emissionSummaryByDay,
  listCommutes,
  type Commute,
  type DayPoint
} from '../lib/api'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis
} from 'recharts'

const emailFromStorage = localStorage.getItem('email') || ''

// emitting modes palette
const MODE_COLORS: Record<string, string> = {
  scooter: '#9CCC65',
  bus: '#2196F3',
  car_gas: '#E53935',
  car_hybrid: '#FB8C00',
  car_ev: '#8E24AA',
  other: '#BDBDBD'
}

const ZERO_EMISSION_MODES = ['walk', 'bike']
type SeriesPoint = { label: string; value: number }

export default function Tracker() {
  const [byMode, setByMode] = useState<{ label: string; value: number }[]>([])
  const [byDay, setByDay] = useState<SeriesPoint[]>([])
  const [total, setTotal] = useState(0)

  const [commutes, setCommutes] = useState<Commute[]>([])
  const [showZeroView, setShowZeroView] = useState(false)

  // readiness + overlay control
  const [emissionsLoaded, setEmissionsLoaded] = useState(false)
  const [zeroLoaded, setZeroLoaded] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const rafHide = useRef<number | null>(null)

  // helper: hide overlay only after next paint (double RAF)
  const hideOverlayAfterPaint = () => {
    if (rafHide.current) cancelAnimationFrame(rafHide.current)
    rafHide.current = requestAnimationFrame(() =>
      requestAnimationFrame(() => setOverlayVisible(false))
    )
  }

  // prefetch everything in parallel on mount (timeouts/abort handled in API layer)
  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false
    setOverlayVisible(true)

    const pMode = emissionSummaryByMode({ user_email: emailFromStorage }, { signal: ctrl.signal })
    const pDay  = emissionSummaryByDay({ user_email: emailFromStorage }, { signal: ctrl.signal })
    const pComm = listCommutes({ user_email: emailFromStorage }, { signal: ctrl.signal })

    Promise.allSettled([pMode, pDay, pComm])
      .then(([modeRes, dayRes, commuteRes]) => {
        if (cancelled) return

        // Emissions (mode)
        if (modeRes.status === 'fulfilled') {
          const byModeObj = modeRes.value.by_mode_kg
          const filteredEntries = Object.entries(byModeObj)
            .filter(([k, v]) => !ZERO_EMISSION_MODES.includes(k) && Number(v) > 0)
          const filteredTotal = filteredEntries.reduce((acc, [, v]) => acc + Number(v), 0)
          setTotal(filteredTotal)
          setByMode(filteredEntries.map(([k, v]) => ({ label: k, value: Number(v) })))
          setEmissionsLoaded(true)
        }

        // Emissions (day)
        if (dayRes.status === 'fulfilled') {
          const series: DayPoint[] = dayRes.value.series
          setByDay(series.filter(d => Number(d.value) > 0))
          setEmissionsLoaded(true)
        }

        // Zero-emission (commutes)
        if (commuteRes.status === 'fulfilled') {
          setCommutes(Array.isArray(commuteRes.value) ? commuteRes.value : [])
          setZeroLoaded(true)
        }
      })
      .catch((e) => {
        console.error('Prefetch failed:', e)
      })

    return () => {
      cancelled = true
      ctrl.abort()
      if (rafHide.current) cancelAnimationFrame(rafHide.current)
    }
  }, [])

  // zero-emission aggregation from prefetched commutes
  const zeroDistance = useMemo(() => {
    let totalKm = 0
    const bucket: Record<string, number> = {}

    for (const r of commutes) {
      if (!ZERO_EMISSION_MODES.includes(r.mode)) continue

      // ✅ normalize to date-only so multiple trips on the same day are grouped
      const d = (() => {
        try {
          return new Date(r.date).toISOString().slice(0, 10) // "YYYY-MM-DD"
        } catch {
          return String(r.date).slice(0, 10)
        }
      })()

      const km = Number(r.distance_km || 0)
      if (!Number.isFinite(km) || km <= 0) continue

      totalKm += km
      bucket[d] = (bucket[d] ?? 0) + km
    }

    const series: SeriesPoint[] = Object.entries(bucket)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value: Number(value.toFixed(3)) }))

    return { totalKm: Number(totalKm.toFixed(3)), series }
  }, [commutes])

  // When data for the active view is loaded, wait for paint then hide overlay.
  useEffect(() => {
    const activeReady = showZeroView ? zeroLoaded : emissionsLoaded
    if (activeReady) {
      hideOverlayAfterPaint()
    } else {
      setOverlayVisible(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showZeroView, emissionsLoaded, zeroLoaded, byMode.length, byDay.length, zeroDistance.series.length])

  const emissionsReady = emissionsLoaded
  const zeroReady = zeroLoaded
  const activeReady = showZeroView ? zeroReady : emissionsReady

  // Toggle view: show overlay only if target isn't already ready
  function onToggleZeroView(checked: boolean) {
    const targetReady = checked ? zeroReady : emissionsReady
    if (!targetReady) setOverlayVisible(true)
    else hideOverlayAfterPaint()
    setShowZeroView(checked)
  }

  return (
    <div style={{ position: 'relative', minHeight: 400 }}>
      {/* buffering overlay */}
      {overlayVisible && (
        <div style={overlayStyle}>
          <div style={spinnerStyle} aria-label="Loading" />
          <div style={{ marginTop: 12, fontWeight: 600 }}>Loading…</div>
        </div>
      )}

      <h2>Carbon Footprint Tracker</h2>

      {/* Only render the rest once the active view's data is ready */}
      {activeReady && (
        <>
          {/* View switch */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 16px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showZeroView}
                onChange={(e) => onToggleZeroView(e.target.checked)}
              />
              Show zero-emission distance view
            </label>
          </div>

          {!showZeroView ? (
            <>
              <p>
                Total emissions from your logged commutes:&nbsp;
                <b>{total.toFixed(2)} kg CO₂e</b>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Emissions by mode (pie) */}
                <div style={{ height: 300 }}>
                  <h3>By Mode (excluding zero-emission)</h3>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={byMode}
                        dataKey="value"
                        nameKey="label"
                        outerRadius={90}
                        labelLine={false}
                        label={false}
                      >
                        {byMode.map((entry, idx) => {
                          const color = MODE_COLORS[entry.label] || MODE_COLORS.other
                          return <Cell key={`cell-${idx}`} fill={color} />
                        })}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Emissions daily trend */}
                <div style={{ height: 300 }}>
                  <h3>Daily Emissions Trend</h3>
                  <ResponsiveContainer>
                    <LineChart data={byDay}>
                      <XAxis dataKey="label" hide />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#4CAF50" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Emissions table */}
              <div style={{ marginTop: 60 }}>
                <h3>Emission Breakdown by Mode</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f3f3', borderBottom: '2px solid #ccc' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px' }}>Mode</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Emissions (kg CO₂e)</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px' }}>Share of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMode.map((m, i) => {
                      const pct = total > 0 ? (m.value / total) * 100 : 0
                      const color = MODE_COLORS[m.label] || MODE_COLORS.other
                      return (
                        <tr key={i} style={{ borderTop: '1px solid #ddd' }}>
                          <td style={{ padding: '8px 12px', color }}>{m.label}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>{m.value.toFixed(3)}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>{pct.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                    {byMode.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: 12, opacity: .6 }}>
                          No emission data yet — all your commutes are zero-emission 🌱
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* Zero-emission distance view */
            <>
              <p>
                Total <b>zero-emission distance</b> (walk + bike):&nbsp;
                <b>{zeroDistance.totalKm.toFixed(2)} km</b>
              </p>

              <div style={{ height: 340 }}>
                <h3>Zero-Emission Distance by Day</h3>
                <ResponsiveContainer>
                  <LineChart data={zeroDistance.series}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2E7D32" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* --- overlay + spinner styles --- */
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:'#E8F5E9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20
}

const spinnerStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: '4px solid rgba(0,0,0,0.1)',
  borderTopColor: '#4CAF50',
  animation: 'verdego-spin 0.9s linear infinite'
}

const styleEl = typeof document !== 'undefined' ? document.createElement('style') : null
if (styleEl && !document.getElementById('verdego-spin-style')) {
  styleEl.id = 'verdego-spin-style'
  styleEl.textContent = `@keyframes verdego-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
  document.head.appendChild(styleEl)
}
