import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow } from './site-stylesheet'

const { window: browser, styleElement } = await createSiteStyleWindow()
// `createSiteStyleWindow` names its return as a bare Element; only a style
// element carries the parsed sheet the positive control below needs.
const styles = styleElement as unknown as HTMLStyleElement

/**
 * happy-dom leaves `var()` unresolved and does not resolve `@import`, so these
 * assertions read the authored declarations on the parsed rule rather than a
 * computed value. Authored selectors may wrap across lines, so the comparison
 * collapses whitespace.
 */
function declaration(selector: string, property: string): string | undefined {
  const rules = Array.from(styles.sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  const rule = rules.find((entry) => entry.selectorText?.replace(/\s+/g, ' ') === selector)
  return rule ? rule.style.getPropertyValue(property) : undefined
}

describe('home carousel stylesheet', () => {
  test('contains the carousel inline size so the transform track cannot widen its window', () => {
    // Positive control: without a resolved sheet every assertion below would
    // pass vacuously against an empty rule list.
    expect(styles.sheet?.cssRules.length ?? 0).toBeGreaterThan(0)

    // Radix ScrollArea wraps window content in a `display: table; min-width: 100%`
    // element, which sizes to its contents, so a percentage-width slide track
    // inside it has a circular basis and falls back to min-content. Measured on
    // the home page, that inflated every window to 920px inside a 610px column
    // and `.os-site`'s `overflow: hidden` clipped the right of each card.
    // `contain: inline-size` is what breaks the cycle; the width bounds keep
    // the carousel inside the column on every viewport.
    expect(declaration('.featured-carousel', 'contain')).toBe('inline-size')
    expect(declaration('.featured-carousel', 'min-width')).toBe('0')
    expect(declaration('.featured-carousel', 'max-width')).toBe('100%')
    expect(declaration('.featured-carousel', 'width')).toBe('100%')
    // The track itself must still clip, or the off-screen slides stay visible.
    expect(declaration('.featured-carousel', 'overflow')).toBe('hidden')
  })

  test('keeps each slide exactly one viewport wide so one index step is one slide', () => {
    // `min-width: 0` on the slide is load-bearing on its own: without it the
    // Radix table wrapper sizes to the slide's natural width.
    expect(declaration('.featured-carousel-slide', 'flex')).toBe('0 0 100%')
    expect(declaration('.featured-carousel-slide', 'min-width')).toBe('0')
    expect(declaration('.featured-carousel-track', 'display')).toBe('flex')
  })

  test('resolves the containment and the slide width on a real element', () => {
    const carousel = browser.document.createElement('div')
    carousel.className = 'featured-carousel'
    const track = browser.document.createElement('div')
    track.className = 'featured-carousel-track'
    const slide = browser.document.createElement('div')
    slide.className = 'featured-carousel-slide'
    track.append(slide)
    carousel.append(track)
    browser.document.body.append(carousel)

    const computed = browser.getComputedStyle(carousel)
    expect(computed.contain).toBe('inline-size')
    expect(computed.overflow).toBe('hidden')
    // happy-dom normalises a unitless zero to "0" rather than "0px".
    expect(browser.getComputedStyle(slide).minWidth).toBe('0')

    carousel.remove()
  })
})
