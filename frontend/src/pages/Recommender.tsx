import { useEffect, useMemo, useRef, useState } from 'react'
import { recommendRoute } from '../lib/api'

/* ---------------- Types ---------------- */
type Option = {
  type?: string
  summary?: string
  duration_min?: number
  transfers?: number
  co2_kg?: number
  mode?: string
}

type RankRow = {
  mode: string
  label: string
  eco?: number
  speed?: number
  cost?: number
  overall?: number
  raw: { co2_kg?: number; duration_min?: number; cost_usd?: number }
}

type Priority = 1 | 2 | 3

/* --------- Emissions & cost helpers --------- */
const EMISSION_FACTORS: Record<string, number> = {
  walk: 0,
  bike: 0,
  scooter: 0.021,
  bus: 0.105,
  car_gas: 0.192,
  car_hybrid: 0.120,
  car_ev: 0.050,
  other: 0.15
}

const GAS_PRICE_USD_PER_GAL = 4.50
const ELECTRIC_PRICE_USD_PER_KWH = 0.20
const GAS_MPG = 28
const EV_MILES_PER_KWH = 3.5
const BUS_FARE_FLAT = 2.50

function kmToMiles(km: number): number { return km * 0.621371 }
function safeNumber(x: any, fallback = 0): number { const n = Number(x); return Number.isFinite(n) ? n : fallback }

function estimateDistanceKm(mode: string, co2_kg?: number): number {
  const f = EMISSION_FACTORS[mode] ?? EMISSION_FACTORS.other
  if (!co2_kg || f === 0) return 0
  return co2_kg / f
}

function costUSD(mode: string, distance_km: number): number {
  const miles: number = kmToMiles(distance_km)

  if (mode === 'walk' || mode === 'bike' || mode === 'scooter') return 0
  if (mode === 'bus') return BUS_FARE_FLAT

  if (mode === 'car_gas') {
    const gallons: number = miles / GAS_MPG
    return gallons * GAS_PRICE_USD_PER_GAL
  }

  if (mode === 'car_ev') {
    const kwh: number = miles / EV_MILES_PER_KWH
    return kwh * ELECTRIC_PRICE_USD_PER_KWH
  }

  if (mode === 'car_hybrid') {
    const gas: number = costUSD('car_gas', distance_km)
    const ev: number = costUSD('car_ev', distance_km)
    return (gas + ev) / 2
  }

  return 2.0
}

function detectMode(opt: Option): string {
  const s = `${opt.mode ?? ''} ${opt.summary ?? ''}`.toLowerCase()
  if (s.includes('walk')) return 'walk'
  if (s.includes('bike')) return 'bike'
  if (s.includes('scooter')) return 'scooter'
  if (s.includes('bus')) return 'bus'
  if (s.includes('hybrid')) return 'car_hybrid'
  if (s.includes('ev') || s.includes('electric')) return 'car_ev'
  if (s.includes('drive') || s.includes('car') || s.includes('us-') || s.includes('i-')) return 'car_gas'
  return 'other'
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'walk': return 'Walking'
    case 'bike': return 'Biking'
    case 'scooter': return 'Scooter'
    case 'bus': return 'Bus'
    case 'car_gas': return 'Car (Gas)'
    case 'car_hybrid': return 'Car (Hybrid)'
    case 'car_ev': return 'Car (EV)'
    default: return 'Other'
  }
}

function rankAscending(items: number[]): number[] {
  const pairs = items.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = Array(items.length).fill(0)
  let currentRank = 1
  for (let idx = 0; idx < pairs.length; idx++) {
    if (idx > 0 && pairs[idx].v !== pairs[idx - 1].v) currentRank = idx + 1
    ranks[pairs[idx].i] = currentRank
  }
  return ranks
}

