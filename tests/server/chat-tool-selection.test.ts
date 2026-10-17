import { describe, expect, it } from 'bun:test'
import type { ChatContextSigner } from '../../src/server/chat/context-signer'
import { createChatService } from '../../src/server/chat/service'
import type { ChatStreamingResponder } from '../../src/server/chat/types'
import type { KnowledgeEvidence } from '../../src/server/knowledge/retrieve'
import { createModerationService } from '../../src/server/moderation/service'
import type { ModerationClassifier } from '../../src/server/moderation/types'

/**
 * The owner-voice guard in `agent/tool-selection.ts`: a question about what
 * Nelson thinks or wrote must reach `search_knowledge` even when the decision
 * model skips it, because the blog and interview corpora hold the real views.
 * The topic gate keeps the frame narrow, and assistant-capability questions
 * stay off the retrieval path.
 */
const evidence: KnowledgeEvidence[] = [
  {
    id: 'code-is-cheap',
    citationId: 'K1',
    text: 'Code is cheap; engineering is not. AI amplifies mistakes as quickly as it produces code.',
    isPublic: true,
    source: {
      type: 'blog',
      sourceId: 'code-is-cheap-engineering-judgment',
      title: 'Code Is Cheap, Software Is Not',
      url: 'https://www.lst97.dev/blog/code-is-cheap-software-is-not',
    },
  },
]

function createHarness() {
  const retrievalQueries: string[] = []
  const plannerAllowedTools: Array<string[] | undefined> = []
  const replyEvidence: string[] = []
  const classifier: ModerationClassifier = {
    classify: async () => ({
      channel: 'chat',
      scope: { label: 'technical_question', confidence: 0.99 },
      safety: { label: 'safe', confidence: 0.99 },
    }),
    classifyChatWithTools: async ({ availableTools }) => ({
      finding: {
        channel: 'chat',
        scope: { label: 'technical_question', confidence: 0.99 },
        safety: { label: 'safe', confidence: 0.99 },
      },
      // The decision model skips every source; only the deterministic guard can
      // route these turns.
      toolDecisions: Object.fromEntries(
        availableTools.map((tool) => [tool, { label: 'skip' as const, confidence: 0.99 }]),
      ),
    }),
    routeTools: async ({ availableTools }) =>
      Object.fromEntries(availableTools.map((tool) => [tool, { label: 'skip' as const, confidence: 0.99 }])),
  }
  const responder: ChatStreamingResponder = {
    respond: async (input) => {
      replyEvidence.push(input.evidence?.map((item) => item.text).join('\n') ?? '')
      return { text: 'Code is cheap; engineering is not. [K1]', model: 'test/model' }
    },
    stream: async function* () {
      yield { done: true as const, text: 'Code is cheap; engineering is not. [K1]', model: 'test/model' }
    },
  }
  const service = createChatService(responder, {
    moderation: createModerationService(classifier, 0.6),
    contextSigner: {
      verify: async () => ({ messages: [], topicAnchors: [] }),
      sign: async () => 'signed',
    } as ChatContextSigner,
    knowledgeEnabled: true,
    knowledge: {
      execute: async (input) => {
        retrievalQueries.push(input.message)
        return { evidence, citations: [], degraded: false }
      },
    },
    planner: {
      planNextStep: async ({ allowedTools }) => {
        plannerAllowedTools.push(allowedTools)
        return {
          kind: 'tool_calls',
          calls: (allowedTools ?? []).map((name, index) => ({
            id: `call-${index}`,
            name,
            arguments: name === 'search_knowledge' ? { query: 'recorded view' } : {},
          })),
        }
      },
    },
  })
  return { service, retrievalQueries, plannerAllowedTools, replyEvidence }
}

describe('chat tool selection owner-voice guard', () => {
  it('forces search_knowledge for an opinion question the decision model skipped', async () => {
    const harness = createHarness()

    const result = await harness.service.send({ message: 'Do you think code is cheap?' })

    expect(result.status).toBe('replied')
    expect(harness.retrievalQueries).toEqual(['Do you think code is cheap?'])
    expect(harness.plannerAllowedTools).toEqual([['search_knowledge']])
    expect(harness.replyEvidence[0]).toContain('Code is cheap; engineering is not.')
  })

  it('forces search_knowledge for a question about what Nelson has written', async () => {
    const harness = createHarness()

    const result = await harness.service.send({ message: 'Have you written anything about AI and testing?' })

    expect(result.status).toBe('replied')
    expect(harness.retrievalQueries).toHaveLength(1)
    expect(harness.plannerAllowedTools).toEqual([['search_knowledge']])
  })

  it('leaves assistant-capability questions off the retrieval path', async () => {
    const harness = createHarness()

    const result = await harness.service.send({ message: 'What can you help me with?' })

    expect(result.status).toBe('replied')
    expect(harness.plannerAllowedTools).toEqual([])
    expect(harness.retrievalQueries).toEqual([])
  })
})
