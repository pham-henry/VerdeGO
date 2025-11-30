import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './pages/App'
import Home from './pages/Home'
import Logger from './pages/Logger'
import Tracker from './pages/Tracker'
import Goals from './pages/WeeklyGoals'
import Recommender from './pages/Recommender'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '/', element: <Home />},
      { path: '/logger', element: <Logger /> },
      { path: '/tracker', element: <Tracker /> },
      { path: '/goals', element: <Goals />},
      { path: '/recommender', element: <Recommender /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

