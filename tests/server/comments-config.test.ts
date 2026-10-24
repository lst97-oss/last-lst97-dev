import { describe, expect, it } from 'bun:test'
import { commentsConfigFrom, commentsProxyConfigFrom, commentsPublicConfigFrom } from '../../src/server/comments/config'

const base = {
  COMMENTS_API_KEY: 'lck_pages_secret',
  COMMENTS_BASE_URL: 'https://last-comments.test/',
  COMMENTS_PROXY_API_KEY: undefined,
  COMMENTS_SITE_KEY: 'lst97-dev',
  COMMENTS_TURNSTILE_SITE_KEY: '0x-public',
}

describe('comments public config', () => {
  it('points the widget at the comments service when no proxy key is set', () => {
    expect(commentsPublicConfigFrom(base)).toEqual({
      baseUrl: 'https://last-comments.test',
      siteKey: 'lst97-dev',
      turnstileSiteKey: '0x-public',
    })
  })

  it('points the widget at this host when the proxy key is set, so the service origin never reaches the page', () => {
    expect(commentsPublicConfigFrom({ ...base, COMMENTS_PROXY_API_KEY: 'lck_proxy' })).toEqual({
      baseUrl: '/api/site/comments',
      siteKey: 'lst97-dev',
      turnstileSiteKey: '0x-public',
    })
  })

  it('stays off until a site key is set', () => {
    expect(commentsPublicConfigFrom({ ...base, COMMENTS_SITE_KEY: undefined })).toBeNull()
  })
})

describe('comments proxy config', () => {
  it('uses the proxy key, never the page-registration key', () => {
    expect(commentsProxyConfigFrom({ ...base, COMMENTS_PROXY_API_KEY: 'lck_proxy' })).toEqual({
      baseUrl: 'https://last-comments.test',
      siteKey: 'lst97-dev',
      apiKey: 'lck_proxy',
    })
  })

  it('is off without the proxy key, even when the page-registration key is set', () => {
    expect(commentsProxyConfigFrom(base)).toBeNull()
  })

  it('keeps the page-registration config separate from the proxy', () => {
    expect(commentsConfigFrom({ ...base, COMMENTS_PROXY_API_KEY: 'lck_proxy' })).toEqual({
      baseUrl: 'https://last-comments.test',
      siteKey: 'lst97-dev',
      apiKey: 'lck_pages_secret',
    })
  })
})
