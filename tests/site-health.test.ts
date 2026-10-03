import { describe, expect, it } from 'bun:test'

import { fetchSiteHealthStatus, siteHealthLabel } from '../src/lib/site-health'

describe('site health status', () => {
  it('reports online only for a successful health response', async () => {
    const status = await fetchSiteHealthStatus(async (input, init) => {
      expect(input).toBe('/api/site/health')
      expect(init?.cache).toBe('no-store')
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    })

    expect(status).toBe('online')
  })

  it('reports offline for failed HTTP, malformed payload, or network responses', async () => {
    const failedHttp = await fetchSiteHealthStatus(async () => new Response(null, { status: 503 }))
    const malformedPayload = await fetchSiteHealthStatus(
      async () => new Response(JSON.stringify({ status: 'degraded' }), { status: 200 }),
    )
    const networkFailure = await fetchSiteHealthStatus(async () => {
      throw new Error('unavailable')
    })

    expect(failedHttp).toBe('offline')
    expect(malformedPayload).toBe('offline')
    expect(networkFailure).toBe('offline')
  })

  it('uses clear labels for checking, online, and offline states', () => {
    expect(siteHealthLabel('checking')).toBe('CHECKING')
    expect(siteHealthLabel('online')).toBe('ONLINE')
    expect(siteHealthLabel('offline')).toBe('OFFLINE')
  })
})