/* -------- Google Maps loader (no status banner) -------- */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if ((window as any)._gmapsLoaded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    ;(window as any)._gmapsLoaded = true
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

/* ================= Component ================= */
export default function Recommender() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [resp, setResp] = useState<{ options?: Option[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    origin?: string
    destination?: string
    priorities?: string
  }>({})

  // NEW: user priorities for eco / speed / cost
  const [ecoPriority, setEcoPriority] = useState<Priority>(1)
  const [speedPriority, setSpeedPriority] = useState<Priority>(2)
  const [costPriority, setCostPriority] = useState<Priority>(3)

  // Map refs/objs
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObj = useRef<any>(null)
  const markers = useRef<{ origin?: any; destination?: any }>({})
  const polylineRef = useRef<any>(null)
  const originInputRef = useRef<HTMLInputElement | null>(null)
  const destInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    let mounted = true

    ;(async () => {
      if (key) {
        await loadGoogleMaps(key)
      }
      if (!mounted || !mapRef.current) return

      const g = (window as any).google
      const center = { lat: 37.3352, lng: -121.8811 } // SJSU
      mapObj.current = new g.maps.Map(mapRef.current, { center, zoom: 11, gestureHandling: 'greedy' })

      polylineRef.current = new g.maps.Polyline({
        path: [],
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: mapObj.current
      })

      // Autocomplete
      if (originInputRef.current) {
        const ac = new g.maps.places.Autocomplete(originInputRef.current)
        ac.addListener('place_changed', () => {
          const p = ac.getPlace()
          if (p?.formatted_address) setOrigin(p.formatted_address)
          if (p?.geometry?.location) setMarker('origin', p.geometry.location)
        })
      }
      if (destInputRef.current) {
        const ac2 = new g.maps.places.Autocomplete(destInputRef.current)
        ac2.addListener('place_changed', () => {
          const p = ac2.getPlace()
          if (p?.formatted_address) setDestination(p.formatted_address)
          if (p?.geometry?.location) setMarker('destination', p.geometry.location)
        })
      }

      // Click to alternate origin/destination
      let nextIsOrigin = true
      mapObj.current.addListener('click', (e: any) => {
        const latLng = e.latLng
        if (nextIsOrigin) {
          setMarker('origin', latLng, true)
        } else {
          setMarker('destination', latLng, true)
        }
        nextIsOrigin = !nextIsOrigin
      })
    })()

    return () => { mounted = false }
  }, [])

  function bindMarkerDrag(kind: 'origin'|'destination'): void {
    const g = (window as any).google
    const m = markers.current[kind]
    if (!g || !m) return
    m.addListener('dragend', () => {
      const pos = m.getPosition()
      drawPolyline()
      reverseGeocode(pos, kind === 'origin' ? setOrigin : setDestination)
    })
  }

  function setMarker(kind: 'origin'|'destination', latLng: any, updateText = false): void {
    const g = (window as any).google
    if (!g || !mapObj.current) return

    // Validate coordinates
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setValidationErrors(prev => ({
        ...prev,
        [kind]: 'Invalid coordinates. Please try again.'
      }))
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setValidationErrors(prev => ({
        ...prev,
        [kind]: 'Coordinates are out of valid range.'
      }))
      return
    }

    // Clear validation error for this field
    setValidationErrors(prev => ({ ...prev, [kind]: undefined }))

    // remove existing marker of that kind
    if (markers.current[kind]) markers.current[kind].setMap(null)

    const icon = kind === 'destination'
      ? { path: g.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#E53935', fillOpacity: 1, strokeWeight: 1 }
      : undefined

    const marker = new g.maps.Marker({
      position: latLng,
      map: mapObj.current,
      icon,
      draggable: true,
      animation: g.maps.Animation.DROP
    })
    markers.current[kind] = marker

    bindMarkerDrag(kind)
    mapObj.current.panTo(latLng)
    if (updateText) reverseGeocode(latLng, kind === 'origin' ? setOrigin : setDestination)
    drawPolyline()
  }

  function drawPolyline(): void {
    const g = (window as any).google
    if (!g || !polylineRef.current) return
    const o = markers.current.origin?.getPosition?.()
    const d = markers.current.destination?.getPosition?.()
    if (o && d) {
      polylineRef.current.setPath([o, d])
      const bounds = new g.maps.LatLngBounds()
      bounds.extend(o); bounds.extend(d)
      mapObj.current.fitBounds(bounds)
    } else {
      polylineRef.current.setPath([])
    }
  }

  function reverseGeocode(latLng: any, setText: (s: string) => void): void {
    const g = (window as any).google
    if (!g) return
    const geocoder = new g.maps.Geocoder()
    geocoder.geocode({ location: latLng }, (results: any, status: any) => {
      if (status === 'OK' && results?.[0]) setText(results[0].formatted_address)
    })
  }

  function swap(): void {
    setOrigin(prev => {
      const newOrigin = destination
      setDestination(prev)
      const g = (window as any).google
      if (g && mapObj.current) {
        const oPos = markers.current.origin?.getPosition?.()
        const dPos = markers.current.destination?.getPosition?.()
        if (markers.current.origin) markers.current.origin.setMap(null)
        if (markers.current.destination) markers.current.destination.setMap(null)
        if (dPos) setMarker('origin', dPos)
        if (oPos) setMarker('destination', oPos)
        drawPolyline()
      }
      return newOrigin
    })
  }

  function clearAll(): void {
    setOrigin('')
    setDestination('')
    setResp(null)
    setErrorMsg(null)
    setValidationErrors({})

    const g = (window as any).google
    if (g && mapObj.current) {
      if (markers.current.origin) {
        markers.current.origin.setMap(null)
      }
      if (markers.current.destination) {
        markers.current.destination.setMap(null)
      }
      markers.current = {}
    }
    if (polylineRef.current) {
      polylineRef.current.setPath([])
    }
  }

  // Validation function
  function validateInputs(): boolean {
    const errors: typeof validationErrors = {}
    let isValid = true

    // Validate origin
    const oPos = markers.current.origin?.getPosition?.()
    if (!oPos && !origin.trim()) {
      errors.origin = 'Origin is required. Enter an address or click on the map.'
      isValid = false
    } else if (oPos) {
      const lat = oPos.lat()
      const lng = oPos.lng()
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        errors.origin = 'Invalid origin coordinates.'
        isValid = false
      } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.origin = 'Origin coordinates are out of valid range.'
        isValid = false
      }
    }

    // Validate destination
    const dPos = markers.current.destination?.getPosition?.()
    if (!dPos && !destination.trim()) {
      errors.destination = 'Destination is required. Enter an address or click on the map.'
      isValid = false
    } else if (dPos) {
      const lat = dPos.lat()
      const lng = dPos.lng()
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        errors.destination = 'Invalid destination coordinates.'
        isValid = false
      } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.destination = 'Destination coordinates are out of valid range.'
        isValid = false
      }
    }

    // Validate priorities are unique
    const priorities = [ecoPriority, speedPriority, costPriority]
    const uniquePriorities = new Set(priorities)
    if (uniquePriorities.size !== 3) {
      errors.priorities = 'Each priority must have a unique value (1, 2, or 3).'
      isValid = false
    }

    // Validate priority values
    if (![1, 2, 3].includes(ecoPriority) || ![1, 2, 3].includes(speedPriority) || ![1, 2, 3].includes(costPriority)) {
      errors.priorities = 'Priorities must be 1, 2, or 3.'
      isValid = false
    }

    setValidationErrors(errors)
    return isValid
  }

  async function run(): Promise<void> {
    // Clear previous errors
    setErrorMsg(null)
    setValidationErrors({})

    // Validate inputs
    if (!validateInputs()) {
      return
    }

    try {
      setLoading(true)

      const oPos = markers.current.origin?.getPosition?.()
      const dPos = markers.current.destination?.getPosition?.()

      const prefs = {
        ecoPriority,
        speedPriority,
        costPriority,
      }

      const payload = (oPos && dPos)
        ? {
            origin: { lat: oPos.lat(), lng: oPos.lng() },
            destination: { lat: dPos.lat(), lng: dPos.lng() },
            prefs,
          }
        : {
            origin: origin.trim(),
            destination: destination.trim(),
            prefs,
          }

      const data = await recommendRoute(payload as any) as { options?: Option[] } | null

      if (!data || ((Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && !data?.options))) {
        setErrorMsg('No route options returned. Try different locations or check the backend.')
        return
      }
      setResp(data)
    } catch (err: any) {
      console.error('recommend failed', err)
      setErrorMsg(err?.message || 'Failed to fetch recommendations. Is the server running?')
    } finally {
      setLoading(false)
    }
  }


   /* -------- Build ranking rows from response, using priorities -------- */
  const rows: RankRow[] = useMemo(() => {
    const options: Option[] = resp?.options ?? []
    if (!options.length) return []

    // Helper: get mode & basic metrics for each option
    type RowMetrics = {
      mode: string
      label: string
      co2_kg: number
      duration_min: number
      cost_usd: number
    }

    const metrics: RowMetrics[] = options.map((opt) => {
      const mode = opt.mode || detectMode(opt)
      const co2_kg = safeNumber(opt.co2_kg, 0)
      const duration_min = safeNumber(opt.duration_min, 0)
      const dist_km = estimateDistanceKm(mode, co2_kg)
      const cost_usd = costUSD(mode, dist_km)
      return {
        mode,
        label: modeLabel(mode),
        co2_kg,
        duration_min,
        cost_usd: Number(cost_usd.toFixed(2)),
      }
    })

    if (!metrics.length) return []

    // ---- helper funcs ----
    const weightForPriority = (p: 1 | 2 | 3): number => {
      // 1 = most important, 3 = least important
      if (p === 1) return 1.0
      if (p === 2) return 0.7
      return 0.5 // p === 3
    }

    const normalize = (val: number, min: number, max: number): number => {
      if (!Number.isFinite(val)) return 0.5
      if (max === min) return 1 // all same → treat as equally good
      return (val - min) / (max - min)
    }

    const rankDescending = (scores: number[]): number[] => {
      const pairs = scores.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
      const ranks = Array(scores.length).fill(0)
      let currentRank = 1
      for (let idx = 0; idx < pairs.length; idx++) {
        if (idx > 0 && pairs[idx].v !== pairs[idx - 1].v) currentRank = idx + 1
        ranks[pairs[idx].i] = currentRank
      }
      return ranks
    }

    // ---- raw arrays ----
    const ecoVals = metrics.map(m => m.co2_kg)         // lower is better
    const speedVals = metrics.map(m => m.duration_min) // lower duration is better (faster)
    const costVals = metrics.map(m => m.cost_usd)      // lower is better

    const minEco = Math.min(...ecoVals)
    const maxEco = Math.max(...ecoVals)
    const minSpeed = Math.min(...speedVals)
    const maxSpeed = Math.max(...speedVals)
    const minCost = Math.min(...costVals)
    const maxCost = Math.max(...costVals)

    // ---- normalized scores (0..1, higher = better) ----
    const ecoScores = ecoVals.map(v => 1 - normalize(v, minEco, maxEco))   // lower co₂ → higher score
    const speedScores = speedVals.map(v => 1 - normalize(v, minSpeed, maxSpeed)) // lower time → higher score
    const costScores = costVals.map(v => 1 - normalize(v, minCost, maxCost))     // lower cost → higher score

    // ---- ranks for display (1 = best) ----
    const ecoRanks = rankDescending(ecoScores)
    const speedRanks = rankDescending(speedScores)
    const costRanks = rankDescending(costScores)

    // ---- priorities → weights ----
    const ecoWeight = weightForPriority(ecoPriority)
    const speedWeight = weightForPriority(speedPriority)
    const costWeight = weightForPriority(costPriority)

    // ---- build final rows ----
    const rows: RankRow[] = metrics.map((m, idx) => {
      const ecoScore = ecoScores[idx]
      const speedScore = speedScores[idx]
      const costScore = costScores[idx]

      const overall =
        ecoScore * ecoWeight +
        speedScore * speedWeight +
        costScore * costWeight

      return {
        mode: m.mode,
        label: m.label,
        eco: ecoRanks[idx],
        speed: speedRanks[idx],
        cost: costRanks[idx],
        overall: Number(overall.toFixed(3)),
        raw: {
          co2_kg: m.co2_kg,
          duration_min: m.duration_min,
          cost_usd: m.cost_usd,
        },
      }
    })

    // Sort by overall descending (higher score = better)
    rows.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))

    return rows
  }, [resp, ecoPriority, speedPriority, costPriority])

  return (
    <div>
      <h2>Customizable Transit Recommender</h2>

      {/* Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto auto",
          gap: 16,
          maxWidth: 900,
          alignItems: "end",
        }}
      >
        {/* Origin */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Origin: <span style={{ color: '#b00020' }}>*</span></span>
          <input
            ref={originInputRef}
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value)
              if (validationErrors.origin) {
                setValidationErrors(prev => ({ ...prev, origin: undefined }))
              }
            }}
            style={{
              padding: "6px 8px",
              border: validationErrors.origin ? '2px solid #b00020' : '1px solid #ccc',
              borderRadius: 4
            }}
            placeholder="Enter address or click on map"
          />
          {validationErrors.origin && (
            <span style={{ color: '#b00020', fontSize: '12px', marginTop: '-2px' }}>
              {validationErrors.origin}
            </span>
          )}
        </label>

        {/* Destination */}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Destination: <span style={{ color: '#b00020' }}>*</span></span>
          <input
            ref={destInputRef}
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value)
              if (validationErrors.destination) {
                setValidationErrors(prev => ({ ...prev, destination: undefined }))
              }
            }}
            style={{
              padding: "6px 8px",
              border: validationErrors.destination ? '2px solid #b00020' : '1px solid #ccc',
              borderRadius: 4
            }}
            placeholder="Enter address or click on map"
          />
          {validationErrors.destination && (
            <span style={{ color: '#b00020', fontSize: '12px', marginTop: '-2px' }}>
              {validationErrors.destination}
            </span>
          )}
        </label>

        {/* Swap button */}
        <button
          onClick={swap}
          style={{
            height: 36,
            marginTop: 22,
          }}
        >
          Swap ↑↓
        </button>

        {/* Recommend + Clear buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={run}
            disabled={loading}
            style={{
              height: 36,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Recommending…" : "Recommend"}
          </button>

          <button
            onClick={clearAll}
            style={{ height: 32 }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Priority controls above the map */}
      <section
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          background: '#FAFAFA',
          maxWidth: 900
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          What matters most for this trip?
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 14 }}>
            Eco impact
            <select
              value={ecoPriority}
              onChange={e => {
                setEcoPriority(Number(e.target.value) as Priority)
                if (validationErrors.priorities) {
                  setValidationErrors(prev => ({ ...prev, priorities: undefined }))
                }
              }}
              style={{
                marginTop: 4,
                padding: '4px 8px',
                border: validationErrors.priorities ? '2px solid #b00020' : '1px solid #ccc',
                borderRadius: 4
              }}
            >
              <option value={1}>1 (highest)</option>
              <option value={2}>2</option>
              <option value={3}>3 (lowest)</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 14 }}>
            Speed
            <select
              value={speedPriority}
              onChange={e => {
                setSpeedPriority(Number(e.target.value) as Priority)
                if (validationErrors.priorities) {
                  setValidationErrors(prev => ({ ...prev, priorities: undefined }))
                }
              }}
              style={{
                marginTop: 4,
                padding: '4px 8px',
                border: validationErrors.priorities ? '2px solid #b00020' : '1px solid #ccc',
                borderRadius: 4
              }}
            >
              <option value={1}>1 (highest)</option>
              <option value={2}>2</option>
              <option value={3}>3 (lowest)</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 14 }}>
            Cost
            <select
              value={costPriority}
              onChange={e => {
                setCostPriority(Number(e.target.value) as Priority)
                if (validationErrors.priorities) {
                  setValidationErrors(prev => ({ ...prev, priorities: undefined }))
                }
              }}
              style={{
                marginTop: 4,
                padding: '4px 8px',
                border: validationErrors.priorities ? '2px solid #b00020' : '1px solid #ccc',
                borderRadius: 4
              }}
            >
              <option value={1}>1 (highest)</option>
              <option value={2}>2</option>
              <option value={3}>3 (lowest)</option>
            </select>
          </label>
        </div>
        {validationErrors.priorities && (
          <div style={{ color: '#b00020', fontSize: '12px', marginTop: 8 }}>
            {validationErrors.priorities}
          </div>
        )}
      </section>

      {errorMsg && <div style={{ marginTop: 8, color: '#b00020' }}>{errorMsg}</div>}

      {/* Map */}
      <div style={{ marginTop: 16, height: 360, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Ranking Table */}
      {rows.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <h3>Ranking Table</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Transport</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Eco-friendly</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Speed</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Cost</th>
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 12px' }}>{r.label}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px' }}>{r.eco ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px' }}>{r.speed ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px' }}>{r.cost ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>{r.overall ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: 16, opacity: 0.7 }}>
          No options yet — set origin & destination, pick your priorities, then click <b>Recommend</b>.
        </p>
      )}
    </div>
  )
}
