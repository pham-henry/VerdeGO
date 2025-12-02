import { useEffect, useState, CSSProperties } from 'react'
import { createCommute, listCommutes, deleteCommute, Commute } from '../lib/api'

const emailFromStorage = localStorage.getItem('email') || ''

export default function Logger() {
  const [form, setForm] = useState<Commute>({
    user_email: emailFromStorage,
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles"
    }).format(new Date()),   // <-- PST date (YYYY-MM-DD)
    mode: 'walk',
    distance_km: 1,
    duration_min: 1,
    notes: ''
  });

  const [allRows, setAllRows] = useState<any[]>([])
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(0)

  const PAGE_SIZE = 7

  const load = async () => {
    const data = await listCommutes({ user_email: emailFromStorage })
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
    await deleteCommute(id, emailFromStorage)
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
    <div style={container}>
      <div style={headerSection}>
        <h2 style={title}>Daily Commute Logger</h2>
        <p style={subtitle}>Record your daily commutes and track your environmental impact.</p>
      </div>

      {/* Commute logging form */}
      <section style={formCard} className="animate-fade-in">
        <h3 style={formTitle}>Add New Commute</h3>
        <form onSubmit={submit} style={formStyle}>
          <div style={formGrid}>
            <div style={field}>
              <label style={label}>Date</label>
              <input
                type="date"
                style={input}
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div style={field}>
              <label style={label}>Transport Mode</label>
              <select
                style={select}
                value={form.mode}
                onChange={e => setForm({ ...form, mode: e.target.value })}
              >
                <option value="">Select mode...</option>
                <option>Walk</option>
                <option>Bike</option>
                <option>Scooter</option>
                <option>Bus</option>
                <option>Car (Gas)</option>
                <option>Car (Hybrid)</option>
                <option>Car (EV)</option>
              </select>
            </div>

            <div style={field}>
              <label style={label}>Distance (km)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                style={input}
                placeholder="0.0"
                value={form.distance_km || ''}
                onChange={e => setForm({ ...form, distance_km: Number(e.target.value) })}
              />
            </div>

            <div style={field}>
              <label style={label}>Duration (min)</label>
              <input
                type="number"
                step="1"
                min="0"
                style={input}
                placeholder="0"
                value={form.duration_min || ''}
                onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })}
              />
            </div>

            <div style={{ ...field, gridColumn: 'span 2' }}>
              <label style={label}>Notes (optional)</label>
              <input
                type="text"
                style={input}
                placeholder="Add any notes about this commute..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" style={submitButton}>
            Add Commute
          </button>
        </form>
      </section>

      {/* Table section */}
      <section style={tableSection}>
        <div style={tableHeader}>
          <h3 style={tableTitle}>
            {showAll ? 'All Commutes' : 'Recent Commutes (Last 5)'}
          </h3>
          <button
            onClick={() => { setShowAll(s => !s); setPage(0) }}
            style={toggleButton}
          >
            {showAll ? 'View Less' : `View All (${allRows.length})`}
          </button>
        </div>

        {/* Commutes table */}
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Mode</th>
                <th style={{ ...th, textAlign: 'right' }}>Distance</th>
                <th style={{ ...th, textAlign: 'right' }}>Duration</th>
                <th style={th}>Notes</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} style={tr}>
                  <td style={td}>{r.date}</td>
                  <td style={td}>
                    <span style={modeBadge}>{r.mode}</span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.distance_km?.toFixed(1) || '0.0'} km</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.duration_min ?? '-'} min</td>
                  <td style={{ ...td, color: 'var(--text-tertiary)' }}>{r.notes || '-'}</td>
                  <td style={td}>
                    <button
                      onClick={() => remove(r.id)}
                      style={deleteButton}
                      aria-label="Delete commute"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} style={emptyState}>
                    <div style={emptyStateContent}>
                      <p>No commutes yet. Add your first commute above to get started!</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {showAll && totalPages > 1 && (
          <div style={pagination}>
            <button
              onClick={() => setPage(p => Math.max(p - 1, 0))}
              disabled={page === 0}
              style={paginationButton}
            >
              ← Previous
            </button>
            <span style={paginationInfo}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
              disabled={page === totalPages - 1}
              style={paginationButton}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function getModeIcon(mode: string): string {
  return ''
}

const container: React.CSSProperties = {
  maxWidth: 1200,
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
}

const formCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  marginBottom: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-light)',
}

const formTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: 'var(--spacing-lg)',
  color: 'var(--text-primary)',
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
}

const formGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 'var(--spacing-md)',
}

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-xs)',
}

const label: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 'var(--spacing-xs)',
}

const input: React.CSSProperties = {
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  fontSize: '15px',
  transition: 'all var(--transition-fast)',
  backgroundColor: 'var(--bg-white)',
}

const select: React.CSSProperties = {
  ...input,
  cursor: 'pointer',
}

const submitButton: React.CSSProperties = {
  padding: 'var(--spacing-md) var(--spacing-xl)',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--text-light)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 600,
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--spacing-sm)',
  alignSelf: 'flex-start',
}

const tableSection: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-xl)',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid var(--border-light)',
}

const tableHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 'var(--spacing-lg)',
  flexWrap: 'wrap',
  gap: 'var(--spacing-md)',
}

const tableTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  margin: 0,
  color: 'var(--text-primary)',
}

const toggleButton: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-light)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all var(--transition-fast)',
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

const tr: React.CSSProperties = {
  borderBottom: '1px solid var(--border-light)',
  transition: 'background-color var(--transition-fast)',
}

const td: React.CSSProperties = {
  padding: 'var(--spacing-md)',
  fontSize: '14px',
  color: 'var(--text-primary)',
}

const modeBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)',
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--color-primary-light)',
  color: 'var(--verdego-dark)',
  fontSize: '13px',
  fontWeight: 500,
}

const deleteButton: React.CSSProperties = {
  padding: 'var(--spacing-xs) var(--spacing-sm)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '16px',
  transition: 'all var(--transition-fast)',
  opacity: 0.7,
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

const pagination: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 'var(--spacing-lg)',
  marginTop: 'var(--spacing-lg)',
  paddingTop: 'var(--spacing-lg)',
  borderTop: '1px solid var(--border-light)',
}

const paginationButton: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-white)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all var(--transition-fast)',
}

const paginationInfo: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
}

