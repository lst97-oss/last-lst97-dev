import { describe, expect, it } from 'bun:test'

import { choice, createSystemOneClient, noul, SystemOneError } from '../../src/server/moderation/system-one-client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const VALID_RESULT = {
  id: 'gen-dec-1',
  model: 'perplexity/pplx-decider-v1.2-20261016',
  provider: 'OpenRouter',
  answers: {
    scope: { type: 'choice', choice: 'owner_projects', confidence: 0.91, probabilities: { owner_projects: 0.91 } },
    refund: { type: 'noul', noul: 0.98 },
  },
  usage: { input_tokens: 275, output_tokens: 20, cost: 0.00003 },
}

describe('System One client', () => {
  it('posts the request to baseUrl + path and parses the envelope including cost', async () => {
    let seenUrl: string | undefined
    let seenInit: RequestInit | undefined
    const client = createSystemOneClient({
      apiKey: 'test-key',
      baseUrl: 'https://openrouter.ai/api/',
      path: '/alpha/decisions',
      fetcher: async (input, init) => {
        seenUrl = String(input)
        seenInit = init
        return jsonResponse(VALID_RESULT)
      },
    })

    const result = await client.systemOne({
      model: 'perplexity/pplx-decider-v1.2',
      state: { message: 'what are your projects?' },
      questions: {
        scope: choice('Which label fits best?', { owner_projects: 'Owned repositories.', uncertain: 'Ambiguous.' }),
        refund: noul('Is this a refund request?'),
      },
    })

    expect(seenUrl).toBe('https://openrouter.ai/api/alpha/decisions')
    expect(seenInit?.method).toBe('POST')
    const headers = new Headers(seenInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-key')
    expect(headers.get('Content-Type')).toBe('application/json')
    const body = JSON.parse(String(seenInit?.body)) as Record<string, unknown>
    expect(body.model).toBe('perplexity/pplx-decider-v1.2')
    expect(body.state).toEqual({ message: 'what are your projects?' })
    expect(body.questions).toEqual({
      scope: {
        type: 'choice',
        instructions: 'Which label fits best?',
        criteria: { owner_projects: 'Owned repositories.', uncertain: 'Ambiguous.' },
      },
      refund: { type: 'noul', instructions: 'Is this a refund request?', criteria: undefined },
    })
    expect(result.model).toBe('perplexity/pplx-decider-v1.2-20261016')
    expect(result.provider).toBe('OpenRouter')
    expect(result.answers).toEqual(VALID_RESULT.answers)
    expect(result.usage).toEqual({ input_tokens: 275, output_tokens: 20, cost: 0.00003 })
  })

  it('forwards provider preferences, session_id, and trace fields', async () => {
    let body: Record<string, unknown> | undefined
    const client = createSystemOneClient({
      apiKey: 'test-key',
      fetcher: async (_input, init) => {
        body = JSON.parse(String(init?.body)) as Record<string, unknown>
        return jsonResponse(VALID_RESULT)
      },
    })

    await client.systemOne({
      model: 'perplexity/pplx-decider-v1.2',
      state: 'hello',
      questions: { refund: noul('Refund?') },
      provider: { sort: 'price' },
      sessionId: 'session-1',
      trace: { trace_name: 'benchmark' },
    })

    expect(body?.provider).toEqual({ sort: 'price' })
    expect(body?.session_id).toBe('session-1')
    expect(body?.trace).toEqual({ trace_name: 'benchmark' })
  })

  it('throws a fixed, categorized error on a non-2xx response without leaking provider text', async () => {
    const client = createSystemOneClient({
      apiKey: 'test-key',
      fetcher: async () => jsonResponse({ error: { message: 'secret provider detail' } }, 404),
    })

    try {
      await client.systemOne({
        model: 'perplexity/pplx-decider-v1.2',
        state: 'x',
        questions: { refund: noul('Refund?') },
      })
      throw new Error('expected the call to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(SystemOneError)
      expect((error as SystemOneError).category).toBe('request_failed')
      expect((error as SystemOneError).message).toBe('System One request failed')
      expect((error as SystemOneError).message).not.toContain('secret provider detail')
    }
  })

  it('rejects a non-JSON body and a shape mismatch as invalid responses', async () => {
    const nonJson = createSystemOneClient({
      apiKey: 'test-key',
      fetcher: async () => new Response('<html>gateway</html>', { status: 200 }),
    })
    const badShape = createSystemOneClient({
      apiKey: 'test-key',
      fetcher: async () =>
        jsonResponse({ model: 'perplexity/pplx-decider-v1.2', usage: { input_tokens: 1, output_tokens: 1 } }),
    })

    await expect(nonJson.systemOne({ model: 'pplx-decider-v1.2', state: 'x', questions: {} })).rejects.toMatchObject({
      category: 'invalid_response',
    })
    await expect(badShape.systemOne({ model: 'pplx-decider-v1.2', state: 'x', questions: {} })).rejects.toMatchObject({
      category: 'invalid_response',
    })
  })

  it('categorizes an aborted request as a timeout and keeps the sanitized message', async () => {
    const client = createSystemOneClient({
      apiKey: 'test-key',
      timeoutMs: 10,
      fetcher: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal
          if (!signal) {
            reject(new Error('missing signal'))
            return
          }
          signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
        }),
    })

    try {
      await client.systemOne({
        model: 'perplexity/pplx-decider-v1.2',
        state: 'x',
        questions: { refund: noul('Refund?') },
      })
      throw new Error('expected the call to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(SystemOneError)
      expect((error as SystemOneError).category).toBe('timeout')
      expect((error as SystemOneError).message).toBe('System One request failed')
    }
  })

  it('rejects an empty key or an invalid timeout at construction', () => {
    expect(() => createSystemOneClient({ apiKey: '   ' })).toThrow('Missing System One API key')
    expect(() => createSystemOneClient({ apiKey: 'test-key', timeoutMs: 0 })).toThrow(
      'System One timeout configuration is invalid',
    )
  })

  it('rejects list-shaped choice criteria instead of sending a malformed question', () => {
    expect(() => choice('Pick one.', ['a', 'b'] as never)).toThrow(
      'Choice criteria must be a map of labels to descriptions.',
    )
  })

  it('retries transient failures and returns the successful attempt', async () => {
    const responses = [
      new Response('bad gateway', { status: 502 }),
      new Response('slow down', { status: 429, headers: { 'retry-after': '1' } }),
      jsonResponse(VALID_RESULT),
    ]
    let calls = 0
    const delays: number[] = []
    const client = createSystemOneClient({
      apiKey: 'test-key',
      maxAttempts: 3,
      retryDelayMs: 10,
      sleep: async (ms) => {
        delays.push(ms)
      },
      fetcher: async () => {
        const response = responses[calls]
        calls += 1
        return response
      },
    })

    const result = await client.systemOne({
      model: 'perplexity/pplx-decider-v1.2',
      state: 'x',
      questions: { refund: noul('Refund?') },
    })

    expect(result.model).toBe(VALID_RESULT.model)
    expect(calls).toBe(3)
    // Two retries: the first jittered around retryDelayMs, the second honoring
    // Retry-After: 1s, capped so one call cannot stall a turn.
    expect(delays).toHaveLength(2)
    expect(delays[0]).toBeGreaterThanOrEqual(10)
    expect(delays[0]).toBeLessThan(20)
    expect(delays[1]).toBeGreaterThanOrEqual(1_000)
    expect(delays[1]).toBeLessThanOrEqual(2_000)
  })

  it('does not retry a non-transient status or an invalid response', async () => {
    let clientErrorCalls = 0
    const clientError = createSystemOneClient({
      apiKey: 'test-key',
      sleep: async () => {},
      fetcher: async () => {
        clientErrorCalls += 1
        return new Response('bad request', { status: 400 })
      },
    })
    await expect(
      clientError.systemOne({
        model: 'perplexity/pplx-decider-v1.2',
        state: 'x',
        questions: { refund: noul('Refund?') },
      }),
    ).rejects.toMatchObject({ category: 'request_failed' })
    expect(clientErrorCalls).toBe(1)

    let invalidCalls = 0
    const invalid = createSystemOneClient({
      apiKey: 'test-key',
      sleep: async () => {},
      fetcher: async () => {
        invalidCalls += 1
        return new Response('<html>gateway</html>', { status: 200 })
      },
    })
    await expect(
      invalid.systemOne({ model: 'perplexity/pplx-decider-v1.2', state: 'x', questions: { refund: noul('Refund?') } }),
    ).rejects.toMatchObject({ category: 'invalid_response' })
    expect(invalidCalls).toBe(1)
  })

  it('gives up after maxAttempts on persistent transient failures', async () => {
    let calls = 0
    const client = createSystemOneClient({
      apiKey: 'test-key',
      maxAttempts: 2,
      retryDelayMs: 0,
      sleep: async () => {},
      fetcher: async () => {
        calls += 1
        return new Response('down', { status: 500 })
      },
    })

    await expect(
      client.systemOne({ model: 'perplexity/pplx-decider-v1.2', state: 'x', questions: { refund: noul('Refund?') } }),
    ).rejects.toMatchObject({ category: 'request_failed' })
    expect(calls).toBe(2)
  })
})
