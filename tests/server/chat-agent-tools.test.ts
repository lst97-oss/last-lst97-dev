import { describe, expect, it } from 'bun:test'

import { parseAgentPlan } from '../../src/server/chat/agent-planner'
import { agentToolDefinitions, runAgentTool } from '../../src/server/chat/agent-tool-runner'

describe('agent planner', () => {
  it('parses tool-call and final-answer plans', () => {
    expect(parseAgentPlan('{"action":"tool_calls","calls":[{"id":"1","name":"coding_stats","arguments":{"range":"all_time"}}]}')).toEqual({
      kind: 'tool_calls',
      calls: [{ id: '1', name: 'coding_stats', arguments: { range: 'all_time' } }],
    })
    expect(parseAgentPlan('{"action":"final_answer","text":"Hello"}')).toEqual({ kind: 'final_answer', text: 'Hello' })
    expect(parseAgentPlan('not json')).toBeNull()
    expect(parseAgentPlan('{"action":"tool_calls","calls":[]}')).toBeNull()
  })

  it('exposes the three fixed read-only tools', () => {
    expect(agentToolDefinitions().map((tool) => tool.name).sort()).toEqual(['coding_history', 'coding_stats', 'search_knowledge', 'site_content'])
  })

  it('describes current-site repository knowledge separately from live CMS content', () => {
    const definitions = agentToolDefinitions()
    const knowledge = definitions.find((tool) => tool.name === 'search_knowledge')
    const siteContent = definitions.find((tool) => tool.name === 'site_content')
    const codingHistory = definitions.find((tool) => tool.name === 'coding_history')
    const codingStats = definitions.find((tool) => tool.name === 'coding_stats')

    expect(knowledge?.description).toContain('current website implementation')
    expect(knowledge?.description).toContain('last-updated dates')
    expect(codingHistory?.description).toContain('WakaTime heartbeat database')
    expect(codingHistory?.description).toContain('trailing 30 days')
    expect(codingHistory?.description).toContain('last-updated dates')
    expect(codingStats?.description).toContain('last 7 days')
    expect(siteContent?.description).toContain('Live Payload CMS projects and blog posts (published only)')
  })
})

describe('agent tool runner', () => {
  const runner = {
    knowledgeEnabled: false,
    codingStatsEnabled: true,
    codingHistoryEnabled: true,
    codingStats: { fetchSummary: async () => 'Coding activity (all time): 3,943 hrs total' },
    codingHistory: {
      summary: async () => ({ totalSeconds: 0, activeDays: 0, heartbeatCount: 0 }),
      byProject: async () => [],
      byLanguage: async () => [],
      projectTime: async () => ({ totalSeconds: 7200, activeDays: 4, heartbeatCount: 100 }),
      dailySeries: async () => [],
      streaks: async () => ({ longestDays: 0, currentDays: 0 }),
    },
    today: '2026-09-23',
    toolTimeoutMs: 1_000,
    logger: { warn() {} },
    siteContent: {
      listProjects: async () => [{ slug: 'demo-app', title: 'Demo App', summary: 'A demo showcase app', technologies: ['Next.js'], featured: false, coverImage: { url: null, alt: null }, role: null, projectStatus: 'completed' as const, startDate: null, endDate: null }],
      getProject: async (slug: string) => slug === 'demo-app' ? { slug: 'demo-app', title: 'Demo App', summary: 'A demo showcase app', technologies: ['Next.js'], featured: false, coverImage: { url: null, alt: null }, role: null, projectStatus: 'completed' as const, startDate: null, endDate: null, content: null, repositoryUrl: 'https://github.com/lst97/demo-app', liveUrl: 'https://demo.lst97.dev', seo: { title: null, description: null, image: { url: null, alt: null } } } : null,
      listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      getPost: async () => null,
    },
  }

  it('runs project_time against the warehouse with SSE labels', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'coding_history', arguments: { op: 'project_time', from: '2025-01-01', to: '2025-12-31', project: 'best-maker-web' } },
      runner,
    )

    expect(result.sseName).toBe('coding_history')
    expect(result.sseLabel).toBe('SEARCHING CODING HISTORY…')
    expect(result.output).toContain('best-maker-web')
  })

  it('rejects project_time without a project name', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'coding_history', arguments: { op: 'project_time', from: '2025-01-01', to: '2025-12-31' } },
      runner,
    )

    expect(result.output).toContain('requires { project }')
    expect(result.status).toBe('rejected')
  })

  it('lists live projects with demo links', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_projects' } },
      runner,
    )

    expect(result.sseName).toBe('site_content')
    expect(result.sseLabel).toBe('BROWSING SITE CONTENT…')
    expect(result.output).toContain('Demo App')
  })

  it('rejects get_project without a slug', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'get_project' } },
      runner,
    )

    expect(result.output).toContain('requires { slug }')
  })

  it('runs live totals through the stats tool', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'coding_stats', arguments: { range: 'all_time' } },
      runner,
    )

    expect(result.sseName).toBe('coding_stats')
    expect(result.output).toContain('3,943 hrs')
    expect(result.status).toBe('completed')
  })

  it('records empty successful tool results as completed', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_projects' } },
      { ...runner, siteContent: { ...runner.siteContent, listProjects: async () => [] } },
    )

    expect(result.output).toBe('No published projects found.')
    expect(result.status).toBe('completed')
  })

  it('marks unavailable clients and null coding results unavailable', async () => {
    const disabled = await runAgentTool(
      { id: '1', name: 'search_knowledge', arguments: { query: 'Nelson education' } },
      { ...runner, knowledge: undefined },
    )
    const missingClient = await runAgentTool(
      { id: '1', name: 'search_knowledge', arguments: { query: 'Nelson education' } },
      { ...runner, knowledgeEnabled: true, knowledge: undefined },
    )
    const nullStats = await runAgentTool(
      { id: '1', name: 'coding_stats', arguments: { range: 'last_7_days' } },
      { ...runner, codingStats: { fetchSummary: async () => null } },
    )
    const timeout = await runAgentTool(
      { id: '1', name: 'coding_history', arguments: { op: 'summary', from: '2026-01-01', to: '2026-01-31' } },
      { ...runner, toolTimeoutMs: 1, codingHistory: { ...runner.codingHistory, summary: async () => new Promise<never>(() => {}) } },
    )

    expect(disabled.status).toBe('rejected')
    expect(missingClient.status).toBe('unavailable')
    expect(nullStats.status).toBe('unavailable')
    expect(timeout.status).toBe('unavailable')
  })
})
