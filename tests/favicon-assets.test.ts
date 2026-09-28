import { describe, expect, test } from 'bun:test'

const FAVICON_DIR = new URL('../public/favicon/', import.meta.url)

const manifest = await Bun.file(new URL('site.webmanifest', FAVICON_DIR)).json()
const rootRouteSource = await Bun.file(new URL('../src/routes/__root.tsx', import.meta.url)).text()

describe('web app manifest', () => {
  test('every declared icon resolves to a file on disk', async () => {
    expect(manifest.icons.length).toBeGreaterThan(0)

    for (const icon of manifest.icons as { src: string; sizes: string; type: string }[]) {
      // Icons live under /favicon; a bare filename would 404 in the browser.
      expect(icon.src.startsWith('/favicon/')).toBe(true)

      const file = Bun.file(new URL(icon.src.replace('/favicon/', ''), FAVICON_DIR))
      expect(await file.exists()).toBe(true)
    }
  })

  test('declares the app identity and points start_url at the root', () => {
    expect(manifest.start_url).toBe('/')
    expect(manifest.name).toContain('LAST//OS')
    expect(manifest.short_name).toBe('LAST//OS')
  })

  test('theme colors match the site design tokens, not a placeholder white', () => {
    // --os-cream from the :root block in src/styles/globals.css.
    expect(manifest.theme_color).toBe('#fff7df')
    expect(manifest.background_color).toBe('#fff7df')
  })
})

describe('favicon assets', () => {
  test('raster icons carry a PNG signature, not an HTML error page', async () => {
    const pngs = [
      'favicon-96x96.png',
      'apple-touch-icon.png',
      'web-app-manifest-192x192.png',
      'web-app-manifest-512x512.png',
    ]

    for (const name of pngs) {
      const head = Buffer.from(await Bun.file(new URL(name, FAVICON_DIR)).slice(0, 8).arrayBuffer())
      expect(head.subarray(0, 4).toString('latin1')).toBe('\x89PNG')
    }
  })

  test('the ico file has a real ICONDIR header', async () => {
    const head = Buffer.from(await Bun.file(new URL('favicon.ico', FAVICON_DIR)).slice(0, 6).arrayBuffer())
    // reserved=0, type=1 (icon), count>=1
    expect(head.readUInt16LE(0)).toBe(0)
    expect(head.readUInt16LE(2)).toBe(1)
    expect(head.readUInt16LE(4)).toBeGreaterThanOrEqual(1)
  })

  test('the svg favicon is real vector markup', async () => {
    const svg = await Bun.file(new URL('favicon.svg', FAVICON_DIR)).text()
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })
})

describe('document head favicon wiring', () => {
  test('declares every icon format a browser needs to find one', () => {
    expect(rootRouteSource).toContain("rel: 'icon', href: '/favicon/favicon.ico'")
    expect(rootRouteSource).toContain("type: 'image/svg+xml', href: '/favicon/favicon.svg'")
    expect(rootRouteSource).toContain("rel: 'apple-touch-icon'")
    expect(rootRouteSource).toContain("rel: 'manifest'")
  })

  test('does not suppress the icon with an empty data uri', () => {
    // `rel: 'icon', href: 'data:,'` renders a blank tab icon.
    expect(rootRouteSource).not.toContain("href: 'data:,'")
  })

  test('every href declared as an icon exists in public/favicon', async () => {
    const hrefs = [...rootRouteSource.matchAll(/href: '(\/favicon\/[^']+)'/g)].map((m) => m[1] as string)
    expect(hrefs.length).toBeGreaterThanOrEqual(4)

    for (const href of hrefs) {
      const file = Bun.file(new URL(href.replace('/favicon/', ''), FAVICON_DIR))
      expect(await file.exists()).toBe(true)
    }
  })
})
