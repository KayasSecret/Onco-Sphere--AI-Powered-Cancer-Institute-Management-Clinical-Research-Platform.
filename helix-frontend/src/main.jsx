import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global bfcache navigation handler: protect authenticated routes on browser back/forward
window.addEventListener('pageshow', () => {
  const token = localStorage.getItem('helix_access_token')
  const publicPaths = ['/', '/login', '/forgot-password', '/reset-password', '/register/apply']
  if (!token && !publicPaths.includes(window.location.pathname)) {
    window.location.replace('/login')
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
