import { describe, expect, it } from 'bun:test'

import { createTurnstileVerifier } from '../../src/server/contact/turnstile-verifier'

const validProviderResponse = {
  success: true,
  challenge_ts: '2026-09-22T12:00:00Z',
  hostname: 'portfolio.example',
  action: 'contact',
  cdata: '',
  'error-codes': [],
}

describe('createTurnstileVerifier', () => {
  it('accepts a successful token only for the contact action and expected hostname', async () => {
    let submittedBody = ''
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async (_input, init) => {
        submittedBody = String(init?.body)
        return Response.json(validProviderResponse)
      },
    })

    const result = await verifier.verify('test-token', 'portfolio.example')
    const submitted = new URLSearchParams(submittedBody)

    expect(result).toBe(true)
    expect(submitted.get('secret')).toBe('test-secret')
    expect(submitted.get('response')).toBe('test-token')
  })

  it('rejects a provider response for another action', async () => {
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => Response.json({ ...validProviderResponse, action: 'login' }),
    })

    expect(await verifier.verify('test-token', 'portfolio.example')).toBe(false)
  })

  it('rejects a provider response for another hostname', async () => {
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => Response.json({ ...validProviderResponse, hostname: 'attacker.example' }),
    })

    expect(await verifier.verify('test-token', 'portfolio.example')).toBe(false)
  })

  it('rejects a provider failure even when action and hostname match', async () => {
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => Response.json({ ...validProviderResponse, success: false }),
    })

    expect(await verifier.verify('test-token', 'portfolio.example')).toBe(false)
  })

  it('treats a malformed provider response as an unavailable verification service', async () => {
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => Response.json(null),
    })

    await expect(verifier.verify('test-token', 'portfolio.example')).rejects.toThrow(
      'Turnstile verification is unavailable',
    )
  })

  it('does not contact Cloudflare when the token is empty', async () => {
    let fetchCount = 0
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => {
        fetchCount += 1
        return Response.json(validProviderResponse)
      },
    })

    expect(await verifier.verify('  ', 'portfolio.example')).toBe(false)
    expect(fetchCount).toBe(0)
  })

  it('replaces provider/network errors with a safe generic error', async () => {
    const verifier = createTurnstileVerifier({
      secret: 'test-secret',
      fetcher: async () => {
        throw new Error('request failed for test-token')
      },
    })

    await expect(verifier.verify('test-token', 'portfolio.example')).rejects.toThrow(
      'Turnstile verification is unavailable',
    )
  })
})
