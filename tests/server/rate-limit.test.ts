import { describe, expect, it } from 'bun:test'

import { createRateLimiter } from '../../src/server/security/rate-limit'

describe('rate limiter', () => {
  it('allows the configured number of calls and rejects the next within the same fixed window', async () => {
    let count = 0
    const limiter = createRateLimiter(
      {
        consume: async () => ++count,
      },
      { limit: 2, windowMs: 60_000, now: () => 120_000 },
    )

    await expect(limiter.check('chat', 'hashed-client')).resolves.toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 60,
    })
    await expect(limiter.check('chat', 'hashed-client')).resolves.toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 60,
    })
    await expect(limiter.check('chat', 'hashed-client')).resolves.toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    })
  })

  it('uses an independent counter per endpoint bucket', async () => {
    const counts = new Map<string, number>()
    const limiter = createRateLimiter(
      {
        consume: async (bucket, key) => {
          const id = `${bucket}:${key}`
          const value = (counts.get(id) ?? 0) + 1
          counts.set(id, value)
          return value
        },
      },
      { limit: 1, windowMs: 60_000, now: () => 120_000 },
    )
    expect(await limiter.check('chat', 'same')).toMatchObject({ allowed: true })
    expect(await limiter.check('contact', 'same')).toMatchObject({ allowed: true })
  })
})
