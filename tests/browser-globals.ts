import { Window as HappyWindow } from 'happy-dom'

/**
 * Every global a mounted-DOM test needs under `bun test`.
 *
 * `requestAnimationFrame` and `cancelAnimationFrame` are load-bearing, not
 * defensive: Base UI drives every open/close transition through
 * `useAnimationFrame` (`@base-ui/utils/useAnimationFrame`), which reads the
 * global directly. Without them, mounting a Dialog, Checkbox, Accordion or
 * Tabs panel throws `ReferenceError: requestAnimationFrame is not defined`
 * from inside a layout effect — so a component that renders fine in the
 * browser cannot be mounted in a test at all.
 */
const BROWSER_GLOBALS = [
  'window',
  'document',
  'navigator',
  'Element',
  'HTMLElement',
  'Node',
  'MutationObserver',
  'PointerEvent',
  'MouseEvent',
  // Base UI's Combobox measures the popup against the viewport through the
  // global `getComputedStyle`, so a mounted combobox throws without it.
  'getComputedStyle',
  'scrollTo',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'IS_REACT_ACT_ENVIRONMENT',
] as const

export type BrowserGlobal = (typeof BROWSER_GLOBALS)[number]

/** The happy-dom window installed on `globalThis`, so a test can build elements from it. */
export interface InstalledBrowserGlobals {
  window: HappyWindow
  /** Restores every key this module overwrote. Call from `afterAll`. */
  restore: () => void
}

/**
 * Installs the happy-dom window's globals on `globalThis` and returns a handle
 * that restores whatever was there before. Pass the same `window` to every
 * `document.createElement` call so nodes come from the installed document.
 */
export function installBrowserGlobals(options: { url?: string } = {}): InstalledBrowserGlobals {
  const browserWindow = new HappyWindow({ url: options.url ?? 'http://localhost/' })

  // Static, string-keyed lookup of pre-existing descriptors: a record, not a
  // Map, so the key set stays checkable against BROWSER_GLOBALS.
  const originals: Record<BrowserGlobal, PropertyDescriptor | undefined> = Object.fromEntries(
    BROWSER_GLOBALS.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  ) as Record<BrowserGlobal, PropertyDescriptor | undefined>

  const defines: Record<BrowserGlobal, unknown> = {
    window: browserWindow,
    document: browserWindow.document,
    navigator: browserWindow.navigator,
    Element: browserWindow.Element,
    HTMLElement: browserWindow.HTMLElement,
    Node: browserWindow.Node,
    MutationObserver: browserWindow.MutationObserver,
    PointerEvent: browserWindow.PointerEvent,
    MouseEvent: browserWindow.MouseEvent,
    scrollTo: browserWindow.scrollTo.bind(browserWindow),
    getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
    requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
    cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
    IS_REACT_ACT_ENVIRONMENT: true,
  }

  Object.defineProperties(
    globalThis,
    Object.fromEntries(
      BROWSER_GLOBALS.map((key) => [key, { configurable: true, value: defines[key] }]),
    ) as PropertyDescriptorMap,
  )

  return {
    window: browserWindow,
    restore: () => {
      for (const key of BROWSER_GLOBALS) {
        const descriptor = originals[key]
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor)
        } else {
          Reflect.deleteProperty(globalThis, key)
        }
      }
    },
  }
}
