import { describe, expect, it } from 'bun:test'

import { clientKeyFromRequest } from '../../src/server/security/client-key'

const originSecret = 'a-cloudflare-origin-secret-with-32-chars'

describe('clientKeyFromRequest', () => {
  it('HMACs Cloudflare-provided client IP and never returns the raw value', async () => {
    const request = new Request('https://example.test', { headers: {
      'cf-connecting-ip': '203.0.113.8',
      'x-origin-verification': originSecret,
    } })
    const key = await clientKeyFromRequest(request, 'a-secret-key-with-at-least-32-characters', true, originSecret)
    expect(key).toMatch(/^[a-f0-9]{64}$/)
    expect(key).not.toContain('203.0.113.8')
  })

  it('fails closed when a production request is not identified by Cloudflare', async () => {
    await expect(clientKeyFromRequest(new Request('https://example.test'), 'a-secret-key-with-at-least-32-characters', true))
      .rejects.toThrow()
  })

  it('uses a stable development identity without trusting forwarded headers', async () => {
    const first = new Request('https://example.test', { headers: { 'x-forwarded-for': '203.0.113.8' } })
    const second = new Request('https://example.test', { headers: { 'x-forwarded-for': '192.0.2.7' } })
    await expect(clientKeyFromRequest(first, 'a-secret-key-with-at-least-32-characters', false))
      .resolves.toBe(await clientKeyFromRequest(second, 'a-secret-key-with-at-least-32-characters', false))
  })
})
