import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, fetchJSON } from '../lib/api' 
import { useAuth } from '../context/AuthContext'

export default function Account() {
  const navigate = useNavigate()
  const { user, accessToken, logout } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // load initial data from auth context
  useEffect(() => {
    if (user) {
      setEmail(user.email)
      setName(user.name || '')
    }
  }, [user])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSavingProfile(true)

    try {
      // adjust endpoint/method to match your backend
      await fetchJSON(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({ name })
      })

      localStorage.setItem('name', name) //update name locally
      setMessage('Profile updated successfully.')
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSavingPassword(true)

    try {
      await fetchJSON(`${API}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      setMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  function signOut() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 640, margin: '24px auto', padding: '0 8px' }}>
      <h2>Account Settings</h2>
      <p style={{ color: '#555', marginBottom: 16 }}>
        Manage your profile information and security.
      </p>

      {message && <div style={msgBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      {/* Profile section */}
      <section style={section}>
        <h3 style={sectionTitle}>Profile</h3>
        <form onSubmit={saveProfile} style={form}>
          <div style={field}>
            <label style={label}>Email</label>
            <input style={input} value={email} disabled />
          </div>

          <div style={field}>
            <label style={label}>Name</label>
            <input
              style={input}
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <button type="submit" style={primaryButton} disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Password section */}
      <section style={section}>
        <h3 style={sectionTitle}>Change Password</h3>
        <form onSubmit={changePasswordSubmit} style={form}>
          <div style={field}>
            <label style={label}>Current Password</label>
            <input
              style={input}
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
          </div>

          <div style={field}>
            <label style={label}>New Password</label>
            <input
              style={input}
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>

          <button type="submit" style={primaryButton} disabled={savingPassword}>
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 24 }}>
        <button style={dangerButton} onClick={signOut}>
          Sign Out
        </button>
      </section>
    </div>
  )
}

const section: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #E0E0E0',
  background: '#FFFFFF',
}

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
}

const form: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
}

const input: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #CCC',
  fontSize: 14,
}

const primaryButton: React.CSSProperties = {
  marginTop: 6,
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  background: '#4CAF50',
  color: '#fff',
  fontSize: 14,
}

const dangerButton: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  background: '#E53935',
  color: '#fff',
  fontSize: 14,
}

const msgBox: React.CSSProperties = {
  background: '#E8F5E9',
  color: '#1B5E20',
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 13,
}

const errorBox: React.CSSProperties = {
  background: '#FFEBEE',
  color: '#B71C1C',
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
  fontSize: 13,
}
