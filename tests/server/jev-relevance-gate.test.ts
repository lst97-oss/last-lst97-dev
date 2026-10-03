import { describe, expect, it } from 'bun:test'

import { createJevKnowledgeRelevanceGate } from '../../src/server/knowledge/jev-relevance-gate'
import type { KnowledgeCandidate } from '../../src/server/knowledge/types'

const candidate: KnowledgeCandidate = {
  id: 'document-1',
  text: 'Direct evidence',
  isPublic: true,
  source: { type: 'project', sourceId: 'project-1', title: 'Direct project', url: 'https://example.test/project-1' },
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('createJevKnowledgeRelevanceGate', () => {
  it('sends one bounded SystemOne request and returns the two Noul probabilities', async () => {
    let requestUrl = ''
    let requestBody: Record<string, unknown> | undefined
    const modelCalls: unknown[] = []
    const gate = createJevKnowledgeRelevanceGate({ apiKey: 'test-server-key' }, async (input, init) => {
      requestUrl = String(input)
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return response({
        model: 'jev-1.13',
        answers: {
          is_relevant: { type: 'noul', noul: 0.82 },
          contains_answer_evidence: { type: 'noul', noul: 0.91 },
        },
        usage: { input_tokens: 1, output_tokens: 1 },
      })
    })

    const scores = await gate.assess({
      query: 'What does the direct project do?',
      candidate,
      onModelCall: (call) => modelCalls.push(call),
    })

    expect(requestUrl).toEndWith('/v1/systemone')
    expect(requestBody).toMatchObject({ model: 'jev-latest' })
    expect(requestBody?.questions).toMatchObject({
      is_relevant: { type: 'noul' },
      contains_answer_evidence: { type: 'noul' },
    })
    expect(Object.keys(requestBody?.questions as Record<string, unknown>)).toEqual([
      'is_relevant',
      'contains_answer_evidence',
    ])
    expect(modelCalls).toEqual([
      {
        provider: 'jev',
        operation: 'rag_relevance',
        model: 'jev-1.13',
        status: 'succeeded',
        inputTokens: 1,
        outputTokens: 1,
      },
    ])
    expect(requestBody?.state).toEqual({
      query: 'What does the direct project do?',
      document: {
        id: 'document-1',
        title: 'Direct project',
        source_type: 'project',
        text: 'Direct evidence',
      },
    })
    expect(scores).toEqual({ isRelevantProbability: 0.82, answerEvidenceProbability: 0.91 })
  })

  it('truncates query and document state fields before sending them to Jev', async () => {
    let requestBody: Record<string, unknown> | undefined
    const gate = createJevKnowledgeRelevanceGate({ apiKey: 'test-server-key' }, async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
      return response({
        model: 'jev-latest',
        answers: {
          is_relevant: { type: 'noul', noul: 0.7 },
          contains_answer_evidence: { type: 'noul', noul: 0.7 },
        },
        usage: { input_tokens: 1, output_tokens: 1 },
      })
    })

    await gate.assess({
      query: 'q'.repeat(2_100),
      candidate: {
        ...candidate,
        id: 'i'.repeat(250),
        text: 't'.repeat(6_100),
        source: { ...candidate.source, title: 'T'.repeat(550) },
      },
    })

    const state = requestBody?.state as { query: string; document: { id: string; title: string; text: string } }
    expect(state.query).toHaveLength(2_000)
    expect(state.document.id).toHaveLength(200)
    expect(state.document.title).toHaveLength(500)
    expect(state.document.text).toHaveLength(6_000)
  })

  it('rejects malformed decisions with a sanitized error', async () => {
    for (const answers of [
      { is_relevant: { type: 'noul', noul: 1.1 }, contains_answer_evidence: { type: 'noul', noul: 0.9 } },
      { is_relevant: { type: 'noul', noul: 0.9 }, contains_answer_evidence: { type: 'noul', noul: Number.NaN } },
      { is_relevant: { type: 'choice', choice: 'yes' }, contains_answer_evidence: { type: 'noul', noul: 0.9 } },
      { is_relevant: { type: 'noul', noul: 0.9 } },
    ]) {
      const gate = createJevKnowledgeRelevanceGate({ apiKey: 'test-server-key' }, async () =>
        response({
          model: 'jev-latest',
          answers,
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      )

      await expect(gate.assess({ query: 'question', candidate })).rejects.toThrow(
        'Jev knowledge relevance decision failed',
      )
    }
  })

  it('sanitizes provider failures and rejects an empty API key', async () => {
    const gate = createJevKnowledgeRelevanceGate({ apiKey: 'test-server-key' }, async () =>
      response({ private: 'provider detail' }, 503),
    )

    await expect(gate.assess({ query: 'question', candidate })).rejects.toThrow(
      'Jev knowledge relevance decision failed',
    )
    expect(() => createJevKnowledgeRelevanceGate({ apiKey: '  ' })).toThrow(
      'Missing required server environment variable: TYPESAFE_API_KEY',
    )
  })
})
