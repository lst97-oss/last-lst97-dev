import { describe, expect, it } from 'bun:test'
import { createCommentsProxyHandler } from '../../src/server/comments/http-handler'
import type { Logger } from '../../src/server/observability/logger'

const pageUrl = 'https://www.lst97.dev/blog/a-note'

function recordingLogger(events: string[]): Logger {
  const logger = {} as Logger
  logger.debug = () => undefined
  logger.info = () => undefined
  logger.warn = (message) => events.push(message)
  logger.error = (message) => events.push(message)
  logger.child = () => logger
  return logger
}

function harness(overrides: Partial<Parameters<typeof createCommentsProxyHandler>[0]> = {}) {
  const forwarded: string[] = []
  const limited: string[] = []
  const botChecked: string[] = []
  const events: string[] = []
  const handler = createCommentsProxyHandler({
    logger: recordingLogger(events),
    rateLimit: async (request) => {
      limited.push(new URL(request.url).pathname)
      return { allowed: true, retryAfterSeconds: 0 }
    },
    checkBotRequest: async () => {
      botChecked.push('checked')
      return { isBot: false, degraded: false }
    },
    forward: async (request) => {
      forwarded.push(`${request.method} ${new URL(request.url).pathname}`)
      return Response.json({ data: { comment: { id: 'c1' } } })
    },
    ...overrides,
  })
  return { handler, forwarded, limited, botChecked, events }
}

const request = (method: string, path: string, body?: unknown) =>
  new Request(`https://www.lst97.dev/api/site/comments${path}`, {
    method,
    headers: { origin: 'https://www.lst97.dev', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('comments proxy handler', () => {
  it('limits and bot-checks a comment create before forwarding it', async () => {
    const { handler, forwarded, limited, botChecked } = harness()
    const response = await handler({ request: request('POST', '/api/comments', { url: pageUrl }) })
    expect(response.status).toBe(200)
    expect(limited).toEqual(['/api/site/comments/api/comments'])
    expect(botChecked).toEqual(['checked'])
    expect(forwarded).toEqual(['POST /api/site/comments/api/comments'])
  })

  it('rate-limits writes and refuses with a retry-after, without forwarding', async () => {
    const { handler, forwarded } = harness({
      rateLimit: async () => ({ allowed: false, retryAfterSeconds: 42 }),
    })
    const response = await handler({ request: request('PATCH', '/api/comments/abc-123', { bodyMarkdown: 'x' }) })
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('42')
    expect(await response.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } })
    expect(forwarded).toHaveLength(0)
  })

  it('does not limit or bot-check reads', async () => {
    const { handler, forwarded, limited, botChecked } = harness()
    const response = await handler({ request: request('GET', `/api/comments?url=${encodeURIComponent(pageUrl)}`) })
    expect(response.status).toBe(200)
    expect(limited).toHaveLength(0)
    expect(botChecked).toHaveLength(0)
    expect(forwarded).toEqual(['GET /api/site/comments/api/comments'])
  })

  it('refuses a bot-classified create without forwarding it', async () => {
    const { handler, forwarded } = harness({
      checkBotRequest: async () => ({ isBot: true, degraded: false }),
    })
    const response = await handler({ request: request('POST', '/api/comments', { url: pageUrl }) })
    expect(response.status).toBe(403)
    expect(forwarded).toHaveLength(0)
  })

  it('does not run BotID on edits, which the widget never declares', async () => {
    const { handler, botChecked } = harness()
    await handler({ request: request('PATCH', '/api/comments/abc-123', { bodyMarkdown: 'x' }) })
    expect(botChecked).toHaveLength(0)
  })

  it('fails closed when the rate limiter cannot answer', async () => {
    const { handler, forwarded, events } = harness({
      rateLimit: async () => {
        throw new Error('database unavailable')
      },
    })
    const response = await handler({ request: request('POST', '/api/comments', { url: pageUrl }) })
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ error: { code: 'COMMENTS_UNAVAILABLE' } })
    expect(forwarded).toHaveLength(0)
    expect(events).toEqual(['comments.proxy_failed'])
  })

  it('answers unavailable, and logs no request detail, when the forwarder throws', async () => {
    const { handler, events } = harness({
      forward: async () => {
        throw new Error('boom with a secret lck_leak')
      },
    })
    const response = await handler({ request: request('GET', `/api/comments?url=${encodeURIComponent(pageUrl)}`) })
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('lck_leak')
    expect(events).toEqual(['comments.proxy_failed'])
  })
})
