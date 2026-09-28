import { describe, expect, it } from 'bun:test'

import { parseAgentPlan } from '../../src/server/chat/agent/agent-planner'
import { runAgentTool } from '../../src/server/chat/tools/agent-tool-runner'
import { CHAT_TOOL_NAMES } from '../../src/server/chat/types'
import type { CodingActivityStats, CodingStatsResult } from '../../src/server/wakatime/stats'

const activityResult: CodingActivityStats = {
  category: 'activity',
  period: { range: 'all_time', start: '2024-02-06T13:00:00Z', end: '2026-09-23T13:59:59Z' },
  retrievedAtUtc: '2026-09-24T13:00:00.000Z',
  totalSeconds: 11_744_496,
  daysInPeriod: 960,
  humanReadableTotal: '3,262 hrs 21 mins',
}

describe('agent planner', () => {
  it('parses typed WakaTime tool-call and final-answer plans', () => {
    expect(parseAgentPlan('{"action":"tool_calls","calls":[{"id":"1","name":"coding_stats","arguments":{"category":"languages","range":"last_30_days"}}]}')).toEqual({
      kind: 'tool_calls',
      calls: [{ id: '1', name: 'coding_stats', arguments: { category: 'languages', range: 'last_30_days' } }],
    })
    expect(parseAgentPlan('{"action":"final_answer","text":"Hello"}')).toEqual({ kind: 'final_answer', text: 'Hello' })
    expect(parseAgentPlan('not json')).toBeNull()
    expect(parseAgentPlan('{"action":"tool_calls","calls":[]}')).toBeNull()
  })

  it('uses the canonical tool registry when parsing planner calls', () => {
    expect(CHAT_TOOL_NAMES).toEqual([
      'search_knowledge',
      'list_owned_projects',
      'coding_stats',
      'coding_history',
      'site_content',
    ])

    for (const name of CHAT_TOOL_NAMES) {
      expect(parseAgentPlan(JSON.stringify({
        action: 'tool_calls',
        calls: [{ id: 'registry-check', name, arguments: {} }],
      }))?.kind).toBe('tool_calls')
    }
    expect(parseAgentPlan('{"action":"tool_calls","calls":[{"id":"bad","name":"unknown_tool","arguments":{}}]}')).toBeNull()
  })
})

