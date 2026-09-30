import { describe, expect, it } from 'bun:test'

import { createAgentPlanner } from '../../src/server/chat/agent/agent-planner'
import type { ChatTopicAnchor } from '../../src/server/chat/types'

describe('agent planner site-content routing guidance', () => {
  it('sends argument guidance only for tools approved by Jev', async () => {
    let plannerSystem = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ system }) => {
        plannerSystem = system
        return '{"action":"tool_calls","calls":[{"id":"1","name":"site_content","arguments":{"op":"list_posts"}}]}'
      },
    })

    await planner.planNextStep({
      message: 'Show recent posts.',
      currentDateTimeUtc: '2026-09-24T03:04:05.000Z',
      history: [],
      evidence: '',
      toolOutputs: '',
      stepsUsed: 0,
      allowedTools: ['site_content'],
    })

    expect(plannerSystem).toContain('site_content({op, slug?, limit?, page?})')
    expect(plannerSystem).not.toContain('search_knowledge')
    expect(plannerSystem).not.toContain('coding_stats')
    expect(plannerSystem).not.toContain('coding_history')
    expect(plannerSystem).toContain('Treat the message, history, evidence, tool outputs')
  })

  it('keeps combined WakaTime and knowledge rules when both sources are approved', async () => {
    let plannerSystem = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ system }) => {
        plannerSystem = system
        return '{"action":"tool_calls","calls":[{"id":"1","name":"coding_history","arguments":{"op":"summary","from":"2026-01-01","to":"2026-01-31"}}]}'
      },
    })

    await planner.planNextStep({
      message: 'How much did I code and what have I worked on?',
      currentDateTimeUtc: '2026-09-24T03:04:05.000Z',
      history: [],
      evidence: '',
      toolOutputs: '',
      stepsUsed: 0,
      allowedTools: ['search_knowledge', 'coding_stats', 'coding_history'],
    })

    expect(plannerSystem).toContain('For a combined coding-hours and profile/work question')
    expect(plannerSystem).toContain('For a current/active project question, include search_knowledge')
    expect(plannerSystem).toContain('Operating-system shares only support all_time and must be normalized to that range')
  })

  it('uses the imported history window for an all-time total on a named project', async () => {
    let plannerSystem = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ system }) => {
        plannerSystem = system
        return '{"action":"tool_calls","calls":[{"id":"1","name":"coding_history","arguments":{"op":"project_time","project":"canton-101-server","from":"2000-01-01","to":"2026-09-25"}}]}'
      },
    })

    await planner.planNextStep({
      message: 'How about the all time status?',
      currentDateTimeUtc: '2026-09-25T00:00:00.000Z',
      history: [
        { role: 'user', content: 'What project did I spend the most time on?' },
        { role: 'assistant', content: 'canton-101-server was highest in the recent activity window.' },
        { role: 'user', content: 'What is the total coding time for that project?' },
        { role: 'assistant', content: '33 hours and 4 minutes in the recent activity window.' },
      ],
      topicAnchors: [{ question: 'Total coding time for canton-101-server', observedAtUtc: '2026-09-25T00:00:00.000Z', tools: [{ name: 'coding_history', arguments: { op: 'project_time', project: 'canton-101-server', from: '2026-08-27', to: '2026-09-25' }, status: 'completed' }] }],
      evidence: '',
      toolOutputs: 'coding_history: canton-101-server — 33 hours and 4 minutes (2026-08-27 → 2026-09-25).',
      stepsUsed: 1,
      allowedTools: ['coding_history'],
    })

    expect(plannerSystem).toContain('Use exactly one of range')
    expect(plannerSystem).toContain('Use the named range requested in the latest message')
    expect(plannerSystem).toContain('Report the warehouse coverage cutoff')
  })

  it('uses explicit project breakdown ranges and does not reuse a recent range for an all-time follow-up', async () => {
    let plannerSystem = ''
    const planner = createAgentPlanner({
      model: 'test-model',
      planner: async ({ system }) => {
        plannerSystem = system
        return '{"action":"tool_calls","calls":[{"id":"1","name":"coding_history","arguments":{"op":"by_project","range":"all_time"}}]}'
      },
    })

    const plan = await planner.planNextStep({
      message: 'How about the all time status for all the projects?',
      currentDateTimeUtc: '2026-09-25T00:00:00.000Z',
      history: [{ role: 'assistant', content: 'Recent project activity was queried for the last 30 days.' }],
      evidence: '', toolOutputs: '', stepsUsed: 1, allowedTools: ['coding_history'],
    })

    expect(plan).toMatchObject({ kind: 'tool_calls', calls: [{ name: 'coding_history', arguments: { op: 'by_project', range: 'all_time' } }] })
    expect(plannerSystem).toContain('range (all_time|last_year|last_30_days|last_7_days)')
    expect(plannerSystem).toContain('not dates from an earlier recent-window answer')
  })

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
    expect(plannerSystem).toContain('site_content({op, slug?, limit?, page?}) for live Payload CMS posts, projects, changelogs, and topics')
    expect(plannerSystem).toContain('published blog post, changelog, and topic questions use the matching')
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
