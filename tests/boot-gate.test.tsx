import { describe, expect, test } from 'bun:test'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { BootGate } from '../src/components/site/boot-gate'
import { BootSkeleton } from '../src/components/ui/skeletons'
import { createSiteStyleWindow } from './site-stylesheet'

function markup(element: ReactElement): string {
  return renderToStaticMarkup(element)
}

function occurrences(source: string, needle: string): number {
  return source.split(needle).length - 1
}

describe('boot gate markup', () => {
  test('wraps the shell in a content layer and pairs it with the skeleton', () => {
    const html = markup(createElement(BootGate, null, createElement('div', { className: 'os-site' })))

    // Exactly one of each, content first: a skeleton rendered before the
    // content it replaces would flash on hydration.
    expect(occurrences(html, 'data-boot="content"')).toBe(1)
    expect(occurrences(html, 'data-boot="skeleton"')).toBe(1)
    expect(html.indexOf('data-boot="content"')).toBeLessThan(html.indexOf('data-boot="skeleton"'))

    // The gated content must still be present in the server HTML, not removed —
    // it is only hidden by CSS, and it is what hydrates.
    expect(html).toContain('os-site')
  })

  test('the skeleton announces itself and mirrors the shell chrome classes', () => {
    const html = markup(createElement(BootSkeleton))

    expect(html).toContain('data-skeleton="boot"')
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Loading LAST//OS"')

    // Geometric parity is the whole point of this component: the reveal swaps
    // it for `DesktopShell`, so every one of these class names must survive or
    // the layout shifts at the exact moment the user expects it to settle.
    for (const selector of [
      'class="system-bar',
      'class="desktop-workspace',
      'class="desktop-shortcuts"',
      'class="desktop-main',
    ]) {
      expect(occurrences(html, selector)).toBe(1)
    }

    const root = html.slice(html.indexOf('<div'), html.indexOf('>'))
    expect(root).toContain('os-site')
    expect(root).toContain('h-dvh')
  })

  test('the skeleton carries a CSS-only loading indicator, no JS-bound spinner', () => {
    const html = markup(createElement(BootSkeleton))

    expect(occurrences(html, '<span>.</span>')).toBe(3)
    // `Spinner` is an `svg`; the boot state must not depend on any component
    // that needs the React runtime to paint.
    expect(html).not.toContain('<svg')
  })
})

describe('boot gate stylesheet', () => {
  test('holds the shell back until html.js-hydrated, then swaps the layers', async () => {
    const { styleElement } = await createSiteStyleWindow()
    const rules = Array.from(
      (styleElement as unknown as HTMLStyleElement).sheet?.cssRules ?? [],
    ) as unknown as CSSStyleRule[]

    const declarationFor = (selector: string): string => {
      const rule = rules.find((entry) =>
        entry.selectorText
          ?.split(',')
          .map((part) => part.trim().replace(/\s+/g, ' '))
          .includes(selector),
      )
      return rule?.style.cssText ?? ''
    }

    // Pre-hydration. `html` carries no `js-hydrated` class before any script
    // runs, so the UNGATED rules are the pre-hydration state: content hidden,
    // skeleton shown.
    expect(declarationFor("[data-boot='content']")).toContain('display: none')
    expect(declarationFor("[data-boot='skeleton']")).toContain('display: flex')

    // Post-hydration: content restored, skeleton removed. `display: contents`
    // is load-bearing, not cosmetic — any box-generating value here would
    // insert an element between <body> and `.os-site`, changing the containing
    // block that `h-dvh` and `position: fixed` rely on.
    expect(declarationFor("html.js-hydrated [data-boot='content']")).toContain('display: contents')
    expect(declarationFor("html.js-hydrated [data-boot='skeleton']")).toContain('display: none')
  })

  test('the gate is scoped to boot markers, never to the no-JavaScript blocker', async () => {
    const { styleElement } = await createSiteStyleWindow()
    const css = (styleElement as unknown as HTMLStyleElement).textContent ?? ''

    // The two gates are disjoint by design: no JS at all leaves
    // `.javascript-disabled-notice` up, while JS-but-stalled-hydration is
    // covered by the 8s timer. Neither rule may key off the other's class.
    expect(css).not.toMatch(/js-hydrated[^{]*javascript-disabled-notice/)
    expect(css).not.toMatch(/js-enabled[^{]*data-boot/)
  })
})

describe('root boot script', () => {
  test('keeps the blocker class and adds a fail-open reveal timer', async () => {
    const rootRoute = await Bun.file(new URL('../src/routes/__root.tsx', import.meta.url)).text()

    expect(rootRoute).toContain("document.documentElement.classList.add('js-enabled')")
    expect(rootRoute).toContain("document.documentElement.classList.add('js-hydrated')},8000)")

    // The timer must be a plain conditional add, never a removal: client-side
    // navigations render new `BootGate` instances, and dropping the class would
    // re-hide the shell underneath the user.
    expect(rootRoute).not.toMatch(/classList\.remove\(['"]js-hydrated['"]\)/)
  })
})