describe('agent tool runner', () => {
  const runner = {
    knowledgeEnabled: false,
    codingStatsEnabled: true,
    codingHistoryEnabled: true,
    codingStats: { fetchSummary: async (): Promise<CodingStatsResult> => activityResult },
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

  it('rejects unexpected arguments at each tool boundary', async () => {
    for (const name of CHAT_TOOL_NAMES) {
      const result = await runAgentTool({ id: 'schema-check', name, arguments: { unexpected: true } }, runner)
      expect(result.status).toBe('rejected')
      expect(result.output).toContain(`Tool ${name} rejected:`)
    }
  })

  it('runs a filtered project catalogue query with server-owned exclusions and exposes concise evidence', async () => {
    let received: unknown
    const project = {
      sourceType: 'github' as const,
      sourceId: 'lst97/python-tool',
      title: 'python-tool',
      url: 'https://github.com/lst97/python-tool',
      isPublic: true,
      summary: 'A small Python command line tool.',
      createdAt: '2024-01-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
      stars: 4,
      forks: 2,
      primaryLanguage: 'Python',
      languages: ['Python', 'Rust'],
      kinds: ['cli_tool' as const],
      githubTopics: ['cli'],
      curatedTopics: ['developer-tool'],
      timeSpentSeconds: 7200,
      mostStarred: true,
    }
    const result = await runAgentTool({
      id: 'catalogue', name: 'list_owned_projects',
      arguments: { languages: ['Python'], kinds: ['cli_tool'], min_stars: 2, limit: 4 },
    }, {
      ...runner,
      knowledgeEnabled: true,
      projectListState: { clarificationAsked: false, shownProjectIds: ['lst97/already-listed'], shortlistStarted: true },
      knowledge: {
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
        listOwnedProjects: async (input) => {
          received = input
          return { projects: [project], hasMore: false, matchingTotal: 1, breakdown: [] }
        },
      },
    })

    expect(received).toMatchObject({ languages: ['Python'], kinds: ['cli_tool'], min_stars: 2, limit: 4, first_batch: false, exclude_source_ids: ['lst97/already-listed'] })
    expect(result.status).toBe('completed')
    expect(result.output).toContain('python-tool')
    expect(result.output).toContain('Python, Rust')
    expect(result.output).toContain('CLI tool')
    expect(result.output).toContain('2 hrs')
    expect(result.retrieval?.projectSourceIds).toEqual(['lst97/python-tool'])
    expect(result.retrieval?.citations).toEqual([{ id: 'K1', title: 'python-tool', url: 'https://github.com/lst97/python-tool', isPublic: true }])
  })

  it('answers a count question with server-computed totals and no citations', async () => {
    let received: unknown
    const project = {
      sourceType: 'github' as const, sourceId: 'lst97/lst97', title: 'lst97',
      url: 'https://github.com/lst97/lst97', isPublic: true, summary: 'Profile.',
      createdAt: null, updatedAt: null, stars: null, forks: null, primaryLanguage: null,
      languages: [], kinds: [], githubTopics: [], curatedTopics: [], timeSpentSeconds: null, mostStarred: false,
    }
    const result = await runAgentTool({
      id: 'catalogue-count', name: 'list_owned_projects', arguments: { op: 'count' },
    }, {
      ...runner,
      knowledgeEnabled: true,
      projectListState: { clarificationAsked: false, shownProjectIds: [], shortlistStarted: true },
      knowledge: {
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
        listOwnedProjects: async (input) => {
          received = input
          return {
            projects: [project],
            hasMore: false,
            matchingTotal: 111,
            breakdown: [
              { dimension: 'visibility' as const, key: 'true', count: 89 },
              { dimension: 'visibility' as const, key: 'false', count: 22 },
              { dimension: 'kind' as const, key: 'cli_tool', count: 18 },
              { dimension: 'topic' as const, key: 'coursework', count: 14 },
            ],
          }
        },
      },
    })

    // The model may send server-owned fields, and they must still be replaced by
    // server values: `op` must not let it choose its own exclusion list.
    expect(received).toMatchObject({ op: 'count', exclude_source_ids: [], first_batch: false })
    expect(result.status).toBe('completed')
    expect(result.output).toContain('Owned project total: 111')
    expect(result.output).toContain('89 public, 22 private')
    expect(result.output).toContain('CLI tool 18')
    expect(result.output).toContain('coursework 14')
    expect(result.output).toContain('Topic and kind counts overlap')
    // A pure count cites nothing, so it cannot be presented as sourced evidence.
    expect(result.retrieval).toBeUndefined()
  })

  it('keeps server-owned exclusions when the model sends its own', async () => {
    let received: unknown
    const result = await runAgentTool({
      id: 'catalogue-injection', name: 'list_owned_projects',
      arguments: { exclude_source_ids: ['lst97/attacker-choice'], first_batch: false },
    }, {
      ...runner,
      knowledgeEnabled: true,
      projectListState: { clarificationAsked: false, shownProjectIds: ['lst97/server-shown'], shortlistStarted: true },
      knowledge: {
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
        listOwnedProjects: async (input) => {
          received = input
          return { projects: [], hasMore: false, matchingTotal: 111, breakdown: [] }
        },
      },
    })

    expect(result.status).toBe('completed')
    // The model must never choose which already-shown projects to exclude.
    expect(received).toMatchObject({ exclude_source_ids: ['lst97/server-shown'], first_batch: false })
  })

  it('counts the whole inventory rather than the unshown remainder', async () => {
    let received: { exclude_source_ids?: string[] } | undefined
    const result = await runAgentTool({
      id: 'catalogue-count-after-page', name: 'list_owned_projects', arguments: { op: 'count' },
    }, {
      ...runner,
      knowledgeEnabled: true,
      // Ten projects were already listed earlier in the conversation.
      projectListState: {
        clarificationAsked: false,
        shownProjectIds: Array.from({ length: 10 }, (_, index) => `lst97/shown-${index}`),
        shortlistStarted: true,
      },
      knowledge: {
        execute: async () => ({ evidence: [], citations: [], degraded: false }),
        listOwnedProjects: async (input) => {
          received = input
          return {
            projects: [],
            hasMore: false,
            matchingTotal: 111,
            breakdown: [{ dimension: 'visibility', key: 'true', count: 89 }],
          }
        },
      },
    })

    // The exclusion list is a paging artifact. If count mode carried it, the total
    // would report 101 and the visibility breakdown would drop to 79 public.
    expect(received).toMatchObject({ op: 'count', exclude_source_ids: [] })
    expect(result.output).toContain('Owned project total: 111')
    expect(result.output).toContain('89 public, 0 private')
    expect(result.output).not.toContain('excluding projects already shown')
  })

  it('keeps regular search_knowledge calls on semantic retrieval', async () => {
    let semanticCalls = 0
    let listCalls = 0
    const knowledge = {
      execute: async (input: { message: string }) => {
        semanticCalls += 1
        expect(input.message).toBe('Nelson education')
        return { evidence: [], citations: [], degraded: false }
      },
      listOwnedProjects: async () => {
        listCalls += 1
        return { projects: [], hasMore: false, matchingTotal: 0, breakdown: [] }
      },
    }
    const result = await runAgentTool(
      { id: 'knowledge', name: 'search_knowledge', arguments: { query: 'Nelson education' } },
      { ...runner, knowledgeEnabled: true, knowledge },
    )

    expect(semanticCalls).toBe(1)
    expect(listCalls).toBe(0)
    expect(result.output).toBe('Knowledge lookup returned no matching sources.')
  })

  it('runs project_time against the warehouse with SSE labels', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'coding_history', arguments: { op: 'project_time', from: '2025-01-01', to: '2025-12-31', project: 'best-maker-web' } },
      runner,
    )

    expect(result.sseName).toBe('coding_history')
    expect(result.sseLabel).toBe('SEARCHING CODING HISTORY…')
    expect(result.output).toContain('best-maker-web')
  })

  it('resolves a coding-history range preset into the requested project date range', async () => {
    let receivedRange: { from: string; to: string } | undefined
    const result = await runAgentTool(
      { id: '1', name: 'coding_history', arguments: { op: 'by_project', range: 'all_time' } },
      {
        ...runner,
        codingHistory: {
          ...runner.codingHistory,
          byProject: async (range) => { receivedRange = range; return [{ name: 'project-a', seconds: 3600, heartbeats: 10 }] },
        },
      },
    )

    expect(receivedRange).toMatchObject({ from: '2000-01-01', to: '2026-09-23' })
    expect(result.output).toContain('Coding history (2000-01-01 → 2026-09-23)')
    expect(result.output).toContain('project-a')
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

  it('runs a typed public-share query and labels its freshness', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' } },
      runner,
    )

    expect(result.sseName).toBe('coding_stats')
    expect(result.sseLabel).toContain('CHECKING WAKATIME ACTIVITY')
    expect(result.output).toContain('WakaTime public share activity')
    expect(result.output).toContain('3,262 hrs 21 mins')
    expect(result.output).toContain('fetched 2026-09-24T13:00:00.000Z')
    expect(result.status).toBe('completed')
  })

  it('rejects invalid category/range combinations including non-all-time operating systems', async () => {
    for (const arguments_ of [
      { range: 'all_time' },
      { category: 'unknown', range: 'all_time' },
      { category: 'operating_systems', range: 'last_7_days' },
    ]) {
      const result = await runAgentTool({ id: '1', name: 'coding_stats', arguments: arguments_ }, runner)
      expect(result.status).toBe('rejected')
    }
  })

  it('records empty successful tool results as completed', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_projects' } },
      { ...runner, siteContent: { ...runner.siteContent, listProjects: async () => [] } },
    )

    expect(result.output).toBe('No published projects found.')
    expect(result.status).toBe('completed')
  })

  it('marks unavailable clients and null public-share results unavailable', async () => {
    const disabled = await runAgentTool(
      { id: '1', name: 'search_knowledge', arguments: { query: 'Nelson education' } },
      { ...runner, knowledge: undefined },
    )
    const missingClient = await runAgentTool(
      { id: '1', name: 'search_knowledge', arguments: { query: 'Nelson education' } },
      { ...runner, knowledgeEnabled: true, knowledge: undefined },
    )
    const nullStats = await runAgentTool(
      { id: '1', name: 'coding_stats', arguments: { category: 'activity', range: 'last_7_days' } },
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
