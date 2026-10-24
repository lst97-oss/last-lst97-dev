import { describe, expect, it } from 'bun:test'
import {
  type CommentsProxyDependencies,
  classifyCommentsRoute,
  commentsPathOf,
  proxyCommentsRequest,
} from '../../src/server/comments/proxy'

const siteOrigin = 'https://www.lst97.dev'
const pageUrl = 'https://www.lst97.dev/blog/a-note'
const upstream = { baseUrl: 'https://comments.test', siteKey: 'lst97-dev', apiKey: 'lck_proxy_secret' }
const visitorId = 'visitor-abcdefgh12345678'

type Call = { url: string; init: RequestInit }

// A fake comments service: records each call and answers with a JSON envelope by default.
function service(respond: () => Response = () => Response.json({ data: { comment: { id: 'c1' } } })) {
  const calls: Call[] = []
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return respond()
  }) as typeof fetch
  return { calls, fetcher }
}

function dependencies(overrides: Partial<CommentsProxyDependencies> = {}): CommentsProxyDependencies {
  return {
    upstream,
    siteOrigin,
    clientId: async () => visitorId,
    fetcher: service().fetcher,
    ...overrides,
  }
}

const proxied = (path: string, init: RequestInit = {}) =>
  new Request(`https://www.lst97.dev/api/site/comments${path}`, init)

