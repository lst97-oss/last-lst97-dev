import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Window as BrowserWindow } from 'happy-dom'

const browserWindow = new BrowserWindow({ url: 'http://localhost/' })
const globalKeys = ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'Node', 'MutationObserver', 'IS_REACT_ACT_ENVIRONMENT'] as const
const originalGlobalDescriptors = new Map(
  globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
)
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch')

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
const { ContactMessageForm } = await import('../src/components/site/contact/contact-message-form')

let root: ReturnType<typeof createRoot>
let container: ReturnType<typeof browserWindow.document.createElement>
let resolveRequest: ((response: Response) => void) | undefined
let requestCount = 0
let responseBodyReads = 0
let turnstileCallback: ((token: string) => void) | undefined

beforeEach(() => {
  requestCount = 0
  responseBodyReads = 0
  turnstileCallback = undefined
  resolveRequest = undefined
  Object.defineProperty(browserWindow, 'turnstile', {
    configurable: true,
    value: {
      render: (_container: HTMLElement, options: { callback: (token: string) => void }) => {
        turnstileCallback = options.callback
        return 'widget-1'
      },
      remove: () => undefined,
      reset: () => undefined,
    },
  })
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: () => {
      requestCount += 1
      return new Promise<Response>((resolve) => {
        resolveRequest = (response) => resolve({
          ...response,
          json: async () => {
            responseBodyReads += 1
            return {}
          },
        } as Response)
      })
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
  if (originalFetchDescriptor) Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor)
  else Reflect.deleteProperty(globalThis, 'fetch')
})

describe('contact message submission', () => {
  test('ignores a second submit while the first request is pending', async () => {
    await act(async () => {
      root.render(React.createElement(ContactMessageForm, { siteKey: 'test-site-key' }))
      await Promise.resolve()
    })
    expect(turnstileCallback).toBeDefined()

    await act(async () => {
      turnstileCallback?.('verified-token')
    })
    await act(async () => {
      fillField('#contact-name', 'Nelson')
      fillField('#contact-email', 'nelson@example.com')
      fillField('#contact-message', 'Hello, this is a proper message.')
      await Promise.resolve()
    })
    const form = container.querySelector('form')
    expect(form).not.toBeNull()

    await act(async () => {
      form?.dispatchEvent(new browserWindow.Event('submit', { bubbles: true, cancelable: true }))
      form?.dispatchEvent(new browserWindow.Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(requestCount).toBe(1)

    await act(async () => {
      resolveRequest?.({ ok: true, json: async () => ({}) } as Response)
      await Promise.resolve()
    })
    expect(container.textContent).toContain('Message delivered.')
    expect(responseBodyReads).toBe(0)
  })

  test('blocks submission and shows field errors when validation fails', async () => {
    await act(async () => {
      root.render(React.createElement(ContactMessageForm, { siteKey: 'test-site-key' }))
      await Promise.resolve()
    })

    await act(async () => {
      turnstileCallback?.('verified-token')
    })
    const form = container.querySelector('form')
    expect(form).not.toBeNull()

    await act(async () => {
      form?.dispatchEvent(new browserWindow.Event('submit', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })

    expect(requestCount).toBe(0)
    expect(container.textContent).toContain('Enter your name (at least 2 characters).')
    expect(container.textContent).toContain('Enter a valid email address.')
    expect(container.textContent).toContain('Your message needs at least 10 characters.')
  })
})

function fillField(selector: string, value: string) {
  const element = container.querySelector(selector)
  if (!element) throw new Error(`missing field ${selector}`)
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set
  if (typeof setter !== 'function') throw new Error(`cannot set value for ${selector}`)
  setter.call(element, value)
  element.dispatchEvent(new browserWindow.Event('input', { bubbles: true }))
}
