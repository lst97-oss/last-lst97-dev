import { describe, expect, it } from 'bun:test'

import { createSiteHealthGetHandler } from '../../src/server/site-health'

describe('site health endpoint', () => {
  it('returns a minimal uncached success response when the endpoint is healthy', async () => {
    const response = await createSiteHealthGetHandler()()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
