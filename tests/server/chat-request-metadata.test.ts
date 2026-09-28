import { describe, expect, it } from 'bun:test'

import { chatRequestMetadataFromRequest } from '../../src/server/observability/chat-request-metadata'

describe('chat request diagnostics metadata', () => {
  it('collects trusted Vercel IP and coarse location with browser metadata', () => {
    const metadata = chatRequestMetadataFromRequest(new Request('https://example.test/api/site/chat', {
      headers: {
        'x-forwarded-for': '203.0.113.8',
        'x-vercel-ip-country': 'AU',
        'x-vercel-ip-country-region': 'VIC',
        'x-vercel-ip-city': 'Melbourne',
        'x-vercel-ip-timezone': 'Australia/Melbourne',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'accept-language': 'en-AU,en;q=0.9',
        referer: 'https://portfolio.example/chat?private=query#reply',
      },
    }), { production: true, vercelRuntime: true })

    expect(metadata).toEqual({
      ipAddress: '203.0.113.8',
      location: { country: 'AU', regionCode: 'VIC', city: 'Melbourne', timezone: 'Australia/Melbourne' },
      browser: { name: 'Chrome', version: '140.0.0.0', operatingSystem: 'macOS', device: 'desktop' },
      language: 'en-AU,en;q=0.9',
      pagePath: '/chat',
    })
  })

  it('does not trust forwarded IP or location headers outside Vercel runtime', () => {
    const metadata = chatRequestMetadataFromRequest(new Request('https://example.test/api/site/chat', {
      headers: {
        'x-forwarded-for': '198.51.100.24',
        'x-vercel-ip-country': 'US',
        'user-agent': 'Mozilla/5.0 Firefox/128.0',
      },
    }), { production: true, vercelRuntime: false })

    expect(metadata?.ipAddress).toBeUndefined()
    expect(metadata?.location).toBeUndefined()
    expect(metadata?.browser?.name).toBe('Firefox')
  })

  it('accepts a trusted IPv6 client address', () => {
    const metadata = chatRequestMetadataFromRequest(new Request('https://example.test/api/site/chat', {
      headers: { 'x-forwarded-for': '2001:db8::1', 'x-vercel-ip-country': 'AU' },
    }), { production: true, vercelRuntime: true })

    expect(metadata?.ipAddress).toBe('2001:db8::1')
    expect(metadata?.location?.country).toBe('AU')
  })

  it('omits malformed trusted IP values and never captures precise coordinates or referrer query data', () => {
    const metadata = chatRequestMetadataFromRequest(new Request('https://example.test/api/site/chat', {
      headers: {
        'x-forwarded-for': '203.0.113.8, 192.0.2.3',
        'x-vercel-ip-latitude': '-37.8136',
        'x-vercel-ip-longitude': '144.9631',
        referer: 'https://portfolio.example/chat?token=secret#answer',
      },
    }), { production: true, vercelRuntime: true })

    expect(metadata?.ipAddress).toBeUndefined()
    expect(metadata?.pagePath).toBe('/chat')
    expect(JSON.stringify(metadata)).not.toContain('144.9631')
    expect(JSON.stringify(metadata)).not.toContain('token=secret')
  })
})
