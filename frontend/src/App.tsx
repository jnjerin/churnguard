// ============================================================================
// CHURNGUARD MAIN APP COMPONENT
// ============================================================================
// Root component that sets up the demo environment

import { useEffect } from 'react'
import { DemoPage } from './components/DemoPage'
import { logger, trackEvent } from './utils/logger'
import './styles/globals.css'

function App() {
  useEffect(() => {
    // Initialize the app
    logger.info('ChurnGuard Demo App initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    })

    trackEvent('app_loaded', {
      timestamp: new Date().toISOString(),
      referrer: document.referrer
    })

    // Set up global error handling
    const handleError = (event: ErrorEvent) => {
      logger.error('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <div className="App">
      <DemoPage />
    </div>
  )
}

export default App
