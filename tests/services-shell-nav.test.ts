import { describe, expect, test } from 'bun:test'

const shellSource = await Bun.file(new URL('../src/components/site/shell.tsx', import.meta.url)).text()
const drawerSource = await Bun.file(new URL('../src/components/site/mobile-nav-drawer.tsx', import.meta.url)).text()

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

describe('mobile drawer navigation', () => {
  test('the drawer grid carries the same Services shortcut', () => {
    expect(drawerSource).toContain(`{ ${NAV_LABELS}, icon: LayoutGrid },`)
  })

  test('Home stays first so the drawer opens on the desktop equivalent', () => {
    const hrefs = [...drawerSource.matchAll(/href: '([^']+)'/g)].map((match) => match[1])
    expect(hrefs[0]).toBe('/')
    expect(hrefs).toContain('/services')
  })
})
