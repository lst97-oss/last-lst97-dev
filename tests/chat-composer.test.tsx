import { describe, expect, it } from 'bun:test'
import { act, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

import { CHAT_INPUT_MAX_HEIGHT_PX, ChatComposer } from '../src/components/site/chat/chat-composer'
import type { ChatConversationViewModel } from '../src/components/site/chat/chat-types'
import { createSiteStyleWindow } from './site-stylesheet'

function conversation(overrides: Partial<ChatConversationViewModel> = {}): ChatConversationViewModel {
  return {
    message: '',
    completedTurns: 0,
    turnLimitReached: false,
    turnstileResetCount: 0,
    turnstileToken: 'token',
    actions: {
      setMessage: () => {},
      sendMessage: async () => {},
      reset: () => {},
      setTurnstileToken: () => {},
    },
    ...overrides,
  } as ChatConversationViewModel
}

describe('ChatComposer', () => {
  it('renders a multi-line control capped at the grow limit, not an unbounded box', () => {
    // A long draft must never be able to push the suggestions and the security
    // check off the page, so the capped height ships with the markup rather than
    // being applied after the first measurement.
    const html = renderToStaticMarkup(
      <ChatComposer
        conversation={conversation({ message: 'a draft\nsplit\nover lines' })}
        pending={false}
        siteKey="site-key"
      />,
    )

    expect(html).toContain('<textarea')
    expect(html).toContain(`max-height:${CHAT_INPUT_MAX_HEIGHT_PX}px`)
    // The grow loop measures scrollHeight in a layout effect, which never runs
    // during SSR. `rows={1}` is the pre-hydration height, so a draft that is
    // many lines long must not paint as one tall box on the server.
    expect(html).toContain('rows="1"')
  })

  it('names both halves of the Enter contract in the key hint', () => {
    // Enter sends and Shift+Enter newlines are only documented in a code
    // comment, so the visible hint is the sole place a visitor can learn the
    // chord. Asserting each key separately is what stops the row silently
    // losing one half.
    const html = renderToStaticMarkup(
      <ChatComposer conversation={conversation({ message: 'hi' })} pending={false} siteKey="site-key" />,
    )

    expect(html).toContain('os-chat-key-hint')
    expect(html).toContain('data-slot="kbd"')
    expect(html).toContain('ENTER')
    expect(html).toContain('SHIFT')
    // The key is now shown, so the tooltip no longer repeats it.
    expect(html).toContain('title="Send message"')
    expect(html).not.toContain('(Enter)')
  })

  it('keeps the composer disabled while a turn is in flight or the limit is reached', () => {
    const pending = renderToStaticMarkup(
      <ChatComposer conversation={conversation({ message: 'hi' })} pending siteKey="site-key" />,
    )
    expect(pending).toContain('disabled')

    const limited = renderToStaticMarkup(
      <ChatComposer
        conversation={conversation({ message: 'hi', turnLimitReached: true })}
        pending={false}
        siteKey="site-key"
      />,
    )
    expect(limited).toContain('disabled')
    // The turn-limit note replaces the send affordance rather than sitting under
    // a dead control.
    expect(limited).toContain('20-turn limit')
  })

  it('writes no size while hidden, then sizes both controls from real geometry', async () => {
    // `BootGate` holds the whole shell at `display: none` until a passive effect
    // adds `html.js-hydrated`, and that effect necessarily runs after this
    // component's layout effect. With no layout box, `scrollHeight` and the rect
    // both read zero, so the effect used to bake `height: 0px` onto the textarea
    // and 0x0 onto the send button — a collapsed input and a button squeezed to
    // its borders, which typing then appeared to repair. It must skip the write
    // while hidden, and size both controls on the reveal. happy-dom has no
    // layout engine, so the box is stubbed on the element; the values are what
    // the browser actually produced for a laid-out composer (44px single line).
    const { window } = await createSiteStyleWindow()
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })

    // Record every observer so the test can fire the reveal itself: nothing in
    // React's state changes when the boot gate lifts, which is precisely why the
    // composer used to stay collapsed until a draft was typed.
    const observers: { callback: () => void }[] = []
    const saved = {
      window: globalThis.window,
      document: globalThis.document,
      ResizeObserver: globalThis.ResizeObserver,
      actEnv: (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT,
    }

    globalThis.window = window as unknown as typeof globalThis.window
    globalThis.document = window.document as unknown as typeof globalThis.document
    ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        observers.push({ callback })
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    const host = window.document.createElement('div')
    window.document.body.append(host)
    const root = createRoot(host as unknown as Element)
    const element: ReactElement = (
      <ChatComposer conversation={conversation({ message: '' })} pending={false} siteKey="site-key" />
    )

    try {
      await act(async () => {
        root.render(element)
      })

      // happy-dom returns its own nominal element types, so these are cast from
      // `unknown` rather than inferred as lib.dom's.
      const hiddenTextarea = window.document.querySelector('textarea') as unknown as HTMLTextAreaElement | null
      const hiddenButton = window.document.querySelector('.os-chat-send') as unknown as HTMLButtonElement | null
      expect(hiddenTextarea).not.toBeNull()
      expect(hiddenButton).not.toBeNull()
      // No layout box yet (happy-dom reports zero), so nothing may be written —
      // the `rows={1}` fallback has to be what paints.
      expect(hiddenTextarea?.style.height).toBe('')
      expect(hiddenButton?.style.height).toBe('')
      expect(hiddenButton?.style.width).toBe('')

      // Reveal: give the control a real box, then let the observer run.
      const revealedTextarea = hiddenTextarea as HTMLTextAreaElement
      Object.defineProperty(revealedTextarea, 'offsetWidth', { value: 990, configurable: true })
      Object.defineProperty(revealedTextarea, 'offsetHeight', { value: 44, configurable: true })
      Object.defineProperty(revealedTextarea, 'scrollHeight', { value: 44, configurable: true })
      revealedTextarea.getBoundingClientRect = () =>
        ({ width: 990, height: 44, top: 0, left: 0, right: 990, bottom: 44 }) as DOMRect

      await act(async () => {
        for (const observer of observers) observer.callback()
      })

      expect(revealedTextarea.style.height).toBe('44px')
      expect(hiddenButton?.style.height).toBe('44px')
      // The button is square and matched to the textarea, not stretched to it.
      expect(hiddenButton?.style.width).toBe('44px')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      globalThis.window = saved.window
      globalThis.document = saved.document
      globalThis.ResizeObserver = saved.ResizeObserver
      ;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = saved.actEnv
    }
  })
})
