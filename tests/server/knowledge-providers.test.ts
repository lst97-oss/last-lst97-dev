import { describe, expect, it } from 'bun:test'

import { createEmbeddingClient } from '../../src/server/knowledge/embedding-client'
import { createSiliconFlowReranker } from '../../src/server/knowledge/siliconflow-reranker'
import type { KnowledgeCandidate } from '../../src/server/knowledge/types'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const candidates: KnowledgeCandidate[] = Array.from({ length: 10 }, (_, index) => ({
  id: `candidate-${index}`,
  text: `Public portfolio evidence ${index}`,
  isPublic: true,
  source: {
    type: 'profile',
    sourceId: `profile-${index}`,
    title: `Profile source ${index}`,
    url: `https://example.test/profile/${index}`,
  },
}))

describe('createEmbeddingClient', () => {
  it('adds the Qwen query instruction and validates a 1024-dimensional response', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const modelCalls: unknown[] = []
    const client = createEmbeddingClient(
      {
        baseUrl: 'http://127.0.0.1:8787/v1',
        model: 'Qwen/Qwen3-Embedding-0.6B',
        apiKey: 'sidecar-key',
        timeoutMs: 1_000,
      },
      async (input, init) => {
        requestUrl = String(input)
        requestInit = init
        return response({
          data: [{ index: 0, embedding: Array.from({ length: 1024 }, (_, index) => (index === 0 ? 1 : 0)) }],
          model: 'Qwen/Qwen3-Embedding-0.6B',
          usage: { prompt_tokens: 12, total_tokens: 12 },
        })
      },
    )

    const vector = await client.embed({
      text: 'Find my projects',
      kind: 'query',
      onModelCall: (call) => modelCalls.push(call),
    })

    expect(vector).toHaveLength(1024)
    expect(requestUrl).toBe('http://127.0.0.1:8787/v1/embeddings')
    expect(requestInit?.headers).toMatchObject({ authorization: 'Bearer sidecar-key' })
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      input: 'Instruct: Given a question, retrieve relevant passages that answer the question\nQuery: Find my projects',
      model: 'Qwen/Qwen3-Embedding-0.6B',
    })
    expect(JSON.parse(String(requestInit?.body))).not.toHaveProperty('input_type')
    expect(modelCalls).toEqual([
      {
        provider: 'siliconflow',
        operation: 'query_embedding',
        model: 'Qwen/Qwen3-Embedding-0.6B',
        status: 'succeeded',
        inputTokens: 12,
        totalTokens: 12,
      },
    ])
  })

  it('rejects malformed, wrong-sized, and non-finite vector responses', async () => {
    const invalidResponses: unknown[] = [
      { data: [{ index: 0, embedding: [1, 2] }] },
      { data: [{ index: 1, embedding: Array(1024).fill(0) }] },
      { data: [{ index: 0, embedding: Array(1024).fill(null) }] },
    ]

    for (const invalidResponse of invalidResponses) {
      const client = createEmbeddingClient(
        { baseUrl: 'http://localhost:8787/v1', model: 'test', timeoutMs: 1_000 },
        async () => response(invalidResponse),
      )
      await expect(client.embed({ text: 'query', kind: 'query' })).rejects.toThrow(
        'Embedding provider returned an invalid response',
      )
    }
  })

  it('does not expose provider response details for an HTTP failure', async () => {
    const client = createEmbeddingClient(
      { baseUrl: 'http://localhost:8787/v1', model: 'test', timeoutMs: 1_000 },
      async () => response({ error: 'private upstream detail' }, 503),
    )

    await expect(client.embed({ text: 'query', kind: 'query' })).rejects.toThrow('Embedding provider request failed')
    await expect(client.embed({ text: 'query', kind: 'query' })).rejects.not.toThrow('private upstream detail')
  })
})

describe('createSiliconFlowReranker', () => {
  it('sends bounded candidate text and maps top results back to the submitted opaque IDs', async () => {
    let requestUrl = ''
    let requestInit: RequestInit | undefined
    const modelCalls: unknown[] = []
    const reranker = createSiliconFlowReranker({ apiKey: 'siliconflow-key', timeoutMs: 1_000 }, async (input, init) => {
      requestUrl = String(input)
      requestInit = init
      return response({
        model: 'Qwen/Qwen3-Reranker-0.6B',
        usage: { prompt_tokens: 20, total_tokens: 20 },
        results: [
          { index: 7, relevance_score: 0.91 },
          { index: 2, relevance_score: 0.83 },
          { index: 1, relevance_score: 0.72 },
          { index: 5, relevance_score: 0.6 },
        ],
      })
    })

    const ranked = await reranker.rerank({
      query: 'Which projects did I build?',
      candidates,
      limit: 3,
      onModelCall: (call) => modelCalls.push(call),
    })

    expect(requestUrl).toBe('https://api.siliconflow.com/v1/rerank')
    expect(requestInit?.headers).toMatchObject({ authorization: 'Bearer siliconflow-key' })
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      model: 'Qwen/Qwen3-Reranker-0.6B',
      query: 'Which projects did I build?',
      documents: candidates.map(({ text }) => text),
      top_n: 3,
      return_documents: false,
    })
    expect(ranked.map(({ id }) => id)).toEqual(['candidate-7', 'candidate-2', 'candidate-1'])
    expect(ranked[0]?.relevanceScore).toBe(0.91)
    expect(modelCalls).toEqual([
      {
        provider: 'siliconflow',
        operation: 'rerank',
        model: 'Qwen/Qwen3-Reranker-0.6B',
        status: 'succeeded',
        inputTokens: 20,
        totalTokens: 20,
      },
    ])
  })

  it('rejects duplicate or out-of-range provider indices', async () => {
    for (const results of [
      [
        { index: 0, relevance_score: 0.9 },
        { index: 0, relevance_score: 0.8 },
      ],
      [{ index: 10, relevance_score: 0.9 }],
      [{ index: 1, relevance_score: Number.NaN }],
    ]) {
      const reranker = createSiliconFlowReranker({ apiKey: 'key', timeoutMs: 1_000 }, async () => response({ results }))
      await expect(reranker.rerank({ query: 'query', candidates, limit: 3 })).rejects.toThrow(
        'Reranker returned an invalid response',
      )
    }
  })

  it('refuses unbounded candidate sets and sanitizes provider failures', async () => {
    const reranker = createSiliconFlowReranker({ apiKey: 'key', timeoutMs: 1_000 }, async () =>
      response({ private: 'upstream details' }, 503),
    )
    await expect(
      reranker.rerank({ query: 'query', candidates: [...candidates, candidates[0]!], limit: 3 }),
    ).rejects.toThrow('Reranker accepts at most 10 candidates')
    await expect(reranker.rerank({ query: 'query', candidates, limit: 3 })).rejects.toThrow('Reranker request failed')
  })
})
