import { describe, expect, it } from 'bun:test'

import { createChatService } from '../../src/server/chat/service'
import { createChatContextSigner } from '../../src/server/chat/context-signer'
import type { ChatConversationContext, ChatResponder, ChatStreamingResponder, ChatTopicAnchor } from '../../src/server/chat/types'
import { resolveKnowledgeQuery } from '../../src/server/knowledge/query-resolution'
import type { ChatContextSigner } from '../../src/server/chat/context-signer'
import type { ModerationService } from '../../src/server/moderation/service'
import { createModerationService } from '../../src/server/moderation/service'
import type { ModerationClassifier } from '../../src/server/moderation/types'
import type { KnowledgeEvidence, PublicCitation } from '../../src/server/knowledge/retrieve'

describe('createChatService', () => {
  it('retains bounded tool topic anchors for Jev after transcript truncation', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const observedAnchors: ChatTopicAnchor[][] = []
    let responderHistoryLength = 0
    const secretEvidence: KnowledgeEvidence[] = [{
      id: 'private-source-id', citationId: 'K1', text: 'PRIVATE RETRIEVED ANSWER', isPublic: true,
      source: { type: 'github-private', sourceId: 'private-source-id', title: 'Private repository', url: 'https://private.example/source' },
    }]
    const service = createChatService({
      respond: async (input) => { responderHistoryLength = input.history.length; return { text: 'Nelson has this experience. [K1]' } },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async (input) => { observedAnchors.push(input.topicAnchors ?? []); return { allowed: true } },
      } as ModerationService,
      contextSigner: signer,
      today: '2026-09-24',
      knowledgeEnabled: true,
      knowledge: { execute: async () => ({ evidence: secretEvidence, citations: [{ id: 'K1', title: 'Private repository', url: 'https://private.example/source', isPublic: true }], degraded: false }) },
      planner: {
        planNextStep: async ({ message, stepsUsed }) => message === 'Tell me about Nelson’s experience.' && stepsUsed === 0
          ? { kind: 'tool_calls', calls: [{ id: 'experience', name: 'search_knowledge', arguments: { query: 'Tell me about Nelson’s experience.' } }] }
          : null,
      },
    })

    const first = await service.send({ message: 'Tell me about Nelson’s experience.' })
    expect(first.status).toBe('replied')
    if (first.status !== 'replied') throw new Error('Expected a reply with a signed context token')
    const firstContext = await signer.verify(first.contextToken)
    expect(firstContext?.topicAnchors).toEqual([{
      question: 'Tell me about Nelson’s experience.',
      observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [{ name: 'search_knowledge', arguments: { query: 'Tell me about Nelson’s experience.' }, status: 'completed' }],
    }])
    expect(JSON.stringify(firstContext)).not.toContain('PRIVATE RETRIEVED ANSWER')
    expect(JSON.stringify(firstContext)).not.toContain('private.example')
    expect(JSON.stringify(firstContext)).not.toContain('private-source-id')

    const paddedContext: ChatConversationContext = {
      messages: Array.from({ length: 12 }, (_, index) => ({
        role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
        content: `prior turn ${index}`,
      })),
      topicAnchors: firstContext?.topicAnchors ?? [],
    }
    const paddedToken = await signer.sign(paddedContext)
    await service.send({ message: 'How about the education?', contextToken: paddedToken })

    expect(observedAnchors[1]).toEqual(firstContext?.topicAnchors ?? [])
    expect(responderHistoryLength).toBe(12)
  })

  it('reuses an experience topic anchor for education after eight chat turns', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const educationRouting: Array<{ historyLength: number; anchorQuestions: string[] }> = []
    const educationPlannerAnchors: string[][] = []
    const knowledgeQueries: string[] = []
    const availableDecision = (availableTools: string[], use: string[]) => Object.fromEntries(
      availableTools.map((tool) => [tool, { label: use.includes(tool) ? 'use' : 'skip', confidence: 0.99 }]),
    )
    const classifier: ModerationClassifier = {
      classify: async () => ({ channel: 'chat', scope: { label: 'owner_context', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } }),
      classifyChatWithTools: async (input) => {
        const lower = input.message.toLowerCase()
        const educationAlreadyAnswered = input.context.some(({ role, content }) => role === 'assistant' && content.includes('Certificate IV'))
        const use = lower.includes('experience')
          ? ['search_knowledge']
          : lower.includes('education') && !educationAlreadyAnswered ? ['search_knowledge'] : []
        if (lower.includes('education')) educationRouting.push({
          historyLength: input.context.length,
          anchorQuestions: (input.topicAnchors ?? []).map(({ question }) => question),
        })
        return {
          finding: { channel: 'chat', scope: { label: 'owner_context', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } },
          toolDecisions: availableDecision(input.availableTools, use),
        }
      },
      routeTools: async (input) => availableDecision(input.availableTools, []),
    }
    const service = createChatService({
      respond: async ({ message }) => ({
        text: message.toLowerCase().includes('education')
          ? 'Nelson completed a Certificate IV at TAFE.'
          : message.toLowerCase().includes('experience')
            ? 'Nelson has experience in customer service and automotive work.'
            : 'Okay.',
      }),
    }, {
      moderation: createModerationService(classifier, 0.75),
      contextSigner: signer,
      today: '2026-09-24',
      knowledgeEnabled: true,
      knowledge: { execute: async ({ message, verifiedHistory, topicAnchors }) => {
        knowledgeQueries.push(resolveKnowledgeQuery(message, verifiedHistory, topicAnchors))
        return { evidence: [], citations: [], degraded: false }
      } },
      planner: {
        planNextStep: async ({ message, stepsUsed, topicAnchors }) => {
          if (/education/i.test(message)) educationPlannerAnchors.push((topicAnchors ?? []).map(({ question }) => question))
          if (stepsUsed > 0 || !/experience|education/i.test(message)) return null
          return { kind: 'tool_calls', calls: [{ id: 'profile', name: 'search_knowledge', arguments: { query: message } }] }
        },
      },
    })

    let contextToken: string | undefined
    const send = async (message: string) => {
      const result = await service.send({ message, contextToken })
      if (result.status !== 'replied') throw new Error(`Expected a reply for ${message}`)
      contextToken = result.contextToken
      return result
    }

    await send('What is your experience?')
    for (let turn = 0; turn < 6; turn += 1) await send(`Thanks for the detail ${turn + 1}.`)
    const education = await send('How about the education?')

    expect(education.status).toBe('replied')
    expect(educationRouting[0]?.historyLength).toBe(12)
    expect(educationRouting[0]?.anchorQuestions).toContain('What is your experience?')
    expect(educationPlannerAnchors[0]).toContain('What is your experience?')
    expect(knowledgeQueries).toEqual(['What is your experience?', "Tell me about Nelson's education."])

    await send('How about the education?')
    expect(knowledgeQueries).toHaveLength(2)
  })

  it('refreshes WakaTime data for a current-project follow-up to an old anchor', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const staleAnchor: ChatTopicAnchor = {
      question: 'What project is Nelson currently working on?',
      observedAtUtc: '2026-07-01T00:00:00.000Z',
      tools: [
        { name: 'coding_history', arguments: { op: 'by_project', from: '2026-06-02', to: '2026-07-01' }, status: 'completed' },
        { name: 'search_knowledge', arguments: { query: 'What project is Nelson currently working on?' }, status: 'completed' },
      ],
    }
    const staleToken = await signer.sign({
      messages: [
        { role: 'user', content: 'What project is Nelson currently working on?' },
        { role: 'assistant', content: 'The recent project was old-project.' },
      ],
      topicAnchors: [staleAnchor],
    })
    let observedAnchorTime = ''
    let recentRange: { from: string; to: string } | undefined
    let currentProjectKnowledgeQueries = 0
    const classifier: ModerationClassifier = {
      classify: async () => ({ channel: 'chat', scope: { label: 'owner_projects', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } }),
      classifyChatWithTools: async (input) => {
        observedAnchorTime = input.topicAnchors?.[0]?.observedAtUtc ?? ''
        const currentProject = /project.*(?:working|now|current)|working on/i.test(input.message)
        return {
          finding: { channel: 'chat', scope: { label: 'owner_projects', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } },
          toolDecisions: Object.fromEntries(input.availableTools.map((tool) => [tool, {
            label: currentProject && ['coding_history', 'search_knowledge'].includes(tool) ? 'use' : 'skip', confidence: 0.99,
          }])),
        }
      },
      routeTools: async (input) => Object.fromEntries(input.availableTools.map((tool) => [tool, { label: 'skip', confidence: 0.99 }])),
    }
    const service = createChatService({ respond: async () => ({ text: 'I checked the latest project activity.' }) }, {
      moderation: createModerationService(classifier, 0.75),
      contextSigner: signer,
      today: '2026-09-24',
      knowledgeEnabled: true,
      knowledge: { execute: async () => {
        currentProjectKnowledgeQueries += 1
        return { evidence: [], citations: [], degraded: false }
      } },
      codingHistoryEnabled: true,
      codingHistory: {
        summary: async () => ({ totalSeconds: 3_600, activeDays: 2, heartbeatCount: 10 }),
        byProject: async (range) => {
          recentRange = range
          return [{ name: 'fresh-project', seconds: 3_600, heartbeats: 10 }]
        },
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      planner: {
        planNextStep: async ({ message, stepsUsed }) => {
          if (stepsUsed > 0 || !/project.*(?:working|now|current)|working on/i.test(message)) return null
          return {
            kind: 'tool_calls',
            calls: [
              { id: 'repository', name: 'search_knowledge', arguments: { query: message } },
              { id: 'activity', name: 'coding_history', arguments: { op: 'by_project', from: '2026-08-26', to: '2026-09-24' } },
            ],
          }
        },
      },
    })

    const result = await service.send({ message: 'What project are you working on now?', contextToken: staleToken })

    expect(result.status).toBe('replied')
    expect(observedAnchorTime).toBe('2026-07-01T00:00:00.000Z')
    expect(recentRange).toMatchObject({ from: '2026-08-26', to: '2026-09-24' })
    expect(currentProjectKnowledgeQueries).toBe(1)
  })

  it('normalizes a provider reply into a public chat response', async () => {
    const responder: ChatResponder = {
      respond: async () => ({ text: 'Hello from the assistant.', model: 'test/model' }),
    }

    const service = createChatService(responder, {
      moderation: { checkChat: async () => ({ allowed: true }), checkContact: async () => ({ allowed: true }) } as ModerationService,
      contextSigner: {
        verify: async () => ({ messages: [], topicAnchors: [] }),
        sign: async (context) => JSON.stringify(context),
      } as ChatContextSigner,
    })

    await expect(
      service.send({
        message: 'Hello',
        contextToken: undefined,
      }),
    ).resolves.toEqual({ status: 'replied', text: 'Hello from the assistant.', model: 'test/model', contextToken: '{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hello from the assistant."}],"topicAnchors":[]}' })
  })

  it('never calls the responder for a rejected message and does not trust browser history', async () => {
    let responderCalled = false
    let moderatedContext: unknown
    const service = createChatService({
      respond: async () => { responderCalled = true; return { text: 'answer' } },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async (input) => { moderatedContext = input.context; return { allowed: false } },
      } as ModerationService,
      contextSigner: {
        verify: async () => ({ messages: [{ role: 'assistant', content: 'server-signed' }], topicAnchors: [] }),
        sign: async () => 'unused',
      } as ChatContextSigner,
    })

    const result = await service.send({ message: 'try this', contextToken: 'valid-token' })
    expect(result).toEqual({ status: 'blocked', reason: 'uncertain' })
    expect(responderCalled).toBe(false)
    expect(moderatedContext).toEqual([{ role: 'assistant', content: 'server-signed' }])
  })

  it('retrieves only after moderation and passes bounded evidence and public citations through', async () => {
    const order: string[] = []
    const evidence: KnowledgeEvidence[] = [{
      id: 'internal-id',
      citationId: 'K1',
      text: 'A public fact from my profile.',
      isPublic: true,
      source: { type: 'profile', sourceId: 'owner', title: 'Profile', url: 'https://github.com/lst97' },
    }]
    const citations: PublicCitation[] = [{ id: 'K1', title: 'Profile', url: 'https://github.com/lst97', isPublic: true }]
    const service = createChatService({
      respond: async (input) => {
        order.push('responder')
        expect(input.evidence).toEqual(evidence)
        return { text: 'Nelson builds open-source tools. [K1]' }
      },
    }, {
      moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => { order.push('moderation'); return { allowed: true } } } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      knowledge: { execute: async () => { order.push('retrieval'); return { evidence, citations, degraded: false } } },
      knowledgeEnabled: true,
    })

    const result = await service.send({ message: 'Who am I?' })

    expect(order).toEqual(['moderation', 'retrieval', 'responder'])
    expect(result).toMatchObject({ status: 'replied', citations, contextToken: 'signed' })
  })

  it('uses Jev-approved knowledge lookup for a question about Nelson’s current project', async () => {
    const evidence: KnowledgeEvidence[] = [{
      id: 'active-project',
      citationId: 'K1',
      text: 'The repository is a portfolio chat assistant with a knowledge retrieval pipeline. Last updated 2026-09-20.',
      isPublic: true,
      source: { type: 'github-private', sourceId: 'portfolio-chat', title: 'Portfolio chat project', url: 'https://github.com/lst97/last-lst97-dev-web' },
    }]
    let retrievalQuery = ''
    let replyEvidence = ''
    let moderationClock = ''
    let replyClock = ''
    let recentRange: { from: string; to: string } | undefined
    let recentProjectQueries = 0
    const classifier: ModerationClassifier = {
      classify: async () => ({ channel: 'chat', scope: { label: 'owner_projects', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } }),
      classifyChatWithTools: async ({ availableTools, currentDateTimeUtc }) => {
        moderationClock = currentDateTimeUtc ?? ''
        return {
        finding: { channel: 'chat', scope: { label: 'owner_projects', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } },
        toolDecisions: Object.fromEntries(availableTools.map((tool) => [tool, { label: ['search_knowledge', 'coding_history'].includes(tool) ? 'use' : 'skip', confidence: 0.99 }])),
        }
      },
      routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, { label: 'skip', confidence: 0.99 }])),
    }
    const service = createChatService({
      respond: async (input) => {
        replyClock = input.currentDateTimeUtc
        replyEvidence = [input.evidence?.map((item) => item.text).join('\n') ?? '', input.extraContext ?? ''].join('\n')
        return { text: 'Recent WakaTime activity and repository metadata point to a portfolio chat assistant project. [K1]', model: 'test/model' }
      },
    }, {
      moderation: createModerationService(classifier, 0.75),
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      knowledgeEnabled: true,
      knowledge: { execute: async ({ message }) => {
        retrievalQuery = message
        return { evidence, citations: [], degraded: false }
      } },
      codingHistoryEnabled: true,
      today: '2026-09-24',
      codingHistory: {
        summary: async () => ({ totalSeconds: 7200, activeDays: 5, heartbeatCount: 20 }),
        byProject: async (range) => {
          recentProjectQueries += 1
          recentRange = range
          return [{ name: 'portfolio-chat', seconds: 7200, heartbeats: 20 }]
        },
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 7200, activeDays: 5, heartbeatCount: 20 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 4, currentDays: 2 }),
      },
    })

    const result = await service.send({ message: 'What project are you currently working on?' })

    expect(retrievalQuery).toBe('What project are you currently working on?')
    expect(moderationClock).toBe('2026-09-24T00:00:00.000Z')
    expect(replyClock).toBe(moderationClock)
    expect(recentProjectQueries).toBe(1)
    expect(recentRange).toMatchObject({ from: '2026-08-26', to: '2026-09-24', op: 'by_project' })
    expect(replyEvidence).toContain('Last updated 2026-09-20')
    expect(replyEvidence).toContain('Top projects: 1. portfolio-chat')
    expect(result).toMatchObject({ status: 'replied', text: 'Recent WakaTime activity and repository metadata point to a portfolio chat assistant project. [K1]' })
  })

  it('never retrieves knowledge for a blocked message', async () => {
    let retrievalCalled = false
    let responderCalled = false
    const service = createChatService({ respond: async () => { responderCalled = true; return { text: 'no' } } }, {
      moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: false }) } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'unused' } as ChatContextSigner,
      knowledge: { execute: async () => { retrievalCalled = true; return { evidence: [], citations: [], degraded: false } } },
      knowledgeEnabled: true,
    })

    expect(await service.send({ message: 'blocked' })).toEqual({ status: 'blocked', reason: 'uncertain' })
    expect(retrievalCalled).toBe(false)
    expect(responderCalled).toBe(false)
  })

  it('blocks a safe but out-of-scope request before knowledge retrieval or the responder', async () => {
    let retrievalCalls = 0
    let responderCalls = 0
    const classifier: ModerationClassifier = {
      classify: async () => ({
        channel: 'chat',
        scope: { label: 'general_knowledge', confidence: 0.99 },
        safety: { label: 'safe', confidence: 0.99 },
      }),
    }
    const service = createChatService({
      respond: async () => { responderCalls += 1; return { text: 'should not run' } },
    }, {
      moderation: createModerationService(classifier, 0.75),
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'unused' } as ChatContextSigner,
      knowledge: { execute: async () => { retrievalCalls += 1; return { evidence: [], citations: [], degraded: false } } },
      knowledgeEnabled: true,
    })

    expect(await service.send({ message: 'Explain photosynthesis.' })).toEqual({ status: 'blocked', reason: 'out_of_scope' })
    expect(retrievalCalls).toBe(0)
    expect(responderCalls).toBe(0)
  })

  it('marks owner-context lookup as degraded when retrieval is unavailable', async () => {
    let unavailableFlag = false
    const service = createChatService({ respond: async (input) => {
      unavailableFlag = input.knowledgeUnavailable === true
      expect(input.evidence).toEqual([])
      return { text: 'I cannot verify that information right now.' }
    } }, {
      moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: true }) } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      knowledge: { execute: async () => { throw new Error('private database detail') } },
      knowledgeEnabled: true,
    })

    const result = await service.send({ message: 'What profile information do you have about me?' })
    expect(result).toMatchObject({ status: 'replied', knowledgeUnavailable: true })
    expect(unavailableFlag).toBe(true)
  })
})

