import { describe, expect, it } from 'bun:test'
import type { ChatContextSigner } from '../../src/server/chat/context-signer'
import { createChatService } from '../../src/server/chat/service'
import type { ChatResponderInput, ChatStreamingResponder } from '../../src/server/chat/types'
import { createRetrieveKnowledge } from '../../src/server/knowledge/retrieve'
import type { KnowledgeCandidate, RankedKnowledgeCandidate } from '../../src/server/knowledge/types'
import type { ModerationService } from '../../src/server/moderation/service'

const directCandidate: KnowledgeCandidate = {
  id: 'direct-project',
  text: 'The direct project is a Cantonese caption alignment tool.',
  isPublic: true,
  source: {
    type: 'github-private',
    sourceId: 'lst97/direct-project',
    title: 'Direct project',
    url: 'https://github.com/lst97/direct-project',
  },
}

const unrelatedCandidate: KnowledgeCandidate = {
  id: 'same-topic-metadata',
  text: 'Repository metadata: TypeScript, PostgreSQL, and Payload are used in the project.',
  isPublic: true,
  source: {
    type: 'github',
    sourceId: 'lst97/unrelated-project',
    title: 'Unrelated project',
    url: 'https://github.com/lst97/unrelated-project',
  },
}

function retrievalHarness() {
  return createRetrieveKnowledge({
    embedding: { embed: async () => [1, 0, 0, 0] },
    repository: {
      search: async () => [unrelatedCandidate, directCandidate],
      listOwnedProjects: async () => ({ projects: [], hasMore: false, matchingTotal: 0, breakdown: [] }),
    },
    reranker: {
      rerank: async ({ candidates }): Promise<RankedKnowledgeCandidate[]> =>
        [
          { ...directCandidate, relevanceScore: 0.95 },
          { ...unrelatedCandidate, relevanceScore: 0.65 },
        ].filter((candidate) => candidates.some(({ id }) => id === candidate.id)),
    },
    relevanceGate: {
      assess: async ({ candidate }) =>
        candidate.id === directCandidate.id
          ? { isRelevantProbability: 0.96, answerEvidenceProbability: 0.94 }
          : { isRelevantProbability: 0.72, answerEvidenceProbability: 0.18 },
    },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
  })
}

function dependencies() {
  return {
    moderation: {
      checkContact: async () => ({ allowed: true }),
      checkChat: async () => ({ allowed: true }),
    } as ModerationService,
    contextSigner: {
      verify: async () => ({ messages: [], topicAnchors: [] }),
      sign: async () => 'signed',
    } as ChatContextSigner,
    knowledge: retrievalHarness(),
    knowledgeEnabled: true,
    planner: {
      planNextStep: async ({ stepsUsed, message }: { stepsUsed: number; message: string }) =>
        stepsUsed === 0
          ? {
              kind: 'tool_calls' as const,
              calls: [{ id: 'knowledge', name: 'search_knowledge' as const, arguments: { query: message } }],
            }
          : null,
    },
  }
}

describe('Jev post-reranker relevance gate in chat', () => {
  it('omits an unrelated reranked document from send evidence, context, and citations', async () => {
    const responderInputs: ChatResponderInput[] = []
    const responder: ChatStreamingResponder = {
      respond: async (input) => {
        responderInputs.push(input)
        return { text: 'The direct project aligns Cantonese captions. [K1]' }
      },
      stream: async function* () {
        yield { done: true as const, text: 'unused', model: 'test/model' }
      },
    }
    const service = createChatService(responder, dependencies())
    const result = await service.send({ message: 'What does the direct project do?' })

    expect(result.status).toBe('replied')
    expect(responderInputs).toHaveLength(1)
    expect(responderInputs[0]?.evidence?.map(({ id }) => id)).toEqual([directCandidate.id])
    expect(JSON.stringify(responderInputs[0]?.evidence)).not.toContain(unrelatedCandidate.text)
    expect(responderInputs[0]?.extraContext).toContain(directCandidate.text)
    expect(responderInputs[0]?.extraContext).not.toContain(unrelatedCandidate.text)
    if (result.status !== 'replied') throw new Error('Expected a reply')
    expect(result.citations).toEqual([
      {
        id: 'K1',
        title: directCandidate.source.title,
        url: directCandidate.source.url,
        isPublic: true,
      },
    ])
  })

  it('omits the same unrelated document from streamed evidence, context, and citations', async () => {
    const responderInputs: ChatResponderInput[] = []
    const responder: ChatStreamingResponder = {
      respond: async () => ({ text: 'unused' }),
      stream: async function* (input) {
        responderInputs.push(input)
        yield { delta: 'The direct project aligns Cantonese captions. [K1]', model: 'test/model' }
        yield { done: true as const, text: 'The direct project aligns Cantonese captions. [K1]', model: 'test/model' }
      },
    }
    const service = createChatService(responder, dependencies())
    const events: unknown[] = []
    for await (const event of service.sendStream({ message: 'What does the direct project do?' })) events.push(event)

    expect(responderInputs).toHaveLength(1)
    expect(responderInputs[0]?.evidence?.map(({ id }) => id)).toEqual([directCandidate.id])
    expect(JSON.stringify(responderInputs[0]?.evidence)).not.toContain(unrelatedCandidate.text)
    expect(responderInputs[0]?.extraContext).toContain(directCandidate.text)
    expect(responderInputs[0]?.extraContext).not.toContain(unrelatedCandidate.text)
    const citations = events.find((event) => (event as { type?: string }).type === 'citations') as {
      citations: Array<{ url: string }>
    }
    expect(citations.citations.map(({ url }) => url)).toEqual([directCandidate.source.url])
    expect(events).toContainEqual({ type: 'done', contextToken: 'signed', model: 'test/model' })
  })
})
