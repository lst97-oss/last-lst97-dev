import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  clampProgress,
  finishProgress,
  HIDDEN_ROUTE_PROGRESS,
  progressPercent,
  ROUTE_PROGRESS_SETTLE_MS,
  ROUTE_PROGRESS_TICK_MS,
  type RouteProgressState,
  startProgress,
  tickProgress,
} from '@/lib/route-progress'

/**
 * Presentational bar. Split from the connected wrapper so the DOM contract is
 * testable without a router context.
 *
 * The fill is a `scaleX` transform rather than `width` so the browser
 * composites it. No `aria-live`: at one tick per 80 ms a live region would spam
 * a screen reader, and the bar is dropped from the a11y tree while idle.
 */
export function RouteProgressBar({ progress, active }: { progress: number; active: boolean }) {
  const clamped = clampProgress(progress)

  return (
    <div
      aria-hidden={active ? undefined : true}
      aria-label="Loading page"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progressPercent(clamped)}
      className="os-route-progress"
      data-active={active ? 'true' : 'false'}
      role="progressbar"
      style={{ transform: `scaleX(${clamped})` }}
    />
  )
}

/**
 * Router-connected progress bar, mounted once by `DesktopShell` so every site
 * surface (including the 404 boundary, which renders the shell directly)
 * carries it.
 *
 * `state.status` is the only pending signal the router offers: the client loader
 * sets it to `"pending"` when a load begins and back to `"idle"` once the
 * location commits. It is `idle` during SSR, so the server render is the hidden
 * bar and timers only ever run client-side.
 */
export function GlobalRouteProgress() {
  const isPending = useRouterState({ select: (state) => state.status === 'pending' })
  const [state, setState] = useState<RouteProgressState>(HIDDEN_ROUTE_PROGRESS)

  useEffect(() => {
    if (isPending) {
      setState(startProgress)
      const tick = window.setInterval(() => setState(tickProgress), ROUTE_PROGRESS_TICK_MS)
      return () => window.clearInterval(tick)
    }

    setState(finishProgress)
    const settle = window.setTimeout(() => setState(HIDDEN_ROUTE_PROGRESS), ROUTE_PROGRESS_SETTLE_MS)
    return () => window.clearTimeout(settle)
  }, [isPending])

  return <RouteProgressBar active={state.visible} progress={state.progress} />
}