const jsonWrite = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  proxied(path, {
    method,
    headers: { origin: siteOrigin, 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

describe('route allowlist', () => {
  it('admits exactly the routes the widget calls', () => {
    expect(classifyCommentsRoute('GET', '/api/auth/get-session')?.operation).toBe('session')
    expect(classifyCommentsRoute('GET', '/api/comments')?.operation).toBe('list')
    expect(classifyCommentsRoute('POST', '/api/comments')?.operation).toBe('create')
    expect(classifyCommentsRoute('PATCH', '/api/comments/abc-123')).toEqual({ operation: 'edit', commentId: 'abc-123' })
    expect(classifyCommentsRoute('DELETE', '/api/comments/abc-123')).toEqual({
      operation: 'delete',
      commentId: 'abc-123',
    })
  })

  it('refuses the vote route even though its path looks like a comment id', () => {
    expect(classifyCommentsRoute('DELETE', '/api/comments/vote')).toBeNull()
    expect(classifyCommentsRoute('PUT', '/api/comments/vote')).toBeNull()
  })

  it('refuses sign-in, moderation, admin and malformed ids', () => {
    expect(classifyCommentsRoute('POST', '/api/auth/sign-in/social')).toBeNull()
    expect(classifyCommentsRoute('GET', '/api/moderation')).toBeNull()
    expect(classifyCommentsRoute('GET', '/api/admin/pages')).toBeNull()
    expect(classifyCommentsRoute('PATCH', '/api/comments/a.b')).toBeNull()
    expect(classifyCommentsRoute('PATCH', '/api/comments/a/b')).toBeNull()
    expect(classifyCommentsRoute('GET', '/api/comments/abc-123')).toBeNull()
  })

  it('reads the upstream path after the host prefix', () => {
    expect(commentsPathOf('https://www.lst97.dev/api/site/comments/api/comments?site=x')).toBe('/api/comments')
  })
})

describe('session probe', () => {
  it('answers null as a guest without contacting the service', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(proxied('/api/auth/get-session'), dependencies({ fetcher }))
    expect(response.status).toBe(200)
    expect(await response.json()).toBeNull()
    expect(calls).toHaveLength(0)
  })
})

describe('reads', () => {
  it('forwards only the allowed query parameters, with the server key and no visitor credentials', async () => {
    const { calls, fetcher } = service()
    const clientIds: string[] = []
    const request = proxied(`/api/comments?url=${encodeURIComponent(pageUrl)}&limit=10&offset=0&site=evil&extra=x`, {
      headers: { cookie: 'better-auth.session=stolen', authorization: 'Bearer stolen', origin: 'https://evil.example' },
    })
    const response = await proxyCommentsRequest(
      request,
      dependencies({
        fetcher,
        clientId: async () => {
          clientIds.push('called')
          return visitorId
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(calls).toHaveLength(1)
    const sent = new URL(calls[0]!.url)
    expect(sent.origin + sent.pathname).toBe('https://comments.test/api/comments')
    expect(sent.searchParams.get('site')).toBe('lst97-dev')
    expect(sent.searchParams.get('url')).toBe(pageUrl)
    expect(sent.searchParams.get('limit')).toBe('10')
    expect(sent.searchParams.get('offset')).toBe('0')
    expect(sent.searchParams.has('extra')).toBe(false)

    const headers = new Headers(calls[0]!.init.headers)
    expect(headers.get('x-api-key')).toBe('lck_proxy_secret')
    expect(headers.get('cookie')).toBeNull()
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('origin')).toBeNull()
    expect(headers.get('x-lc-client')).toBeNull()
    // Reads never need a visitor identity, so a host with no usable address still shows comments.
    expect(clientIds).toHaveLength(0)
  })

  it('refuses a page URL on another origin without contacting the service', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      proxied(`/api/comments?url=${encodeURIComponent('https://attacker.example/x')}`),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
    expect(calls).toHaveLength(0)
  })
})

describe('writes', () => {
  it('builds the create body from an allowlist and ignores the site the client sends', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', {
        site: 'someone-else',
        url: pageUrl,
        authorName: 'Ada',
        bodyMarkdown: 'Hello',
        verificationToken: 'token-1',
        pageKey: 'posts-7',
        editKey: 'not-for-create',
      }),
      dependencies({ fetcher }),
    )

    expect(response.status).toBe(200)
    expect(calls[0]!.url).toBe('https://comments.test/api/comments')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      site: 'lst97-dev',
      url: pageUrl,
      authorName: 'Ada',
      bodyMarkdown: 'Hello',
      verificationToken: 'token-1',
    })
    const headers = new Headers(calls[0]!.init.headers)
    expect(headers.get('x-api-key')).toBe('lck_proxy_secret')
    expect(headers.get('x-lc-client')).toBe(visitorId)
    expect(headers.get('origin')).toBeNull()
  })

  it('refuses a write from another origin, or with no Origin, before the service sees it', async () => {
    for (const origin of ['https://evil.example', undefined]) {
      const { calls, fetcher } = service()
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (origin) headers.origin = origin
      const response = await proxyCommentsRequest(
        proxied('/api/comments', {
          method: 'POST',
          headers,
          body: JSON.stringify({ url: pageUrl, bodyMarkdown: 'Hi', authorName: 'Ada' }),
        }),
        dependencies({ fetcher }),
      )
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } })
      expect(calls).toHaveLength(0)
    }
  })

  it('refuses a write that is not JSON', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      proxied('/api/comments', {
        method: 'POST',
        headers: { origin: siteOrigin, 'content-type': 'text/plain' },
        body: JSON.stringify({ url: pageUrl, bodyMarkdown: 'Hi', authorName: 'Ada' }),
      }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(415)
    expect(calls).toHaveLength(0)
  })

  it('refuses a create whose page URL is on another origin', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', { url: 'https://attacker.example/p', bodyMarkdown: 'Hi', authorName: 'Ada' }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('refuses an oversized body before parsing it', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', { url: pageUrl, bodyMarkdown: 'a'.repeat(20_000), authorName: 'Ada' }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(413)
    expect(calls).toHaveLength(0)
  })

  it('forwards a guest edit with its edit key, and keeps the edit key out of other calls', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      jsonWrite('PATCH', '/api/comments/abc-123', {
        site: 'x',
        bodyMarkdown: 'Edited',
        editKey: 'key-1',
        url: pageUrl,
      }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(200)
    expect(calls[0]!.url).toBe('https://comments.test/api/comments/abc-123')
    expect(calls[0]!.init.method).toBe('PATCH')
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      site: 'lst97-dev',
      bodyMarkdown: 'Edited',
      editKey: 'key-1',
    })
  })

  it('forwards a delete with the site key in the query and no body', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      proxied('/api/comments/abc-123', { method: 'DELETE', headers: { origin: siteOrigin } }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(200)
    expect(calls[0]!.url).toBe('https://comments.test/api/comments/abc-123?site=lst97-dev')
    expect(calls[0]!.init.method).toBe('DELETE')
    expect(calls[0]!.init.body).toBeUndefined()
  })

  it('refuses a write without contacting the service when no visitor identity can be formed', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', { url: pageUrl, bodyMarkdown: 'Hi', authorName: 'Ada' }),
      dependencies({
        fetcher,
        clientId: async () => {
          throw new Error('Trusted client address is unavailable')
        },
      }),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'COMMENTS_UNAVAILABLE' } })
    expect(calls).toHaveLength(0)
  })
})

