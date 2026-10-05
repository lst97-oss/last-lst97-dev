import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow } from './site-stylesheet'

// The viewer dialog is a Radix DialogContent, so the OS look depends entirely
// on these hand-written rules beating the primitive's own `rounded-lg` and
// `sm:max-w-lg`. `tests/site-stylesheet.ts` is required here: happy-dom never
// resolves `@import`, so loading src/styles.css directly would leave every
// computed style empty and these assertions would pass vacuously.
const { window: browser } = await createSiteStyleWindow()

function element(tag: string, className: string) {
  const el = browser.document.createElement(tag)
  el.className = className
  browser.document.body.append(el)
  return el
}

describe('media viewer styles', () => {
  test('the dialog is a squared OS window rather than a rounded card', () => {
    const dialog = element('div', 'media-viewer-dialog')
    const style = browser.getComputedStyle(dialog)

    // DialogContent ships `rounded-lg border`; the override must win.
    expect(style.borderRadius).toBe('0px')
    expect(style.borderTopWidth).toBe('3px')
    // --os-paper. happy-dom resolves custom properties to their hex value
    // rather than the rgb() form browsers compute.
    expect(style.backgroundColor).toBe('#fffdf3')

    dialog.remove()
  })

  test('the viewer image is contained so neither tall nor wide images are cropped', () => {
    const image = element('img', 'media-viewer-image')
    const style = browser.getComputedStyle(image)

    expect(style.objectFit).toBe('contain')
    expect(style.maxWidth).toBe('100%')

    image.remove()
  })

  test('the viewer body insets its content while the frame stays flush', () => {
    // The title bar is a direct child of the frame and must span its full
    // width, so the frame itself carries no padding. The padding lives on the
    // `.media-viewer-body` element, mirroring the `.window-content` body
    // `WindowFrame` renders. Putting the padding on the frame instead insets
    // the title bar, which no other window on the site does.
    //
    // Exact values, not "not zero": happy-dom resolves media-query-scoped
    // rules and reports the largest matching value, so a "not 0px" assertion
    // would still pass if the base rule regressed to zero.
    const frame = element('div', 'media-viewer-window')
    const frameStyle = browser.getComputedStyle(frame)

    // The frame declares no padding at all, so happy-dom returns "" rather
    // than "0px" — either way the bar is uninset.
    expect(frameStyle.paddingTop || '0px').toBe('0px')
    expect(frameStyle.paddingLeft || '0px').toBe('0px')
    expect(frameStyle.paddingRight || '0px').toBe('0px')
    expect(frameStyle.paddingBottom || '0px').toBe('0px')
    // `min-height: 0` lets the image shrink inside the 84vh cap rather than
    // overflowing the flex column.
    // happy-dom normalizes a unitless `0` to "0" rather than "0px".
    expect(frameStyle.minHeight).toBe('0')

    const body = element('div', 'window-content media-viewer-body')
    const bodyStyle = browser.getComputedStyle(body)

    expect(bodyStyle.paddingTop).toBe('32px')
    expect(bodyStyle.paddingRight).toBe('32px')
    expect(bodyStyle.paddingBottom).toBe('32px')
    expect(bodyStyle.paddingLeft).toBe('32px')
    expect(bodyStyle.minHeight).toBe('0')

    frame.remove()
    body.remove()
  })

  test('the dialog does not pad its scroll viewport on top of the window body', () => {
    // The dialog draws its own border and offset shadow, so viewport padding
    // plus window padding reads as a second frame floating inside the first.
    const dialog = element('div', 'media-viewer-dialog')
    const scroll = browser.document.createElement('div')
    scroll.setAttribute('data-dialog-scroll', '')
    const viewport = browser.document.createElement('div')
    viewport.setAttribute('data-slot', 'scroll-area-viewport')
    scroll.append(viewport)
    dialog.append(scroll)
    browser.document.body.append(dialog)

    expect(browser.getComputedStyle(viewport).paddingTop).toBe('0px')

    dialog.remove()
  })

  test('the scroll viewport wrapper is capped so a wide image scales down instead of overflowing', () => {
    // Radix's viewport wraps its children in a div carrying an inline
    // `display: table`, whose used width is max(specified width, min-content).
    // The wrapper's min-content is the image's full intrinsic width, so it grew
    // past the dialog and became the box `.media-viewer-image`'s `max-width: 100%`
    // resolved against — the image never scaled down and DialogContent's
    // `overflow-hidden` clipped it. Both declarations below are load-bearing:
    // `display` must leave the table formatting context (a table box cannot
    // shrink below min-content, so `width` alone is inert), and `width` is what
    // caps it at the viewport once it is a block-level flex container.
    const dialog = element('div', 'media-viewer-dialog')
    const scroll = browser.document.createElement('div')
    scroll.setAttribute('data-dialog-scroll', '')
    const viewport = browser.document.createElement('div')
    viewport.setAttribute('data-slot', 'scroll-area-viewport')
    const wrapper = browser.document.createElement('div')
    viewport.append(wrapper)
    scroll.append(viewport)
    dialog.append(scroll)
    browser.document.body.append(dialog)

    const style = browser.getComputedStyle(wrapper)
    expect(style.display).toBe('flex')
    expect(style.flexDirection).toBe('column')
    expect(style.width).toBe('100%')

    dialog.remove()
  })

  test('the active filmstrip thumb is visually distinct from an inactive one', () => {
    const inactive = element('button', 'media-viewer-thumb')
    const active = element('button', 'media-viewer-thumb is-active')

    expect(browser.getComputedStyle(active).borderTopColor).not.toBe(browser.getComputedStyle(inactive).borderTopColor)

    inactive.remove()
    active.remove()
  })

  test('the filmstrip scrolls horizontally so long galleries stay reachable', () => {
    const strip = element('div', 'media-viewer-filmstrip')

    expect(browser.getComputedStyle(strip).overflowX).toBe('auto')
    expect(browser.getComputedStyle(strip).display).toBe('flex')

    strip.remove()
  })
})
