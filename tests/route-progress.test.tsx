import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { RouteProgressBar } from '../src/components/site/route-progress-bar'
import {
  advanceProgress,
  clampProgress,
  finishProgress,
  HIDDEN_ROUTE_PROGRESS,
  progressPercent,
  ROUTE_PROGRESS_CEILING,
  ROUTE_PROGRESS_START,
  startProgress,
  tickProgress,
} from '../src/lib/route-progress'
import { createSiteStyleWindow } from './site-stylesheet'

const { window: browser } = await createSiteStyleWindow()

describe('route progress creep', () => {
  test('advances monotonically but never reaches the ceiling edge while loading', () => {
    expect(advanceProgress(0)).toBeGreaterThan(0)
    expect(advanceProgress(0.5)).toBeGreaterThan(0.5)
    expect(advanceProgress(0.9)).toBeLessThanOrEqual(ROUTE_PROGRESS_CEILING)

    let progress = 0
    for (let tick = 0; tick < 1_000; tick += 1) {
      const next = advanceProgress(progress)
      expect(next).toBeGreaterThanOrEqual(progress)
      expect(next).toBeLessThanOrEqual(ROUTE_PROGRESS_CEILING)
      progress = next
    }
  })

  test('clamps out-of-range and non-finite input so the transform stays valid', () => {
    expect(clampProgress(-4)).toBe(0)
    expect(clampProgress(7)).toBe(1)
    expect(clampProgress(Number.NaN)).toBe(0)
    expect(progressPercent(0.456)).toBe(46)
    expect(progressPercent(9)).toBe(100)
  })

  test('a new navigation restarts the fill at a width that is actually visible', () => {
    const started = startProgress({ visible: true, progress: 0.8 })

    // A fast client navigation resolves in ~50ms. Starting at exactly 0 left
    // the bar on screen for its whole life at zero width, i.e. invisible.
    expect(started.visible).toBe(true)
    expect(started.progress).toBe(ROUTE_PROGRESS_START)
    expect(started.progress).toBeLessThan(ROUTE_PROGRESS_CEILING)
    expect(tickProgress(started).progress).toBeGreaterThan(started.progress)
  })

  test('a load that resolved in one frame still flashes the sliver complete', () => {
    expect(finishProgress(startProgress(HIDDEN_ROUTE_PROGRESS))).toEqual({ visible: true, progress: 1 })
  })

  test('a load that never started stays hidden', () => {
    expect(finishProgress(HIDDEN_ROUTE_PROGRESS)).toEqual(HIDDEN_ROUTE_PROGRESS)
  })

  test('a load that started ticking completes to the full width', () => {
    expect(finishProgress(tickProgress(startProgress(HIDDEN_ROUTE_PROGRESS)))).toEqual({
      visible: true,
      progress: 1,
    })
  })
})

describe('route progress bar', () => {
  test('announces the clamped percentage as a progressbar while loading', () => {
    const markup = renderToStaticMarkup(createElement(RouteProgressBar, { progress: 0.5, active: true }))

    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="50"')
    expect(markup).toContain('aria-valuemin="0"')
    expect(markup).toContain('aria-valuemax="100"')
    expect(markup).toContain('data-active="true"')
    expect(markup).toContain('scaleX(0.5)')
    expect(markup).not.toContain('aria-hidden')
  })

  test('leaves the accessibility tree while idle', () => {
    const markup = renderToStaticMarkup(createElement(RouteProgressBar, { progress: 0, active: false }))

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('data-active="false"')
    expect(markup).toContain('scaleX(0)')
  })
})

describe('route progress bar styles', () => {
  test('pins a pointer-transparent overlay at the top of the viewport', () => {
    const bar = browser.document.createElement('div')
    bar.className = 'os-route-progress'
    bar.style.transform = 'scaleX(0.4)'
    browser.document.body.append(bar)

    const computed = browser.getComputedStyle(bar)
    expect(computed.position).toBe('fixed')
    expect(computed.height).toBe('4px')
    expect(computed.pointerEvents).toBe('none')
    // Grows from the left edge — the whole point of the fill direction.
    expect(computed.transformOrigin).toBe('left center')

    bar.remove()
  })

  test('outranks a maximized window without touching the no-JS notice', () => {
    const rule = documentStyleText('.os-route-progress')

    expect(rule).toMatch(/z-index:\s*40/)
    expect(rule).toMatch(/transition:\s*transform\s+200ms\s+ease-out/)
    expect(rule).toMatch(/background:\s*var\(--os-yellow\)/)
  })
})

function documentStyleText(selector: string): string {
  const sheets = [...browser.document.querySelectorAll('style')].map((element) => element.textContent ?? '')
  return sheets.join('\n').match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}
