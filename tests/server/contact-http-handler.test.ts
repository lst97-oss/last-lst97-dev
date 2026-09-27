import { describe, expect, it, spyOn } from 'bun:test'

import { createContactPostHandler } from '../../src/server/contact/http-handler'
import { JsonLogger } from '../../src/server/observability/logger'
import type { Logger, LogFields } from '../../src/server/observability/logger'

function captureLogger(events: Array<{ level: string; event: string; fields?: LogFields }>): Logger {
  return {
    debug: (event, fields) => events.push({ level: 'debug', event, fields }),
    info: (event, fields) => events.push({ level: 'info', event, fields }),
    warn: (event, fields) => events.push({ level: 'warn', event, fields }),
    error: (event, fields) => events.push({ level: 'error', event, fields }),
  }
}

const allowRateLimit = async () => ({ allowed: true, remaining: 4, retryAfterSeconds: 60 })

describe('contact POST handler', () => {
  it('rejects oversized JSON before invoking the submission workflow', async () => {
    let submitted = false
    const handler = createContactPostHandler({
      submitContact: async () => { submitted = true; return { ok: true, receiptStatus: 'sent' } },
      logger: captureLogger([]),
      rateLimit: allowRateLimit,
    })
    const response = await handler({
      request: new Request('https://portfolio.example/api/site/contact', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(17_000) }),
      }),
    })
    expect(response.status).toBe(413)
    expect(submitted).toBe(false)
  })

  it('returns a retry hint when the endpoint rate limit is reached', async () => {
    const handler = createContactPostHandler({
      submitContact: async () => ({ ok: true, receiptStatus: 'sent' }),
      logger: captureLogger([]),
      rateLimit: async () => ({ allowed: false, remaining: 0, retryAfterSeconds: 120 }),
    })
    const response = await handler({
      request: new Request('https://portfolio.example/api/site/contact', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      }),
    })
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('120')
  })

  it('returns only a generic response for rejected contact content or an unavailable screen', async () => {
    for (const result of [
      { ok: false as const, reason: 'moderation' as const },
      { ok: false as const, reason: 'moderation_unavailable' as const },
    ]) {
      const handler = createContactPostHandler({
        submitContact: async () => result,
        logger: captureLogger([]),
        rateLimit: allowRateLimit,
      })
      const response = await handler({ request: new Request('https://portfolio.example/api/site/contact', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      }) })
      expect(response.status).toBe(result.reason === 'moderation' ? 422 : 503)
      const body = await response.text()
      expect(body).not.toContain(result.reason)
      expect(body).not.toContain('spam')
      expect(body).not.toContain('advertising')
    }
  })
  it('accepts a delivered notification even when the receipt could not be sent', async () => {
    const events: Array<{ level: string; event: string; fields?: LogFields }> = []
    const handler = createContactPostHandler({
      submitContact: async () => ({ ok: true, receiptStatus: 'failed' }),
      logger: captureLogger(events),
      rateLimit: allowRateLimit,
    })

    const response = await handler({
      request: new Request('https://portfolio.example/api/site/contact', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1', 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ada', email: 'ada@example.com' }),
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ accepted: true, requestId: 'request-1' })
    expect(events).toContainEqual({
      level: 'info',
      event: 'contact.accepted',
      fields: { requestId: 'request-1', suppressed: false, receiptStatus: 'failed' },
    })
  })

  it('returns a generic 503 when notification delivery fails', async () => {
    const events: Array<{ level: string; event: string; fields?: LogFields }> = []
    const handler = createContactPostHandler({
      submitContact: async () => {
        throw new Error('SMTP failed for ada@example.com: secret provider details')
      },
      logger: captureLogger(events),
      rateLimit: allowRateLimit,
    })

    const response = await handler({
      request: new Request('https://portfolio.example/api/site/contact', {
        method: 'POST',
        headers: { 'x-request-id': 'request-2', 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ada', email: 'ada@example.com' }),
      }),
    })
    const body = await response.text()

    expect(response.status).toBe(503)
    expect(body).toContain('Contact delivery is temporarily unavailable.')
    expect(body).not.toContain('ada@example.com')
    expect(body).not.toContain('secret provider details')
    expect(events).toContainEqual({
      level: 'error',
      event: 'contact.failed',
      fields: { requestId: 'request-2', failureCategory: 'contact_delivery' },
    })
  })

  it('does not log sensitive values from non-Error throws', async () => {
    const sensitiveValues: unknown[] = [
      'SMTP response for ada@example.com: provider-secret',
      { email: 'ada@example.com', response: 'provider-secret' },
    ]

    for (const failure of sensitiveValues) {
      const write = spyOn(console, 'error').mockImplementation(() => {})
      const handler = createContactPostHandler({
        submitContact: async () => { throw failure },
        logger: new JsonLogger('debug'),
        rateLimit: allowRateLimit,
      })

      try {
        await handler({
          request: new Request('https://portfolio.example/api/site/contact', {
            method: 'POST',
            headers: { 'x-request-id': 'request-private', 'content-type': 'application/json' },
            body: '{}',
          }),
        })

        const serialized = String(write.mock.calls[0]?.[0])
        expect(serialized).not.toContain('ada@example.com')
        expect(serialized).not.toContain('provider-secret')
        expect(serialized).toContain('contact.failed')
      } finally {
        write.mockRestore()
      }
    }
  })
})
