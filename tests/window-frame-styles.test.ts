import { describe, expect, test } from 'bun:test'
import { build } from 'vite'
import { createSiteStyleWindow } from './site-stylesheet'

/**
 * Runs CSS through the project's real production minifier and returns the
 * minified text. `cssMinify: 'lightningcss'` is stated explicitly rather than
 * inherited from Vite's default: the defect IS Lightning CSS's declaration
 * ordering, so the test must name the minifier it is pinning rather than
 * silently following a future Vite default change.
 *
 * The CSS is written to a temp file because a Vite build takes a real entry
 * path, and the minified result is read off the rollup output rather than
 * from disk so nothing needs cleaning up beyond the directory.
 */
/**
 * A unique scratch directory under the OS temp dir. Bun has no `mkdtemp`, so
 * this composes the same guarantee from `crypto.randomUUID()`: the name is
 * unpredictable, so two concurrent runs cannot collide on it.
 */
async function makeScratchDir(): Promise<string> {
  const base = (Bun.env.TMPDIR ?? '/tmp').replace(/[/\\]+$/, '')
  const root = `${base}/lastos-css-minify-${crypto.randomUUID()}`
  await Bun.write(`${root}/fixture.css`, '')
  return root
}

async function minifyCss(css: string): Promise<string> {
  const root = await makeScratchDir()
  const entry = `${root}/fixture.css`
  try {
    await Bun.write(entry, css)
    const outputs = await build({
      root,
      logLevel: 'silent',
      build: {
        cssMinify: 'lightningcss',
        write: false,
        rollupOptions: { input: entry },
      },
    })
    // `build` is typed as `RolldownOutput | RolldownOutput[] | RolldownWatcher`;
    // only the outputs carry `output`, so a watcher result is filtered out by
    // shape rather than asserted away.
    const results = Array.isArray(outputs) ? outputs : [outputs]
    const assets = results
      .filter((result): result is Extract<typeof result, { output: unknown }> => 'output' in result)
      .flatMap((result) => result.output)
      .filter((output) => output.type === 'asset')
    const minified = assets.map((asset) => String(asset.source)).join('')

    if (!minified) throw new Error('vite build produced no CSS asset')
    return minified
  } finally {
    // Bun 1.4 has no `rm`, and this repo spawns `rm` directly elsewhere
    // (`sync-github-knowledge.ts`), so it matches that rather than shelling.
    Bun.spawnSync(['rm', '-rf', root])
  }
}

const shellSource = await Bun.file(new URL('../src/components/site/shell.tsx', import.meta.url)).text()

const { window: browser, styleElement: styles } = await createSiteStyleWindow()

/**
 * The `@media (max-width: 650px)` block from src/styles/responsive.css with
 * comments stripped. Read as text rather than through computed styles because
 * happy-dom does not apply media queries, and `:has()` selectors would need
 * real engine support to resolve.
 */
