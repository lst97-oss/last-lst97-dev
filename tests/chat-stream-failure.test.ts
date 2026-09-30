import { describe, expect, it } from 'bun:test'

import { AUTHORED_CHAT_MESSAGES, CHAT_OFFLINE_MESSAGE, safeChatFailureMessage } from '../src/lib/chat-limits'

// The chat hook itself needs a live SSE endpoint and a Turnstile token, so
// these assert the exported decision function it uses to render failures.
describe('chat stream failure messages', () => {
  it('never renders a transport error verbatim', () => {
    // When an SSE body is torn down mid-stream the runtime rejects the reader
    // with these messages. They are plumbing, and showing one to a visitor is
    // the bug: "Error in input stream" is what used to appear in the chat.
    for (const message of ['Error in input stream', 'terminated', 'network error', 'Failed to fetch']) {
      expect(safeChatFailureMessage(new TypeError(message))).toBe(CHAT_OFFLINE_MESSAGE)
    }
  })

  it('collapses a non-Error throw to the offline message', () => {
    expect(safeChatFailureMessage(undefined)).toBe(CHAT_OFFLINE_MESSAGE)
    expect(safeChatFailureMessage('Error in input stream')).toBe(CHAT_OFFLINE_MESSAGE)
    expect(safeChatFailureMessage({ message: CHAT_OFFLINE_MESSAGE })).toBe(CHAT_OFFLINE_MESSAGE)
  })

  it('still shows the server-authored copy it is entitled to', () => {
    // Collapsing everything would be a second bug: the visitor has to learn
    // that the security check expired, or that they are being rate limited.
    for (const message of AUTHORED_CHAT_MESSAGES) {
      expect(safeChatFailureMessage(new Error(message))).toBe(message)
    }
  })

  it('does not author a message the server never sends', () => {
    // Guards the allowlist against drift in both directions.
    expect(AUTHORED_CHAT_MESSAGES.has('Complete the security check and send your message again.')).toBe(true)
    expect(AUTHORED_CHAT_MESSAGES.has('Too many requests. Please try again later.')).toBe(true)
    expect(AUTHORED_CHAT_MESSAGES.has('Request is too large.')).toBe(true)
    expect(AUTHORED_CHAT_MESSAGES.has('Error in input stream')).toBe(false)
  })

  it('routes the client failure path through the sanitizer', async () => {
    // The cases above cover the decision function, but the actual bug was the
    // call site: `use-chat-stream.ts` rendered `requestError.message`
    // directly. Only a source-level assertion catches that specific
    // regression, so pin the dispatch and forbid the raw form.
    const source = await Bun.file(
      new URL('../src/components/site/chat/use-chat-stream.ts', import.meta.url),
    ).text()

    expect(source).toContain('error: safeChatFailureMessage(requestError)')
    expect(source).not.toMatch(/error: requestError instanceof Error \? requestError\.message/)
  })
})
