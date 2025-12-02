import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '../lib/api' // make sure this exists
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { login } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const resp = await registerUser({ name, email, password })
      // prefer backend name, fall back to typed name
      login({ ...resp, name: resp.name ?? name })
      navigate('/home')
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
    }
  }

  return (
    <div style={pageContainer}>
      <div style={contentCard} className="animate-fade-in">
        <div style={headerSection}>
          <button style={backButton} onClick={() => navigate('/')}>
            ← Back
          </button>
          <h2 style={title}>Create Account</h2>
          <p style={subtitle}>
            Join VerdeGO and start tracking your greener commutes today.
          </p>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={submit} style={form}>
          <div style={field}>
            <label style={label}>Name</label>
            <input
              style={input}
              type="text"
              required
              maxLength={100}
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div style={field}>
            <label style={label}>Email</label>
            <input
              style={input}
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div style={field}>
            <label style={label}>Password</label>
            <input
              style={input}
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" style={primaryButton}>Create Account</button>
        </form>
      </div>
    </div>
  )
}

/* reuse same style objects as in Login.tsx */
const pageContainer: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--spacing-lg)',
  background: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
}

const contentCard: React.CSSProperties = {
  maxWidth: 420,
  width: '100%',
  padding: 'var(--spacing-2xl)',
  borderRadius: 'var(--radius-xl)',
  background: 'var(--bg-white)',
  boxShadow: 'var(--shadow-xl)',
  border: '1px solid var(--border-light)',
}

const headerSection: React.CSSProperties = {
  marginBottom: 'var(--spacing-xl)',
}

const title: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: 'var(--spacing-sm)',
  marginTop: 'var(--spacing-md)',
  background: 'linear-gradient(135deg, var(--color-secondary), #1565C0)',
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

const form: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
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

const primaryButton: React.CSSProperties = {
  marginTop: 'var(--spacing-md)',
  padding: 'var(--spacing-md)',
  background: 'var(--color-secondary)',
  color: 'var(--text-light)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 600,
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
}

const backButton: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
  fontSize: '14px',
  borderRadius: 'var(--radius-full)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-light)',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  transition: 'all var(--transition-fast)',
  fontWeight: 500,
}

const errorBox: React.CSSProperties = {
  background: '#FFEBEE',
  color: '#B71C1C',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--spacing-md)',
  fontSize: '14px',
  border: '1px solid #EF5350',
}