let mobileBlock: Promise<string> | null = null
function readMobileBlock(): Promise<string> {
  mobileBlock ??= Bun.file(new URL('../src/styles/responsive.css', import.meta.url))
    .text()
    .then((css) => {
      const block = css.replace(/\/\*[\s\S]*?\*\//g, '').split('@media (max-width: 650px) {')[1] ?? ''
      // Stop at the media query's own closing brace so later blocks cannot
      // satisfy a matcher meant for this one.
      return block.slice(0, block.indexOf('\n}'))
    })
  return mobileBlock
}

describe('window frame styles', () => {
  test('keeps the desktop background grid fixed while content scrolls', () => {
    const desktop = browser.document.createElement('div')
    desktop.className = 'os-site'
    browser.document.body.append(desktop)

    expect(browser.getComputedStyle(desktop).backgroundAttachment).toBe('fixed')

    desktop.remove()
  })

  test('declares a document scroll lock while keeping maximized window content scrollable', () => {
    const frame = browser.document.createElement('section')
    const otherFrame = browser.document.createElement('section')
    frame.className = 'window-frame is-maximized'
    otherFrame.className = 'window-frame is-maximized'
    const content = browser.document.createElement('div')
    content.className = 'window-content'
    frame.append(content)
    browser.document.body.append(frame, otherFrame)

    const rootLockRule = styles.textContent?.match(/html:has\(\.window-frame\.is-maximized\)\s*\{[^}]*\}/)?.[0] ?? ''

    expect(rootLockRule).toContain('overflow: hidden;')
    expect(browser.getComputedStyle(content).overflow).toBe('auto')

    frame.remove()
    otherFrame.remove()
  })

  test('a minimized dashboard window does not stretch to its grid row', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame is-minimized'
    browser.document.body.append(frame)

    expect(browser.getComputedStyle(frame).alignSelf).toBe('start')

    frame.remove()
  })

  test('a minimized scrollable window still collapses its content box', () => {
    // Every non-home route renders a `scrollable` frame, and its content box is
    // three-class `display: flex` — the SAME specificity as the minimize rule's
    // `display: none`. Without a `:not(.is-minimized)` guard the later rule won
    // and minimize did nothing at all outside the home dashboard, where frames
    // are not scrollable. The store and the button were never at fault.
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame is-minimized window-frame--scroll'
    const content = browser.document.createElement('div')
    content.className = 'window-content window-content--scroll'
    frame.append(content)
    browser.document.body.append(frame)

    expect(browser.getComputedStyle(content).display).toBe('none')

    frame.remove()
  })

  test('a scrollable frame is height-capped so its scroll viewport can resolve', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame is-normal window-frame--scroll'
    browser.document.body.append(frame)

    const frameStyle = browser.getComputedStyle(frame)

    expect(frameStyle.display).toBe('flex')
    expect(frameStyle.flexDirection).toBe('column')
    expect(frameStyle.maxHeight).toContain('100dvh')

    frame.remove()
  })

  test('a maximized scrollable frame leaves the height cap to the fixed inset', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame is-maximized window-frame--scroll'
    browser.document.body.append(frame)

    // `:not(.is-maximized)` opts out, so the cap never fights the fixed inset.
    expect(browser.getComputedStyle(frame).maxHeight).toBe('')

    frame.remove()
  })

  test('the mobile breakpoint does not remove the scrollable frame height cap', async () => {
    // The shell root is `h-dvh overflow-hidden`, so the page can never scroll:
    // a window whose content exceeds the viewport is only reachable through its
    // own ScrollArea. Resetting the cap here (`max-height: none`) let the frame
    // grow past the viewport into a clipped shell, which is what made long
    // detail pages impossible to scroll on a phone.
    const responsive = (await Bun.file(new URL('../src/styles/responsive.css', import.meta.url)).text()).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const mobileStart = responsive.indexOf('@media (max-width: 650px) {')
    expect(mobileStart).toBeGreaterThan(-1)

    const mobile = responsive.slice(mobileStart)
    const reset = mobile.match(/\.window-frame--scroll:not\(\.is-maximized\)\s*\{[^}]*\}/)?.[0] ?? ''

    // Either the rule is gone, or it must not strip the cap.
    expect(reset === '' || !reset.includes('max-height: none')).toBe(true)
  })

  test.each(['is-normal', 'is-maximized'])('the scrollable content box never shows a native scrollbar (%s)', (mode) => {
    const frame = browser.document.createElement('section')
    frame.className = `window-frame ${mode} window-frame--scroll`
    const content = browser.document.createElement('div')
    content.className = 'window-content window-content--scroll'
    frame.append(content)
    browser.document.body.append(frame)

    // The themed ScrollArea inside is the only scroller; the box itself must
    // stay `hidden` or the maximized state re-introduces a native bar beside it.
    expect(browser.getComputedStyle(content).overflow).toBe('hidden')
    expect(browser.getComputedStyle(content).paddingTop).toBe('0px')

    frame.remove()
  })

  test('releases the shell height clamp on mobile so a page without a scrollable frame can scroll', async () => {
    // Below `sm` the shell root stops being a viewport-locked app frame. While
    // it stayed `h-dvh overflow-hidden`, a page with no `scrollable` WindowFrame
    // (home) had nowhere to scroll: the document was exactly one viewport tall
    // and the content column grew past it, so the overflow was clipped and
    // unreachable. `overflow-y: visible` is load-bearing — `auto` would turn
    // the shell into a second scroller competing with the page.
    const mobile = await readMobileBlock()

    expect(mobile).toMatch(/\.os-site\s*\{[^}]*overflow-y:\s*visible/)
    // A word boundary is required, not selector anchoring: the released rule
    // keeps `min-height: 100dvh`, whose `height: 100dvh` substring would
    // otherwise satisfy a matcher meant for the clamped `height` declaration.
    expect(mobile).not.toMatch(/\.os-site\s*\{[^}]*(^|[\s;])height:\s*100dvh/)
    // The decorative background must stay contained, and `clip` is the only
    // value that does that without forcing `overflow-y` to a scroll container.
    expect(mobile).toMatch(/\.os-site\s*\{[^}]*overflow-x:\s*clip/)
  })

  test('re-applies the shell height clamp on mobile when a scrollable frame owns the scroll', async () => {
    // Chat, contact, and every list/detail page wrap their content in a
    // `scrollable` WindowFrame, so the frame's themed ScrollArea must stay the
    // only reachable scroller. Releasing the clamp for those pages too would
    // leak page scroll past the frame (a 23px gap on a 390x844 phone) and give
    // two nested scrollers on one screen.
    const mobile = await readMobileBlock()

    expect(mobile).toMatch(/\.os-site:has\(\.window-frame--scroll\)\s*\{[^}]*height:\s*100dvh/)
    expect(mobile).toMatch(/\.os-site:has\(\.window-frame--scroll\)\s*\{[^}]*overflow:\s*hidden/)
  })

  test('every scrollable frame route opts into the shell scroller', async () => {
    // The two scroll models are selected by whether a `scrollable` frame is
    // present, so a route that scrolls tall content without the prop silently
    // falls back to the page model — the pre-fix mobile behaviour.
    const chatPage = await Bun.file(new URL('../src/components/site/chat/chat-page.tsx', import.meta.url)).text()
    const contactRoute = await Bun.file(new URL('../src/routes/_site.contact.tsx', import.meta.url)).text()

    // The prop can sit on any line of the JSX tag, so match across newlines.
    expect(chatPage).toMatch(/<WindowFrame[\s\S]{0,200}?\bscrollable\b/)
    expect(contactRoute).toMatch(/<WindowFrame[\s\S]{0,200}?\bscrollable\b/)
  })

  test('locks the shell scroller on pages whose window owns scrolling', async () => {
    const shellRule =
      styles.textContent?.match(
        /\.os-site:has\(\.window-frame--scroll\)\s+\.desktop-main\s*>\s*\[data-slot=['"]scroll-area-viewport['"]\]\s*\{[^}]*\}/,
      )?.[0] ?? ''
    const shellScrollbarRule =
      styles.textContent?.match(
        /\.os-site:has\(\.window-frame--scroll\)\s+\.desktop-main\s*>\s*\[data-slot=['"]scroll-area-scrollbar['"]\]\s*\{[^}]*\}/,
      )?.[0] ?? ''

    expect(shellRule).toMatch(/overflow-y:\s*hidden/)
    expect(shellScrollbarRule).toMatch(/display:\s*none/)
  })

  test('the about page gives its long content a window scroller', async () => {
    const aboutRoute = await Bun.file(new URL('../src/routes/_site.about.tsx', import.meta.url)).text()

    expect(aboutRoute).toMatch(/<WindowFrame[\s\S]{0,200}?\bscrollable\b/)
  })

  test('keeps the site not-found boundary inside the routes that load the site stylesheet', async () => {
    // The router truncates the head/asset lane at the not-found match
    // (`_getAssetMatches` and `projectLane` both stop there), so a child
    // route's `notFound()` only keeps `src/styles.css` linked when the
    // boundary is a match that also produces it. Before this, the boundary
    // walked up to `__root`, whose head carries no site sheet, and the 404
    // rendered unstyled with a global page scrollbar.
    const [siteRoute, rootRoute, adminIndex, adminSplat] = await Promise.all(
      [
        '../src/routes/_site.tsx',
        '../src/routes/__root.tsx',
        '../src/routes/_payload.admin.index.tsx',
        '../src/routes/_payload.admin.$.tsx',
      ].map((path) => Bun.file(new URL(path, import.meta.url)).text()),
    )

    expect(siteRoute).toMatch(/notFoundComponent/)
    // The root also wraps `/_payload`, and `src/styles.css` is unlayered so
    // it outranks Payload's layered admin CSS. Relinking the sheet there
    // strips the admin panel of its own styling (regression of 8d3e8dd).
    expect(rootRoute).not.toContain('styles.css')
    // `/_payload` is a sibling of `/_site` and the admin routes own their
    // boundary, so Payload's own not-found always wins under `/admin` and
    // the site page can never render there.
    expect(adminIndex).toMatch(/notFoundComponent:\s*AdminNotFound/)
    expect(adminSplat).toMatch(/notFoundComponent:\s*AdminNotFound/)
  })

  test('renders the desktop navigation as a compact floating glass dock', () => {
    // The chrome is on the Radix viewport, not the ScrollArea root: the root is
    // only the positioning context, and the viewport is what clips and scrolls.
    const sidebar = browser.document.createElement('aside')
    sidebar.className = 'desktop-shortcuts'
    const viewport = browser.document.createElement('div')
    viewport.className = 'desktop-shortcuts-viewport'
    sidebar.append(viewport)
    browser.document.body.append(sidebar)

    const rootStyle = browser.getComputedStyle(sidebar)
    expect(rootStyle.position).toBe('fixed')
    expect(rootStyle.maxHeight).toContain('96px')
    expect(rootStyle.transform).toBe('translateY(-50%)')

    const chrome = browser.getComputedStyle(viewport)
    expect(chrome.borderRadius).toBe('6px')
    expect(chrome.borderRightWidth).toBe('1px')
    expect(chrome.backdropFilter).toBe('blur(16px)')
    expect(chrome.backgroundColor).toBe('transparent')
    expect(chrome.boxShadow).toBe('0 4px 12px rgba(23, 23, 31, 0.16)')

    sidebar.remove()
  })

  test('the dock outranks the ScrollArea root utility class so it stays fixed', async () => {
    // Regression: `ScrollArea` bakes Tailwind's `relative` into its own root
    // class list. Tailwind's `utilities` layer outranks this unlayered file
    // (layer order in src/styles.css), so a plain `position: fixed` silently
    // lost. The dock stayed `relative` — a grid item stretched to its row and
    // bounded only by `max-height`, painting a full-height translucent column.
    // happy-dom cannot catch this: it does not load the `utilities` layer, so
    // the computed style looked correct while the real page regressed.
    const shell = (await Bun.file(new URL('../src/styles/shell.css', import.meta.url)).text()).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const dock = shell.match(/\.desktop-shortcuts\s*\{[^}]*\}/)?.[0] ?? ''

    expect(dock).not.toBe('')
    expect(dock).toMatch(/position:\s*fixed\s*!important/)
    // Without `min-height: 0` the root is a flex container whose `flex-1`
    // viewport child gives it an automatic minimum size of its content height,
    // so the box grows to the shortcuts instead of hugging them.
    expect(dock).toMatch(/min-height:\s*0/)
    // The viewport must not claim a height; a `100%` resolves against the
    // fixed root and re-introduces the full-height chrome.
    const dockViewport = shell.match(/\.desktop-shortcuts-viewport\s*\{[^}]*\}/)?.[0] ?? ''
    expect(dockViewport).not.toMatch(/(^|[\s;])height:/)
  })

  test('the dock never scrolls horizontally', () => {
    // `overflow-y: auto` alone computed `overflow-x` to `auto`, which gave the
    // dock a sideways scrollbar at narrow widths. The themed bar owns the
    // vertical axis; x must stay `clip`.
    const sidebar = browser.document.createElement('aside')
    sidebar.className = 'desktop-shortcuts'
    const viewport = browser.document.createElement('div')
    viewport.className = 'desktop-shortcuts-viewport'
    sidebar.append(viewport)
    browser.document.body.append(sidebar)

    const chrome = browser.getComputedStyle(viewport)
    expect(chrome.overflowX).toBe('clip')

    sidebar.remove()
  })

  test('the narrow dock is wide enough for its own children', async () => {
    // The viewport is border-box with 1px borders and 8px padding per side, so
    // the old 82px width left 62px of content for a 72px `.desktop-shortcut`,
    // and the dock overlapped the grid track that still reserved 82px.
    // `await` binds tighter than `.`, so without the parens it awaits the
    // BunFile object and `.replace` is called on a Promise.
    const responsive = (await Bun.file(new URL('../src/styles/responsive.css', import.meta.url)).text()).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const narrow = responsive.split('@media (max-width: 900px) {')[1] ?? ''

    const dockWidth = Number(narrow.match(/\.desktop-shortcuts\s*\{\s*width:\s*(\d+)px/)?.[1])
    const trackWidth = Number(narrow.match(/\.desktop-workspace\s*\{\s*grid-template-columns:\s*(\d+)px/)?.[1])
    const childWidth = Number(narrow.match(/\.desktop-shortcut\s*\{\s*width:\s*(\d+)px/)?.[1])
    const paddingAndBorder = 8 * 2 + 1 * 2

    expect(dockWidth).toBe(trackWidth)
    expect(dockWidth - paddingAndBorder).toBeGreaterThanOrEqual(childWidth)
  })

  test('keeps desktop content in the content column beside the fixed dock', () => {
    const main = browser.document.createElement('main')
    main.className = 'desktop-main'
    browser.document.body.append(main)

    expect(browser.getComputedStyle(main).gridColumn).toBe('2')

    main.remove()
  })

  test('restores visible markers for rich-text ordered and unordered lists', () => {
    const content = browser.document.createElement('div')
    content.className = 'rich-text'
    const unorderedList = browser.document.createElement('ul')
    const orderedList = browser.document.createElement('ol')
    content.append(unorderedList, orderedList)
    browser.document.body.append(content)

    expect(browser.getComputedStyle(unorderedList).listStyleType).toBe('disc')
    expect(browser.getComputedStyle(orderedList).listStyleType).toBe('decimal')

    content.remove()
  })

  test('uses dark ink for the default dock navigation label color', () => {
    // The resting label ink left .desktop-shortcut in the shell refresh; it is
    // now Tailwind's `text-foreground` utility on the dock link itself.
    const shortcutLink = shellSource
      .split('\n')
      .find((line) => line.includes('desktop-shortcut ') && line.includes('className='))

    expect(shortcutLink).toContain('text-foreground')

    // text-foreground resolves through --color-foreground, which is itself
    // aliased to --foreground, the dark ink token.
    const rules = Array.from((styles as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
    const root = rules.find((rule) => rule.selectorText === ':root')
    expect(root?.style.getPropertyValue('--foreground')).toBe('var(--os-ink)')

    const activeRule = rules.find((rule) =>
      rule.selectorText
        ?.split(',')
        .map((selector) => selector.trim())
        .includes('.desktop-shortcut.is-active'),
    )
    expect(activeRule?.style.getPropertyValue('color')).toBe('var(--os-ink)')
  })

  test('reveals operator coding details only when the profile window is maximized', () => {
    const frame = browser.document.createElement('section')
    frame.className = 'window-frame operator-profile-window'
    const details = browser.document.createElement('div')
    details.className = 'profile-coding-details'
    const jsonDetails = browser.document.createElement('div')
    jsonDetails.className = 'profile-json-details'
    frame.append(details, jsonDetails)
    browser.document.body.append(frame)

    expect(browser.getComputedStyle(details).display).toBe('none')
    expect(browser.getComputedStyle(jsonDetails).display).toBe('none')

    frame.classList.add('is-maximized')
    expect(browser.getComputedStyle(details).display).not.toBe('none')
    expect(browser.getComputedStyle(jsonDetails).display).not.toBe('none')

    frame.remove()
  })
})

describe('dock glass blur survives minification', () => {
  /**
   * `backdrop-filter` is a shorthand, and Lightning CSS — Vite's default CSS
   * minifier — collapses it into the prefixed property. With the standard
   * declaration written first, the prefixed one overwrote it and the built
   * rule shipped as `-webkit-backdrop-filter` alone, which Chromium does not
   * support at all. The dock rendered as a flat transparent panel in every
   * production build while dev looked correct (vitejs/vite#21954).
   *
   * Both orders are valid CSS, so only running the real minifier over the
   * real rule catches a regression, and happy-dom cannot help: it does not
   * model `backdrop-filter` at all.
   *
   * The minifier runs through a Vite build rather than a direct
   * `lightningcss` call. That package's Node-API binding is broken under
   * Bun — it throws `Get TypedArray info failed` from `transform` even when
   * the platform package is `require`d directly, so `import { transform }
   * from 'lightningcss'` cannot work under `bun test`. A one-file Vite build
   * uses the same default minifier, returns the minified CSS in the rollup
   * output, and runs in well under a second.
   */
  test('minified output keeps the standard backdrop-filter property', async () => {
    const shell = (await Bun.file(new URL('../src/styles/shell.css', import.meta.url)).text()).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const rule = shell.match(/\.desktop-shortcuts-viewport\s*\{[^}]*\}/)?.[0] ?? ''

    expect(rule).not.toBe('')
    const prefixed = rule.indexOf('-webkit-backdrop-filter')
    const standard = rule.indexOf('backdrop-filter')
    // Both must be present first: `indexOf` returns -1 for a missing
    // declaration, and -1 < 0 would make the order check pass for the
    // wrong reason.
    expect(prefixed).toBeGreaterThanOrEqual(0)
    expect(standard).toBeGreaterThanOrEqual(0)
    expect(prefixed).toBeLessThan(standard)

    const minified = await minifyCss(rule)
    // The boundary stops the `-webkit-backdrop-filter` the minifier does emit
    // from satisfying this matcher, which would pass against the broken build.
    expect(minified).toMatch(/(^|[^-\w])backdrop-filter:blur\(16px\)/)
  })
})
