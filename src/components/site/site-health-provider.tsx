import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

import { inspectBrowserCapabilities } from '@/lib/browser-capabilities'
import { fetchSiteHealthStatus, type SiteHealthStatus, shouldPollHealth } from '@/lib/site-health'

const SiteHealthContext = createContext<SiteHealthStatus>('checking')
const HEALTH_POLL_INTERVAL_MS = 300_000
const HEALTH_REQUEST_TIMEOUT_MS = 5_000

export function SiteHealthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SiteHealthStatus>('checking')

  useEffect(() => {
    if (!inspectBrowserCapabilities(['fetch', 'abort-controller']).supported) {
      setStatus('offline')
      return
    }

    let disposed = false
    let requestInFlight = false
    let activeController: AbortController | undefined
    let timeoutId: number | undefined

    const checkHealth = async () => {
      if (requestInFlight) return
      requestInFlight = true
      const controller = new AbortController()
      activeController = controller
      timeoutId = window.setTimeout(() => controller.abort(), HEALTH_REQUEST_TIMEOUT_MS)

      try {
        const nextStatus = await fetchSiteHealthStatus(fetch, controller.signal)
        if (!disposed) setStatus(nextStatus)
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId)
        if (activeController === controller) activeController = undefined
        requestInFlight = false
      }
    }

    void checkHealth()
    const intervalId = window.setInterval(() => {
      if (shouldPollHealth(document.visibilityState)) void checkHealth()
    }, HEALTH_POLL_INTERVAL_MS)

    // `visibilitychange` must probe (not merely resume the timer) or a tab
    // returning after an outage shows stale ONLINE for five minutes. `offline`
    // sets the status directly: a probe would only burn the five-second timeout.
    const handleVisibilityChange = () => {
      if (shouldPollHealth(document.visibilityState)) void checkHealth()
    }
    const handleOnline = () => void checkHealth()
    const handleOffline = () => setStatus('offline')
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      activeController?.abort()
    }
  }, [])

  return <SiteHealthContext.Provider value={status}>{children}</SiteHealthContext.Provider>
}

export function useSiteHealthStatus(): SiteHealthStatus {
  return useContext(SiteHealthContext)
}
