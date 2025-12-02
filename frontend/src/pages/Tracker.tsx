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

const defaultEmail = 'demo@user.com'

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

    const pMode = emissionSummaryByMode({ user_email: defaultEmail }, { signal: ctrl.signal })
    const pDay  = emissionSummaryByDay({ user_email: defaultEmail }, { signal: ctrl.signal })
    const pComm = listCommutes({ user_email: defaultEmail }, { signal: ctrl.signal })

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

      // normalize to date-only so multiple trips on the same day are grouped
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
    <div style={container}>
      {/* buffering overlay */}
      {overlayVisible && (
        <div style={overlayStyle}>
          <div style={spinnerStyle} aria-label="Loading" />
          <div style={overlayText}>Loading your carbon footprint data…</div>
        </div>
      )}

      <div style={headerSection}>
        <h2 style={title}>Carbon Footprint Tracker</h2>
        <p style={subtitle}>
          Visualize your emissions by mode and track your environmental impact over time.
        </p>
      </div>

      {/* Only render the rest once the active view's data is ready */}
      {activeReady && (
        <>
          {/* View switch */}
          <div style={viewToggleSection}>
            <label style={toggleLabel}>
              <input
                type="checkbox"
                checked={showZeroView}
                onChange={(e) => onToggleZeroView(e.target.checked)}
                style={toggleCheckbox}
              />
              <span style={toggleText}>Show zero-emission distance view</span>
            </label>
          </div>

          {!showZeroView ? (
            <>
              <div style={summaryCard}>
                <div style={summaryLabel}>Total Emissions</div>
                <div style={summaryValue}>{total.toFixed(2)} kg CO₂e</div>
                <div style={summaryHint}>From all logged commutes</div>
              </div>

              <div style={chartsGrid}>
                {/* Emissions by mode (pie) */}
                <div style={chartCard}>
                  <h3 style={chartTitle}>Emissions by Mode</h3>
                  <div style={chartContainer}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={byMode}
                          dataKey="value"
                          nameKey="label"
                          outerRadius={100}
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
                </div>

                {/* Emissions daily trend */}
                <div style={chartCard}>
                  <h3 style={chartTitle}>Daily Emissions Trend</h3>
                  <div style={chartContainer}>
                    <ResponsiveContainer>
                      <LineChart data={byDay}>
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#4CAF50" strokeWidth={3} dot={{ fill: '#4CAF50', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Emissions table */}
              <div style={tableSection}>
                <h3 style={tableTitle}>Emission Breakdown by Mode</h3>
                <div style={tableWrapper}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={th}>Mode</th>
                        <th style={{ ...th, textAlign: 'right' }}>Emissions (kg CO₂e)</th>
                        <th style={{ ...th, textAlign: 'right' }}>Share of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byMode.map((m, i) => {
                        const pct = total > 0 ? (m.value / total) * 100 : 0
                        const color = MODE_COLORS[m.label] || MODE_COLORS.other
                        return (
                          <tr key={i} style={tableRow}>
                            <td style={{ ...tableCell, color, fontWeight: 600 }}>{m.label}</td>
                            <td style={{ ...tableCell, textAlign: 'right' }}>{m.value.toFixed(3)}</td>
                            <td style={{ ...tableCell, textAlign: 'right' }}>{pct.toFixed(1)}%</td>
                          </tr>
                        )
                      })}
                      {byMode.length === 0 && (
                        <tr>
                          <td colSpan={3} style={emptyState}>
                            <div style={emptyStateContent}>
                              <p>No emission data yet — all your commutes are zero-emission!</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Zero-emission distance view */
            <>
              <div style={summaryCard}>
                <div style={summaryLabel}>Total Zero-Emission Distance</div>
                <div style={{ ...summaryValue, color: 'var(--verdego-dark)' }}>{zeroDistance.totalKm.toFixed(2)} km</div>
                <div style={summaryHint}>Walk + Bike distances</div>
              </div>

              <div style={chartCard}>
                <h3 style={chartTitle}>Zero-Emission Distance by Day</h3>
                <div style={{ ...chartContainer, height: 360 }}>
                  <ResponsiveContainer>
                    <LineChart data={zeroDistance.series}>
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#2E7D32" strokeWidth={3} dot={{ fill: '#2E7D32', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* --- Styles --- */
const container: React.CSSProperties = {
  position: 'relative',
  minHeight: 400,
  maxWidth: 1200,
  margin: '0 auto',
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
  lineHeight: 1.5,
}

const viewToggleSection: React.CSSProperties = {
  marginBottom: 'var(--spacing-xl)',
  padding: 'var(--spacing-md)',
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
}

const toggleLabel: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 500,
}

const toggleCheckbox: React.CSSProperties = {
  width: '20px',
  height: '20px',
  cursor: 'pointer',
}

const toggleText: React.CSSProperties = {
  color: 'var(--text-primary)',
}

const summaryCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  marginBottom: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-light)',
  textAlign: 'center',
}

const summaryLabel: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 'var(--spacing-sm)',
}

const summaryValue: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: 'var(--color-primary)',
  marginBottom: 'var(--spacing-xs)',
}

const summaryHint: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text-tertiary)',
}

const chartsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  gap: 'var(--spacing-xl)',
  marginBottom: 'var(--spacing-xl)',
}

const chartCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-light)',
}

const chartTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: 'var(--spacing-lg)',
  color: 'var(--text-primary)',
}

const chartContainer: React.CSSProperties = {
  height: 320,
  width: '100%',
}

const tableSection: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-light)',
  marginTop: 'var(--spacing-xl)',
}

const tableTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: 'var(--spacing-lg)',
  color: 'var(--text-primary)',
}

const tableWrapper: React.CSSProperties = {
  overflowX: 'auto',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--spacing-md)',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  borderBottom: '2px solid var(--border-light)',
  backgroundColor: 'var(--bg-light)',
}

const tableRow: React.CSSProperties = {
  borderBottom: '1px solid var(--border-light)',
}

const tableCell: React.CSSProperties = {
  padding: 'var(--spacing-md)',
  fontSize: '14px',
  color: 'var(--text-primary)',
}

const emptyState: React.CSSProperties = {
  padding: 'var(--spacing-2xl)',
  textAlign: 'center',
}

const emptyStateContent: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--spacing-md)',
  color: 'var(--text-tertiary)',
}

/* --- overlay + spinner styles --- */
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(232, 245, 233, 0.95)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
  borderRadius: 'var(--radius-lg)',
}

const spinnerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  border: '4px solid rgba(76, 175, 80, 0.2)',
  borderTopColor: '#4CAF50',
  animation: 'spin 0.9s linear infinite',
}

const overlayText: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  fontSize: '16px',
}

const styleEl = typeof document !== 'undefined' ? document.createElement('style') : null
if (styleEl && !document.getElementById('verdego-spin-style')) {
  styleEl.id = 'verdego-spin-style'
  styleEl.textContent = `@keyframes verdego-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`
  document.head.appendChild(styleEl)
}
