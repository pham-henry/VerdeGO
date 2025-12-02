import { Link, Outlet, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation()
  const authRoutes = ['/', '/login', '/register', '/auth']
  const hideLayout = authRoutes.includes(loc.pathname)
  
  // Add navigation link hover styles
  if (typeof document !== 'undefined' && !document.getElementById('nav-link-styles')) {
    const style = document.createElement('style')
    style.id = 'nav-link-styles'
    style.textContent = `
      .nav-link:hover {
        background-color: rgba(76, 175, 80, 0.1) !important;
        color: var(--color-primary) !important;
      }
    `
    document.head.appendChild(style)
  }

  const navLinks = [
    { to: '/home', label: 'Home', icon: '' },
    { to: '/logger', label: 'Logger', icon: '' },
    { to: '/tracker', label: 'Tracker', icon: '' },
    { to: '/goals', label: 'Goals', icon: '' },
    { to: '/recommender', label: 'Recommender', icon: '' },
    { to: '/account', label: 'Account', icon: '' },
  ]

  return (
    <div style={container}>
      {!hideLayout && (
        <>
          <header style={header}>
            <div style={headerContent}>
              <Link to="/home" style={logoLink}>
                <div style={logoContainer}>
                  <h1 style={logoText}>VerdeGO</h1>
                </div>
              </Link>
              <nav style={nav}>
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="nav-link"
                    style={{
                      ...navLink,
                      ...(loc.pathname === link.to ? navLinkActive : {})
                    }}
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </header>
        </>
      )}

      <main style={main}>
        <Outlet />
      </main>

      {!hideLayout && (
        <footer style={footer}>
          <div style={footerContent}>
            <p style={footerText}>
              © 2025 VerdeGO · Making sustainable commutes easy
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

const container: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--bg-default)',
}

const header: React.CSSProperties = {
  backgroundColor: 'var(--bg-white)',
  borderBottom: '1px solid var(--border-light)',
  boxShadow: 'var(--shadow-sm)',
  position: 'sticky',
  top: 0,
  zIndex: 'var(--z-sticky)',
  backdropFilter: 'blur(10px)',
}

const headerContent: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: 'var(--spacing-md) var(--spacing-lg)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--spacing-lg)',
}

const logoLink: React.CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const logoContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
}

const logoText: React.CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 700,
  background: 'linear-gradient(135deg, var(--verdego-green), var(--verdego-dark))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const nav: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--spacing-xs)',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const navLink: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-xs)',
  padding: 'var(--spacing-sm) var(--spacing-md)',
  borderRadius: 'var(--radius-md)',
  textDecoration: 'none',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all var(--transition-fast)',
  position: 'relative',
}

const navLinkActive: React.CSSProperties = {
  color: 'var(--color-primary)',
  backgroundColor: 'var(--color-primary-light)',
  fontWeight: 600,
}

const main: React.CSSProperties = {
  flex: 1,
  maxWidth: 1200,
  width: '100%',
  margin: '0 auto',
  padding: 'var(--spacing-lg)',
}

const footer: React.CSSProperties = {
  marginTop: 'auto',
  borderTop: '1px solid var(--border-light)',
  backgroundColor: 'var(--bg-white)',
  padding: 'var(--spacing-lg)',
}

const footerContent: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  textAlign: 'center',
}

const footerText: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-tertiary)',
  margin: 0,
}
