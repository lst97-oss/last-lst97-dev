import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { CHAT_INPUT_MAX_HEIGHT_PX, ChatComposer } from '../src/components/site/chat/chat-composer'
import type { ChatConversationViewModel } from '../src/components/site/chat/chat-types'

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
})
