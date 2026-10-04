import { describe, expect, test } from 'bun:test'

const shellSource = await Bun.file(new URL('../src/components/site/shell.tsx', import.meta.url)).text()
const tabBarSource = await Bun.file(new URL('../src/components/site/mobile-tab-bar.tsx', import.meta.url)).text()

/**
 * The nav data is three hand-maintained arrays plus the sitemap and chat section
 * lists. A route added without its entries is still reachable but invisible and
 * de-indexed, so these assertions exist to make that drift fail loudly.
 */
const NAV_LABELS = "href: '/services', label: 'Services'"

describe('desktop shell navigation', () => {
  test('the dock carries a Services shortcut carrying an icon', () => {
    expect(shellSource).toContain(`{ ${NAV_LABELS}, icon: LayoutGrid },`)
  })

  test('Services is its own top-level menu, not buried in another group', () => {
    expect(shellSource).toContain("label: 'Services',")
    expect(shellSource).toContain(
      "{ href: '/services', label: 'Website packages', description: 'Pricing, inclusions & process', icon: LayoutGrid },",
    )
    // The quote path is the only CTA, and it points at the existing form route.
    expect(shellSource).toContain(
      "{ href: '/contact', label: 'Request a quote', description: 'Send requirements for a fixed price', icon: AtSign },",
    )
  })

  test('every nav entry keeps the shape the menu renderer reads', () => {
    const entries = [...shellSource.matchAll(/\{ href: '([^']+)', label: '([^']+)'/g)].map((match) => ({
      href: match[1],
      label: match[2],
    }))
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.href).toMatch(/^\/[a-z0-9/-]*$/)
      expect(entry.label).not.toBe('')
    }
  })
})

describe('mobile tab bar navigation', () => {
  /** The hrefs inside one nav array literal, in source order. */
  function hrefsInArray(source: string, name: string, end: string): string[] {
    const start = source.indexOf(`const ${name}`)
    expect(start).toBeGreaterThan(-1)
    const slice = source.slice(start, source.indexOf(end, start))
    return [...slice.matchAll(/href: '([^']+)'/g)].map((match) => match[1] as string)
  }

  test('the tab bar carries a Services shortcut carrying an icon', () => {
    expect(tabBarSource).toContain(`{ ${NAV_LABELS}, icon: LayoutGrid },`)
  })

  test('the four primary tabs keep their order, which is the bar layout', () => {
    expect(hrefsInArray(tabBarSource, 'mobileTabBarItems', 'const mobileMoreItems')).toEqual([
      '/',
      '/services',
      '/projects',
      '/chat',
    ])
  })

  test('More holds every destination that is not a tab', () => {
    const moreHrefs = hrefsInArray(tabBarSource, 'mobileMoreItems', 'const moreDescriptions')
    expect(moreHrefs).toEqual(['/about', '/blog', '/changelog', '/contact'])
  })

  test('no public page becomes unreachable on mobile', () => {
    // The bottom sheet listed eight destinations. Splitting them across four
    // tabs and a More menu must still cover all eight, or a page is silently
    // gone from the only nav a phone can see.
    const reachable = [
      ...hrefsInArray(tabBarSource, 'mobileTabBarItems', 'const mobileMoreItems'),
      ...hrefsInArray(tabBarSource, 'mobileMoreItems', 'const moreDescriptions'),
    ]
    for (const href of ['/', '/services', '/about', '/blog', '/projects', '/changelog', '/chat', '/contact']) {
      expect(reachable).toContain(href)
    }
  })

  test('the More menu opens upward and keeps the About this site action', () => {
    // `side="top"` is what keeps the popup on screen above a bar pinned to the
    // bottom; the default side would render it below the viewport.
    expect(tabBarSource).toContain('side="top"')
    // The header's About button is hidden below sm, so this menu item is the
    // only way to open that panel on a phone.
    expect(tabBarSource).toContain('setAboutOpen(true)')
  })
})
