import { afterEach, describe, expect, test } from 'bun:test'
import type { Element as HappyElement, HTMLDivElement, Window } from 'happy-dom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

import { masonryRowSpan } from '../src/components/site/masonry-rows'
import { CardGrid } from '../src/components/site/os-ui'
import { createSiteStyleWindow } from './site-stylesheet'

// `.card-masonry` uses grid-auto-rows: 8px with row-gap: 0 and a 14px bottom
// margin on each card, so a card's reserved height is height + 14 divided by 8.
const ROW_PX = 8
const MARGIN_PX = 14

// Rendering a real component needs DOM globals, and this file is not the only
// one in the shared `bun test` process. Leaving a happy-dom `window` or
// `document` installed makes every later suite read a synthetic environment —
// 53 server tests failed on a leaked `HTMLElement` — so each override is
// recorded and put back exactly as it was.
const SAVED_GLOBALS = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT', 'ResizeObserver'] as const
const savedGlobals = new Map<string, { present: boolean; value: unknown }>()

function installDomGlobals(window: Window) {
  const target = globalThis as Record<string, unknown>
  for (const name of SAVED_GLOBALS) {
    savedGlobals.set(name, { present: name in target, value: target[name] })
  }
  target.window = window
  target.document = window.document
  target.HTMLElement = window.HTMLElement
  target.IS_REACT_ACT_ENVIRONMENT = true
  target.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
}

afterEach(() => {
  const target = globalThis as Record<string, unknown>
  for (const [name, previous] of savedGlobals) {
    if (previous.present) target[name] = previous.value
    else delete target[name]
  }
  savedGlobals.clear()
})

describe('masonry row spans', () => {
  test('reserves enough rows for the card box plus its own margin', () => {
    const cardHeight = 200
    const span = masonryRowSpan(cardHeight)
    const reserved = span * ROW_PX

    // Under-reserving is the failure that makes neighbouring cards overlap.
    expect(reserved).toBeGreaterThanOrEqual(cardHeight + MARGIN_PX)
    // And it must not waste more than one row pitch doing it.
    expect(reserved).toBeLessThan(cardHeight + MARGIN_PX + ROW_PX)
  })

  test('still reserves the margin for a card that measured as collapsed', () => {
    // A card is never observed at a true zero height in practice, but if it is
    // it must still reserve its own 14px margin rather than reserving nothing.
    expect(masonryRowSpan(0)).toBe(Math.ceil(MARGIN_PX / ROW_PX))
    expect(masonryRowSpan(0)).toBeGreaterThanOrEqual(1)
  })

  test('packs cards of different heights into proportionally different spans', () => {
    const short = masonryRowSpan(120)
    const tall = masonryRowSpan(360)

    expect(tall).toBeGreaterThan(short)
    expect(tall / short).toBeCloseTo(3, 0)
  })
})

describe('CardGrid masonry packing', () => {
  // The hook writes row spans and turns on the packing class in an effect, not
  // through state. Both are load-bearing: `grid-auto-rows: 8px` with no spans
  // collapses every card to a single row, so a grid whose class never lands
  // renders as a stack of slivers rather than as cards.
  test('spans every card and turns on dense packing once measured', async () => {
    const { window } = await createSiteStyleWindow()
    installDomGlobals(window)
    // happy-dom has no layout engine, so each card reports a fixed box.
    type HappyRect = Window['HTMLElement']['prototype']['getBoundingClientRect'] extends () => infer R ? R : never
    window.HTMLElement.prototype.getBoundingClientRect = () =>
      ({ height: 200, width: 300, top: 0, left: 0, right: 300, bottom: 200 }) as unknown as HappyRect

    const host = window.document.createElement('div') as unknown as HTMLDivElement
    window.document.body.append(host)
    const root = createRoot(host as unknown as Element)

    await act(async () => {
      root.render(
        createElement(
          CardGrid,
          null,
          createElement('div', { className: 'content-card' }, 'first'),
          createElement('div', { className: 'content-card' }, 'second'),
        ),
      )
    })

    const grid = host.firstElementChild as unknown as HTMLElement
    const spans = [...grid.children].map((child) => (child as HTMLElement).style.gridRowEnd)

    expect(grid.className.split(' ')).toContain('card-masonry')
    expect(spans).toEqual([`span ${masonryRowSpan(200)}`, `span ${masonryRowSpan(200)}`])
    expect(window.getComputedStyle(grid as unknown as HappyElement).gridAutoRows).toBe('8px')
  })
})
