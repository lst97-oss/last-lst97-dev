import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Window as BrowserWindow } from 'happy-dom'

const browserWindow = new BrowserWindow({ url: 'http://localhost/' })
const globalKeys = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'Node', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT'] as const
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
const { TurnstileChallenge } = await import('../src/components/site/turnstile-challenge')

let root: ReturnType<typeof createRoot>
let container: ReturnType<typeof browserWindow.document.createElement>
let widgetOptions: { callback: (token: string | null) => void } | undefined
const neverResolves = new Promise<void>(() => undefined)

function ConditionalSuspension({ shouldSuspend }: { shouldSuspend: boolean }) {
  if (shouldSuspend) throw neverResolves
  return null
}

function challengeTree(onToken: (token: string | null) => void, shouldSuspend: boolean) {
  return React.createElement(React.Suspense, { fallback: 'loading' }, React.createElement(React.Fragment, null, [
    React.createElement(TurnstileChallenge, {
      key: 'challenge',
      action: 'contact',
      siteKey: 'test-site-key',
      resetCount: 0,
      onToken,
    }),
    React.createElement(ConditionalSuspension, { key: 'suspender', shouldSuspend }),
  ]))
}

beforeEach(() => {
  widgetOptions = undefined
  Object.defineProperty(browserWindow, 'turnstile', {
    configurable: true,
    value: {
      render: (_container: HTMLElement, options: typeof widgetOptions) => {
        widgetOptions = options
        return 'widget-1'
      },
      remove: () => undefined,
      reset: () => undefined,
    },
  })
  container = browserWindow.document.createElement('div')
  browserWindow.document.body.append(container)
  root = createRoot(container as unknown as HTMLElement)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

afterAll(() => {
  for (const key of globalKeys) {
    const descriptor = originalGlobalDescriptors.get(key)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
})

describe('Turnstile challenge callback', () => {
  test('does not publish a callback from a render that React suspends', async () => {
    const committedTokens: (string | null)[] = []
    const abandonedTokens: (string | null)[] = []

    await act(async () => {
      root.render(challengeTree((token) => committedTokens.push(token), false))
      await Promise.resolve()
    })

    await act(async () => {
      root.render(challengeTree((token) => abandonedTokens.push(token), true))
      await Promise.resolve()
    })

    expect(widgetOptions).toBeDefined()
    widgetOptions?.callback('challenge-token')
    expect(committedTokens).toEqual(['challenge-token'])
    expect(abandonedTokens).toEqual([])
  })
})
