import { afterAll, describe, expect, test } from 'bun:test'
import { installBrowserGlobals } from './browser-globals'

const { window: browser, restore } = installBrowserGlobals()

// Dynamic imports, deliberately: `installBrowserGlobals` must run BEFORE React
// and the components load, because Base UI reads `requestAnimationFrame` off
// `globalThis` when a transition starts. A static import would hoist React above
// the global install and every mount here would throw. This is the same
// ordering `tests/window-frame.test.ts` uses.
const React = await import('react')
const { act, createElement: h } = React
const { createRoot } = await import('react-dom/client')

const { Accordion, AccordionContent, AccordionItem, AccordionTrigger } = await import('../src/components/ui/accordion')
const { Checkbox } = await import('../src/components/ui/checkbox')
const { ScrollArea } = await import('../src/components/ui/scroll-area')
const { Switch } = await import('../src/components/ui/switch')
const { Tabs, TabsContent, TabsList, TabsTrigger } = await import('../src/components/ui/tabs')
const { Toggle } = await import('../src/components/ui/toggle')

afterAll(() => {
  restore()
})

async function mount(element: React.ReactElement) {
  const container = browser.document.createElement('div')
  browser.document.body.append(container)
  const root = createRoot(container as unknown as HTMLDivElement)
  await act(async () => {
    root.render(element)
  })
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    },
  }
}

/**
 * The CSS in `src/styles` keys on Base UI's attribute vocabulary, not Radix's
 * `data-state`. These assertions pin the attributes the stylesheet actually
 * selects on, so a wrapper that silently reverted to `data-state` would fail
 * here instead of rendering an unstyled control.
 */
describe('base ui state attributes', () => {
  test('the scroll area viewport renders children directly, with no table wrapper', async () => {
    const { container, unmount } = await mount(h(ScrollArea, { scrollbars: 'both' as const }, 'body'))

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')
    expect(viewport).not.toBeNull()
    // The Radix wrapper was an inline `display: table` box, which sized to its
    // contents and could not shrink below min-content. Nothing may reintroduce
    // it: five CSS files carry width caps that depend on its absence.
    expect(viewport?.querySelector('div')).toBeNull()
    expect(viewport?.textContent).toBe('body')

    await unmount()
  })

  test('a checked checkbox and switch report data-checked', async () => {
    const { container, unmount } = await mount(
      h('div', {}, h(Checkbox, { checked: true }), h(Switch, { checked: true })),
    )

    expect(container.querySelectorAll('[data-checked]').length).toBeGreaterThanOrEqual(2)
    // Radix spelled this `data-state="checked"`; chat.css selects `[data-checked]`.
    expect(container.querySelector('[data-state]')).toBeNull()

    await unmount()
  })

  test('a pressed toggle reports data-pressed', async () => {
    const { container, unmount } = await mount(h(Toggle, { pressed: true }, 'T'))

    expect(container.querySelector('[data-pressed]')).not.toBeNull()
    expect(container.querySelector('[data-state]')).toBeNull()

    await unmount()
  })

  test('an open accordion marks its trigger data-panel-open and its panel data-open', async () => {
    const { container, unmount } = await mount(
      h(
        Accordion,
        { value: ['a'] },
        h(AccordionItem, { value: 'a' }, h(AccordionTrigger, null, 'Trigger'), h(AccordionContent, null, 'Panel')),
      ),
    )

    expect(container.querySelector('[data-slot="accordion-trigger"]')?.hasAttribute('data-panel-open')).toBe(true)
    expect(container.querySelector('[data-slot="accordion-content"]')?.hasAttribute('data-open')).toBe(true)
    // content-pages.css rotates the chevron off `[data-panel-open]`, so the
    // panel's own `data-open` must not be conflated with it.
    expect(container.querySelector('[data-slot="accordion-trigger"]')?.hasAttribute('data-open')).toBe(false)

    await unmount()
  })

  test('the selected tab reports data-active and the inactive panel is kept mounted but hidden', async () => {
    const { container, unmount } = await mount(
      h(
        Tabs,
        { defaultValue: 'a' },
        h(TabsList, null, h(TabsTrigger, { value: 'a' }, 'A')),
        h(TabsContent, { value: 'a', keepMounted: true }, 'Panel A'),
        h(TabsContent, { value: 'b', keepMounted: true }, 'Panel B'),
      ),
    )

    expect(container.querySelector('[data-slot="tabs-trigger"]')?.hasAttribute('data-active')).toBe(true)
    // Both panels must stay in the DOM so their copy reaches crawlers — the
    // thin-content defect the services page comment guards against.
    expect(container.textContent).toContain('Panel B')
    const inactive = Array.from(container.querySelectorAll('[data-slot="tabs-content"]')).find(
      (panel) => panel.textContent === 'Panel B',
    )
    expect(inactive?.hasAttribute('hidden')).toBe(true)
    expect(inactive?.hasAttribute('data-hidden')).toBe(true)

    await unmount()
  })
})
