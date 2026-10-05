import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow } from './site-stylesheet'

const { window: browser, styleElement: styles } = await createSiteStyleWindow()

// happy-dom keeps `var()` references unresolved in getComputedStyle, so the
// themed bar is asserted through the declarations that produce those colors.
// Authored selectors may wrap across lines, so compare on collapsed whitespace.
function declaration(selector: string, property: string) {
  const rules = Array.from((styles as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  const rule = rules.find((entry) => entry.selectorText?.replace(/\s+/g, ' ') === selector)
  return rule ? rule.style.getPropertyValue(property) : undefined
}

function appendScrollArea() {
  const root = browser.document.createElement('div')
  root.setAttribute('data-slot', 'scroll-area')
  const viewport = browser.document.createElement('div')
  viewport.setAttribute('data-slot', 'scroll-area-viewport')
  const bar = browser.document.createElement('div')
  bar.setAttribute('data-slot', 'scroll-area-scrollbar')
  bar.setAttribute('data-orientation', 'vertical')
  const thumb = browser.document.createElement('div')
  thumb.setAttribute('data-slot', 'scroll-area-thumb')
  thumb.setAttribute('data-orientation', 'vertical')
  bar.append(thumb)
  root.append(viewport, bar)
  browser.document.body.append(root)
  return { root, viewport, bar, thumb }
}

describe('scroll area styles', () => {
  test('the bar has no fill, so the surface behind it shows through', () => {
    appendScrollArea()

    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-scrollbar"]', 'background')).toBe(
      'transparent',
    )
    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-scrollbar"]', 'border-top-width')).toBe('0px')
  })

  test('the bar matches the chat display scrollbar width and thumb inset', () => {
    const { bar } = appendScrollArea()

    // .os-chat-viewport::-webkit-scrollbar is 10px, and its thumb is inset 2px
    // per side by a border that matches the track. Here the bar's own padding
    // produces that same 2px inset around a transparent track.
    expect(
      declaration(
        '[data-slot="scroll-area"] [data-slot="scroll-area-scrollbar"][data-orientation="vertical"]',
        'width',
      ),
    ).toBe('10px')
    expect(
      declaration(
        '[data-slot="scroll-area"] [data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]',
        'height',
      ),
    ).toBe('10px')
    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-scrollbar"]', 'padding')).toBe('2px')
    expect(browser.getComputedStyle(bar).width).toBe('10px')
  })

  test('the thumb uses the chat display yellow and keeps a grabbable width', () => {
    const { thumb } = appendScrollArea()

    // A margin here would eat the whole 6px track width and leave an
    // ungrabbable bar, because the thumb is sized to the content box.
    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-thumb"]', 'margin')).toBe('')
    expect(browser.getComputedStyle(thumb).marginTop).toBe('')
    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-thumb"]', 'background')).toBe(
      'var(--os-yellow)',
    )
    expect(declaration('[data-slot="scroll-area"] [data-slot="scroll-area-thumb"]', 'border-radius')).toBe('0px')
    // The thumb carries its own data-orientation, so the resize cursor is
    // selected directly rather than through the bar that contains it.
    expect(
      declaration('[data-slot="scroll-area"] [data-slot="scroll-area-thumb"][data-orientation="vertical"]', 'cursor'),
    ).toBe('ns-resize')
    expect(
      declaration('[data-slot="scroll-area"] [data-slot="scroll-area-thumb"][data-orientation="horizontal"]', 'cursor'),
    ).toBe('ew-resize')
  })

  test('a bar whose viewport cannot scroll is not painted', () => {
    // `keepMounted` keeps every bar in the DOM so the width/thumb rules above
    // keep matching while it is idle, which also painted a 10px bar with a
    // full-height thumb on shells and panels that had nothing to scroll — a
    // scrollbar that could not be dragged anywhere. Base UI mirrors the
    // viewport's overflow state onto the bar, so absence of the attribute is
    // the signal, and the bar must then be hidden.
    //
    // Asserted as hidden vs not hidden rather than as an exact `display`: the
    // bare element takes its `flex` from the component's Tailwind class, which
    // happy-dom resolves to `block`. Only the hiding rule is ours.
    const { bar } = appendScrollArea()

    // No overflow attribute is the idle state, so the bar starts hidden.
    expect(browser.getComputedStyle(bar).display).toBe('none')

    // Base UI adds the attribute only when that axis really scrolls.
    bar.setAttribute('data-has-overflow-y', '')
    expect(browser.getComputedStyle(bar).display).not.toBe('none')

    bar.removeAttribute('data-has-overflow-y')
    expect(browser.getComputedStyle(bar).display).toBe('none')

    // A horizontal bar is gated on its own axis, so a panel that scrolls
    // sideways still shows the strip it needs.
    bar.setAttribute('data-orientation', 'horizontal')
    bar.setAttribute('data-has-overflow-x', '')
    expect(browser.getComputedStyle(bar).display).not.toBe('none')

    bar.removeAttribute('data-has-overflow-x')
    expect(browser.getComputedStyle(bar).display).toBe('none')
  })

  test('no dialog-scoped override paints a track, which would darken the surface', () => {
    // The dialog contains nested diagram ScrollAreas, so a descendant rule here
    // would repaint their tracks too.
    expect(
      declaration('.chat-pipeline-dialog [data-dialog-scroll] > [data-slot="scroll-area-scrollbar"]', 'background'),
    ).toBeUndefined()
  })

  test('the dialog viewport keeps its own padding instead of the diagram padding', () => {
    expect(
      declaration('.chat-pipeline-dialog [data-dialog-scroll] > [data-slot="scroll-area-viewport"]', 'padding'),
    ).toBe('24px')
  })
})
