import { useEffect, useState } from 'react'
import { createCommute, listCommutes, deleteCommute, Commute } from '../lib/api'

const defaultEmail = 'demo@user'

export default function Logger() {
  const [form, setForm] = useState<Commute>({
    user_email: defaultEmail,
    date: new Date().toISOString().slice(0, 10),
    mode: 'bike',
    distance_km: 3,
    duration_min: 12,
    notes: ''
  })

  const [allRows, setAllRows] = useState<any[]>([])
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(0)

  const PAGE_SIZE = 7

  const load = async () => {
    const data = await listCommutes({ user_email: defaultEmail })
    if (Array.isArray(data)) {
      // Sort newest → oldest once, keep for both views
      const sorted = [...data].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setAllRows(sorted)
    } else {
      setAllRows([])
    }
  }

  useEffect(() => { load() }, [])

  async function submit(e: any) {
    e.preventDefault()
    await createCommute(form)
    await load()
  }

  async function remove(id: number | string) {
    await deleteCommute(id)
    await load()
  }

  // Determine which rows to show
  let rows: any[] = []
  if (showAll) {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE
    rows = allRows.slice(start, end)
  } else {
    rows = allRows.slice(0, 5)
  }

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE)

  return (
    <div>
      <h2>Daily Commute Logger</h2>

      {/* Commute logging form */}
      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 8,
          alignItems: 'end'
        }}
      >
        <label>
          Date
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
          />
        </label>

        <label>
          Mode
          <select
            value={form.mode}
            onChange={e => setForm({ ...form, mode: e.target.value })}
          >
            <option>walk</option><option>bike</option><option>scooter</option>
            <option>bus</option><option>train</option>
            <option>car_gas</option><option>car_hybrid</option><option>car_ev</option>
          </select>
        </label>

        <label>
          Distance (km)
          <input
            type="number"
            step="0.1"
            value={form.distance_km}
            onChange={e => setForm({ ...form, distance_km: Number(e.target.value) })}
          />
        </label>

        <label>
          Duration (min)
          <input
            type="number"
            step="1"
            value={form.duration_min}
            onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })}
          />
        </label>

        <label>
          Notes
          <input
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </label>

        <button type="submit">Add</button>
      </form>

      {/* Table header + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 24, gap: 12 }}>
        <h3 style={{ margin: 0 }}>
          {showAll ? 'All Commutes' : 'Recent Commutes (Last 5)'}
        </h3>
        <button
          onClick={() => { setShowAll(s => !s); setPage(0) }}
          style={{ padding: '6px 10px' }}
        >
          {showAll ? 'View Less' : `View All (${allRows.length})`}
        </button>
      </div>

      {/* Commutes table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f3f3', borderBottom: '2px solid #ccc' }}>
            <th align="left" style={{ padding: '10px 12px' }}>Date</th>
            <th align="left" style={{ padding: '10px 12px' }}>Mode</th>
            <th align="right" style={{ padding: '10px 12px' }}>Distance (km)</th>
            <th align="right" style={{ padding: '10px 12px' }}>Duration (min)</th>
            <th align="left" style={{ padding: '10px 12px' }}>Notes</th>
            <th style={{ padding: '10px 12px' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderTop: '1px solid #ddd' }}>
              <td style={{ padding: '8px 12px' }}>{r.date}</td>
              <td style={{ padding: '8px 12px' }}>{r.mode}</td>
              <td align="right" style={{ padding: '8px 12px' }}>{r.distance_km}</td>
              <td align="right" style={{ padding: '8px 12px' }}>{r.duration_min ?? '-'}</td>
              <td style={{ padding: '8px 12px' }}>{r.notes ?? ''}</td>
              <td style={{ padding: '8px 12px' }}>
                <button onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} style={{ opacity: 0.6, padding: 12 }}>
                No data yet. Add your first commute above.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination controls (only visible in View All) */}
      {showAll && totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          marginTop: 12
        }}>
          <button
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            disabled={page === 0}
            style={{ padding: '6px 10px' }}
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
            disabled={page === totalPages - 1}
            style={{ padding: '6px 10px' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

