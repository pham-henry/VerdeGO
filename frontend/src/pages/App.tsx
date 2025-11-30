import { Link, Outlet, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation();
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
        <h1 style={{ margin: 0 }}>VerdeGO</h1>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link to="/">Home</Link>
          <Link to="/logger">Logger</Link>
          <Link to="/tracker">Tracker</Link>
          <Link to="/goals">Goals</Link>
          <Link to="/recommender">Recommender</Link>
        </nav>
      </header>
      <hr/>
      <Outlet />
      <footer style={{ marginTop: 48, opacity: 0.6 }}>
        <small>© 2025 VerdeGO</small>
      </footer>
    </div>
  )
}

