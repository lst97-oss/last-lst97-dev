import { describe, expect, it } from 'bun:test'

import { createSiteHealthGetHandler } from '../../src/server/site-health'

describe('site health endpoint', () => {
  it('returns a minimal edge-cacheable success response when the endpoint is healthy', async () => {
    const response = await createSiteHealthGetHandler()()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=60')
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
