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

/* --------- Emissions & cost helpers --------- */
const EMISSION_FACTORS: Record<string, number> = {
  walk: 0,
  bike: 0,
  scooter: 0.021,
  bus: 0.105,
  train: 0.041,
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
const TRAIN_FARE_FLAT = 3.50

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
  if (mode === 'train') return TRAIN_FARE_FLAT

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
  // train prioritized before bike for mixed "bike + light rail"
  if (s.includes('walk')) return 'walk'
  if (s.includes('light rail') || s.includes('train')) return 'train'
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
    case 'train': return 'Train'
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
  const [origin, setOrigin] = useState('SJSU, San Jose, CA')
  const [destination, setDestination] = useState("Levi's Stadium, Santa Clara, CA")
  const [resp, setResp] = useState<{ options?: Option[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  async function run(): Promise<void> {
    try {
      setLoading(true)
      setErrorMsg(null)

      const oPos = markers.current.origin?.getPosition?.()
      const dPos = markers.current.destination?.getPosition?.()

      const payload = (oPos && dPos)
        ? {
            origin: { lat: oPos.lat(), lng: oPos.lng() },
            destination: { lat: dPos.lat(), lng: dPos.lng() },
            prefs: { eco: true, fastest: true, least_transfers: true }
          }
        : {
            origin,
            destination,
            prefs: { eco: true, fastest: true, least_transfers: true }
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

  /* -------- Build ranking rows from response -------- */
  const rows: RankRow[] = useMemo(() => {
    const options: Option[] = resp?.options ?? []
    const bestPerMode = new Map<string, Option>()

    for (const opt of options) {
      const mode = detectMode(opt)
      const prev = bestPerMode.get(mode)
      if (!prev || safeNumber(opt.duration_min, Infinity) < safeNumber(prev.duration_min, Infinity)) {
        bestPerMode.set(mode, { ...opt, mode })
      }
    }

    const arr: RankRow[] = Array.from(bestPerMode.values()).map((opt) => {
      const mode = opt.mode || detectMode(opt)
      const co2_kg = safeNumber(opt.co2_kg, 0)
      const duration_min = safeNumber(opt.duration_min, 0)
      const dist_km = estimateDistanceKm(mode, co2_kg)
      const cst = costUSD(mode, dist_km)
      return {
        mode,
        label: modeLabel(mode),
        raw: { co2_kg, duration_min, cost_usd: Number(cst.toFixed(2)) }
      }
    })

    const ecoVals = arr.map(r => r.raw.co2_kg ?? Infinity)
    const spdVals = arr.map(r => r.raw.duration_min ?? Infinity)
    const costVals = arr.map(r => r.raw.cost_usd ?? Infinity)

    if (arr.length) {
      const ecoRanks = rankAscending(ecoVals)
      const spdRanks = rankAscending(spdVals)
      const cstRanks = rankAscending(costVals)
      arr.forEach((r, i) => {
        r.eco = ecoRanks[i]
        r.speed = spdRanks[i]
        r.cost = cstRanks[i]
        const used = [r.eco, r.speed, r.cost] as number[]
        r.overall = Number((used.reduce((a, b) => a + b, 0) / used.length).toFixed(2))
      })
      arr.sort((a, b) => (a.overall ?? 999) - (b.overall ?? 999))
    }

    return arr
  }, [resp])

  return (
    <div>
      <h2>Customizable Transit Recommender</h2>

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 12, maxWidth: 900 }}>
        <label>Origin
          <input ref={originInputRef} value={origin} onChange={e => setOrigin(e.target.value)} />
        </label>
        <label>Destination
          <input ref={destInputRef} value={destination} onChange={e => setDestination(e.target.value)} />
        </label>
        <button onClick={swap} style={{ alignSelf: 'end', height: 36 }}>Swap ↑↓</button>
        <button onClick={run} disabled={loading} style={{ alignSelf: 'end', height: 36 }}>
          {loading ? 'Recommending…' : 'Recommend'}
        </button>
      </div>

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
                <th style={{ textAlign: 'right', padding: '10px 12px' }}>Overall</th>
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
          No options yet — set origin & destination, then click <b>Recommend</b>.
        </p>
      )}
    </div>
  )
}

