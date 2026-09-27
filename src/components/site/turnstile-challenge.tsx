import { useEffect, useRef, useState } from 'react'
import type { TurnstileAction } from '../../lib/turnstile'

interface TurnstileOptions {
  sitekey: string
  action: TurnstileAction
  appearance: 'always' | 'execute' | 'interaction-only'
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

interface TurnstileAPI {
  render(container: HTMLElement, options: TurnstileOptions): string
  reset(widgetId?: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI
  }
}

let turnstileScriptPromise: Promise<void> | undefined

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      turnstileScriptPromise = undefined
      reject(new Error('Turnstile failed to load'))
    }
    document.head.append(script)
  })

  return turnstileScriptPromise
}

export function TurnstileChallenge({
  action,
  siteKey,
  resetCount,
  onToken,
}: {
  action: TurnstileAction
  siteKey: string
  resetCount: number
  onToken: (token: string | null) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  const widgetIdRef = useRef<string | null>(null)
  const previousResetCountRef = useRef(resetCount)
  const [loadFailed, setLoadFailed] = useState(false)

  onTokenRef.current = onToken

  useEffect(() => {
    let active = true
    void loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: 'interaction-only',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            onTokenRef.current(null)
            setLoadFailed(true)
          },
        })
      })
      .catch(() => {
        if (active) setLoadFailed(true)
      })

    return () => {
      active = false
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [action, siteKey])

  useEffect(() => {
    if (previousResetCountRef.current === resetCount) return
    previousResetCountRef.current = resetCount
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current)
  }, [resetCount])

  return (
    <div className="turnstile-challenge" aria-live="polite">
      <div ref={containerRef} />
      {loadFailed ? <p className="turnstile-unavailable" role="status">The security check could not load. Please refresh and try again.</p> : null}
    </div>
  )
}
