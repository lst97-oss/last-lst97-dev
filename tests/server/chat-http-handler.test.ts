import { describe, expect, it } from 'bun:test'

import { chatContactActionResponseSchema, chatJsonResponseSchema } from '../../src/server/chat/events'
import { createChatPostHandler } from '../../src/server/chat/http-handler'
import type { Logger } from '../../src/server/observability/logger'

const logger: Logger = { debug() {}, info() {}, warn() {}, error() {} }
const testChatTurnstileToken = 'test-chat-turnstile-token'

function createTestChatHandler(dependencies: Parameters<typeof createChatPostHandler>[0]) {
  return createChatPostHandler({
    ...dependencies,
    verifyChatTurnstile: async (token) => token === testChatTurnstileToken,
  })
}

function chatRequestBody(value: Record<string, unknown>) {
  return JSON.stringify({ ...value, turnstileToken: testChatTurnstileToken })
}

const bugReportFields = {
  name: 'Visitor',
  email: 'visitor@example.com',
  summary: 'Filter fails',
  expectedBehaviour: 'Tags narrow the list',
  stepsToReproduce: 'Open projects, tap a tag',
  evidence: '',
  impact: '',
  extraContext: '',
  environment: '',
}

describe('chat POST handler', () => {
  it('returns a clear conflict when the signed conversation has reached twenty turns', async () => {
    const handler = createTestChatHandler({
      send: async () => ({ status: 'turn_limit' }),
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'another question' }),
      }),
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'turn_limit' })
  })

  it('forwards typed contact actions with server-derived hostname and excludes diagnostics metadata', async () => {
    let received: Record<string, unknown> | undefined
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      handleContactAction: async (input) => {
        received = input as unknown as Record<string, unknown>
        return { ok: true, event: { type: 'contact_started', text: 'Fresh session.', contextToken: 'fresh-token' } }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
      getDiagnosticsMetadata: () => ({ ipAddress: '203.0.113.8' }),
    })

    const response = await handler({
      request: new Request('https://chat.example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start_contact', contextToken: 'signed-pending-token' }),
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ event: { type: 'contact_started', contextToken: 'fresh-token' } })
    expect(received).toMatchObject({ action: 'start_contact', expectedHostname: 'chat.example.test' })
    expect(received).not.toHaveProperty('diagnosticsMetadata')
    expect(received).toHaveProperty('requestId')
  })

  it('uses both chat and contact rate limits before the explicit send action', async () => {
    let actionCalls = 0
    let chatLimits = 0
    let contactLimits = 0
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      handleContactAction: async () => {
        actionCalls += 1
        return {
          ok: true,
          event: { type: 'contact_delivery', template: 'email', receiptStatus: 'sent', contextToken: 'done' },
        }
      },
      logger,
      rateLimit: async () => {
        chatLimits += 1
        return { allowed: true, remaining: 1, retryAfterSeconds: 60 }
      },
      contactRateLimit: async () => {
        contactLimits += 1
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 }
      },
    })

    const response = await handler({
      request: new Request('https://chat.example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_send',
          contextToken: 'signed-review-token',
          refinedSubmission: { template: 'email', fields: { email: 'visitor@example.com', message: 'Hello' } },
          originalSubmission: { template: 'email', fields: { email: 'visitor@example.com', message: 'Hello' } },
          turnstileToken: 'turnstile-token',
        }),
      }),
    })

    expect(response.status).toBe(429)
    expect(chatLimits).toBe(1)
    expect(contactLimits).toBe(1)
    expect(actionCalls).toBe(0)
  })

  it('charges the contact rate limit for screening, not only for the send', async () => {
    let actionCalls = 0
    let contactLimits = 0
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      handleContactAction: async () => {
        actionCalls += 1
        return {
          ok: true,
          event: {
            type: 'contact_review',
            refined: true,
            template: 'bug_report',
            originalSubmission: { template: 'bug_report', fields: bugReportFields },
            refinedSubmission: { template: 'bug_report', fields: bugReportFields },
            contextToken: 'review',
          },
        }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
      contactRateLimit: async () => {
        contactLimits += 1
        return { allowed: false, remaining: 0, retryAfterSeconds: 60 }
      },
      verifyContactScreeningTurnstile: async () => true,
    })

    // Screening spends two model calls, so it must not fall back to the
    // 60/hour chat bucket.
    const response = await handler({
      request: new Request('https://chat.example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_form',
          contextToken: 'signed-filling-token',
          fields: { summary: 'Filter fails' },
          turnstileToken: 'screening-token',
        }),
      }),
    })

    expect(response.status).toBe(429)
    expect(contactLimits).toBe(1)
    expect(actionCalls).toBe(0)
  })

  it('refuses to screen a submission that has no verified challenge', async () => {
    let actionCalls = 0
    let screenedCalls = 0
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      handleContactAction: async () => {
        actionCalls += 1
        return {
          ok: true,
          event: {
            type: 'contact_review',
            refined: true,
            template: 'bug_report',
            originalSubmission: { template: 'bug_report', fields: bugReportFields },
            refinedSubmission: { template: 'bug_report', fields: bugReportFields },
            contextToken: 'review',
          },
        }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
      contactRateLimit: async () => ({ allowed: true, remaining: 4, retryAfterSeconds: 60 }),
      verifyContactScreeningTurnstile: async (token) => {
        screenedCalls += 1
        return token === 'valid-screening-token'
      },
    })

    const post = (body: Record<string, unknown>) =>
      handler({
        request: new Request('https://chat.example.test/api/site/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      })

    const missing = await post({ action: 'submit_form', contextToken: 'signed-filling-token', fields: {} })
    expect(missing.status).toBe(400)
    expect(actionCalls).toBe(0)

    const invalid = await post({
      action: 'submit_form',
      contextToken: 'signed-filling-token',
      fields: { summary: 'Filter fails' },
      turnstileToken: 'wrong-token',
    })
    expect(invalid.status).toBe(403)
    expect(actionCalls).toBe(0)

    const valid = await post({
      action: 'submit_form',
      contextToken: 'signed-filling-token',
      fields: { summary: 'Filter fails' },
      turnstileToken: 'valid-screening-token',
    })
    expect(valid.status).toBe(200)
    // Two attempts: the rejected token still reaches siteverify, and only the
    // valid one reaches the workflow.
    expect(screenedCalls).toBe(2)
    expect(actionCalls).toBe(1)
  })

  it('fails closed when the screening verifier is missing', async () => {
    let actionCalls = 0
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      handleContactAction: async () => {
        actionCalls += 1
        return {
          ok: true,
          event: {
            type: 'contact_review',
            refined: true,
            template: 'bug_report',
            originalSubmission: { template: 'bug_report', fields: bugReportFields },
            refinedSubmission: { template: 'bug_report', fields: bugReportFields },
            contextToken: 'review',
          },
        }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
      contactRateLimit: async () => ({ allowed: true, remaining: 4, retryAfterSeconds: 60 }),
    })

    const response = await handler({
      request: new Request('https://chat.example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_form',
          contextToken: 'signed-filling-token',
          fields: { summary: 'Filter fails' },
          turnstileToken: 'any-token',
        }),
      }),
    })

    expect(response.status).toBe(503)
    expect(actionCalls).toBe(0)
  })

  it('accepts a signed context token larger than the former sixty kilobyte limit', async () => {
    let sent = false
    const handler = createTestChatHandler({
      send: async () => {
        sent = true
        return { status: 'replied', text: 'ok', contextToken: 'signed' }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'continue', contextToken: 'x'.repeat(70_000) }),
      }),
    })
    expect(response.status).toBe(200)
    expect(sent).toBe(true)
  })

  it('passes server-derived diagnostics metadata to the chat service without returning it to the browser', async () => {
    let received: { diagnosticsMetadata?: { ipAddress?: string } } | undefined
    const handler = createTestChatHandler({
      send: async (input) => {
        received = input
        return { status: 'replied', text: 'ok', contextToken: 'signed' }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
      getDiagnosticsMetadata: () => ({ ipAddress: '203.0.113.8', browser: { name: 'Chrome' } }),
    })

    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'hello' }),
      }),
    })

    expect(received?.diagnosticsMetadata?.ipAddress).toBe('203.0.113.8')
    expect(await response.json()).not.toHaveProperty('diagnosticsMetadata')
  })

  it('explains an out-of-scope rejection without disclosing classifier internals', async () => {
    const handler = createTestChatHandler({
      send: async () => ({ status: 'blocked', reason: 'out_of_scope' }),
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'test' }),
      }),
    })
    expect(response.status).toBe(422)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe(
      'This chat focuses on Nelson, his projects and published posts, and this website and its features.',
    )
    expect(body.error).not.toMatch(/prompt.inject|harmful|spam/i)
  })

  it('bounds request bodies and rate-limits before calling the chat service', async () => {
    let sent = false
    const handler = createChatPostHandler({
      send: async () => {
        sent = true
        return { status: 'replied', text: 'ok', contextToken: 'signed' }
      },
      logger,
      rateLimit: async () => ({ allowed: false, remaining: 0, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      }),
    })
    expect(response.status).toBe(429)
    expect(sent).toBe(false)
  })

  it('returns only public citation metadata and a retrieval outage indicator', async () => {
    const handler = createTestChatHandler({
      send: async () => ({
        status: 'replied',
        text: 'Nelson builds open-source tools. [K1]',
        contextToken: 'signed',
        citations: [{ id: 'K1', title: 'Profile', url: 'https://github.com/lst97', isPublic: true }],
        knowledgeUnavailable: true,
      }),
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'Who am I?' }),
      }),
    })
    const body = (await response.json()) as Record<string, unknown>
    expect(body.citations).toEqual([{ id: 'K1', title: 'Profile', url: 'https://github.com/lst97', isPublic: true }])
    expect(body.knowledgeUnavailable).toBe(true)
    expect(body).not.toHaveProperty('evidence')
  })

  it('streams SSE frames when the client accepts an event stream', async () => {
    const handler = createTestChatHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      sendStream: async function* () {
        yield { type: 'status', status: 'thinking' }
        yield { type: 'token', delta: 'Hi' }
        yield { type: 'done', contextToken: 'signed' }
      },
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: chatRequestBody({ message: 'Hello' }),
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const text = await response.text()
    expect(text.startsWith('event: status\ndata: {"type":"status","status":"thinking"}\n\n')).toBe(true)
    expect(text).toContain('event: token\ndata: {"type":"token","delta":"Hi"}')
    expect(text).toContain('event: done\ndata: {"type":"done","contextToken":"signed"}')
  })

  it('keeps validation and rate-limit errors as JSON even for stream requests', async () => {
    const handler = createChatPostHandler({
      send: async () => ({ status: 'replied', text: 'unused', contextToken: 'unused' }),
      sendStream: async function* () {
        yield { type: 'done', contextToken: 'unused' }
      },
      logger,
      rateLimit: async () => ({ allowed: false, remaining: 0, retryAfterSeconds: 60 }),
    })
    const response = await handler({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({ message: 'hello' }),
      }),
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('emits JSON bodies the browser contract accepts', async () => {
    // The drift guard between what the handler writes and what the browser
    // parses. Without it, renaming a response field breaks the client with
    // nothing failing until a visitor sees an error banner.
    const handler = createTestChatHandler({
      send: async () => ({
        status: 'replied',
        text: 'A reply.',
        model: 'openai/test-model',
        contextToken: 'signed',
        citations: [{ id: 'K1', title: 'GitHub profile', url: 'https://a.test', isPublic: true }],
      }),
      handleContactAction: async () => ({
        ok: true,
        event: { type: 'contact_started', text: 'Fresh session.', contextToken: 'fresh-token' },
      }),
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const post = (body: unknown) =>
      handler({
        request: new Request('https://example.test/api/site/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      })

    // No `accept: text/event-stream`, so the handler takes the JSON reply path.
    const reply = await post({ message: 'Hello', turnstileToken: testChatTurnstileToken })
    expect(chatJsonResponseSchema.safeParse(await reply.json()).success).toBe(true)

    const turnLimited = createTestChatHandler({
      send: async () => ({ status: 'turn_limit' }),
      logger,
      rateLimit: async () => ({ allowed: true, remaining: 1, retryAfterSeconds: 60 }),
    })
    const limitResponse = await turnLimited({
      request: new Request('https://example.test/api/site/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: chatRequestBody({ message: 'Hello', contextToken: 'signed' }),
      }),
    })
    expect(chatJsonResponseSchema.safeParse(await limitResponse.json()).success).toBe(true)

    const missingToken = await post({ message: 'Hello' })
    expect(chatJsonResponseSchema.safeParse(await missingToken.json()).success).toBe(true)

    const action = await post({ action: 'start_contact', contextToken: 'signed-pending-token' })
    const actionBody = chatContactActionResponseSchema.safeParse(await action.json())
    expect(actionBody.success).toBe(true)
    expect(actionBody.success && actionBody.data.event?.type).toBe('contact_started')
  })
})
