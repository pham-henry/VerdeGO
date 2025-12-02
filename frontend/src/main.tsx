import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Auth /> },          // default landing page
      { path: 'auth', element: <Auth /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },

      { path: 'home', element: <Home /> },
      { path: 'logger', element: <Logger /> },
      { path: 'tracker', element: <Tracker /> },
      { path: 'goals', element: <Goals /> },
      { path: 'recommender', element: <Recommender /> },
      { path: 'account', element: <Account /> },
    ]
  }
])

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
