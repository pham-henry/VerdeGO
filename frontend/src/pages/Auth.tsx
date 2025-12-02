import { useNavigate } from 'react-router-dom'

export default function Auth() {
  const navigate = useNavigate()

  return (
    <div style={container}>
      <h1 style={title}>Welcome to VerdeGO</h1>
      <p style={subtitle}>Eco-friendly commute tracking made simple.</p>

      <div style={buttonRow}>
        <button style={btn} onClick={() => navigate('/login')}>
          Log In
        </button>
        <button style={btnAlt} onClick={() => navigate('/register')}>
          Create Account
        </button>
      </div>
    </div>
  )
}

const container: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '70vh',
  textAlign: 'center',
}

const title: React.CSSProperties = {
  fontSize: '2.2rem',
  fontWeight: 700,
  marginBottom: 8
}

const subtitle: React.CSSProperties = {
  opacity: 0.75,
  marginBottom: 24
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  gap: 16
}

const btn: React.CSSProperties = {
  padding: '10px 22px',
  fontSize: '1rem',
  borderRadius: 8,
  backgroundColor: '#4CAF50',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
}

const btnAlt: React.CSSProperties = {
  ...btn,
  backgroundColor: '#2196F3'
}
