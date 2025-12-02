import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../lib/api' // make sure this exists

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const resp = await loginUser({ email, password })

      // store auth info
      localStorage.setItem('accessToken', resp.accessToken)
      localStorage.setItem('refreshToken', resp.refreshToken)
      localStorage.setItem('email', resp.email)
      if (resp.name) localStorage.setItem('name', resp.name)

      navigate('/home')
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    }
  }

  return (
    <div style={pageContainer}>
      <h2 style={{ marginBottom: 8 }}>Log In</h2>
      <p style={{ marginBottom: 16, color: '#555' }}>
        Welcome back! Enter your credentials to continue.
      </p>

      <button style={backButton} onClick={() => navigate('/')}>
        ← Back to welcome
      </button>

      {error && <div style={errorBox}>{error}</div>}

      <form onSubmit={submit} style={form}>
        <div style={field}>
          <label style={label}>Email</label>
          <input
            style={input}
            type="email"
            required
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
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" style={primaryButton}>Log In</button>
      </form>
    </div>
  )
}

/* ---- shared styles ---- */
const pageContainer: React.CSSProperties = {
  maxWidth: 420,
  margin: '60px auto',
  padding: 24,
  borderRadius: 12,
  background: '#FFFFFF',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
}

const form: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginTop: 12
}

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4
}

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#555'
}

const input: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #CCC',
  fontSize: 14
}

const primaryButton: React.CSSProperties = {
  marginTop: 8,
  padding: '10px 18px',
  background: '#4CAF50',
  color: '#fff',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontSize: 15,
}

const backButton: React.CSSProperties = {
  marginBottom: 12,
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 999,
  border: '1px solid #BDBDBD',
  background: '#FAFAFA',
  cursor: 'pointer',
}

const errorBox: React.CSSProperties = {
  background: '#FFEBEE',
  color: '#B71C1C',
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 13
}
