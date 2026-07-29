import { useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import AppRouter from './routes/index'
import { Toaster } from './components/ui/sonner'

/**
 * HELIX Application Root
 * Wraps the entire app with the Redux Provider and renders the router.
 * The Phase 0 health-check page has been replaced with the full router.
 */
export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <Provider store={store}>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </Provider>
  )
}
