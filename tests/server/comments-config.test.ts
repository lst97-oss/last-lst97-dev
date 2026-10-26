import { describe, expect, it } from 'bun:test'
import { commentsConfigFrom, commentsPublicConfigFrom } from '../../src/server/comments/config'

const base = {
  COMMENTS_API_KEY: 'lck_single_key',
  COMMENTS_BASE_URL: 'https://last-comments.test/',
  COMMENTS_PUBLIC_URL: 'https://last-comments.test/',
  COMMENTS_SITE_KEY: 'lst97-dev',
}

describe('comments config', () => {
  it('uses the one key for the server side, with the service origin trimmed', () => {
    expect(commentsConfigFrom(base)).toEqual({
      baseUrl: 'https://last-comments.test',
      siteKey: 'lst97-dev',
      apiKey: 'lck_single_key',
    })
  })

  it('renders no thread without the site key or without the key', () => {
    expect(commentsConfigFrom({ ...base, COMMENTS_SITE_KEY: undefined })).toBeNull()
    expect(commentsConfigFrom({ ...base, COMMENTS_API_KEY: undefined })).toBeNull()
    expect(commentsPublicConfigFrom({ ...base, COMMENTS_API_KEY: undefined })).toBeNull()
  })
})

describe('comments public config', () => {
  it('points the widget at the comments service, not at a host proxy', () => {
    expect(commentsPublicConfigFrom(base)).toEqual({
      baseUrl: 'https://last-comments.test',
      siteKey: 'lst97-dev',
    })
  })

  it('never exposes the key to the browser', () => {
    const config = commentsPublicConfigFrom(base)
    expect(JSON.stringify(config)).not.toContain('lck_single_key')
  })
})