describe('createChatService.sendStream', () => {
  function streamingResponder(chunks: string[]) {
    return {
      respond: async () => ({ text: chunks.join('') }),
      stream: async function *() {
        for (const delta of chunks) yield { delta }
        yield { done: true as const, text: chunks.join(''), model: 'test/model' }
      },
    }
  }

  const baseDependencies = {
    moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: true }) } as ModerationService,
    contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
    planner: { planNextStep: async () => null },
  }

  function scriptedPlanner(plans: Array<{ kind: 'tool_calls'; calls: { id: string; name: 'search_knowledge' | 'coding_stats' | 'coding_history' | 'site_content'; arguments: Record<string, unknown> }[] } | { kind: 'final_answer'; text: string } | null>) {
    let index = 0
    return {
      planNextStep: async () => {
        if (index >= plans.length) return null
        const plan = plans[index]!
        index += 1
        return plan
      },
    }
  }

  async function collect(service: { sendStream(input: { message: string }): AsyncGenerator<unknown> }, message: string) {
    const events: unknown[] = []
    for await (const event of service.sendStream({ message })) events.push(event)
    return events
  }

  it('streams tokens and finishes with a signed context token', async () => {
    const service = createChatService(streamingResponder(['Hel', 'lo']), baseDependencies)

    expect(await collect(service, 'Hello')).toEqual([
      { type: 'status', status: 'composing_reply' },
      { type: 'token', delta: 'Hel' },
      { type: 'token', delta: 'lo' },
      { type: 'done', contextToken: 'signed', model: 'test/model' },
    ])
  })

  it('emits tool events around coding stats for coding-time questions', async () => {
    let fetchedRange: string | undefined
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { range: 'last_7_days' } }] }, null]),
      codingStats: { fetchSummary: async (range: 'last_7_days' | 'all_time') => { fetchedRange = range; return 'Coding activity (last 7 days): 32 hrs total' } },
      codingStatsEnabled: true,
    })


    const events = await collect(service, 'How much did you code this week?')

    expect(fetchedRange).toBe('last_7_days')
    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    expect(events[2]).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('emits tool events for knowledge lookup and streams the reply after', async () => {
    const responder: ChatStreamingResponder = {
      respond: async () => ({ text: 'answer' }),
      stream: async function *() {
        yield { done: true as const, text: 'answer', model: 'test/model' }
      },
    }
    const service = createChatService(responder, {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'search_knowledge', arguments: { query: 'What work have I done?' } }] }, null]),
      knowledgeEnabled: true,
      knowledge: {
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
      },
    })
    const events = await collect(service, 'What work have I done?')

    expect(events[0]).toMatchObject({ type: 'tool_start' })
    expect(events[1]).toMatchObject({ type: 'tool_result' })
    expect(events[2]).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('explains provider rate limits and logs the provider status without exposing provider details', async () => {
    const failures: Array<{ event: string; fields?: Record<string, unknown> }> = []
    const providerError = Object.assign(new Error('private provider response body'), { statusCode: 429 })
    const responder: ChatStreamingResponder = {
      respond: async () => ({ text: 'unused' }),
      stream: async function *() { throw providerError },
    }
    const service = createChatService(responder, {
      ...baseDependencies,
      knowledgeEnabled: true,
      knowledge: { execute: async () => ({ evidence: [], citations: [], degraded: false }) },
      logger: {
        warn() {},
        error(event, fields) { failures.push({ event, fields }) },
      },
    })

    const events = await collect(service, 'What work have I done?')

    expect(events).toEqual([
      { type: 'status', status: 'composing_reply' },
      { type: 'error', message: 'The AI reply provider is rate-limited right now. Please try again in a moment.' },
    ])
    expect(failures).toEqual([{
      event: 'chat.reply_generation.failed',
      fields: { failureCategory: 'provider_rate_limit', providerStatusCode: 429 },
    }])
    expect(JSON.stringify(failures)).not.toContain('private provider response body')
  })

  it('explains when the configured model has no available provider endpoints', async () => {
    const providerError = Object.assign(new Error('No endpoints found for ling-3.0-flash-vl:free.'), { statusCode: 404 })
    const responder: ChatStreamingResponder = {
      respond: async () => ({ text: 'unused' }),
      stream: async function *() { throw providerError },
    }
    const service = createChatService(responder, baseDependencies)

    expect(await collect(service, 'What work have I done?')).toEqual([
      { type: 'status', status: 'composing_reply' },
      { type: 'error', message: 'The configured AI model has no available OpenRouter provider right now. Please select another model or try again later.' },
    ])
  })

  it('skips the tool for unrelated questions and degrades silently when stats fail', async () => {
    let calls = 0
    const service = createChatService(streamingResponder(['hi']), {
      ...baseDependencies,
      codingStats: { fetchSummary: async () => { calls += 1; return null } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'What is recursion?')

    expect(calls).toBe(0)
    expect(events.some((event) => (event as { type: string }).type === 'tool_start')).toBe(false)
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('yields a single error event for blocked messages without touching tools or the responder', async () => {
    let toolCalls = 0
    const service = createChatService(streamingResponder(['never']), {
      moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: false }) } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'unused' } as ChatContextSigner,
      codingStats: { fetchSummary: async () => { toolCalls += 1; return 'stats' } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much did you code this week?')

    expect(events).toEqual([{ type: 'error', message: 'I couldn’t confidently classify your request. Please rephrase it as a question about Nelson or this site’s assistant.' }])
    expect(toolCalls).toBe(0)
  })

  it('answers history questions from the warehouse and skips the live API tool', async () => {
    let apiCalls = 0
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_history', arguments: { op: 'summary', from: '2025-01-01', to: '2025-12-31' } }] }, null]),
      today: '2026-09-23',
      codingHistory: {
        summary: async () => ({ totalSeconds: 7200, activeDays: 4, heartbeatCount: 100 }),
        byProject: async () => [{ name: 'alpha', seconds: 3600, heartbeats: 50 }],
        byLanguage: async () => [{ name: 'TypeScript', seconds: 3600, heartbeats: 50 }],
        projectTime: async () => ({ totalSeconds: 3600, activeDays: 2, heartbeatCount: 50 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 4, currentDays: 0 }),
      },
      codingHistoryEnabled: true,
      codingStats: { fetchSummary: async () => { apiCalls += 1; return 'live stats' } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much did I code in 2025?')

    expect(apiCalls).toBe(0)
    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'coding_history' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'coding_history' })
    expect(events[2]).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('falls back to the live API tool when the warehouse has no match', async () => {
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { range: 'last_7_days' } }] }, null]),
      today: '2026-09-23',
      codingHistory: {
        summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        byProject: async () => [],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      codingHistoryEnabled: true,
      codingStats: { fetchSummary: async () => 'live stats' },
      codingStatsEnabled: true,
    })


    const events = await collect(service, 'How much did you code this week?')

    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    expect(events[2]).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('answers range-less total-hours questions from the live API, not the import snapshot', async () => {
    let historyCalls = 0
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { range: 'all_time' } }] }, null]),
      today: '2026-09-23',
      codingHistory: {
        summary: async () => { historyCalls += 1; return { totalSeconds: 7200, activeDays: 4, heartbeatCount: 100 } },
        byProject: async () => [],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 4, currentDays: 0 }),
      },
      codingHistoryEnabled: true,
      codingStats: { fetchSummary: async () => 'Coding activity (all time): 3,943 hrs total' },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'What is your total coding hours?')

    expect(historyCalls).toBe(0)
    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    const citations = events.find((event) => (event as { type: string }).type === 'citations') as { citations: { url: string }[] }
    expect(citations.citations.some((citation) => citation.url === 'https://wakatime.com/@lst97')).toBe(true)
  })

  it('answers per-project spend from the warehouse with SSE tool events', async () => {
    let summaryCalls = 0
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_history', arguments: { op: 'project_time', from: '2025-01-01', to: '2025-12-31', project: 'best-maker-web' } }] }, null]),
      today: '2026-09-23',
      codingHistory: {
        summary: async () => { summaryCalls += 1; return { totalSeconds: 0, activeDays: 0, heartbeatCount: 0 } },
        byProject: async () => [],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 7200, activeDays: 4, heartbeatCount: 100 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 4, currentDays: 0 }),
      },
      codingHistoryEnabled: true,
      codingStats: { fetchSummary: async () => 'live stats' },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much time did I spend on best-maker-web in 2025?')

    expect(summaryCalls).toBe(0)
    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'coding_history', label: 'SEARCHING CODING HISTORY…' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'coding_history' })
    expect(JSON.stringify(events[1])).toContain('best-maker-web')
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('fans out live totals and warehouse breakdown for total-plus-project questions', async () => {
    const { planner: _ignored, ...fallbackDeps } = baseDependencies
    void _ignored
    const service = createChatService(streamingResponder(['ok']), {
      ...fallbackDeps,
      codingHistory: {
        summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        byProject: async () => [{ name: 'alpha', seconds: 3600, heartbeats: 50 }],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      codingHistoryEnabled: true,
      codingStats: { fetchSummary: async () => 'Coding activity (all time): 3,943 hrs total' },
      codingStatsEnabled: true,
      siteContent: {
        listProjects: async () => [],
        getProject: async () => null,
        listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getPost: async () => null,
      },
    })

    const events = await collect(service, 'What is the total coding hours and most time spent for which project?')
    const starts = events.filter((event) => (event as { type: string }).type === 'tool_start')
    const results = events.filter((event) => (event as { type: string }).type === 'tool_result')

    expect(starts).toHaveLength(2)
    expect(results).toHaveLength(2)
    expect(JSON.stringify(starts.map((event) => (event as { name: string }).name).sort())).toContain('coding_history')
    expect(JSON.stringify(starts.map((event) => (event as { name: string }).name).sort())).toContain('coding_stats')
  })

  it('routes showcase questions to live site content with SSE events', async () => {
    const { planner: _skipped, ...deps } = baseDependencies
    void _skipped
    const service = createChatService(streamingResponder(['ok']), {
      ...deps,
      siteContent: {
        listProjects: async () => [{ slug: 'demo-app', title: 'Demo App', summary: 'A demo showcase app', technologies: ['Next.js'], featured: true, coverImage: { url: null, alt: null }, role: null, projectStatus: 'completed' as const, startDate: null, endDate: null }],
        getProject: async () => null,
        listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getPost: async () => null,
      },
    })

    const events = await collect(service, 'Does he have some project demo showcase?')

    expect(events[0]).toMatchObject({ type: 'tool_start', name: 'site_content', label: 'BROWSING SITE CONTENT…' })
    expect(events[1]).toMatchObject({ type: 'tool_result', name: 'site_content' })
    expect(JSON.stringify(events[1])).toContain('Demo App')
  })
})
