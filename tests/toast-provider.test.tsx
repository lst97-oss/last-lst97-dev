import { describe, expect, test } from 'bun:test'
import { createSiteStyleWindow } from './site-stylesheet'

/**
 * The toast host is mounted once by `src/routes/_site.tsx` and must never fall
 * out of the document, or a `toast.add()` returns an id and paints nothing —
 * the failure mode these assertions exist to catch. Two of the previous tests
 * were pinned to sonner's SSR output (`aria-live`, `data-react-aria-top-layer`)
 * and died with it: Base UI's `ToastPortal` renders nothing on the server, so
 * there is no server markup to assert. Rendering is now proven in
 * `tests/toast-mount.test.tsx`, which mounts the real host under a DOM.
 */

describe('toast provider', () => {
  test('the site layout mounts exactly one toaster', async () => {
    const route = await Bun.file(new URL('../src/routes/_site.tsx', import.meta.url)).text()

    const mounts = route.match(/<Toaster\s*\/>/g) ?? []
    expect(mounts).toHaveLength(1)

    // It has to be inside the `_site` layout, not `__root`: `withPayloadRoot`
    // hands `/_payload/admin` to Payload's own `<html>` shell, and the admin
    // already brings a Toaster from `@payloadcms/ui`. Mounting at the root
    // would give the admin two.
    expect(route).not.toContain('__root')
  })

  test('the toaster sits outside BootGate, whose content wrapper is display:none', async () => {
    const route = await Bun.file(new URL('../src/routes/_site.tsx', import.meta.url)).text()

    // `[data-boot='content']` is `display: none` until `html.js-hydrated`
    // (see shell.css). A toast raised during hydration would mount but stay
    // invisible if the provider were inside that subtree.
    expect(route.indexOf('</BootGate>')).toBeLessThan(route.indexOf('<Toaster />'))
  })

  test('the host is the Base UI wrapper, and no sonner import survives', async () => {
    expect(await Bun.file(new URL('../src/components/ui/toast.tsx', import.meta.url)).exists()).toBe(true)
    expect(await Bun.file(new URL('../src/components/ui/sonner.tsx', import.meta.url)).exists()).toBe(false)

    const route = await Bun.file(new URL('../src/routes/_site.tsx', import.meta.url)).text()
    expect(route).toContain('@/components/ui/toast')
    expect(route).not.toContain('sonner')
  })
})

describe('toaster stylesheet', () => {
  async function rules() {
    const { styleElement } = await createSiteStyleWindow()
    return Array.from((styleElement as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  }

  /** happy-dom's CSSOM is lossy for shorthands, so shorthand assertions read the authored text. */
  async function sheetText() {
    const { styleElement } = await createSiteStyleWindow()
    return (styleElement as unknown as HTMLStyleElement).textContent ?? ''
  }

  /** Collapses the wrapping that authored selectors get, then compares exactly. */
  function ruleFor(found: CSSStyleRule[], selector: string) {
    return found.find((rule) =>
      rule.selectorText
        ?.split(',')
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .includes(selector),
    )
  }

  test('paints the container in the site monospace stack', async () => {
    const found = await rules()
    const container = ruleFor(found, '.os-toast-viewport')

    expect(container).toBeDefined()
    expect(container?.style.getPropertyValue('font-family').trim()).toBe('var(--font-mono)')
  })

  test('paints the toast in the OS window idiom, not the primitive default', async () => {
    const css = await sheetText()

    // Matched against the stylesheet TEXT, the way `window-frame-styles.test.ts`
    // does it, because happy-dom re-serialises `border: 3px solid var(--border)`
    // as a bare `border: 3px solid` plus longhands.
    const surface = css.match(/\[data-slot='toast'\]\s*\{[^}]*\}/)?.[0]

    expect(surface).toBeDefined()
    expect(surface).toContain('border: 3px solid var(--border)')
    // Replaces the primitive's own `shadow-lg` rather than adding to it — a
    // soft blur under a hard 3px frame reads as two unrelated surfaces.
    expect(surface).toMatch(/box-shadow:\s*var\(--shadow-os-sm\)/)
    // Every control on this site is square; no control is a circle.
    expect(surface).toContain('border-radius: 0')
  })

  test('carries toast type on the icon, so the type survives a flat paper card', async () => {
    const found = await rules()

    for (const [type, token] of [
      ['success', '--success'],
      ['error', '--error'],
      ['warning', '--warning'],
      ['info', '--info'],
    ] as const) {
      const rule = ruleFor(found, `[data-type='${type}'] [data-slot='toast-icon']`)
      expect(rule?.style.getPropertyValue('color').trim()).toBe(`var(${token})`)
    }
  })

  test('clears the mobile tab bar below the shared 40rem breakpoint', async () => {
    const css = await sheetText()

    // Same query `responsive.css` gates the bar and its own reserve on, so the
    // offset and the bar appear and disappear together. The bar's reserve is
    // declared on `.os-site`, which is not an ancestor of the toast portal, so
    // the height token has to be applied here.
    const query = css.match(/@media \(width < 40rem\)\s*\{\s*\.os-toast-viewport\s*\{[^}]*\}/)?.[0]

    expect(query).toBeDefined()
    expect(query).toContain('--os-tab-bar-height')
  })
})
