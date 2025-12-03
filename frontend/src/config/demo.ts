/**
 * Demo mode configuration
 * 
 * When VITE_DEMO_MODE is set to "true", the app runs in demo mode:
 * - Auto-logs in a demo user
 * - Uses in-memory/localStorage data instead of backend API calls
 * - All data is simulated and not saved on a server
 */
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

/**
 * Demo user credentials and info
 */
export const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@verdego.app',
  name: 'Demo User',
}

