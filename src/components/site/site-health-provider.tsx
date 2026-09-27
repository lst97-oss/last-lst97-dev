import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import { fetchSiteHealthStatus, type SiteHealthStatus } from '../../lib/site-health'

const SiteHealthContext = createContext<SiteHealthStatus>('checking')
const HEALTH_POLL_INTERVAL_MS = 30_000
const HEALTH_REQUEST_TIMEOUT_MS = 5_000

export function SiteHealthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SiteHealthStatus>('checking')

  useEffect(() => {
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
    const intervalId = window.setInterval(() => void checkHealth(), HEALTH_POLL_INTERVAL_MS)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      activeController?.abort()
    }
  }, [])

  return <SiteHealthContext.Provider value={status}>{children}</SiteHealthContext.Provider>
}

export function useSiteHealthStatus(): SiteHealthStatus {
  return useContext(SiteHealthContext)
}
