import { describe, expect, it } from 'bun:test'

import { createChatService } from '../../src/server/chat/service'
import { createChatContextSigner } from '../../src/server/chat/context-signer'
import type { ChatContextSigner } from '../../src/server/chat/context-signer'
import type { ChatResponderInput, ChatStreamingResponder } from '../../src/server/chat/types'
import type { ModerationService } from '../../src/server/moderation/service'
import type { CodingStatsRequest, CodingStatsResult } from '../../src/server/wakatime/stats'

const publicShareResult = (range: CodingStatsRequest['range']): CodingStatsResult => ({
  category: 'activity',
  period: { range, start: '2024-02-06T13:00:00Z', end: '2026-09-23T13:59:59Z' },
  retrievedAtUtc: '2026-09-24T13:00:00.000Z',
  totalSeconds: 11_744_496,
  daysInPeriod: 960,
  humanReadableTotal: '3,262 hrs 21 mins',
})

const SIGNING_SECRET = 'a-secret-key-with-at-least-32-characters'

describe('chat tool acceptance follow-up', () => {
  it('executes an approved coding lookup after the user accepts the prior offer', async () => {
    const signer = createChatContextSigner(SIGNING_SECRET)
    const contextToken = await signer.sign({
      messages: [
        { role: 'user', content: 'How about the coding hours?' },
        { role: 'assistant', content: 'I do not have the public-share result yet. Want me to fetch it?' },
      ],
      topicAnchors: [],
    })
    let statsCalls = 0
    let responderInput: ChatResponderInput | undefined
    const service = createChatService({
      respond: async (input) => {
        responderInput = input
        return { text: 'The WakaTime public-share result is 3,262 hours.' }
      },
    }, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({
          allowed: true,
          toolDecisions: {
            search_knowledge: { label: 'skip', confidence: 0.99 },
            coding_stats: { label: 'use', confidence: 0.99 },
            coding_history: { label: 'skip', confidence: 0.99 },
            site_content: { label: 'skip', confidence: 0.99 },
          },
        }),
      } as ModerationService,
      contextSigner: signer as ChatContextSigner,
      codingStatsEnabled: true,
      codingStats: {
        fetchSummary: async (query) => {
          statsCalls += 1
          return publicShareResult(query.range)
        },
      },
      planner: {
        planNextStep: async () => ({ kind: 'final_answer', text: 'I should not ask for permission.' }),
      },
    })

    const result = await service.send({ message: 'yes please', contextToken })

    expect(result.status).toBe('replied')
    expect(statsCalls).toBe(1)
    expect(responderInput?.extraContext).toContain('3,262 hrs 21 mins')
    expect(responderInput?.toolRoutingUnavailable).not.toBe(true)
  })

  it('executes the accepted coding lookup on the streaming path', async () => {
    const signer = createChatContextSigner(SIGNING_SECRET)
    const contextToken = await signer.sign({
      messages: [
        { role: 'user', content: 'How about the coding hours?' },
        { role: 'assistant', content: 'I do not have the public-share result yet. Want me to fetch it?' },
      ],
      topicAnchors: [],
    })
    let statsCalls = 0
    let responderInput: ChatResponderInput | undefined
    const streamingResponder: ChatStreamingResponder = {
      respond: async () => ({ text: 'unused' }),
      stream: async function * (input: ChatResponderInput) {
        responderInput = input
        yield { delta: 'The WakaTime public-share result is 3,262 hours.', model: 'test/model' }
        yield { done: true as const, text: 'The WakaTime public-share result is 3,262 hours.', model: 'test/model' }
      },
    }
    const service = createChatService(streamingResponder, {
      moderation: {
        checkContact: async () => ({ allowed: true }),
        checkChat: async () => ({
          allowed: true,
          toolDecisions: {
            search_knowledge: { label: 'skip', confidence: 0.99 },
            coding_stats: { label: 'use', confidence: 0.99 },
            coding_history: { label: 'skip', confidence: 0.99 },
            site_content: { label: 'skip', confidence: 0.99 },
          },
        }),
      } as ModerationService,
      contextSigner: signer as ChatContextSigner,
      codingStatsEnabled: true,
      codingStats: {
        fetchSummary: async (query) => {
          statsCalls += 1
          return publicShareResult(query.range)
        },
      },
      planner: {
        planNextStep: async () => ({ kind: 'final_answer', text: 'I should not ask for permission.' }),
      },
    })

    const events: unknown[] = []
    for await (const event of service.sendStream({ message: 'yes please', contextToken })) events.push(event)

    expect(statsCalls).toBe(1)
    expect(responderInput?.extraContext).toContain('3,262 hrs 21 mins')
    expect(events.find((event) => (event as { type?: string }).type === 'tool_start')).toMatchObject({ type: 'tool_start', name: 'coding_stats' })
    expect(events.find((event) => (event as { type?: string }).type === 'tool_result')).toMatchObject({ type: 'tool_result', name: 'coding_stats' })
    expect(events.at(-1)).toMatchObject({ type: 'done' })
  })
})
