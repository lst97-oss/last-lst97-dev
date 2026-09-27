import { describe, expect, test } from 'bun:test'

import { chatSessionReducer, createInitialChatSessionState } from '../src/components/site/chat/chat-session-state'

describe('chat session reducer', () => {
  test('updates conversation state immutably while preserving contact and status state', () => {
    const initial = createInitialChatSessionState()
    const next = chatSessionReducer(initial, { type: 'conversation/set-message', message: 'How can we collaborate?' })

    expect(next).not.toBe(initial)
    expect(next.conversation).not.toBe(initial.conversation)
    expect(next.conversation.message).toBe('How can we collaborate?')
    expect(next.contact).toBe(initial.contact)
    expect(next.status).toBe(initial.status)
    expect(initial.conversation.message).toBe('')
  })
})
