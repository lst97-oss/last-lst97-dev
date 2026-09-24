import { describe, expect, it } from 'bun:test'

import { createAgentPlanner } from '../../src/server/chat/agent-planner'
import type { ChatTopicAnchor } from '../../src/server/chat/types'

describe('agent planner site-content routing guidance', () => {
  it('distinguishes indexed current-repository questions from live published CMS content', async () => {
    let plannerSystem = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ system }) => {
        plannerSystem = system
        return '{"action":"final_answer","text":"I have the evidence."}'
      },
    })

    await planner.planNextStep({
      message: 'How is this website repository structured?',
      currentDateTimeUtc: '2026-09-24T03:04:05.000Z',
      history: [],
      evidence: '',
      toolOutputs: '',
      stepsUsed: 0,
    })

    expect(plannerSystem).toContain('Current website repository architecture/implementation questions use search_knowledge')
    expect(plannerSystem).toContain('search_knowledge')
    expect(plannerSystem).toContain('site_content({op, slug?, limit?, page?}) for LIVE Payload CMS projects and blog posts')
    expect(plannerSystem).toContain('published blog post questions use site_content list_posts or get_post')
  })

  it('anchors relative-date interpretation to the request-time UTC clock', async () => {
    let plannerUser = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ user }) => {
        plannerUser = user
        return '{"action":"final_answer","text":"I have the evidence."}'
      },
    })

    await planner.planNextStep({
      message: 'What happened recently?',
      currentDateTimeUtc: '2026-09-24T03:04:05.000Z',
      history: [],
      evidence: '',
      toolOutputs: '',
      stepsUsed: 0,
    })

    expect(plannerUser).toContain('Current date and time: 2026-09-24T03:04:05.000Z (UTC)')
    expect(plannerUser).toContain("do not use the model's assumed current date")
  })

  it('passes bounded topic references and approved tools to the argument planner', async () => {
    let plannerUser = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ user }) => {
        plannerUser = user
        return '{"action":"tool_calls","calls":[{"id":"1","name":"search_knowledge","arguments":{"query":"Tell me about Nelson’s education."}}]}'
      },
    })
    const topicAnchors: ChatTopicAnchor[] = [{
      question: "Tell me about Nelson's experience",
      observedAtUtc: '2026-09-24T00:00:00.000Z',
      tools: [{ name: 'search_knowledge', arguments: { query: "Nelson's work experience" }, status: 'completed' }],
    }]

    await planner.planNextStep({
      message: 'How about education?',
      currentDateTimeUtc: '2026-09-24T03:04:05.000Z',
      history: [],
      topicAnchors,
      evidence: '',
      toolOutputs: '',
      stepsUsed: 0,
      allowedTools: ['search_knowledge'],
    })

    expect(plannerUser).toContain('How about education?')
    expect(plannerUser).toContain('Nelson')
    expect(plannerUser).toContain('experience')
    expect(plannerUser).toContain('completed')
    expect(plannerUser).toContain('Approved tools: search_knowledge')
    expect(plannerUser).toContain('2026-09-24T03:04:05.000Z')
    expect(plannerUser).not.toContain('https://')
    expect(plannerUser).not.toContain('Tool output text')
  })
})
