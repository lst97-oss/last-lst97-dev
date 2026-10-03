import { describe, expect, it } from 'bun:test'
import { HTTPClient } from '@openrouter/sdk'

import type { ChatContactSubmission } from '../../src/lib/chat-contact'
import { createOpenRouterChatContactRefiner } from '../../src/server/contact/chat/openrouter-refiner'

/**
 * `responseFormat: json_object` is not universally supported. A provider that
 * does not implement structured output rejects it with 400, and combined with
 * `provider.requireParameters` the routing layer answers 404 because no endpoint
 * satisfies every requested parameter. Both mean "this model cannot do JSON
 * mode", not "the request was wrong" — without a fallback the whole contact
 * workflow dead-ends on "the report refinement service is temporarily
 * unavailable" for every template.
 *
 * The transport is injected through the SDK's own `HTTPClient`, because the SDK
 * bypasses `globalThis.fetch`: a stub installed there records zero requests and
 * every assertion below would pass without exercising anything.
 */

interface CapturedBody {
  response_format?: { type: string }
  provider?: { requireParameters?: boolean }
}

function stubTransport(responses: Array<{ status: number; body: unknown }>) {
  const bodies: CapturedBody[] = []
  let call = 0
  const httpClient = new HTTPClient({
    fetcher: async (input: RequestInfo | URL, init?: RequestInit) => {
      // The SDK hands the fetcher a `Request`, not `(url, init)`; reading
      // `init.body` alone silently yields an empty string.
      const request = input instanceof Request ? input : undefined
      const raw = String(init?.body ?? '') || (request ? await request.clone().text() : '')
      bodies.push(JSON.parse(raw) as CapturedBody)
      const next = responses[Math.min(call, responses.length - 1)]
      call += 1
      return new Response(JSON.stringify(next?.body ?? {}), {
        status: next?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })
  return { bodies, httpClient }
}

// The SDK's zod schema requires the full OpenRouter usage object. The three
// counters alone are rejected as "Response validation failed", which reads like
// a transport problem and is not one.
const USAGE = {
  prompt_tokens: 12,
  completion_tokens: 8,
  total_tokens: 20,
  cost: 0.000004,
  is_byok: false,
  prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 0, audio_tokens: 0, video_tokens: 0 },
  cost_details: {
    upstream_inference_cost: 0.000004,
    upstream_inference_prompt_cost: 0.000001,
    upstream_inference_completions_cost: 0.000003,
  },
  completion_tokens_details: { reasoning_tokens: 0, image_tokens: 0, audio_tokens: 0 },
}
// The SDK validates the response against a zod schema that requires `id`,
// `created`, `provider`, `system_fingerprint`, `service_tier` and the full
// `usage` object on the root. A minimal well-formed-looking body is rejected as
// "Response validation failed", which reads like a transport fault and is not
// one — so the stub mirrors the real API rather than guessing.
const ROOT = {
  id: 'gen-test',
  object: 'chat.completion',
  created: 1_760_000_000,
  model: 'test/model',
  provider: 'Test Provider',
  system_fingerprint: null,
  service_tier: null,
}

function completion(fields: Record<string, string>) {
  return {
    ...ROOT,
    choices: [
      {
        index: 0,
        logprobs: null,
        finish_reason: 'stop',
        native_finish_reason: 'stop',
        message: { role: 'assistant', content: JSON.stringify({ fields }), refusal: null },
      },
    ],
    usage: USAGE,
  }
}

function proseCompletion(content: string) {
  return {
    ...ROOT,
    choices: [
      {
        index: 0,
        logprobs: null,
        finish_reason: 'stop',
        native_finish_reason: 'stop',
        message: { role: 'assistant', content, refusal: null },
      },
    ],
    usage: USAGE,
  }
}

const submission: ChatContactSubmission = {
  template: 'bug_report',
  fields: {
    name: 'Ada Visitor',
    email: 'ada@example.com',
    summary: 'filter doesnt work',
    expectedBehaviour: 'should show only selected items',
    stepsToReproduce: '1. open the projects page',
    evidence: '',
    impact: '',
    extraContext: '',
    environment: '',
  },
}

const REFINED = {
  summary: 'Filter does not work.',
  expectedBehaviour: 'Only matching projects should appear.',
  stepsToReproduce: '1. Open the projects page.',
}

const PROVIDER_ERROR = { error: { message: 'Provider returned error' } }
const ROUTING_ERROR = { error: { message: 'No endpoints found that can handle the requested parameters.' } }

describe('OpenRouter contact refiner JSON mode', () => {
  it('uses JSON mode when the provider supports it, without a retry', async () => {
    const { bodies, httpClient } = stubTransport([{ status: 200, body: completion(REFINED) }])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    expect(result.ok).toBe(true)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]?.response_format).toEqual({ type: 'json_object' })
  })

  it('retries without JSON mode when the provider rejects it with 404', async () => {
    // The routing 404 arrives when `requireParameters` is combined with an
    // unsupported response format; the retry must drop both, or it fails for the
    // same reason as the first attempt.
    const { bodies, httpClient } = stubTransport([
      { status: 404, body: ROUTING_ERROR },
      { status: 200, body: completion(REFINED) },
    ])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    expect(result.ok).toBe(true)
    expect(bodies).toHaveLength(2)
    expect(bodies[0]?.response_format).toEqual({ type: 'json_object' })
    expect(bodies[1]?.response_format).toBeUndefined()
    expect(bodies[1]?.provider).toBeUndefined()
  })

  it('retries without JSON mode when the provider rejects it with 400', async () => {
    const { bodies, httpClient } = stubTransport([
      { status: 400, body: PROVIDER_ERROR },
      { status: 200, body: completion(REFINED) },
    ])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    expect(result.ok).toBe(true)
    expect(bodies).toHaveLength(2)
    expect(bodies[1]?.response_format).toBeUndefined()
  })
})

describe('OpenRouter contact refiner unusable JSON', () => {
  it('retries once with an explicit correction before giving up on refinement', async () => {
    const { bodies, httpClient } = stubTransport([
      { status: 200, body: proseCompletion('Sure! Here is your summary.') },
      { status: 200, body: completion(REFINED) },
    ])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.refined).toBe(true)
    expect(bodies).toHaveLength(2)
    // The second attempt must actually say what went wrong, or it is just the
    // same request twice.
    expect(bodies[1]?.response_format).toEqual({ type: 'json_object' })
  })

  it('sends the visitor’s own words when every attempt returns unusable JSON', async () => {
    const { bodies, httpClient } = stubTransport([{ status: 200, body: proseCompletion('Not JSON at all.') }])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    // A refinement is a convenience, not a gate: the request must still reach
    // the operator rather than dead-ending the whole contact workflow.
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.refined).toBe(false)
    expect(result.submission).toEqual(submission)
    expect(bodies).toHaveLength(2)
  })

  it('never sends a model answer that failed validation', async () => {
    // The retry succeeding is not enough to be safe: a model that returns a
    // required field as prose, or invents an optional one, must still be
    // rejected in favour of the visitor's original text.
    const { httpClient } = stubTransport([
      { status: 200, body: completion({ summary: 'Filter does not work.' }) },
      { status: 200, body: completion({ summary: 'Filter does not work.' }) },
    ])

    const result = await createOpenRouterChatContactRefiner({ httpClient }).refine(submission)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.refined).toBe(false)
    expect(result.submission.fields).toEqual(submission.fields)
  })
})
