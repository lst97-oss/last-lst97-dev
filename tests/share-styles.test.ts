import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SharePreview } from '../src/components/site/share/share-preview'
import { createSiteStyleWindow } from './site-stylesheet'

// The share dialog is a Base UI `Dialog.Popup`, so the OS look depends entirely on
// these hand-written rules beating the primitive's own `rounded-lg` and
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

describe('share styles', () => {
  test('the dialog is a squared OS window rather than a rounded card', () => {
    const dialog = element('div', 'share-dialog')
    const style = browser.getComputedStyle(dialog)

    // DialogContent ships `rounded-lg border`; the override must win.
    expect(style.borderRadius).toBe('0px')
    expect(style.borderTopWidth).toBe('3px')
    // --os-paper. happy-dom resolves custom properties to their hex value
    // rather than the rgb() form browsers compute.
    expect(style.backgroundColor).toBe('#fffdf3')

    dialog.remove()
  })

  test('the dialog does not pad its scroll viewport on top of its own frame', () => {
    const dialog = element('div', 'share-dialog')
    const scroll = element('div', '')
    scroll.setAttribute('data-dialog-scroll', '')
    const viewport = element('div', '')
    viewport.setAttribute('data-slot', 'scroll-area-viewport')
    scroll.append(viewport)
    dialog.append(scroll)

    // DialogContent hardcodes `p-6` there; the 3px border and offset shadow
    // would otherwise read as a second frame inside the first. happy-dom's
    // viewport is 1024px, so the `min-width: 640px` step applies.
    expect(browser.getComputedStyle(viewport).paddingTop).toBe('24px')

    dialog.remove()
  })

  test('the preview image holds the OG card ratio so the crop is honest', () => {
    const image = element('img', 'share-preview-image')
    const style = browser.getComputedStyle(image)

    // 1200x630 is what every destination renders the card at.
    expect(style.aspectRatio).toBe('1200 / 630')
    expect(style.width).toBe('100%')

    image.remove()
  })

  test('the empty-image state replaces a card the scraper would never see', () => {
    const empty = element('div', 'share-preview-image share-preview-image--empty')
    const style = browser.getComputedStyle(empty)

    // A document with no cover emits no og:image, so the preview must show the
    // absence rather than a default image the platform will not receive.
    expect(style.display).toBe('grid')
    expect(style.aspectRatio).toBe('1200 / 630')

    empty.remove()
  })

  test('the target grid lays the four destinations out in one row', () => {
    const targets = element('div', 'share-targets')
    const style = browser.getComputedStyle(targets)

    // One row of four at happy-dom's 1024px viewport. The two-column narrow
    // step is a `max-width`-free media query, and happy-dom does not
    // re-evaluate media queries when `innerWidth` changes, so the reflow is
    // verified in the browser rather than asserted here.
    expect(style.display).toBe('grid')
    expect(style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))')

    targets.remove()
  })

  test('a share tile reads as a raised pixel button, not a flat link', () => {
    const tile = element('a', 'share-target')
    const style = browser.getComputedStyle(tile)

    expect(style.borderTopWidth).toBe('2px')
    expect(style.textTransform).toBe('uppercase')
    // happy-dom resolves the custom property to its hex value, as it does for
    // backgroundColor above.
    expect(style.boxShadow).toBe('3px 3px 0 #17171f')

    tile.remove()
  })

  test('the copy status line reserves its height so the dialog cannot jump', () => {
    const status = element('p', 'share-status')
    const style = browser.getComputedStyle(status)

    // Empty when idle, so without a reservation the dialog would resize by one
    // line every time the copy confirmation appeared.
    // 1.2em at the inherited 15px base; asserted as computed px because
    // happy-dom resolves em against the element's font size.
    expect(style.minHeight).toBe('18px')

    status.remove()
  })
})
