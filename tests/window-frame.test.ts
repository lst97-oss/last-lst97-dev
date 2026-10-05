import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { installBrowserGlobals } from './browser-globals'

const { window: browserWindow, restore: restoreBrowserGlobals } = installBrowserGlobals()

const React = await import('react')
const { act } = React
const { createRoot } = await import('react-dom/client')
const { createMemoryHistory, createRootRoute, createRouter, RouterProvider } = await import('@tanstack/react-router')
const { WindowFrame } = await import('../src/components/site/window-frame')
const { focusWindow, osStore, resetOsState, toggleMinimizeWindow } = await import('../src/lib/os-store')

const windowId = 'operator.profile'
const rootRoute = createRootRoute({
  component: () => React.createElement(WindowFrame, { title: windowId, windowId, children: 'Profile content' }),
})
const router = createRouter({
  routeTree: rootRoute,
  history: createMemoryHistory({ initialEntries: ['/'] }),
})

let container: HTMLDivElement
let browserContainer: ReturnType<typeof browserWindow.document.createElement>
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  resetOsState()
  focusWindow(windowId)
  toggleMinimizeWindow(windowId)
  browserContainer = browserWindow.document.createElement('div')
  container = browserContainer as unknown as HTMLDivElement
  browserWindow.document.body.append(browserContainer)
  root = createRoot(container)
  await act(async () => root.render(React.createElement(RouterProvider, { router })))
})

afterEach(async () => {
  await act(async () => root.unmount())
  browserContainer.remove()
  resetOsState()
})

afterAll(() => {
  restoreBrowserGlobals()
})

describe('window frame controls', () => {
  test('allows a window to hide selected controls while keeping the others', async () => {
    const customWindowId = 'welcome.exe'
    focusWindow(customWindowId)

    const customRoute = createRootRoute({
      component: () =>
        React.createElement(WindowFrame, {
          title: customWindowId,
          windowId: customWindowId,
          controls: { close: false },
          children: 'Welcome content',
        }),
    })
    const customRouter = createRouter({
      routeTree: customRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    const customBrowserContainer = browserWindow.document.createElement('div')
    const customContainer = customBrowserContainer as unknown as HTMLDivElement
    browserWindow.document.body.append(customBrowserContainer)
    const customRoot = createRoot(customContainer)

    try {
      await act(async () => customRoot.render(React.createElement(RouterProvider, { router: customRouter })))

      expect(customContainer.querySelector(`[aria-label="Close ${customWindowId}"]`)).toBeNull()
      expect(customContainer.querySelector(`[aria-label="Minimize ${customWindowId}"]`)).not.toBeNull()
      expect(customContainer.querySelector(`[aria-label="Maximize ${customWindowId}"]`)).not.toBeNull()
    } finally {
      await act(async () => customRoot.unmount())
      customBrowserContainer.remove()
    }
  })

  test('restores a minimized window when its minimize control is clicked again', async () => {
    const restoreControl = container.querySelector<HTMLButtonElement>(`button[aria-label="Restore ${windowId}"]`)
    expect(restoreControl).not.toBeNull()
    expect(container.querySelector(`[aria-label="Close ${windowId}"]`)).not.toBeNull()

    await act(async () => {
      restoreControl?.dispatchEvent(
        new browserWindow.PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
        }) as unknown as PointerEvent,
      )
      restoreControl?.focus()
      restoreControl?.dispatchEvent(
        new browserWindow.MouseEvent('click', { bubbles: true, cancelable: true }) as unknown as MouseEvent,
      )
    })

    expect(osStore.state.windowModes[windowId]).toBe('normal')
    expect(container.querySelector('.window-frame')?.classList.contains('is-minimized')).toBe(false)
  })

  test('renders the children through a themed scroll area only when scrollable', async () => {
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeNull()
    expect(container.querySelector('.window-content')?.textContent).toBe('Profile content')

    const scrollRoute = createRootRoute({
      component: () =>
        React.createElement(WindowFrame, {
          title: 'note.detail',
          windowId: 'note.detail',
          scrollable: true,
          children: 'Detail body',
        }),
    })
    const scrollRouter = createRouter({
      routeTree: scrollRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    const scrollContainer = browserWindow.document.createElement('div')
    browserWindow.document.body.append(scrollContainer)
    const scrollRoot = createRoot(scrollContainer as unknown as HTMLDivElement)

    try {
      await act(async () => scrollRoot.render(React.createElement(RouterProvider, { router: scrollRouter })))

      const content = scrollContainer.querySelector('.window-content')
      // The cap class is applied by the prop, not by the caller: forgetting it
      // would leave the themed viewport unbounded and the page scrolling.
      expect(scrollContainer.querySelector('.window-frame--scroll')).not.toBeNull()
      expect(content?.classList.contains('window-content--scroll')).toBe(true)
      expect(content?.querySelector('[data-slot="scroll-area"]')).not.toBeNull()
      expect(content?.querySelector('[data-slot="scroll-area-viewport"]')?.textContent).toBe('Detail body')
    } finally {
      await act(async () => scrollRoot.unmount())
      scrollContainer.remove()
    }
  })

  test('keeps the themed scroll area on a mobile viewport', async () => {
    // The shell root is `h-dvh overflow-hidden`, so the document can never
    // scroll: a window taller than the viewport is reachable only through its
    // own ScrollArea. Skipping it on mobile left long detail pages running off
    // the bottom of a clipped shell with no way to reach the rest.
    browserWindow.happyDOM.setViewport({ width: 390, height: 844 })
    const originalInnerWidth = browserWindow.innerWidth
    Object.defineProperty(browserWindow, 'innerWidth', { configurable: true, value: 390 })

    const mobileRoute = createRootRoute({
      component: () =>
        React.createElement(WindowFrame, {
          title: 'note.mobile',
          windowId: 'note.mobile',
          scrollable: true,
          children: 'Long article body',
        }),
    })
    const mobileRouter = createRouter({
      routeTree: mobileRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    const mobileContainer = browserWindow.document.createElement('div')
    browserWindow.document.body.append(mobileContainer)
    const mobileRoot = createRoot(mobileContainer as unknown as HTMLDivElement)

    try {
      await act(async () => mobileRoot.render(React.createElement(RouterProvider, { router: mobileRouter })))

      const frame = mobileContainer.querySelector('.window-frame')
      expect(frame?.classList.contains('window-frame--scroll')).toBe(true)
      expect(frame?.querySelector('[data-slot="scroll-area"]')).not.toBeNull()
      expect(frame?.querySelector('[data-slot="scroll-area-viewport"]')?.textContent).toBe('Long article body')
    } finally {
      await act(async () => mobileRoot.unmount())
      mobileContainer.remove()
      Object.defineProperty(browserWindow, 'innerWidth', { configurable: true, value: originalInnerWidth })
    }
  })
})
