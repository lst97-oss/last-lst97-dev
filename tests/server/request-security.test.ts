import { describe, expect, it } from 'bun:test'

import { clientKeyFromRequest } from '../../src/server/security/client-key'

describe('clientKeyFromRequest', () => {
  it('HMACs the Vercel forwarded client IP and never returns the raw value', async () => {
    const request = new Request('https://example.test', { headers: {
      'x-forwarded-for': '203.0.113.8',
    } })
    const key = await clientKeyFromRequest(request, 'a-secret-key-with-at-least-32-characters', true, true)
    expect(key).toMatch(/^[a-f0-9]{64}$/)
    expect(key).not.toContain('203.0.113.8')
  })

  it('fails closed when production has no trusted Vercel IP', async () => {
    await expect(clientKeyFromRequest(
      new Request('https://example.test'),
      'a-secret-key-with-at-least-32-characters',
      true,
      true,
    ))
      .rejects.toThrow()
    await expect(clientKeyFromRequest(
      new Request('https://example.test', { headers: { 'x-forwarded-for': '203.0.113.8' } }),
      'a-secret-key-with-at-least-32-characters',
      true,
      false,
    )).rejects.toThrow()
  })

  it('uses a stable development identity without trusting forwarded headers', async () => {
    const first = new Request('https://example.test', { headers: { 'x-forwarded-for': '203.0.113.8' } })
    const second = new Request('https://example.test', { headers: { 'x-forwarded-for': '192.0.2.7' } })
    await expect(clientKeyFromRequest(first, 'a-secret-key-with-at-least-32-characters', false, false))
      .resolves.toBe(await clientKeyFromRequest(second, 'a-secret-key-with-at-least-32-characters', false, false))
  })
})
