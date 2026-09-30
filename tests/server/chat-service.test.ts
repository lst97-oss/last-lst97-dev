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
import type { CodingStatsRequest, CodingStatsResult } from '../../src/server/wakatime/stats'
import type { ContentReader } from '../../src/server/content/service'
import type { ListPostsInput } from '../../src/server/content/types'

const codingActivityResult = (range: CodingStatsRequest['range']): CodingStatsResult => ({
  category: 'activity',
  period: { range, start: '2026-09-17T14:00:00Z', end: '2026-09-24T13:59:59Z' },
  retrievedAtUtc: '2026-09-24T13:00:00.000Z',
  totalSeconds: range === 'all_time' ? 11_744_496 : 129_600,
  daysInPeriod: range === 'all_time' ? 960 : 7,
  humanReadableTotal: range === 'all_time' ? '3,262 hrs 21 mins' : '36 hrs',
})

describe('createChatService', () => {
  it('passes the same approved tool result to send and sendStream responders', async () => {
    const responderContexts: string[] = []
    let fetchedStats = 0
    const responder: ChatStreamingResponder = {
      respond: async (input) => {
        responderContexts.push(input.extraContext ?? '')
        return { text: 'Here are the activity results.' }
      },
      stream: async function * (input) {
        responderContexts.push(input.extraContext ?? '')
        yield { done: true as const, text: 'Here are the activity results.', model: 'test/model' }
      },
    }
    const service = createChatService(responder, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'coding_stats' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      planner: {
        planNextStep: async ({ allowedTools }) => {
          expect(allowedTools).toEqual(['coding_stats'])
          return { kind: 'tool_calls', calls: [{
            id: 'activity',
            name: 'coding_stats',
            arguments: { category: 'activity', range: 'last_7_days' },
          }] }
        },
      },
      codingStatsEnabled: true,
      codingStats: { fetchSummary: async () => { fetchedStats += 1; return codingActivityResult('last_7_days') } },
    })

    const sent = await service.send({ message: 'Show my WakaTime activity for the last week.' })
    const streamed: unknown[] = []
    for await (const event of service.sendStream({ message: 'Show my WakaTime activity for the last week.' })) streamed.push(event)

    expect(sent.status).toBe('replied')
    expect(fetchedStats).toBe(2)
    expect(responderContexts).toHaveLength(2)
    expect(responderContexts[0]).toContain('36 hrs total')
    expect(responderContexts[1]).toBe(responderContexts[0])
    expect(streamed.filter((event) => (event as { type?: string }).type === 'tool_start')).toHaveLength(1)
    expect(streamed.filter((event) => (event as { type?: string }).type === 'tool_result')).toHaveLength(1)
    expect(streamed.map((event) => {
      const typed = event as { type: string; status?: string; name?: string }
      if (typed.type === 'status') return `status:${typed.status}`
      if (typed.type === 'tool_start' || typed.type === 'tool_result') return `${typed.type}:${typed.name}`
      return typed.type
    })).toEqual([
      'status:thinking',
      'status:preparing_arguments',
      'tool_start:coding_stats',
      'tool_result:coding_stats',
      'status:composing_reply',
      'citations',
      'done',
    ])
    expect(streamed[streamed.length - 1]).toMatchObject({ type: 'done' })
  })

  it('asks for confirmation when the user asks how to report a bug and excludes the triggering text from contact context', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const records: Array<Record<string, unknown>> = []
    let responderCalls = 0
    const previous = [{ role: 'user' as const, content: 'Earlier normal chat detail' }]
    const priorToken = await signer.sign({ messages: previous, topicAnchors: [] })
    const service = createChatService({
      respond: async () => { responderCalls += 1; return { text: 'unexpected' } },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true, contactIntent: 'contact' }),
      } as ModerationService,
      contextSigner: signer,
      diagnosticsSink: { enqueue: (record) => records.push(record as unknown as Record<string, unknown>) },
    })

    const result = await service.send({
      message: 'I have a bug I want to report, what can I do?',
      contextToken: priorToken,
      diagnosticsMetadata: { ipAddress: '203.0.113.8' },
    })

    expect(result.status).toBe('contact_confirmation')
    expect(responderCalls).toBe(0)
    if (result.status !== 'contact_confirmation') return
    expect(result.text).toContain('send a message or report to Nelson by email')
    expect(result.text).toContain('clears this conversation')
    const context = await signer.verify(result.contextToken)
    expect(context?.messages).toEqual(previous)
    expect(context?.workflow).toEqual({ mode: 'normal', phase: 'contact_confirmation' })
    expect(JSON.stringify(context)).not.toContain('I have a bug')
    expect(records[0]).toMatchObject({ query: '', history: [], outcome: 'complete' })
    expect(records[0]).not.toHaveProperty('metadata')
    expect(JSON.stringify(records[0])).not.toContain('I have a bug')
  })

  it('runs the direct project catalogue when Jev selects it', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    let catalogueCalls = 0
    let knowledgeCalls = 0
    let received: unknown
    let catalogueFallback = ''
    const project = {
      sourceType: 'github' as const, sourceId: 'lst97/python-cli', title: 'python-cli',
      url: 'https://github.com/lst97/python-cli', isPublic: true, summary: 'A Python command line tool.',
      createdAt: null, updatedAt: '2026-09-20T00:00:00.000Z', stars: 5, forks: 1,
      primaryLanguage: 'Python', languages: ['Python'], kinds: ['cli_tool' as const],
      githubTopics: [], curatedTopics: [], timeSpentSeconds: null, mostStarred: true,
    }
    const service = createChatService({ respond: async ({ evidence, catalogueFallback: fallback }) => {
      catalogueFallback = fallback ?? ''
      expect(evidence?.[0]?.text).toContain('python-cli')
      return { text: 'I couldn’t form a verified answer from the available information.' }
    } }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true, toolDecisions: { list_owned_projects: { label: 'use', confidence: 0.99 }, search_knowledge: { label: 'skip', confidence: 0.99 } } }),
      } as ModerationService,
      contextSigner: signer,
      knowledgeEnabled: true,
      knowledge: {
        execute: async () => { knowledgeCalls += 1; return { evidence: [], citations: [], degraded: false } },
        listOwnedProjects: async (query) => {
          catalogueCalls += 1
          received = query
          return { projects: [project], hasMore: false, matchingTotal: 1, breakdown: [] }
        },
      },
      planner: { planNextStep: async () => ({ kind: 'tool_calls', calls: [{ id: 'python-projects', name: 'list_owned_projects', arguments: { languages: ['Python'] } }] }) },
    })

    const result = await service.send({ message: 'Show me Python projects.' })
    expect(result.status).toBe('replied')
    expect(catalogueCalls).toBe(1)
    expect(knowledgeCalls).toBe(0)
    expect(received).toMatchObject({ languages: ['Python'], first_batch: true, exclude_source_ids: [] })
    expect(catalogueFallback).toContain('python-cli')
    expect(result.status === 'replied' ? result.text : '').toContain('python-cli')
  })

  it('asks Jev for a fresh RAG decision after a catalogue result when details are requested', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    let routeCount = 0
    const toolOrder: string[] = []
    const project = {
      sourceType: 'github' as const, sourceId: 'lst97/python-cli', title: 'python-cli',
      url: 'https://github.com/lst97/python-cli', isPublic: true, summary: 'A Python command line tool.',
      createdAt: null, updatedAt: null, stars: 1, forks: 0, primaryLanguage: 'Python', languages: ['Python'],
      kinds: ['cli_tool' as const], githubTopics: [], curatedTopics: [], timeSpentSeconds: null, mostStarred: true,
    }
    const service = createChatService({ respond: async () => ({ text: 'Details found.' }) }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true, toolDecisions: { list_owned_projects: { label: 'use', confidence: 0.99 }, search_knowledge: { label: 'use', confidence: 0.99 } } }),
        routeTools: async () => {
          routeCount += 1
          return { list_owned_projects: { label: 'skip', confidence: 0.99 }, search_knowledge: { label: 'use', confidence: 0.99 } }
        },
      } as ModerationService,
      contextSigner: signer, knowledgeEnabled: true,
      knowledge: {
        listOwnedProjects: async () => {
          toolOrder.push('catalogue')
          return { projects: [project], hasMore: false, matchingTotal: 1, breakdown: [] }
        },
        execute: async () => { toolOrder.push('rag'); return { evidence: [], citations: [], degraded: false } },
      },
      planner: { planNextStep: async ({ allowedTools }) => ({ kind: 'tool_calls', calls: allowedTools?.includes('list_owned_projects')
        ? [{ id: 'catalogue', name: 'list_owned_projects', arguments: {} }]
        : [{ id: 'details', name: 'search_knowledge', arguments: { query: 'python-cli details' } }] }) },
    })

    const result = await service.send({ message: 'List my Python projects and describe them.' })
    expect(result.status).toBe('replied')
    expect(toolOrder).toEqual(['catalogue', 'rag'])
    expect(routeCount).toBe(1)
  })

  it('repairs invalid tool arguments once before executing the approved tool', async () => {
    const plannerInputs: Array<{ allowedTools?: string[]; repair?: { call: { id: string; name: string; arguments: Record<string, unknown> }; rejection: string } }> = []
    let fetchedStats = 0
    let replyContext = ''
    const service = createChatService({
      respond: async (input) => {
        replyContext = input.extraContext ?? ''
        return { text: 'Here are the activity results.' }
      },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'coding_stats' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      contextSigner: {
        verify: async () => ({ messages: [], topicAnchors: [] }),
        sign: async () => 'signed',
      } as ChatContextSigner,
      codingStatsEnabled: true,
      codingStats: { fetchSummary: async () => { fetchedStats += 1; return codingActivityResult('last_7_days') } },
      planner: {
        planNextStep: async (input) => {
          plannerInputs.push(input)
          if (plannerInputs.length === 1) {
            return { kind: 'tool_calls', calls: [{ id: 'bad', name: 'coding_stats', arguments: { range: 'last_7_days' } }] }
          }
          return { kind: 'tool_calls', calls: [{ id: 'bad', name: 'coding_stats', arguments: { category: 'activity', range: 'last_7_days' } }] }
        },
      },
    })

    const result = await service.send({ message: 'Show my WakaTime activity for the last week.' })

    expect(result.status).toBe('replied')
    expect(plannerInputs).toHaveLength(2)
    expect(plannerInputs[1]?.allowedTools).toEqual(['coding_stats'])
    expect(plannerInputs[1]?.repair).toMatchObject({
      call: { id: 'bad', name: 'coding_stats', arguments: { range: 'last_7_days' } },
      rejection: expect.stringContaining('expected'),
    })
    expect(fetchedStats).toBe(1)
    expect(replyContext).toContain('36 hrs total')
  })

  it('does not execute or retry again when repaired arguments remain invalid', async () => {
    let plannerCalls = 0
    let fetchedStats = 0
    let routingUnavailable = false
    const service = createChatService({
      respond: async (input) => {
        routingUnavailable = input.toolRoutingUnavailable === true
        return { text: 'I cannot verify that right now.' }
      },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'coding_stats' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      contextSigner: {
        verify: async () => ({ messages: [], topicAnchors: [] }),
        sign: async () => 'signed',
      } as ChatContextSigner,
      codingStatsEnabled: true,
      codingStats: { fetchSummary: async () => { fetchedStats += 1; return codingActivityResult('last_7_days') } },
      planner: {
        planNextStep: async () => {
          plannerCalls += 1
          return { kind: 'tool_calls', calls: [{
            id: 'bad',
            name: 'coding_stats',
            arguments: { range: 'last_7_days' },
          }] }
        },
      },
    })

    const result = await service.send({ message: 'Show my WakaTime activity for the last week.' })

    expect(result.status).toBe('replied')
    expect(plannerCalls).toBe(2)
    expect(fetchedStats).toBe(0)
    expect(routingUnavailable).toBe(true)
  })

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
    expect(educationRouting[0]?.historyLength).toBe(14)
    expect(educationRouting[0]?.anchorQuestions).toContain('What is your experience?')
    expect(educationPlannerAnchors[0]).toContain('What is your experience?')
    expect(knowledgeQueries).toEqual(['What is your experience?', "Tell me about Nelson's education."])

    await send('How about the education?')
    expect(knowledgeQueries).toHaveLength(3)
  })

  it('retrieves education again when the previous experience answer mentioned one credential', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const knowledgeQueries: string[] = []
    const classifier: ModerationClassifier = {
      classify: async () => ({ channel: 'chat', scope: { label: 'owner_context', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } }),
      classifyChatWithTools: async (input) => {
        const educationMentioned = input.context.some(({ role, content }) => role === 'assistant' && content.includes('Certificate IV'))
        const useKnowledge = /experience/i.test(input.message) || (/education/i.test(input.message) && !educationMentioned)
        return {
          finding: { channel: 'chat', scope: { label: 'owner_context', confidence: 0.99 }, safety: { label: 'safe', confidence: 0.99 } },
          toolDecisions: Object.fromEntries(input.availableTools.map((tool) => [tool, {
            label: useKnowledge && tool === 'search_knowledge' ? 'use' : 'skip',
            confidence: 0.99,
          }])),
        }
      },
      routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, { label: 'skip', confidence: 0.99 }])),
    }
    const service = createChatService({
      respond: async ({ message }) => ({
        text: /experience/i.test(message)
          ? 'Nelson has customer-service and automotive experience. He also completed a Certificate IV.'
          : 'Nelson completed a Diploma and Bachelor degree at Deakin University, plus automotive qualifications.',
      }),
    }, {
      moderation: createModerationService(classifier, 0.75),
      contextSigner: signer,
      today: '2026-09-24',
      knowledgeEnabled: true,
      knowledge: { execute: async ({ message }) => {
        knowledgeQueries.push(message)
        return { evidence: [], citations: [], degraded: false }
      } },
      planner: {
        planNextStep: async ({ message, stepsUsed, allowedTools }) => {
          if (stepsUsed > 0 || !allowedTools?.includes('search_knowledge')) return null
          return { kind: 'tool_calls', calls: [{ id: 'profile', name: 'search_knowledge', arguments: { query: message } }] }
        },
      },
    })

    const first = await service.send({ message: 'What is your experience?' })
    if (first.status !== 'replied') throw new Error('Expected the experience answer')
    const education = await service.send({ message: 'How about the education?', contextToken: first.contextToken })

    expect(education.status).toBe('replied')
    expect(knowledgeQueries).toEqual(['What is your experience?', "Tell me about Nelson's education."])
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

  it('retains the source project label through long turns and resolves the requested follow-up fact', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    let contextToken: string | undefined
    let routeToolsCalls = 0
    let resolvedKnowledgeQuery = ''
    const availableDecision = (availableTools: string[], use: string[]) => Object.fromEntries(
      availableTools.map((tool) => [tool, { label: use.includes(tool) ? 'use' : 'skip', confidence: 0.99 }]),
    )
    const service = createChatService({ respond: async () => ({ text: 'I used the available project data.' }) }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async ({ message, availableTools = [] }) => ({
          allowed: true,
          toolDecisions: availableDecision(availableTools, message.includes('currently doing')
            ? ['coding_history', 'search_knowledge']
            : message.includes('language') ? ['search_knowledge'] : []),
        }),
        routeTools: async ({ availableTools }) => {
          routeToolsCalls += 1
          return availableDecision(availableTools, [])
        },
      } as ModerationService,
      contextSigner: signer,
      today: '2026-09-24',
      knowledgeEnabled: true,
      knowledge: { execute: async ({ message }) => {
        resolvedKnowledgeQuery = resolveKnowledgeQuery(message, [], (await signer.verify(contextToken))?.topicAnchors ?? [])
        return { evidence: [], citations: [], degraded: false }
      } },
      codingHistoryEnabled: true,
      codingHistory: {
        summary: async () => ({ totalSeconds: 3_600, activeDays: 2, heartbeatCount: 10 }),
        byProject: async () => [{ name: 'QueueKit', seconds: 3_600, heartbeats: 10 }],
        byLanguage: async () => [],
        projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [],
        streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
      planner: {
        planNextStep: async ({ message, allowedTools }) => {
          if (!allowedTools?.length) return null
          const calls = allowedTools.map((name, index) => name === 'coding_history'
            ? { id: `${index}`, name, arguments: { op: 'by_project', from: '2026-08-26', to: '2026-09-24' } }
            : { id: `${index}`, name, arguments: { query: message } })
          return { kind: 'tool_calls', calls }
        },
      },
    })

    const send = async (message: string) => {
      const result = await service.send({ message, contextToken })
      if (result.status !== 'replied') throw new Error(`Expected a reply for ${message}`)
      contextToken = result.contextToken
      return result
    }

    await send('What project are you currently doing?')
    const firstContext = await signer.verify(contextToken)
    expect(firstContext?.topicAnchors.at(-1)?.entityLabel).toBe('QueueKit')
    for (let turn = 0; turn < 7; turn += 1) await send(`Thanks ${turn + 1}.`)
    await send('What language is that project written in?')

    expect(resolvedKnowledgeQuery).toBe('What language is QueueKit written in?')
    for await (const _event of service.sendStream({ message: 'What project are you currently doing?', contextToken })) { /* collect streamed turn */ }
    expect(routeToolsCalls).toBe(0)
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
    ).resolves.toEqual({ status: 'replied', text: 'Hello from the assistant.', model: 'test/model', contextToken: '{"messages":[{"role":"user","content":"Hello"},{"role":"assistant","content":"Hello from the assistant."}],"topicAnchors":[],"projectListState":{"clarificationAsked":false,"shownProjectIds":[],"shortlistStarted":false}}' })
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

  it('locks a signed forty-message conversation before moderation or tools run', async () => {
    let moderationCalled = false
    let responderCalled = false
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `turn ${index}`,
    }))
    const service = createChatService({ respond: async () => { responderCalled = true; return { text: 'answer' } } }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => { moderationCalled = true; return { allowed: true } },
      } as ModerationService,
      contextSigner: {
        verify: async () => ({ messages, topicAnchors: [] }),
        sign: async () => 'unused',
      } as ChatContextSigner,
      knowledgeEnabled: true,
      knowledge: { execute: async () => { throw new Error('should not retrieve') } },
    })

    await expect(service.send({ message: 'one more', contextToken: 'valid' })).resolves.toEqual({ status: 'turn_limit' })
    expect(moderationCalled).toBe(false)
    expect(responderCalled).toBe(false)
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

  it('emits thinking before chat screening starts', async () => {
    let moderationCalled = false
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      moderation: {
        ...baseDependencies.moderation,
        checkChat: async () => { moderationCalled = true; return { allowed: true } },
      } as ModerationService,
    })
    const stream = service.sendStream({ message: 'Hello' })

    expect(await stream.next()).toEqual({
      done: false,
      value: { type: 'status', status: 'thinking' },
    })
    expect(moderationCalled).toBe(false)
    await stream.return(undefined)
  })

  it('returns a typed turn-limit error without running moderation or the responder', async () => {
    let moderationCalled = false
    let responderCalled = false
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
      content: `turn ${index}`,
    }))
    const service = createChatService({
      respond: async () => { responderCalled = true; return { text: 'should not appear' } },
      stream: async function *() { responderCalled = true; yield { delta: 'should not appear' } },
    } as ChatStreamingResponder, {
      ...baseDependencies,
      moderation: {
        ...baseDependencies.moderation,
        checkChat: async () => { moderationCalled = true; return { allowed: true } },
      } as ModerationService,
      contextSigner: { verify: async () => ({ messages, topicAnchors: [] }), sign: async () => 'unused' } as ChatContextSigner,
    })
    const events: unknown[] = []
    for await (const event of service.sendStream({ message: 'one more', contextToken: 'valid' })) events.push(event)
    expect(events).toEqual([{
      type: 'status',
      status: 'thinking',
    }, {
      type: 'error',
      code: 'turn_limit',
      message: 'This chat has reached its 20-turn limit. Clear the chat to start a new conversation.',
    }])
    expect(moderationCalled).toBe(false)
    expect(responderCalled).toBe(false)
  })

  it('streams a broad project request normally when Jev does not select inventory', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    let responderCalled = false
    const service = createChatService({
      respond: async () => { responderCalled = true; return { text: 'Here are the projects I built.' } },
      stream: async function *() { responderCalled = true; yield { delta: 'Here are the projects I built.' }; yield { done: true as const, text: 'Here are the projects I built.', model: 'test/model' } },
    } as ChatStreamingResponder, {
      ...baseDependencies,
      moderation: {
        ...baseDependencies.moderation,
        checkChat: async () => ({ allowed: true }),
      } as ModerationService,
      contextSigner: signer,
    })
    const events = await collect(service, 'What projects have you built?')

    expect(events).toHaveLength(5)
    expect(events[0]).toEqual({ type: 'status', status: 'thinking' })
    expect(events[2]).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[3]).toEqual({ type: 'token', delta: 'Here are the projects I built.' })
    expect(events[4]).toMatchObject({ type: 'done' })
    expect(responderCalled).toBe(true)
    expect(JSON.stringify(events)).not.toContain('What kind of projects')
  })

  it('repairs invalid streamed tool arguments once before running the source call', async () => {
    let plannerCalls = 0
    let fetchedStats = 0
    const service = createChatService(streamingResponder(['checked']), {
      ...baseDependencies,
      moderation: {
        ...baseDependencies.moderation,
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'coding_stats' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      planner: {
        planNextStep: async () => {
          plannerCalls += 1
          return { kind: 'tool_calls', calls: [{
            id: 'activity',
            name: 'coding_stats',
            arguments: plannerCalls === 1
              ? { range: 'last_7_days' }
              : { category: 'activity', range: 'last_7_days' },
          }] }
        },
      },
      codingStatsEnabled: true,
      codingStats: { fetchSummary: async () => { fetchedStats += 1; return codingActivityResult('last_7_days') } },
    })

    const events = await collect(service, 'Show my WakaTime activity for the last week.')

    expect(plannerCalls).toBe(2)
    expect(fetchedStats).toBe(1)
    expect(events.filter((event) => (event as { type?: string }).type === 'tool_start')).toHaveLength(2)
    expect(events.some((event) => (event as { type?: string; status?: string }).type === 'status' && (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('streams tokens and finishes with a signed context token', async () => {
    const service = createChatService(streamingResponder(['Hel', 'lo']), baseDependencies)

    expect(await collect(service, 'Hello')).toEqual([
      { type: 'status', status: 'thinking' },
      { type: 'status', status: 'preparing_arguments' },
      { type: 'status', status: 'composing_reply' },
      { type: 'token', delta: 'Hel' },
      { type: 'token', delta: 'lo' },
      { type: 'done', contextToken: 'signed', model: 'test/model' },
    ])
  })

  it('emits typed public-share tool events for weekly coding activity', async () => {
    let fetchedQuery: CodingStatsRequest | undefined
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { category: 'activity', range: 'last_7_days' } }] }, null]),
      codingStats: { fetchSummary: async (query) => { fetchedQuery = query; return codingActivityResult(query.range) } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much did you code this week?')

    expect(fetchedQuery).toEqual({ category: 'activity', range: 'last_7_days' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    expect(JSON.stringify(events)).toContain('WakaTime public share activity')
    expect(events.find((event) => (event as { status?: string }).status === 'composing_reply')).toEqual({ type: 'status', status: 'composing_reply' })
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

    expect(events.some((event) => (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result' })
    expect(events.find((event) => (event as { status?: string }).status === 'composing_reply')).toEqual({ type: 'status', status: 'composing_reply' })
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
      { type: 'status', status: 'thinking' },
      { type: 'status', status: 'preparing_arguments' },
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
      { type: 'status', status: 'thinking' },
      { type: 'status', status: 'preparing_arguments' },
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

  it('yields thinking then blocks messages without touching tools or the responder', async () => {
    let toolCalls = 0
    const service = createChatService(streamingResponder(['never']), {
      moderation: { checkContact: async () => ({ allowed: true }), checkChat: async () => ({ allowed: false }) } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'unused' } as ChatContextSigner,
      codingStats: { fetchSummary: async () => { toolCalls += 1; return codingActivityResult('last_7_days') } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much did you code this week?')

    expect(events).toEqual([
      { type: 'status', status: 'thinking' },
      { type: 'error', message: 'I couldn’t confidently classify your request. Please rephrase it as a question about Nelson or this site’s assistant.' },
    ])
    expect(toolCalls).toBe(0)
  })

  it('answers history questions from the warehouse and skips the public-share tool', async () => {

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
      codingStats: { fetchSummary: async (query) => { apiCalls += 1; return codingActivityResult(query.range) } },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much did I code in 2025?')

    expect(apiCalls).toBe(0)
    expect(events.some((event) => (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_history' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result', name: 'coding_history' })
    expect(events.find((event) => (event as { status?: string }).status === 'composing_reply')).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('uses the public share when a recent range-less question is approved', async () => {
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { category: 'activity', range: 'last_7_days' } }] }, null]),
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
      codingStats: { fetchSummary: async (query) => codingActivityResult(query.range) },
      codingStatsEnabled: true,
    })


    const events = await collect(service, 'How much did you code this week?')

    expect(events.some((event) => (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    expect(events.find((event) => (event as { status?: string }).status === 'composing_reply')).toEqual({ type: 'status', status: 'composing_reply' })
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('answers range-less total-hours questions from the public share, not the import snapshot', async () => {
    let historyCalls = 0
    const service = createChatService(streamingResponder(['ok']), {
      ...baseDependencies,
      planner: scriptedPlanner([{ kind: 'tool_calls', calls: [{ id: '1', name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' } }] }, null]),
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
      codingStats: { fetchSummary: async (query) => codingActivityResult(query.range) },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'What is your total coding hours?')

    expect(historyCalls).toBe(0)
    expect(events.some((event) => (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
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
      codingStats: { fetchSummary: async (query) => codingActivityResult(query.range) },
      codingStatsEnabled: true,
    })

    const events = await collect(service, 'How much time did I spend on best-maker-web in 2025?')

    expect(summaryCalls).toBe(0)
    expect(events.some((event) => (event as { status?: string }).status === 'preparing_arguments')).toBe(true)
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_history', label: 'SEARCHING CODING HISTORY…' })
    const toolResult = events.find((event) => (event as { type?: string }).type === 'tool_result')
    expect(toolResult).toMatchObject({ type: 'tool_result', name: 'coding_history' })
    expect(JSON.stringify(toolResult)).toContain('best-maker-web')
    expect(events[events.length - 1]).toMatchObject({ type: 'done' })
  })

  it('asks the catalogue for exact totals when Jev is uncertain about a count question', async () => {
    let received: { op?: string } | undefined
    const service = createChatService(streamingResponder(['ok']), {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: 'uncertain',
          confidence: 0.5,
        }])),
      } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      knowledgeEnabled: true,
      knowledge: {
        listOwnedProjects: async (query) => {
          received = query
          return {
            projects: [],
            hasMore: false,
            matchingTotal: 111,
            breakdown: [
              { dimension: 'visibility', key: 'true', count: 89 },
              { dimension: 'visibility', key: 'false', count: 22 },
            ],
          }
        },
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
      },
    })

    const result = await service.send({ message: 'how many projects do you have?' })

    expect(result.status).toBe('replied')
    // The uncertain path has no planner, so the deterministic matcher must ask
    // for the count op; without it the question degrades to a truncated list.
    expect(received).toMatchObject({ op: 'count' })
  })

  it('keeps a list request on the list operation', async () => {
    let received: { op?: string } | undefined
    const service = createChatService(streamingResponder(['ok']), {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: 'uncertain',
          confidence: 0.5,
        }])),
      } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      knowledgeEnabled: true,
      knowledge: {
        listOwnedProjects: async (query) => {
          received = query
          return { projects: [], hasMore: false, matchingTotal: 0, breakdown: [] }
        },
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
      },
    })

    await service.send({ message: 'show me your projects' })

    expect(received).toBeDefined()
    expect(received?.op).toBeUndefined()
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
      codingStats: { fetchSummary: async (query) => codingActivityResult(query.range) },
      codingStatsEnabled: true,
      siteContent: {
        listProjectsPage: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getProject: async () => null,
        listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getPost: async () => null,
        listChangelogs: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getChangelog: async () => null,
        listTopics: async () => [],
        getTopic: async () => null,
      } as never,
    })

    const events = await collect(service, 'What is the total coding hours and most time spent for which project?')
    const starts = events.filter((event) => (event as { type: string }).type === 'tool_start')
    const results = events.filter((event) => (event as { type: string }).type === 'tool_result')

    expect(starts).toHaveLength(2)
    expect(results).toHaveLength(2)
    expect(JSON.stringify(starts.map((event) => (event as { name: string }).name).sort())).toContain('coding_history')
    expect(JSON.stringify(starts.map((event) => (event as { name: string }).name).sort())).toContain('coding_stats')
  })

  it('uses all-time per-project history for an all-project range follow-up', async () => {
    let historyRange: { from: string; to: string } | undefined
    let publicShareCalls = 0
    const service = createChatService({ respond: async () => ({ text: 'Project activity loaded.' }) }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true, toolDecisions: {
          coding_stats: { label: 'uncertain', confidence: 0.5 },
          coding_history: { label: 'uncertain', confidence: 0.5 },
        } }),
      } as ModerationService,
      contextSigner: { verify: async () => ({ messages: [], topicAnchors: [] }), sign: async () => 'signed' } as ChatContextSigner,
      today: '2026-09-25',
      codingStatsEnabled: true,
      codingStats: { fetchSummary: async () => { publicShareCalls += 1; return null } },
      codingHistoryEnabled: true,
      codingHistory: {
        summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        byProject: async (range) => { historyRange = range; return [{ name: 'project-a', seconds: 3600, heartbeats: 10 }] },
        byLanguage: async () => [], projectTime: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
        dailySeries: async () => [], streaks: async () => ({ longestDays: 0, currentDays: 0 }),
      },
    })

    const result = await service.send({ message: 'How about the all time status for all the projects?' })

    expect(historyRange).toMatchObject({ from: '2000-01-01', to: '2026-09-25' })
    expect(publicShareCalls).toBe(0)
    expect(result.status).toBe('replied')
  })

  it('routes showcase questions to live site content with SSE events', async () => {
    const { planner: _skipped, ...deps } = baseDependencies
    void _skipped
    const service = createChatService(streamingResponder(['ok']), {
      ...deps,
      siteContent: {
        listProjectsPage: async () => ({ items: [{ slug: 'demo-app', title: 'Demo App', summary: 'A demo showcase app', technologies: ['Next.js'], featured: true, coverImage: { url: null, alt: null }, gallery: [], role: null, projectStatus: 'completed' as const, startDate: null, endDate: null, updatedAt: '2026-01-01T00:00:00.000Z', createdAt: '2025-12-31T00:00:00.000Z' }], page: 1, totalPages: 1, totalDocs: 1 }),
        getProject: async () => null,
        listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getPost: async () => null,
        listChangelogs: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        getChangelog: async () => null,
        listTopics: async () => [],
        getTopic: async () => null,
      },
    })

    const events = await collect(service, 'Does he have some project demo showcase?')

    expect(events[1]).toMatchObject({ type: 'tool_start', name: 'site_content', label: 'BROWSING SITE CONTENT…' })
    expect(events[2]).toMatchObject({ type: 'tool_result', name: 'site_content' })
    expect(JSON.stringify(events[2])).toContain('Demo App')
  })

  type SiteContentReader = Pick<
    ContentReader,
    'listProjectsPage' | 'getProject' | 'listPosts' | 'getPost' | 'listChangelogs' | 'getChangelog' | 'listTopics' | 'getTopic'
  >
  type SiteContentFakeOverrides = Partial<SiteContentReader>

  /**
   * Builds a reader whose collection methods answer empty and record which op served each
   * call. An override replaces the returned data but is still recorded, so a routed op is
   * provable from `ops` even when the test supplies its own rows.
   */
  function siteContentFakes(overrides: SiteContentFakeOverrides = {}): { reader: SiteContentReader; ops: string[] } {
    const ops: string[] = []
    const emptyPage = { items: [], page: 1, totalPages: 1, totalDocs: 0 }
    const methods = {
      listProjectsPage: async () => emptyPage,
      getProject: async () => null,
      listPosts: async () => emptyPage,
      getPost: async () => null,
      listChangelogs: async () => emptyPage,
      getChangelog: async () => null,
      listTopics: async () => [],
      getTopic: async () => null,
      ...overrides,
    }
    const reader = {
      listProjectsPage: async (input: ListPostsInput) => (ops.push('list_projects'), methods.listProjectsPage(input)),
      getProject: async (slug: string) => (ops.push('get_project'), methods.getProject(slug)),
      listPosts: async (input: ListPostsInput) => (ops.push('list_posts'), methods.listPosts(input)),
      getPost: async (slug: string) => (ops.push('get_post'), methods.getPost(slug)),
      listChangelogs: async (input: ListPostsInput) => (ops.push('list_changelogs'), methods.listChangelogs(input)),
      getChangelog: async (slug: string) => (ops.push('get_changelog'), methods.getChangelog(slug)),
      listTopics: async () => (ops.push('list_topics'), methods.listTopics()),
      getTopic: async (slug: string) => (ops.push('get_topic'), methods.getTopic(slug)),
    } satisfies SiteContentReader
    return { reader, ops }
  }

  function siteContentService(siteContent: SiteContentReader) {
    const { planner: _skipped, ...deps } = baseDependencies
    void _skipped
    return createChatService(streamingResponder(['ok']), {
      ...deps,
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'site_content' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      siteContent,
    })
  }

  /**
   * Reproduces the reported failure: Jev answers a site-scoped question from the
   * owned-project catalogue and skips site_content. The forced guard must add the
   * Payload lookup back so the responder can describe the published showcase.
   */
  function catalogueOnlyService(siteContent: SiteContentReader) {
    const { planner: _skipped, ...deps } = baseDependencies
    void _skipped
    return createChatService(streamingResponder(['ok']), {
      ...deps,
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({ allowed: true }),
        routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
          label: tool === 'list_owned_projects' ? 'use' : 'skip',
          confidence: 0.99,
        }])),
      } as ModerationService,
      siteContent,
    })
  }

  it('answers site-orientation questions with the section list even when Jev skips it', async () => {
    const { reader, ops } = siteContentFakes()

    const events = await collect(catalogueOnlyService(reader), 'what can i do on this site?')

    // The section list is static, so the reader records no collection call; assert
    // the op through the tool result the turn actually emitted instead.
    expect(ops).toEqual([])
    const summary = toolResultSummaries(events).join('\n')
    expect(summary).toContain('Site sections (7):')
    // Every section must survive the 600-char tool-output budget, not just the head.
    for (const path of ['/', '/about', '/projects', '/blog', '/changelog', '/contact', '/chat'])
      expect(summary).toContain(`(${path})`)
  })

  it('routes a where-is-the-contact-page question to the section list', async () => {
    const { reader } = siteContentFakes()

    const events = await collect(siteContentService(reader), 'where can i find the contact page?')

    expect(toolResultSummaries(events).join('\n')).toContain('Site sections (7):')
  })

  it('shows only the sources the reply cites, not every catalogue project it touched', async () => {
    const { reader } = siteContentFakes()
    const projects = Array.from({ length: 10 }, (_, index) => ({
      sourceType: 'github' as const,
      sourceId: `lst97/repo-${index}`,
      title: `repo-${index}`,
      url: `https://github.com/lst97/repo-${index}`,
      isPublic: true,
      summary: `Repository ${index}`,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stars: index,
      forks: 0,
      primaryLanguage: 'TypeScript',
      languages: ['TypeScript'],
      kinds: ['web_app' as const],
      githubTopics: [],
      curatedTopics: [],
      timeSpentSeconds: 0,
      mostStarred: false,
    }))
    const service = createChatService(
      streamingResponder(['The latest post is "Measuring layout" [K1].']),
      {
        ...baseDependencies,
        moderation: {
          checkContact: async () => ({ allowed: true }),
          checkChat: async () => ({ allowed: true }),
          routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
            label: tool === 'list_owned_projects' ? 'use' : 'skip',
            confidence: 0.99,
          }])),
        } as ModerationService,
        knowledgeEnabled: true,
        knowledge: {
          execute: async () => ({ evidence: [], citations: [], degraded: false }),
          listOwnedProjects: async () => ({ projects, hasMore: false, matchingTotal: 10, breakdown: [] }),
        },
        siteContent: reader,
      },
    )

    const events = await collect(service, 'what is the latest project post in this site?')
    const citationEvent = events.find(
      (event) => typeof event === 'object' && event !== null && 'type' in event && event.type === 'citations',
    )
    const citations =
      typeof citationEvent === 'object' && citationEvent !== null && 'citations' in citationEvent
        ? (citationEvent.citations as { id: string; title: string }[])
        : []

    // The turn touched ten catalogue projects, but the reply rests on [K1] alone.
    expect(citations.map((citation) => citation.id)).toEqual(['K1'])
  })

  it('keeps a bounded fallback when the reply cites nothing', async () => {
    const { reader } = siteContentFakes()
    const service = createChatService(
      streamingResponder(['There is nothing published here yet.']),
      {
        ...baseDependencies,
        moderation: {
          checkContact: async () => ({ allowed: true }),
          checkChat: async () => ({ allowed: true }),
          routeTools: async ({ availableTools }) => Object.fromEntries(availableTools.map((tool) => [tool, {
            label: tool === 'site_content' ? 'use' : 'skip',
            confidence: 0.99,
          }])),
        } as ModerationService,
        siteContent: reader,
      },
    )

    const events = await collect(service, 'what is the latest post in this site?')
    const citationEvent = events.find(
      (event) => typeof event === 'object' && event !== null && 'type' in event && event.type === 'citations',
    )

    expect(citationEvent).toBeUndefined()
  })

  it('reaches the published showcase for a site-scoped project question even when Jev skips it', async () => {
    const { reader, ops } = siteContentFakes({
      listProjectsPage: async () => ({ items: [{ slug: 'walk-through', title: 'My overall projects walk through', summary: 'Portfolio entry.', technologies: [], featured: true, coverImage: { url: null, alt: null }, gallery: [], role: null, projectStatus: 'completed', startDate: null, endDate: null, updatedAt: '2026-01-01T00:00:00.000Z' }], page: 1, totalPages: 1, totalDocs: 1 }),
    })

    const events = await collect(catalogueOnlyService(reader), 'what is the current projects in this site have?')

    expect(ops).toContain('list_projects')
    expect(toolResultSummaries(events).join('\n')).toContain('My overall projects walk through')
  })

  it('reaches both the published showcase and the post list for a site-scoped release question', async () => {
    const { reader, ops } = siteContentFakes()

    await collect(catalogueOnlyService(reader), 'what is the latest blog post and project post this site released?')

    expect(ops).toEqual(expect.arrayContaining(['list_posts', 'list_projects']))
  })

  function toolResultSummaries(events: unknown[]) {
    return events
      .filter((event) => typeof event === 'object' && event !== null && 'type' in event && event.type === 'tool_result')
      .map((event) => (event as { summary: string }).summary)
  }




  it('reads the changelog collection for a changelog question instead of the post list', async () => {
    const { reader, ops } = siteContentFakes({
      listChangelogs: async () => ({
        items: [{ slug: 'v1-2-0', title: 'Release 1.2.0', version: '1.2.0', excerpt: 'Adds the changelog tool.', publishedAt: '2026-09-01', updatedAt: '2026-09-02', createdAt: '2026-08-30', tags: [], changeTypes: ['feature'], coverImage: { url: null, alt: null } }],
        page: 1,
        totalPages: 1,
        totalDocs: 1,
      }),
    })

    const events = await collect(siteContentService(reader), 'What is the latest changelog on this site?')

    expect(ops).toEqual(['list_changelogs'])
    expect(toolResultSummaries(events).join('\n')).toContain('Release 1.2.0')
  })

  it('reads the topic collection for a topic question', async () => {
    const { reader, ops } = siteContentFakes({
      listTopics: async () => [{ id: 1, title: 'AI', slug: 'ai', description: 'Machine learning work.' }],
    })

    const events = await collect(siteContentService(reader), 'What topics do you cover?')

    expect(ops).toEqual(['list_topics'])
    expect(toolResultSummaries(events).join('\n')).toContain('AI (ai)')
  })

  it('queries each collection once for a mixed posts, projects, and changelog request', async () => {
    const { reader, ops } = siteContentFakes()

    await collect(siteContentService(reader), 'List your blog posts, projects, and changelog entries')

    expect(ops).toEqual(['list_posts', 'list_projects', 'list_changelogs'])
  })



  it('records a redacted non-streamed query, Jev decision, RAG candidates, and reported usage', async () => {
    const signer = createChatContextSigner('a-secret-key-with-at-least-32-characters')
    const records: Array<Record<string, unknown>> = []
    const service = createChatService({
      respond: async (input) => {
        input.onModelCall?.({ provider: 'openrouter', operation: 'response', model: 'test/responder', status: 'succeeded', inputTokens: 40, outputTokens: 8, totalTokens: 48, costUsd: 0.001 })
        return { text: 'SIT320-Project-MD5 is a verified project.' }
      },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async (_input, observer) => {
          observer?.onModelCall({ provider: 'jev', operation: 'moderation', model: 'jev-latest', status: 'succeeded', inputTokens: 15, outputTokens: 2 })
          observer?.onJevDecision({ stage: 'moderation', decisions: {
            scope: { label: 'owner_projects', confidence: 0.98 },
            safety: { label: 'safe', confidence: 0.99 },
            search_knowledge: { label: 'use', confidence: 0.97 },
          } })
          return { allowed: true, toolDecisions: { search_knowledge: { label: 'use', confidence: 0.97 } } }
        },
      } as ModerationService,
      contextSigner: signer,
      knowledgeEnabled: true,
      knowledge: {
        execute: async (input) => {
          input.diagnostics?.onModelCall?.({ provider: 'siliconflow', operation: 'query_embedding', status: 'succeeded', inputTokens: 20, totalTokens: 20 })
          input.diagnostics?.onRetrieval?.({ query: input.message, degraded: false, candidates: [{
            id: 'doc-1', sourceId: 'lst97/SIT320-Project-MD5', sourceType: 'github', title: 'SIT320-Project-MD5', isPublic: true,
            excerpt: 'Verified project evidence', retrievedRank: 1, rerankScore: 0.9, relevanceProbability: 0.95,
            answerEvidenceProbability: 0.91, outcome: 'accepted', finalSelected: true,
          }] })
          return { evidence: [], citations: [], degraded: false }
        },
      },
      planner: { planNextStep: async (input) => {
        input.onModelCall?.({ provider: 'openrouter', operation: 'planner', model: 'test/planner', status: 'succeeded', inputTokens: 30, outputTokens: 5, totalTokens: 35 })
        return { kind: 'tool_calls', calls: [{ id: 'search', name: 'search_knowledge', arguments: { query: input.message } }] }
      } },
      diagnosticsSink: { enqueue: (record) => records.push(record as unknown as Record<string, unknown>) },
    })

    const result = await service.send({
      message: 'What is SIT320-Project-MD5?',
      diagnosticsMetadata: { ipAddress: '203.0.113.8', browser: { name: 'Chrome', operatingSystem: 'macOS', device: 'desktop' } },
    })
    const record = records[0]

    expect(result.status).toBe('replied')
    expect(record).toMatchObject({
      query: 'What is SIT320-Project-MD5?',
      response: 'SIT320-Project-MD5 is a verified project.',
      outcome: 'complete',
      metadata: { ipAddress: '203.0.113.8', browser: { name: 'Chrome', operatingSystem: 'macOS', device: 'desktop' } },
    })
    expect(record?.jevDecisions).toHaveLength(1)
    expect(record?.ragRetrievals).toMatchObject([{ candidates: [{ sourceId: 'lst97/SIT320-Project-MD5', finalSelected: true }] }])
    expect(record?.modelCalls).toMatchObject([
      { provider: 'jev', operation: 'moderation', inputTokens: 15, outputTokens: 2 },
      { provider: 'openrouter', operation: 'planner', inputTokens: 30, outputTokens: 5 },
      { provider: 'siliconflow', operation: 'query_embedding', inputTokens: 20 },
      { provider: 'openrouter', operation: 'response', inputTokens: 40, outputTokens: 8, totalTokens: 48, costUsd: 0.001 },
    ])
    expect(record).not.toHaveProperty('contextToken')
  })

  it('records the final streamed assistant response without adding diagnostics to SSE events', async () => {
    const records: Array<Record<string, unknown>> = []
    const responder: ChatStreamingResponder = {
      respond: async () => ({ text: 'unused' }),
      async *stream(input) {
        input.onModelCall?.({ provider: 'openrouter', operation: 'response', status: 'succeeded', inputTokens: 12, outputTokens: 3, totalTokens: 15 })
        yield { delta: 'Streamed answer' }
        yield { done: true, text: 'Streamed answer' }
      },
    }
    const service = createChatService(responder, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async (_input, observer) => {
          observer?.onJevDecision({ stage: 'moderation', decisions: { scope: { label: 'owner_context', confidence: 0.9 } } })
          return { allowed: true }
        },
      } as ModerationService,
      contextSigner: createChatContextSigner('a-secret-key-with-at-least-32-characters'),
      diagnosticsSink: { enqueue: (record) => records.push(record as unknown as Record<string, unknown>) },
    })

    const events = []
    for await (const event of service.sendStream({ message: 'Tell me about Nelson’s work.' })) events.push(event)

    expect(records[0]).toMatchObject({ outcome: 'complete', response: 'Streamed answer' })
    expect(JSON.stringify(events)).not.toContain('inputTokens')
    expect(JSON.stringify(events)).not.toContain('traceId')
  })
})
