import { afterAll, describe, expect, test } from 'bun:test'

import { installBrowserGlobals } from './browser-globals'

const installed = installBrowserGlobals()
const { window: browser, restore } = installed

// Dynamic imports, deliberately: `installBrowserGlobals` must run BEFORE React
// and the toast host load, because Base UI drives every transition through
// `useAnimationFrame`, which reads `requestAnimationFrame` off `globalThis`
// inside a layout effect. A static import would hoist React above the global
// install and every mount below would throw. This is the same ordering
// `tests/base-ui-attributes.test.tsx` uses.
const React = await import('react')
const { act, createElement: h } = React
const { createRoot } = await import('react-dom/client')

const { toast, ToastList, ToastProvider, ToastViewport } = await import('../src/components/ui/toast')

afterAll(() => {
  restore()
})

/**
 * Mounts the host WITHOUT `ToastPortal`, which is load-bearing rather than a
 * shortcut. `react-dom/server` — imported by ~30 other test files — primes
 * React's DOM internals the first time it loads, and a `ToastPortal` mounted
 * afterwards writes into a document React no longer resolves against this
 * window, so it renders nothing. That makes any portal-mounted assertion pass
 * or fail purely on suite file order. `Provider → Viewport → List` renders the
 * same toast nodes through the same manager and is order-independent, verified
 * against `tests/content-rendering.test.tsx` as the hostile first file.
 *
 * What this cannot cover is the portal mount itself, which is verified in a
 * real browser instead: `tests/toast-provider.test.tsx` pins that the host is
 * mounted exactly once and outside `BootGate`.
 */
async function mount() {
  const container = browser.document.createElement('div')
  browser.document.body.append(container)
  const root = createRoot(container as unknown as HTMLDivElement)
  await act(async () => {
    root.render(h(ToastProvider, { toastManager: toast }, h(ToastViewport, null, h(ToastList))))
  })
  return {
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

/**
 * Proves the toast host actually PAINTS a toast, which no server-rendered
 * assertion can: Base UI's `ToastPortal` renders nothing during SSR, so
 * `renderToStaticMarkup` sees an empty string whether the host works or is
 * missing entirely. That is exactly how the original bug hid — the provider
 * was never mounted in the document, and a toast call still returned an id and
 * threw nothing.
 */
describe('toast host renders a toast', () => {
  test('a toast added through the manager appears in the viewport', async () => {
    const { unmount } = await mount()

    // Nothing is on screen before a toast is added, so the assertions below
    // can only pass because the add actually rendered something.
    expect(browser.document.body.innerHTML).not.toContain('data-slot="toast"')

    await act(async () => {
      toast.add({ title: 'Saved', description: 'Changes written', type: 'success' })
    })

    const rendered = browser.document.body.innerHTML
    expect(rendered).toContain('data-slot="toast"')
    expect(browser.document.body.textContent).toContain('Saved')
    expect(browser.document.body.textContent).toContain('Changes written')

    await unmount()
  })

  test('the added toast reaches the surface with its type, so the icon can tint', async () => {
    const { unmount } = await mount()

    await act(async () => {
      toast.add({ title: 'Failed', type: 'error' })
    })

    // Type is carried by the icon rather than the card background, so the
    // `data-type` reaching the surface is what makes the tint possible. This
    // is the attribute `shell.css` keys the four colour rules on.
    const rendered = browser.document.body.innerHTML
    expect(rendered).toContain('data-type="error"')
    expect(rendered).toContain('data-slot="toast-icon"')

    await unmount()
  })
})
