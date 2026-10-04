import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { Toaster } from '../src/components/ui/sonner'
import { createSiteStyleWindow } from './site-stylesheet'

/**
 * The provider used to be missing entirely: `src/components/ui/sonner.tsx`
 * existed, `sonner` was a declared dependency, and nothing in `src/` rendered
 * it. A `toast()` call still returned an id and still threw nothing, so the
 * only symptom was a toast that never appeared — the failure mode these
 * assertions pin.
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

  test('the wrapper renders the toaster list and not a theme provider', () => {
    // Sonner renders its list lazily — the `<ol data-sonner-toaster>` only
    // exists once a toast is present — so SSR proves the `aria-live` section
    // exists without depending on that.
    const html = renderToStaticMarkup(createElement(Toaster))

    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('data-react-aria-top-layer="true"')
  })

  test('the wrapper no longer depends on an unmounted next-themes provider', async () => {
    const source = await Bun.file(new URL('../src/components/ui/sonner.tsx', import.meta.url)).text()

    // `next-themes` has no `ThemeProvider` anywhere in `src/`, so `useTheme()`
    // always returned its out-of-context fallback and the `theme` prop was
    // dead. The dependency and the import both go with it.
    expect(source).not.toContain('next-themes')
    expect(source).not.toContain('useTheme')
    // Pinned to `light` on purpose: nothing sets `html.dark`, so `system`
    // would let an OS-dark machine push sonner's dark palette over `--card`.
    expect(source).toContain('theme="light"')
  })
})

describe('toaster stylesheet', () => {
  async function rules() {
    const { styleElement } = await createSiteStyleWindow()
    return Array.from((styleElement as unknown as HTMLStyleElement).sheet?.cssRules ?? []) as unknown as CSSStyleRule[]
  }

  test("qualifies the container so sonner's injected font cannot win", async () => {
    const found = await rules()
    const container = found.find((rule) =>
      rule.selectorText
        ?.split(',')
        .map((part) => part.trim().replace(/\s+/g, ' '))
        .includes('.os-toaster[data-sonner-toaster]'),
    )

    // Sonner injects `font-family: ui-sans-serif, …` on
    // `[data-sonner-toaster]` (0,1,0) from a runtime <style> that loads AFTER
    // the site sheet. An unqualified `.os-toaster` loses on cascade order and
    // the toast renders in system sans while the whole site is monospace — a
    // regression that is invisible in markup and only measurable in the
    // computed style.
    expect(container).toBeDefined()
    expect(container?.style.cssText).toContain('font-family')
    expect(container?.style.getPropertyValue('font-family').trim()).toBe('var(--font-mono)')
  })

  test("paints the toast in the OS window idiom, not sonner's soft card", async () => {
    const { styleElement } = await createSiteStyleWindow()
    const css = (styleElement as unknown as HTMLStyleElement).textContent ?? ''

    // Matched against the stylesheet TEXT, the way `window-frame-styles.test.ts`
    // does it. happy-dom's CSSOM is lossy for shorthands: `rule.cssText`
    // re-serialises `border: 3px solid var(--border)` as `border: 3px solid`
    // plus three longhands all set to `var(--border)`, and `getPropertyValue`
    // on the shorthand drops the parts. Only the authored text is lossless.
    const surface = css.match(/\.os-toaster \[data-sonner-toast\]\[data-styled='true'\]\s*\{[^}]*\}/)?.[0]

    expect(surface).toBeDefined()
    expect(surface).toContain('border: 3px solid var(--border)')
    // Replaces sonner's own `0 4px 12px rgba(0,0,0,.1)` rather than adding to it.
    expect(surface).toMatch(/box-shadow:\s*var\(--shadow-os-sm\)/)
  })

  test('carries toast type on the icon, since sonner only tints under richColors', async () => {
    const found = await rules()

    for (const [type, token] of [
      ['success', '--success'],
      ['error', '--error'],
      ['warning', '--warning'],
      ['info', '--info'],
    ] as const) {
      const rule = found.find((entry) =>
        entry.selectorText
          ?.split(',')
          .map((part) => part.trim().replace(/\s+/g, ' '))
          .includes(`.os-toaster [data-sonner-toast][data-type='${type}'] [data-icon]`),
      )
      expect(rule?.style.getPropertyValue('color').trim()).toBe(`var(${token})`)
    }
  })
})
