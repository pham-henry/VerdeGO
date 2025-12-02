import { useNavigate } from 'react-router-dom'

export default function Auth() {
  const navigate = useNavigate()

  return (
    <div style={container}>
      <div style={contentCard} className="animate-fade-in">
        <div style={logoSection}>
          <h1 style={title}>Welcome to VerdeGO</h1>
        </div>
        <p style={subtitle}>
          Track your commutes, reduce your carbon footprint, and make sustainable choices every day.
        </p>

        <div style={buttonRow}>
          <button style={btnPrimary} onClick={() => navigate('/login')}>
            Log In
          </button>
          <button style={btnSecondary} onClick={() => navigate('/register')}>
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}

const container: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  textAlign: 'center',
  padding: 'var(--spacing-lg)',
  background: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
}

const contentCard: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--spacing-2xl)',
  boxShadow: 'var(--shadow-xl)',
  maxWidth: '480px',
  width: '100%',
  border: '1px solid var(--border-light)',
}

const logoSection: React.CSSProperties = {
  marginBottom: 'var(--spacing-lg)',
}

const title: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 700,
  marginBottom: 'var(--spacing-md)',
  background: 'linear-gradient(135deg, var(--verdego-green), var(--verdego-dark))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const subtitle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: 'var(--text-secondary)',
  marginBottom: 'var(--spacing-xl)',
  lineHeight: 1.6,
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-md)',
  width: '100%',
}

const btnPrimary: React.CSSProperties = {
  padding: 'var(--spacing-md) var(--spacing-xl)',
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-primary)',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
  boxShadow: 'var(--shadow-md)',
}

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  backgroundColor: 'var(--bg-white)',
  color: 'var(--color-primary)',
  border: '2px solid var(--color-primary)',
  boxShadow: 'none',
}
