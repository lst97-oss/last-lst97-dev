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
    expect(
      parseAgentPlan(
        '{"action":"tool_calls","calls":[{"id":"1","name":"coding_stats","arguments":{"category":"languages","range":"last_30_days"}}]}',
      ),
    ).toEqual({
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
      'services',
    ])

    for (const name of CHAT_TOOL_NAMES) {
      expect(
        parseAgentPlan(
          JSON.stringify({
            action: 'tool_calls',
            calls: [{ id: 'registry-check', name, arguments: {} }],
          }),
        )?.kind,
      ).toBe('tool_calls')
    }
    expect(
      parseAgentPlan('{"action":"tool_calls","calls":[{"id":"bad","name":"unknown_tool","arguments":{}}]}'),
    ).toBeNull()
  })
})

describe('agent tool runner', () => {
  const changelogEntry = {
    slug: 'v1-2-0',
    title: 'Release 1.2.0',
    version: '1.2.0',
    excerpt: 'Adds the changelog tool.',
    publishedAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    createdAt: '2026-08-30T00:00:00.000Z',
    tags: [],
    changeTypes: ['feature' as const],
    coverImage: { url: null, alt: null },
    content: null,
    seo: { title: null, description: null, image: { url: null, alt: null } },
  }
  const topicEntry = { id: 1, title: 'AI', slug: 'ai', description: 'Machine learning work.' }
  const postEntry = {
    slug: 'measuring-layout',
    title: 'Measuring layout',
    excerpt: 'A grid that packs by measured height.',
    publishedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    tags: [],
    topics: [],
    coverImage: { url: null, alt: null },
    content: null,
    seo: { title: null, description: null, image: { url: null, alt: null } },
  }
  const projectEntry = {
    slug: 'demo-app',
    title: 'Demo App',
    summary: 'A demo showcase app',
    technologies: ['Next.js'],
    topics: [],
    tags: [],
    featured: false,
    coverImage: { url: null, alt: null },
    gallery: [],
    role: null,
    projectStatus: 'completed' as const,
    startDate: null,
    endDate: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2025-12-31T00:00:00.000Z',
  }
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
    publicSiteUrl: 'https://www.lst97.dev',
    logger: { warn() {} },
    siteContent: {
      listProjectsPage: async () => ({ items: [projectEntry], page: 1, totalPages: 1, totalDocs: 1 }),
      getProject: async (slug: string) =>
        slug === 'demo-app'
          ? {
              slug: 'demo-app',
              title: 'Demo App',
              summary: 'A demo showcase app',
              technologies: ['Next.js'],
              topics: [],
              tags: [],
              featured: false,
              coverImage: { url: null, alt: null },
              gallery: [],
              role: null,
              projectStatus: 'completed' as const,
              startDate: null,
              endDate: null,
              updatedAt: '2026-01-01T00:00:00.000Z',
              createdAt: '2025-12-31T00:00:00.000Z',
              content: null,
              repositoryUrl: 'https://github.com/lst97/demo-app',
              liveUrl: 'https://demo.lst97.dev',
              seo: { title: null, description: null, image: { url: null, alt: null } },
            }
          : null,
      listPosts: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
      getPost: async () => null,
      listChangelogs: async () => ({ items: [changelogEntry], page: 1, totalPages: 1, totalDocs: 1 }),
      getChangelog: async (slug: string) => (slug === changelogEntry.slug ? changelogEntry : null),
      listTopics: async () => [topicEntry],
      getTopic: async (slug: string) => (slug === topicEntry.slug ? topicEntry : null),
    },
  }

  it('returns every published tier from the services tool within the responder evidence budget', async () => {
    // The 600-char agent-loop cap cut this output mid-sentence after the
    // Starter tier, and the answer model invented two packages that do not
    // exist. The full tier list has to survive to the responder.
    const published = [
      'The Starter package starts from A$1,000.',
      'The Business package starts from A$2,200.',
      'The Business+ package starts from A$3,500.',
    ]
    const evidence = published.map((text, index) => ({
      citationId: `K${index + 1}`,
      source: {
        type: 'services' as const,
        sourceId: 'packages-and-pricing',
        title: 'How much does a website cost?',
        url: 'https://www.lst97.dev/services',
      },
      text,
      score: 0.9,
    }))

    const result = await runAgentTool({ id: 'svc', name: 'services', arguments: {} }, {
      ...runner,
      knowledgeEnabled: true,
      knowledge: { execute: async () => ({ evidence, citations: [], degraded: false }) },
    } as never)

    expect(result.status).toBe('completed')
    expect(result.output).toContain('Service scope results:')
    for (const tier of published) expect(result.output).toContain(tier)
    expect(result.output).toContain('A$3,500')
    // Anything past 600 characters is dropped before the responder sees it.
    expect(result.output.length).toBeLessThan(6_000)
    expect(result.retrieval?.evidence).toHaveLength(3)
  })

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
    const result = await runAgentTool(
      {
        id: 'catalogue',
        name: 'list_owned_projects',
        arguments: { languages: ['Python'], kinds: ['cli_tool'], min_stars: 2, limit: 4 },
      },
      {
        ...runner,
        knowledgeEnabled: true,
        projectListState: {
          clarificationAsked: false,
          shownProjectIds: ['lst97/already-listed'],
          shortlistStarted: true,
        },
        knowledge: {
          execute: async () => ({ evidence: [], citations: [], degraded: false }),
          listOwnedProjects: async (input) => {
            received = input
            return { projects: [project], hasMore: false, matchingTotal: 1, breakdown: [] }
          },
        },
      },
    )

    expect(received).toMatchObject({
      languages: ['Python'],
      kinds: ['cli_tool'],
      min_stars: 2,
      limit: 4,
      first_batch: false,
      exclude_source_ids: ['lst97/already-listed'],
    })
    expect(result.status).toBe('completed')
    expect(result.output).toContain('python-tool')
    expect(result.output).toContain('Python, Rust')
    expect(result.output).toContain('CLI tool')
    expect(result.output).toContain('2 hrs')
    expect(result.retrieval?.projectSourceIds).toEqual(['lst97/python-tool'])
    expect(result.retrieval?.citations).toEqual([
      { id: 'K1', title: 'python-tool', url: 'https://github.com/lst97/python-tool', isPublic: true },
    ])
  })

  it('answers a count question with server-computed totals and no citations', async () => {
    let received: unknown
    const project = {
      sourceType: 'github' as const,
      sourceId: 'lst97/lst97',
      title: 'lst97',
      url: 'https://github.com/lst97/lst97',
      isPublic: true,
      summary: 'Profile.',
      createdAt: null,
      updatedAt: null,
      stars: null,
      forks: null,
      primaryLanguage: null,
      languages: [],
      kinds: [],
      githubTopics: [],
      curatedTopics: [],
      timeSpentSeconds: null,
      mostStarred: false,
    }
    const result = await runAgentTool(
      {
        id: 'catalogue-count',
        name: 'list_owned_projects',
        arguments: { op: 'count' },
      },
      {
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
      },
    )

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
    const result = await runAgentTool(
      {
        id: 'catalogue-injection',
        name: 'list_owned_projects',
        arguments: { exclude_source_ids: ['lst97/attacker-choice'], first_batch: false },
      },
      {
        ...runner,
        knowledgeEnabled: true,
        projectListState: {
          clarificationAsked: false,
          shownProjectIds: ['lst97/server-shown'],
          shortlistStarted: true,
        },
        knowledge: {
          execute: async () => ({ evidence: [], citations: [], degraded: false }),
          listOwnedProjects: async (input) => {
            received = input
            return { projects: [], hasMore: false, matchingTotal: 111, breakdown: [] }
          },
        },
      },
    )

    expect(result.status).toBe('completed')
    // The model must never choose which already-shown projects to exclude.
    expect(received).toMatchObject({ exclude_source_ids: ['lst97/server-shown'], first_batch: false })
  })

  it('counts the whole inventory rather than the unshown remainder', async () => {
    let received: { exclude_source_ids?: string[] } | undefined
    const result = await runAgentTool(
      {
        id: 'catalogue-count-after-page',
        name: 'list_owned_projects',
        arguments: { op: 'count' },
      },
      {
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
      },
    )

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
      {
        id: '1',
        name: 'coding_history',
        arguments: { op: 'project_time', from: '2025-01-01', to: '2025-12-31', project: 'best-maker-web' },
      },
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
          byProject: async (range) => {
            receivedRange = range
            return [{ name: 'project-a', seconds: 3600, heartbeats: 10 }]
          },
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
    const result = await runAgentTool({ id: '1', name: 'site_content', arguments: { op: 'list_projects' } }, runner)

    expect(result.sseName).toBe('site_content')
    expect(result.sseLabel).toBe('BROWSING SITE CONTENT…')
    expect(result.output).toContain('Demo App')
  })

  it('rejects get_project without a slug', async () => {
    const result = await runAgentTool({ id: '1', name: 'site_content', arguments: { op: 'get_project' } }, runner)

    expect(result.output).toContain('requires { slug }')
  })

  it('lists live changelog entries with their version', async () => {
    const result = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_changelogs', limit: 5, page: 1 } },
      runner,
    )

    expect(result.sseName).toBe('site_content')
    expect(result.sseLabel).toBe('BROWSING SITE CONTENT…')
    expect(result.status).toBe('completed')
    expect(result.output).toContain('Recent changelogs (page 1/1):')
    expect(result.output).toContain('1.2.0')
    expect(result.output).toContain('Release 1.2.0 (v1-2-0)')
  })

  it('returns clickable public URLs for posts, projects, changelogs, and topics', async () => {
    const posts = await runAgentTool(
      { id: 'posts', name: 'site_content', arguments: { op: 'list_posts' } },
      {
        ...runner,
        siteContent: {
          ...runner.siteContent,
          listPosts: async () => ({ items: [postEntry], page: 1, totalPages: 1, totalDocs: 1 }),
        },
      },
    )
    const projects = await runAgentTool(
      { id: 'projects', name: 'site_content', arguments: { op: 'list_projects' } },
      runner,
    )
    const changelogs = await runAgentTool(
      { id: 'changelogs', name: 'site_content', arguments: { op: 'list_changelogs' } },
      runner,
    )
    const topics = await runAgentTool({ id: 'topics', name: 'site_content', arguments: { op: 'list_topics' } }, runner)
    const post = await runAgentTool(
      { id: 'post', name: 'site_content', arguments: { op: 'get_post', slug: 'measuring-layout' } },
      { ...runner, siteContent: { ...runner.siteContent, getPost: async () => postEntry } },
    )
    const topic = await runAgentTool(
      { id: 'topic', name: 'site_content', arguments: { op: 'get_topic', slug: 'ai' } },
      runner,
    )

    expect(posts.output).toContain('https://www.lst97.dev/blog/measuring-layout')
    expect(projects.output).toContain('https://www.lst97.dev/projects/demo-app')
    expect(changelogs.output).toContain('https://www.lst97.dev/changelog/v1-2-0')
    expect(topics.output).toContain('https://www.lst97.dev/blog/topics/ai')
    expect(post.output).toContain('Page: https://www.lst97.dev/blog/measuring-layout')
    expect(topic.output).toContain('Page: https://www.lst97.dev/blog/topics/ai')
  })

  it('lists the site sections with a purpose and a link, without needing a CMS', async () => {
    const result = await runAgentTool(
      { id: 'pages', name: 'site_content', arguments: { op: 'list_pages' } },
      {
        ...runner,
        siteContent: undefined,
      },
    )

    expect(result.status).toBe('completed')
    expect(result.output).toContain('Site sections (8):')
    expect(result.output).toContain('- Contact (/contact) —')
    // URLs live in the citations; the text stays inside the 600-char tool budget.
    expect(result.output).not.toContain('URL:')
    // Two budgets apply, and the SSE one is the tighter: `agent-loop.ts:166` gives
    // the responder 600 characters of tool output, while `agent-loop.ts:359` puts
    // only the first 400 into the `tool_result` summary the chat-service test
    // reads. Passing the first and failing the second drops the tail section
    // (Chat) from every site-orientation answer while the tool itself looks green.
    expect(result.output.length).toBeLessThanOrEqual(400)
    expect(result.output).toContain('- Services (/services)')
    expect(result.retrieval?.citations).toEqual([
      { id: 'K1', title: 'Home', url: 'https://www.lst97.dev/', isPublic: true },
      { id: 'K2', title: 'About', url: 'https://www.lst97.dev/about', isPublic: true },
      { id: 'K3', title: 'Services', url: 'https://www.lst97.dev/services', isPublic: true },
      { id: 'K4', title: 'Projects', url: 'https://www.lst97.dev/projects', isPublic: true },
      { id: 'K5', title: 'Blog', url: 'https://www.lst97.dev/blog', isPublic: true },
      { id: 'K6', title: 'Changelog', url: 'https://www.lst97.dev/changelog', isPublic: true },
      { id: 'K7', title: 'Contact', url: 'https://www.lst97.dev/contact', isPublic: true },
      { id: 'K8', title: 'Chat', url: 'https://www.lst97.dev/chat', isPublic: true },
    ])
  })

  it('returns SOURCES citations so a site-content answer is attributable', async () => {
    const changelogs = await runAgentTool(
      { id: 'changelogs', name: 'site_content', arguments: { op: 'list_changelogs' } },
      runner,
    )
    const post = await runAgentTool(
      { id: 'post', name: 'site_content', arguments: { op: 'get_post', slug: 'measuring-layout' } },
      { ...runner, siteContent: { ...runner.siteContent, getPost: async () => postEntry } },
    )

    expect(changelogs.retrieval?.citations).toEqual([
      { id: 'K1', title: '1.2.0 — Release 1.2.0', url: 'https://www.lst97.dev/changelog/v1-2-0', isPublic: true },
    ])
    expect(post.retrieval?.citations).toEqual([
      { id: 'K1', title: 'Measuring layout', url: 'https://www.lst97.dev/blog/measuring-layout', isPublic: true },
    ])
  })

  it('does not double the version prefix already stored on the changelog entry', async () => {
    const result = await runAgentTool(
      { id: 'changelogs', name: 'site_content', arguments: { op: 'list_changelogs' } },
      runner,
    )

    expect(result.output).toContain('1.2.0 Release 1.2.0')
    expect(result.output).not.toContain('vv1.2.0')
    expect(result.output).not.toContain('v1.2.0 Release')
  })

  it('percent-encodes a slug so a crafted one cannot escape its path', async () => {
    const result = await runAgentTool(
      { id: 'projects', name: 'site_content', arguments: { op: 'list_projects' } },
      {
        ...runner,
        siteContent: {
          ...runner.siteContent,
          listProjectsPage: async () => ({
            items: [{ ...projectEntry, slug: '../admin' }],
            page: 1,
            totalPages: 1,
            totalDocs: 1,
          }),
        },
      },
    )

    expect(result.output).toContain('https://www.lst97.dev/projects/..%2Fadmin')
    expect(result.output).not.toContain('/projects/../admin')
  })

  it('reads one changelog entry and rejects a slugless lookup', async () => {
    const found = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'get_changelog', slug: 'v1-2-0' } },
      runner,
    )
    const missing = await runAgentTool({ id: '1', name: 'site_content', arguments: { op: 'get_changelog' } }, runner)

    expect(found.status).toBe('completed')
    expect(found.output).toContain('Version: 1.2.0')
    expect(found.output).toContain('Change types: feature')
    expect(missing.status).toBe('rejected')
    expect(missing.output).toContain('get_changelog requires { slug }')
  })

  it('lists and reads live topics', async () => {
    const list = await runAgentTool({ id: '1', name: 'site_content', arguments: { op: 'list_topics' } }, runner)
    const found = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'get_topic', slug: 'ai' } },
      runner,
    )
    const missing = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'get_topic', slug: 'nope' } },
      runner,
    )

    expect(list.status).toBe('completed')
    expect(list.output).toContain('Published topics (1):')
    expect(list.output).toContain('AI (ai) — Machine learning work.')
    expect(found.status).toBe('completed')
    expect(found.output).toContain('AI (ai): Machine learning work.')
    expect(missing.status).toBe('completed')
    expect(missing.output).toBe('No published topic found for slug nope.')
  })

  it('reports an empty changelog or topic list without borrowing another collection', async () => {
    const changelogs = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_changelogs' } },
      {
        ...runner,
        siteContent: {
          ...runner.siteContent,
          listChangelogs: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        },
      },
    )
    const topics = await runAgentTool(
      { id: '1', name: 'site_content', arguments: { op: 'list_topics' } },
      { ...runner, siteContent: { ...runner.siteContent, listTopics: async () => [] } },
    )

    expect(changelogs.output).toBe('No published changelogs found.')
    expect(topics.output).toBe('No published topics found.')
    expect(changelogs.output).not.toContain('AI')
    expect(topics.output).not.toContain('Release 1.2.0')
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
      {
        ...runner,
        siteContent: {
          ...runner.siteContent,
          listProjectsPage: async () => ({ items: [], page: 1, totalPages: 1, totalDocs: 0 }),
        },
      },
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
      {
        ...runner,
        toolTimeoutMs: 1,
        codingHistory: { ...runner.codingHistory, summary: async () => new Promise<never>(() => {}) },
      },
    )

    expect(disabled.status).toBe('rejected')
    expect(missingClient.status).toBe('unavailable')
    expect(nullStats.status).toBe('unavailable')
    expect(timeout.status).toBe('unavailable')
  })
})
