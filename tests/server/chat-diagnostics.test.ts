import { describe, expect, it } from 'bun:test'

import {
  createChatDiagnosticsCapture,
  createDiscordDiagnosticsSink,
  redactDiagnosticsText,
  type ChatDiagnosticsRecord,
} from '../../src/server/observability/chat-diagnostics'

describe('chat diagnostics', () => {
  it('redacts common secrets and contact details before storage', () => {
    const result = redactDiagnosticsText(
      'Bearer abcdefghijklmnop api_key=secret-value eyJabcdefghijk.abcdefghijk.abcdefghijk nelson@example.com',
    )

    expect(result).not.toContain('abcdefghijklmnop')
    expect(result).not.toContain('secret-value')
    expect(result).not.toContain('eyJabcdefghijk')
    expect(result).not.toContain('nelson@example.com')
  })

  it('preserves phone-like values and numeric request identifiers', () => {
    const result = redactDiagnosticsText('request_id=2026-09-26-1234567890 contact +61 400 123 456')

    expect(result).toContain('2026-09-26-1234567890')
    expect(result).toContain('+61 400 123 456')
    expect(result).not.toContain('[REDACTED_PHONE]')
  })

  it('redacts IP addresses and credentials embedded in URLs', () => {
    const result = redactDiagnosticsText(
      'IP 127.0.0.1, IPv6 2001:db8::1, and https://alice:S3cr3t@internal/db',
    )

    expect(result).not.toContain('127.0.0.1')
    expect(result).not.toContain('2001:db8::1')
    expect(result).not.toContain('alice:S3cr3t')
    expect(result).not.toContain('S3cr3t')
    expect(result).toContain('https://[REDACTED_CREDENTIALS]@internal/db')
  })

  it('captures only bounded recent context and redacted excerpts', () => {
    let submitted: ChatDiagnosticsRecord | undefined
    const capture = createChatDiagnosticsCapture({
      traceId: 'turn-1',
      message: 'Bearer abcdefghijklmnop user@example.com',
      history: Array.from({ length: 8 }, (_, index) => ({ role: 'user' as const, content: `message ${index}` })),
      startedAtMs: 10,
    }, { enqueue: (record) => { submitted = record } }, () => 25)

    capture.addModelCall({ provider: 'openrouter', operation: 'response', status: 'succeeded' })
    capture.addJevDecision({ stage: 'tool_routing', decisions: { search_knowledge: { label: 'use', confidence: 0.9 } } })
    capture.finish({ outcome: 'complete', response: 'Assistant response' })

    expect(submitted?.history).toHaveLength(6)
    expect(submitted?.history[0]?.content).toBe('message 2')
    expect(submitted?.query).not.toContain('abcdefghijklmnop')
    expect(submitted?.query).not.toContain('user@example.com')
    expect(submitted?.response).toBe('Assistant response')
    expect(submitted?.modelCalls[0]?.inputTokens).toBeUndefined()
    expect(submitted?.modelCalls[0]?.usageReported).toBe(false)
    expect(submitted?.durationMs).toBe(15)
  })

  it('sends bounded webhook messages without enabling mentions', async () => {
    const payloads: Array<{
      allowed_mentions: { parse: string[] }
      embeds: Array<{ title?: string; description?: string; fields?: Array<{ name: string; value: string }>; color?: number; timestamp?: string; footer?: { text: string } }>
    }> = []
    const sink = createDiscordDiagnosticsSink({
      webhookUrl: 'https://discord.com/api/webhooks/123456/secret-token',
      fetcher: async (input, init) => {
        expect(String(input)).toContain('?wait=true')
        payloads.push(JSON.parse(String(init?.body)))
        return new Response('', { status: 204 })
      },
    })
    const record: ChatDiagnosticsRecord = {
      traceId: 'turn-2',
      startedAtUtc: '2026-09-25T00:00:00.000Z',
      durationMs: 50,
      outcome: 'complete',
      query: 'How do I inspect this token? @everyone Bearer abcdefghijklmnop',
      metadata: {
        ipAddress: '203.0.113.8',
        location: { country: 'AU', region: 'Victoria', city: 'Melbourne', timezone: 'Australia/Melbourne' },
        browser: { name: 'Chrome', version: '140.0.0.0', operatingSystem: 'macOS', device: 'desktop' },
        language: 'en-AU',
        pagePath: '/chat',
      },
      history: [],
      response: 'Try the formatted diagnostic view.',
      modelCalls: [],
      jevDecisions: [],
      ragRetrievals: [{
        query: 'token debugging',
        degraded: false,
        candidates: Array.from({ length: 10 }, (_, index) => ({
          id: `candidate-${index}`,
          sourceId: `repo-${index}`,
          sourceType: 'github_repository',
          title: `Candidate ${index}`,
          isPublic: true,
          excerpt: 'x'.repeat(300),
          retrievedRank: index + 1,
          outcome: 'accepted' as const,
          finalSelected: index < 3,
        })),
      }],
    }

    sink.enqueue(record)
    expect(payloads).toHaveLength(0)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(payloads.length).toBeGreaterThan(1)
    expect(payloads.every(({ allowed_mentions }) => allowed_mentions.parse.length === 0)).toBe(true)
    expect(payloads.every(({ embeds }) => embeds.length === 1)).toBe(true)
    expect(payloads.every(({ embeds }) => {
      const embed = embeds[0]!
      const total = (embed.title?.length ?? 0)
        + (embed.description?.length ?? 0)
        + (embed.footer?.text.length ?? 0)
        + (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0)
      return total <= 6_000
        && (embed.title?.length ?? 0) <= 256
        && (embed.description?.length ?? 0) <= 4_096
        && (embed.fields ?? []).every((field) => field.name.length <= 256 && field.value.length <= 1_024)
    })).toBe(true)
    expect(JSON.stringify(payloads)).toContain('Chat turn · complete')
    expect(JSON.stringify(payloads)).toContain('USER QUERY')
    expect(JSON.stringify(payloads)).toContain('RAG candidate')
    expect(JSON.stringify(payloads)).toContain('203.0.113.8')
    expect(JSON.stringify(payloads)).toContain('Visitor metadata')
    expect(JSON.stringify(payloads)).toContain('140.0.0.0')
    expect(JSON.stringify(payloads)).not.toContain('abcdefghijklmnop')
  })

  it('does not propagate webhook delivery failures into the chat process', async () => {
    const warnings: Array<{ event: string; fields?: Record<string, unknown> }> = []
    const sink = createDiscordDiagnosticsSink({
      webhookUrl: 'https://discord.com/api/webhooks/123456/secret-token',
      fetcher: async () => { throw new Error('private transport detail') },
      wait: async () => {},
      logger: { warn: (event, fields) => warnings.push({ event, fields }) },
    })
    const record: ChatDiagnosticsRecord = {
      traceId: 'turn-3',
      startedAtUtc: '2026-09-25T00:00:00.000Z',
      durationMs: 1,
      outcome: 'complete',
      query: 'hello',
      history: [],
      modelCalls: [],
      jevDecisions: [],
      ragRetrievals: [],
    }

    expect(() => sink.enqueue(record)).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(JSON.stringify(warnings)).not.toContain('private transport detail')
    expect(JSON.stringify(warnings)).not.toContain('secret-token')
  })

  it('honors Discord retry-after once without delaying the chat response', async () => {
    let attempts = 0
    const waits: number[] = []
    const sink = createDiscordDiagnosticsSink({
      webhookUrl: 'https://discord.com/api/webhooks/123456/secret-token',
      fetcher: async () => {
        attempts += 1
        return attempts === 1
          ? new Response('', { status: 429, headers: { 'retry-after': '0.02' } })
          : new Response('', { status: 204 })
      },
      wait: async (durationMs) => { waits.push(durationMs) },
    })
    const record: ChatDiagnosticsRecord = {
      traceId: 'turn-4',
      startedAtUtc: '2026-09-25T00:00:00.000Z',
      durationMs: 1,
      outcome: 'complete',
      query: 'hello',
      history: [],
      modelCalls: [],
      jevDecisions: [],
      ragRetrievals: [],
    }

    sink.enqueue(record)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(attempts).toBe(3)
    expect(waits).toEqual([20])
  })
})
