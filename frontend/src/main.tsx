import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import Home from './pages/Home'
import Logger from './pages/Logger'
import Tracker from './pages/Tracker'
import Goals from './pages/WeeklyGoals'
import Recommender from './pages/Recommender'
import Auth from './pages/Auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Account from './pages/Account'
import { RequireAuth, GuestOnly } from './components/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <GuestOnly><Auth /></GuestOnly> },
      {
        path: 'auth',
        element: (
          <GuestOnly>
            <Auth />
          </GuestOnly>
        )
      },
      {
        path: 'login',
        element: (
          <GuestOnly>
            <Login />
          </GuestOnly>
        )
      },
      {
        path: 'register',
        element: (
          <GuestOnly>
            <Register />
          </GuestOnly>
        )
      },
      {
        element: <RequireAuth />,
        children: [
          { path: 'home', element: <Home /> },
          { path: 'logger', element: <Logger /> },
          { path: 'tracker', element: <Tracker /> },
          { path: 'goals', element: <Goals /> },
          { path: 'recommender', element: <Recommender /> },
          { path: 'account', element: <Account /> },
        ]
      }
    ]
  }
])

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
