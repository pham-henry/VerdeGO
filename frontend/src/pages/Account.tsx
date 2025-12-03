import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API, fetchJSON } from '../lib/api' 
import { useAuth } from '../context/AuthContext'
import { IS_DEMO } from '../config/demo'

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
      if (IS_DEMO) {
        // In demo mode, just update localStorage
        localStorage.setItem('name', name)
        setMessage('Profile updated successfully (demo mode).')
      } else {
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
      }
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
      if (IS_DEMO) {
        // In demo mode, just show a message
        setMessage('Password update simulated (demo mode - changes are not saved).')
        setCurrentPassword('')
        setNewPassword('')
      } else {
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
      }
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
    <div style={container}>
      <div style={headerSection}>
        <h2 style={title}>Account Settings</h2>
        <p style={subtitle}>
          Manage your profile information and security preferences.
        </p>
      </div>

      {message && <div style={msgBox}>{message}</div>}
      {error && <div style={errorBox}>{error}</div>}

      {/* Profile section */}
      <section style={section} className="animate-fade-in">
        <h3 style={sectionTitle}>
          Profile Information
        </h3>
        <form onSubmit={saveProfile} style={form}>
          <div style={field}>
            <label style={label}>Email</label>
            <input
              style={{ ...input, ...inputDisabled }}
              value={email}
              disabled
            />
            <p style={helpText}>Your email cannot be changed.</p>
          </div>

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

          <button type="submit" style={primaryButton} disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Password section */}
      <section style={section} className="animate-fade-in">
        <h3 style={sectionTitle}>
          Change Password
        </h3>
        <form onSubmit={changePasswordSubmit} style={form}>
          <div style={field}>
            <label style={label}>Current Password</label>
            <input
              style={input}
              type="password"
              required
              placeholder="Enter current password"
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
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <p style={helpText}>Must be at least 6 characters long.</p>
          </div>

          <button type="submit" style={primaryButton} disabled={savingPassword}>
            {savingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </section>

      <section style={dangerSection}>
        <h3 style={dangerSectionTitle}>Account Actions</h3>
        <button style={dangerButton} onClick={signOut}>
          Sign Out
        </button>
      </section>
    </div>
  )
}

const container: React.CSSProperties = {
  maxWidth: 700,
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
  lineHeight: 1.5,
}

const section: React.CSSProperties = {
  marginTop: 'var(--spacing-lg)',
  padding: 'var(--spacing-xl)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-light)',
  background: 'var(--bg-white)',
  boxShadow: 'var(--shadow-md)',
}

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 'var(--spacing-lg)',
  fontSize: '1.25rem',
  fontWeight: 600,
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

const inputDisabled: React.CSSProperties = {
  backgroundColor: 'var(--bg-light)',
  color: 'var(--text-tertiary)',
  cursor: 'not-allowed',
}

const helpText: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-tertiary)',
  margin: 'var(--spacing-xs) 0 0 0',
}

const primaryButton: React.CSSProperties = {
  marginTop: 'var(--spacing-sm)',
  padding: 'var(--spacing-md) var(--spacing-xl)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: 'pointer',
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
  alignSelf: 'flex-start',
}

const dangerSection: React.CSSProperties = {
  marginTop: 'var(--spacing-xl)',
  padding: 'var(--spacing-xl)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid rgba(229, 57, 53, 0.3)',
  background: 'rgba(255, 235, 238, 0.3)',
}

const dangerSectionTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 'var(--spacing-md)',
  fontSize: '1.1rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const dangerButton: React.CSSProperties = {
  padding: 'var(--spacing-md) var(--spacing-xl)',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: 'pointer',
  background: 'var(--color-danger)',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
}

const msgBox: React.CSSProperties = {
  background: '#E8F5E9',
  color: '#1B5E20',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--spacing-md)',
  fontSize: '14px',
  border: '1px solid #4CAF50',
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
