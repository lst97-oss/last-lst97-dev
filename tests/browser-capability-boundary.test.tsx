import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { Window as BrowserWindow } from 'happy-dom'

const browserWindow = new BrowserWindow({ url: 'http://localhost/' })
const globalKeys = [
  'window',
  'document',
  'navigator',
  'Element',
  'HTMLElement',
  'Node',
  'MutationObserver',
  'IS_REACT_ACT_ENVIRONMENT',
] as const
const originalGlobalDescriptors = new Map(
  globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
)

Object.defineProperties(globalThis, {
  window: { configurable: true, value: browserWindow },
  document: { configurable: true, value: browserWindow.document },
  navigator: { configurable: true, value: browserWindow.navigator },
  Element: { configurable: true, value: browserWindow.Element },
  HTMLElement: { configurable: true, value: browserWindow.HTMLElement },
  Node: { configurable: true, value: browserWindow.Node },
  MutationObserver: { configurable: true, value: browserWindow.MutationObserver },
  IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
})

const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { renderToStaticMarkup } = await import('react-dom/server')
const { BrowserCapabilityBoundary } = await import('../src/components/site/browser-capability-boundary')

let root: ReturnType<typeof createRoot>
let container: ReturnType<typeof browserWindow.document.createElement>

afterEach(async () => {
  if (root) await act(async () => root.unmount())
  container?.remove()
})

afterAll(() => {
  for (const key of globalKeys) {
    const descriptor = originalGlobalDescriptors.get(key)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

describe('BrowserCapabilityBoundary', () => {
  test('keeps the same feature content in SSR and after a supported browser check', async () => {
    const runtime = {
      fetch: (() => Promise.resolve(new Response())) as unknown as typeof fetch,
      AbortController,
      ReadableStream,
      TextDecoder,
    }
    const feature = React.createElement('p', null, 'Interactive feature')
    const boundaryProps = {
      feature: 'Chat',
      requirements: ['fetch', 'abort-controller', 'response-streams', 'text-decoder'] as const,
      runtime,
    }

    expect(renderToStaticMarkup(React.createElement(BrowserCapabilityBoundary, boundaryProps, feature))).toBe(
      '<p>Interactive feature</p>',
    )

    container = browserWindow.document.createElement('div')
    browserWindow.document.body.append(container)
    root = createRoot(container as unknown as HTMLElement)
    await act(async () => {
      root.render(React.createElement(BrowserCapabilityBoundary, boundaryProps, feature))
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Interactive feature')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  test('replaces only the feature content with an accessible notice when a requirement is missing', async () => {
    const runtime = {
      fetch: (() => Promise.resolve(new Response())) as unknown as typeof fetch,
      AbortController,
      ReadableStream: undefined,
      TextDecoder,
    }
    container = browserWindow.document.createElement('div')
    browserWindow.document.body.append(container)
    root = createRoot(container as unknown as HTMLElement)
    await act(async () => {
      root.render(
        React.createElement(
          BrowserCapabilityBoundary,
          {
            feature: 'Chat',
            requirements: ['fetch', 'response-streams'] as const,
            runtime,
          },
          React.createElement('p', null, 'Chat composer'),
        ),
      )
      await Promise.resolve()
    })

    const notice = container.querySelector('[role="alert"]')
    expect(notice?.textContent).toContain('Chat requires browser features that are unavailable')
    expect(notice?.textContent).toContain('Response streams')
    expect(container.textContent).not.toContain('Chat composer')
  })
})