describe('upstream responses', () => {
  it('passes the service envelope through and drops any cookie it sets', async () => {
    const { fetcher } = service(
      () =>
        new Response(JSON.stringify({ error: { code: 'COMMENT_VERIFICATION_FAILED', message: 'Failed' } }), {
          status: 403,
          headers: { 'content-type': 'application/json', 'set-cookie': 'comments_session=leak; HttpOnly' },
        }),
    )
    const response = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', { url: pageUrl, bodyMarkdown: 'Hi', authorName: 'Ada' }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: { code: 'COMMENT_VERIFICATION_FAILED', message: 'Failed' } })
  })

  it('answers unavailable when the service cannot be reached', async () => {
    const { fetcher } = service()
    const failing = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    const response = await proxyCommentsRequest(proxied('/api/comments?url=' + encodeURIComponent(pageUrl)), {
      ...dependencies({ fetcher }),
      fetcher: failing,
    })
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'COMMENTS_UNAVAILABLE' } })
  })

  it('answers unavailable when the service returns a page instead of JSON', async () => {
    const { fetcher } = service(() => new Response('<html>Bad gateway</html>', { status: 502 }))
    const response = await proxyCommentsRequest(
      proxied('/api/comments?url=' + encodeURIComponent(pageUrl)),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'COMMENTS_UNAVAILABLE' } })
  })
})

describe('authorization seam', () => {
  it('applies a deny decision to reads as well as writes, before the service is contacted', async () => {
    const { calls, fetcher } = service()
    const seen: string[] = []
    const deps = dependencies({
      fetcher,
      authorize: async ({ operation }) => {
        seen.push(operation)
        return { allow: false, status: 403, code: 'FORBIDDEN', message: 'Blocked by policy' }
      },
    })

    const read = await proxyCommentsRequest(proxied('/api/comments?url=' + encodeURIComponent(pageUrl)), deps)
    expect(read.status).toBe(403)
    expect(await read.json()).toMatchObject({ error: { code: 'FORBIDDEN', message: 'Blocked by policy' } })

    const write = await proxyCommentsRequest(
      jsonWrite('POST', '/api/comments', { url: pageUrl, bodyMarkdown: 'Hi', authorName: 'Ada' }),
      deps,
    )
    expect(write.status).toBe(403)
    expect(seen).toEqual(['list', 'create'])
    expect(calls).toHaveLength(0)
  })

  it('lets an allowed request through unchanged', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      proxied('/api/comments?url=' + encodeURIComponent(pageUrl)),
      dependencies({ fetcher, authorize: async () => ({ allow: true }) }),
    )
    expect(response.status).toBe(200)
    expect(calls).toHaveLength(1)
  })
})

describe('unknown routes', () => {
  it('answers 404 for anything the widget does not call', async () => {
    const { calls, fetcher } = service()
    const response = await proxyCommentsRequest(
      proxied('/api/comments/vote?site=x&commentId=y', { method: 'DELETE' }),
      dependencies({ fetcher }),
    )
    expect(response.status).toBe(404)
    expect(calls).toHaveLength(0)
  })
})
