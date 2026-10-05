/**
 * Progress model for the global top-of-page route loading bar.
 *
 * TanStack Router exposes only `status === 'pending'` — there is no byte-level
 * or navigation-progress event — so the percentage is a deterministic
 * timer-driven approximation. Kept pure so the curve is testable without a
 * router or a DOM.
 */

export const ROUTE_PROGRESS_TICK_MS = 80
export const ROUTE_PROGRESS_EASE = 0.14
export const ROUTE_PROGRESS_CEILING = 0.9
export const ROUTE_PROGRESS_START = 0.08
export const ROUTE_PROGRESS_SETTLE_MS = 260

export interface RouteProgressState {
  visible: boolean
  progress: number
}

export const HIDDEN_ROUTE_PROGRESS: RouteProgressState = { visible: false, progress: 0 }

export function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(1, Math.max(0, progress))
}

export function progressPercent(progress: number): number {
  return Math.round(clampProgress(progress) * 100)
}

/**
 * One easing step toward the ceiling. Monotonic and asymptotic, so a slow load
 * visibly creeps instead of stalling at 100% before the response arrives.
 */
export function advanceProgress(current: number): number {
  const clamped = clampProgress(current)
  return Math.min(ROUTE_PROGRESS_CEILING, clamped + (ROUTE_PROGRESS_CEILING - clamped) * ROUTE_PROGRESS_EASE)
}

export function startProgress(_state: RouteProgressState): RouteProgressState {
  return { visible: true, progress: ROUTE_PROGRESS_START }
}

export function tickProgress(state: RouteProgressState): RouteProgressState {
  return { visible: true, progress: advanceProgress(state.progress) }
}

/**
 * A load that never started (the initial idle effect, or a navigation that
 * resolved before the bar ever painted) hides outright; anything else
 * completes to 1 and the CSS transition animates the remaining fill. The guard
 * is on a zero progress, not on elapsed time: `startProgress` seeds a visible
 * sliver so a load that resolves in ~50ms shows that sliver completing rather
 * than an invisible zero-width bar.
 */
export function finishProgress(state: RouteProgressState): RouteProgressState {
  if (state.progress === 0) return HIDDEN_ROUTE_PROGRESS
  return { visible: true, progress: 1 }
}
