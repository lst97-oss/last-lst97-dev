import { describe, expect, it } from 'bun:test'

import { OPENROUTER_CHAT_REQUEST_OPTIONS } from '../../src/server/chat/openrouter-retry-policy'

describe('OpenRouter chat retry policy', () => {
  it('retries rate limits with bounded backoff while respecting the SDK Retry-After behavior', () => {
    expect(OPENROUTER_CHAT_REQUEST_OPTIONS).toEqual({
      retryCodes: ['429', '5XX'],
      retries: {
        strategy: 'backoff',
        backoff: {
          initialInterval: 1_000,
          maxInterval: 8_000,
          exponent: 2,
          maxElapsedTime: 15_000,
        },
        retryConnectionErrors: true,
      },
    })
  })
})
