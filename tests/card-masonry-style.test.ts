import { describe, expect, test } from 'bun:test'
import type { HTMLStyleElement } from 'happy-dom'
import { createSiteStyleWindow } from './site-stylesheet'

const { window: browser, styleElement } = await createSiteStyleWindow()
// `createSiteStyleWindow` names its return as a bare Element; only a
// style element carries the parsed sheet the positive control below needs.
const styles = styleElement as HTMLStyleElement

describe('card masonry stylesheet', () => {
  test('packs cards densely with an 8px row pitch and no row gap', () => {
    // Positive control: without a resolved sheet every assertion below would
    // pass vacuously against an empty rule list.
    expect(styles.sheet?.cssRules.length ?? 0).toBeGreaterThan(0)

    const grid = browser.document.createElement('div')
    grid.className = 'card-masonry'
    browser.document.body.append(grid)

    const computed = browser.getComputedStyle(grid)
    expect(computed.gridAutoFlow).toBe('row dense')
    expect(computed.gridAutoRows).toBe('8px')
    // happy-dom normalizes a unitless `row-gap: 0` to "0" rather than "0px".
    expect(computed.rowGap).toBe('0')
    expect(computed.columnGap).toBe('14px')
    // Without `align-items: start` a card fills its own span, the observer
    // re-measures the grown box, and the grid grows without bound.
    expect(computed.alignItems).toBe('start')

    grid.remove()
  })

  test('gives every packed card the visual gap through a bottom margin', () => {
    const card = browser.document.createElement('div')
    card.className = 'content-card'
    browser.document.body.append(card)

    expect(browser.getComputedStyle(card).marginBottom).toBe('')

    const masonry = browser.document.createElement('div')
    masonry.className = 'card-masonry'
    masonry.append(card)
    browser.document.body.append(masonry)

    expect(browser.getComputedStyle(card).marginBottom).toBe('14px')

    masonry.remove()
  })
})
