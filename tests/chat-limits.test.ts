import { describe, expect, it } from 'bun:test'

import { isChatTurnLimitReached, nextCompletedChatTurnCount } from '../src/lib/chat-limits'

describe('chat turn limits', () => {
  it('allows exactly twenty completed turns and then locks the composer', () => {
    expect(isChatTurnLimitReached(19)).toBe(false)
    expect(nextCompletedChatTurnCount(19)).toBe(20)
    expect(isChatTurnLimitReached(20)).toBe(true)
    expect(nextCompletedChatTurnCount(20)).toBe(20)
  })
})
