import { describe, expect, it } from 'bun:test'

import { vercelClientIpFromRequest } from '../../src/server/security/vercel-client-ip'

function requestWith(headers: Record<string, string>) {
  return new Request('https://example.test', { headers })
}

describe('vercelClientIpFromRequest', () => {
  it('reads one valid IP from x-forwarded-for on Vercel, IPv4 and IPv6', () => {
    expect(vercelClientIpFromRequest(requestWith({ 'x-forwarded-for': '203.0.113.8' }), true)).toBe('203.0.113.8')
    expect(vercelClientIpFromRequest(requestWith({ 'x-forwarded-for': '2001:db8::1' }), true)).toBe('2001:db8::1')
  })

  it('fails closed on chained or malformed values', () => {
    for (const value of ['203.0.113.8, 198.51.100.2', 'not-an-ip', '']) {
      expect(vercelClientIpFromRequest(requestWith({ 'x-forwarded-for': value }), true)).toBeUndefined()
    }
  })

  it('trusts no header outside Vercel unless the operator names one', () => {
    expect(vercelClientIpFromRequest(requestWith({ 'x-forwarded-for': '203.0.113.8' }), false)).toBeUndefined()
    expect(vercelClientIpFromRequest(requestWith({ 'x-real-ip': '198.51.100.2' }), false)).toBeUndefined()
  })

  it('reads the operator-named header outside Vercel', () => {
    expect(vercelClientIpFromRequest(requestWith({ 'x-real-ip': '198.51.100.2' }), false, 'x-real-ip')).toBe(
      '198.51.100.2',
    )
  })

  it('ignores the named header on Vercel and keeps reading x-forwarded-for', () => {
    expect(vercelClientIpFromRequest(requestWith({ 'x-real-ip': '198.51.100.2' }), true, 'x-real-ip')).toBeUndefined()
    expect(
      vercelClientIpFromRequest(
        requestWith({ 'x-forwarded-for': '203.0.113.8', 'x-real-ip': '198.51.100.2' }),
        true,
        'x-real-ip',
      ),
    ).toBe('203.0.113.8')
  })
})
