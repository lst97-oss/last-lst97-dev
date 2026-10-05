import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow, readResponsiveBlock } from './site-stylesheet'

// The viewer dialog is a Base UI `Dialog.Popup`, so the OS look depends entirely
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

  test('the scroll viewport is capped so a wide image scales down instead of overflowing', () => {
    // Base UI's scroll-area viewport lays its children out directly — there is
    // no inner wrapper — so the cap has to live on the viewport itself. Both
    // declarations are load-bearing: `min-width: 0` lets the viewport shrink
    // below its content's min-content width, and `max-width: 100%` stops a wide
    // image from stretching the frame, which is what `.media-viewer-image`'s own
    // `max-width: 100%` then resolves against.
    const dialog = element('div', 'media-viewer-dialog')
    const scroll = browser.document.createElement('div')
    scroll.setAttribute('data-dialog-scroll', '')
    const viewport = browser.document.createElement('div')
    viewport.setAttribute('data-slot', 'scroll-area-viewport')
    const window = element('div', 'media-viewer-window')
    viewport.append(window)
    scroll.append(viewport)
    dialog.append(scroll)
    browser.document.body.append(dialog)

    const viewportStyle = browser.getComputedStyle(viewport)
    // happy-dom keeps a unitless zero as "0" rather than normalising it to "0px".
    expect(viewportStyle.minWidth === '0' || viewportStyle.minWidth === '0px').toBe(true)
    expect(viewportStyle.maxWidth).toBe('100%')
    expect(browser.getComputedStyle(window).width).toBe('100%')

    dialog.remove()
  })

  test('the active filmstrip thumb is visually distinct from an inactive one', () => {
    const inactive = element('button', 'media-viewer-thumb')
    const active = element('button', 'media-viewer-thumb is-active')

    expect(browser.getComputedStyle(active).borderTopColor).not.toBe(browser.getComputedStyle(inactive).borderTopColor)

    inactive.remove()
    active.remove()
  })

  test('the filmstrip is a themed ScrollArea rather than a natively-scrolling div', () => {
    // The strip must draw the project's shared ScrollArea bar instead of the
    // browser's own, so the assertions cover the themed bar's axis and the
    // containment that stops the strip's min-content from widening the dialog.
    // The themed bar rules are scoped under the ScrollArea root, so the fixture
    // has to nest them the way the component renders.
    const root = browser.document.createElement('div')
    root.setAttribute('data-slot', 'scroll-area')
    root.className = 'media-viewer-filmstrip'
    const scrollbar = browser.document.createElement('div')
    scrollbar.setAttribute('data-slot', 'scroll-area-scrollbar')
    scrollbar.setAttribute('data-orientation', 'horizontal')
    root.append(scrollbar)
    browser.document.body.append(root)

    const strip = root

    expect(browser.getComputedStyle(strip).contain).toBe('inline-size')
    // happy-dom normalizes a unitless `0` to "0" rather than "0px".
    expect(browser.getComputedStyle(strip).minWidth).toBe('0')
    expect(browser.getComputedStyle(scrollbar).height).toBe('10px')
    // No native horizontal bar.
    expect(browser.getComputedStyle(strip).overflowX).not.toBe('auto')
    expect(browser.getComputedStyle(strip).overflowX).not.toBe('scroll')

    strip.remove()
  })

  test('the filmstrip row keeps each thumbnail at its fixed width', () => {
    const row = element('div', 'media-viewer-filmstrip-row')
    const thumb = element('button', 'media-viewer-thumb')

    expect(browser.getComputedStyle(row).display).toBe('flex')
    expect(browser.getComputedStyle(thumb).flex).toContain('0 0 auto')

    row.remove()
    thumb.remove()
  })

  test('the key hint is a centered flex row above the mobile cutoff', async () => {
    const hint = element('p', 'media-viewer-key-hint')
    const style = browser.getComputedStyle(hint)

    expect(style.display).toBe('flex')
    expect(style.justifyContent).toBe('center')
    expect(style.marginTop).toBe('10px')

    // Below 650px there are no arrow keys and Escape has no touch equivalent,
    // so the row goes away entirely rather than reflowing.
    const responsive = await Bun.file(new URL('../src/styles/responsive.css', import.meta.url)).text()
    const mobile = readResponsiveBlock(responsive, '@media (max-width: 650px) {')
    expect(mobile).toMatch(/\.media-viewer-key-hint\s*\{\s*display:\s*none;\s*\}/)

    hint.remove()
  })
})
