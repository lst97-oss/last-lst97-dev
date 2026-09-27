import { z } from 'zod'

import { resolveCodingHistoryRange, runCodingHistoryTool } from './coding-history-tool'
import { codingStatsLabel, parseCodingStatsToolArguments, runCodingStatsTool } from './coding-stats-tool'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import { projectCatalogFiltersSchema, type ProjectCatalogFilters, type ProjectCatalogRecord, type ProjectCatalogQuery } from '../knowledge/project-catalog'

// Fixed tool schemas: the model may only call these read-only ops with
// bounded outputs. No raw rows, entities, or secrets ever leave the server.

const searchKnowledgeArgs = z.object({
  query: z.string().trim().min(1).max(2_000),
}).strict()

const projectCatalogArgs = projectCatalogFiltersSchema


const codingHistoryArgs = z.object({
  op: z.enum(['summary', 'by_project', 'by_language', 'project_time', 'daily', 'streaks']),
  range: z.enum(['all_time', 'last_year', 'last_30_days', 'last_7_days']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  project: z.string().trim().min(1).max(500).optional(),
}).strict().superRefine((input, context) => {
  if (input.range && (input.from || input.to)) context.addIssue({ code: 'custom', path: ['range'], message: 'Use a named range or explicit from/to dates, not both' })
  if (!input.range && (!input.from || !input.to)) context.addIssue({ code: 'custom', path: ['from'], message: 'Provide a named range or both from and to dates' })
  if (input.from && input.to && input.from > input.to) context.addIssue({ code: 'custom', path: ['from'], message: 'from must not be after to' })
})

const siteContentArgs = z.object({
  op: z.enum(['list_projects', 'get_project', 'list_posts', 'get_post']),
  slug: z.string().trim().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  page: z.number().int().min(1).max(100).optional(),
}).strict()
const TOOL_DEFINITIONS = [
  {
    name: 'list_owned_projects',
    description: 'Query Nelson’s owned public and private project catalogue directly. Use for listing, browsing, or filtering projects by free-text query, programming language, software kind, GitHub or curated topic, visibility, created/updated dates, stars, forks, or WakaTime time spent. Returns at most 10 short summaries and metrics. Time spent covers all imported WakaTime history unless a date range is supplied. Use search_knowledge after this tool when the user asks for detail about selected projects. Contributions are excluded; site_content remains the source for currently published showcase projects.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search project names and summaries' },
        languages: { type: 'array', items: { type: 'string' }, description: 'Match any recorded GitHub language' },
        kinds: { type: 'array', items: { type: 'string', enum: ['web_app', 'mobile_app', 'desktop_app', 'api_backend', 'cli_tool', 'library_package', 'automation_devtool', 'data_ml', 'game', 'infrastructure_devops', 'plugin_extension', 'other'] } },
        topics: { type: 'array', items: { type: 'string' }, description: 'Match GitHub or curated topic tags' },
        visibility: { type: 'array', items: { type: 'string', enum: ['public', 'private'] } },
        created_after: { type: 'string', description: 'Created on or after YYYY-MM-DD' },
        created_before: { type: 'string', description: 'Created on or before YYYY-MM-DD' },
        updated_after: { type: 'string', description: 'Updated on or after YYYY-MM-DD' },
        updated_before: { type: 'string', description: 'Updated on or before YYYY-MM-DD' },
        min_stars: { type: 'number' }, max_stars: { type: 'number' },
        min_forks: { type: 'number' }, max_forks: { type: 'number' },
        min_time_spent_seconds: { type: 'number' }, max_time_spent_seconds: { type: 'number' },
        time_spent_range: { type: 'string', enum: ['all_time', 'last_year', 'last_30_days', 'last_7_days'], description: 'Filter WakaTime time totals to one preset window instead of explicit time_spent_from/time_spent_to dates' },
        time_spent_from: { type: 'string', description: 'Start day for WakaTime totals; YYYY-MM-DD' },
        time_spent_to: { type: 'string', description: 'End day for WakaTime totals; YYYY-MM-DD' },
        sort_by: { type: 'string', enum: ['relevance', 'stars', 'forks', 'created', 'updated', 'time_spent'] },
        sort_direction: { type: 'string', enum: ['asc', 'desc'] },
        limit: { type: 'number', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'search_knowledge',
    description: 'Search Nelson\'s personal knowledge base and indexed documentation for his profile, project and repository details, contributions, goals, recorded project demo URLs, repository last-updated dates, the current website implementation, and any indexed WakaTime snapshot. Use for a named project\'s purpose or details and for live-demo questions. Use list_owned_projects for owned-project inventories. Use with coding_history when identifying a current project so repository update metadata can be compared with recent WakaTime activity; treat any WakaTime snapshot as dated evidence, not live activity.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Focused search query about Nelson or his work' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'coding_stats',
    description: 'Current WakaTime public-share snapshots for coding activity, languages, editors/IDEs, operating systems, and AI/human work categories across the last 7 days, last 30 days, last year, or all time. Use for bounded live share data. Use coding_history for deep conditional database queries such as named project, explicit historical date ranges, daily series, and streaks; the database snapshot may be older.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['activity', 'languages', 'editors', 'operating_systems', 'categories'], description: 'Snapshot dimension to return' },
        range: { type: 'string', enum: ['last_7_days', 'last_30_days', 'last_year', 'all_time'], description: 'Published share period' },
      },
      required: ['category', 'range'],
      additionalProperties: false,
    },
  },
  {
    name: 'coding_history',
    description: 'WakaTime heartbeat database for coding hours and activity: top ten per-project breakdowns and named-project time across all_time, last_year, last_30_days, last_7_days, or explicit dates, plus per-language breakdowns, daily series, trends, and streaks. For a question about Nelson\'s current/active project, query by_project for last_30_days; pair with search_knowledge to compare repository purpose and last-updated dates.',
    parameters: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['summary', 'by_project', 'by_language', 'project_time', 'daily', 'streaks'] },
        range: { type: 'string', enum: ['all_time', 'last_year', 'last_30_days', 'last_7_days'], description: 'Use a named range instead of from/to when one matches the request.' },
        from: { type: 'string', description: 'Explicit range start YYYY-MM-DD; use with to instead of range' },
        to: { type: 'string', description: 'Explicit range end YYYY-MM-DD; use with from instead of range' },
        project: { type: 'string', description: 'Project name hint, required for project_time' },
      },
      required: ['op'],
      additionalProperties: false,
    },
  },
  {
    name: 'site_content',
    description: 'Current published Payload CMS projects and blog posts. Use to check what is on the public showcase, latest published listings, and links stored in the live site. Use search_knowledge for Nelson\'s broader project facts and demo URLs recorded in his profile or repository data; use both when the user asks about both project facts and current publication.',
    parameters: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['list_projects', 'get_project', 'list_posts', 'get_post'], description: 'list_projects for the showcase overview; get_project/get_post for one slug; list_posts for recent posts' },
        slug: { type: 'string', description: 'Project or post slug, required for get_project/get_post' },
        limit: { type: 'number', description: 'Max posts for list_posts (default 5, max 20)' },
        page: { type: 'number', description: 'Post page for list_posts (default 1)' },
      },
      required: ['op'],
      additionalProperties: false,
    },
  },
] as const

export function agentToolDefinitions(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
  return TOOL_DEFINITIONS.map((tool) => ({ ...tool, parameters: { ...tool.parameters } }))
}

const TOOL_TIMEOUT = Symbol('tool-timeout')

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | typeof TOOL_TIMEOUT> {
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Agent tool request timed out')), timeoutMs)
      }),
    ])
  } catch {
    return TOOL_TIMEOUT
  }
}

function invalid(call: AgentToolCall, reason: string, runner: AgentToolRunner): AgentToolResult {
  runner.logger.warn('chat.agent_tool.invalid', { tool: call.name, reason })
  return { call, output: `Tool ${call.name} rejected: ${reason}.`, status: 'rejected', sseLabel: 'TOOL CALL REJECTED…', sseName: 'knowledge' }
}

function unavailable(call: AgentToolCall, output: string, sseLabel: string, sseName: AgentToolResult['sseName'], arguments_: Record<string, string | number | boolean | undefined>): AgentToolResult {
  return { call, output, status: 'unavailable', validatedArguments: arguments_, sseLabel, sseName }
}

function lexicalTextLength(value: unknown): number {
  if (typeof value === 'string') return value.length
  if (Array.isArray(value)) return value.reduce((total, entry) => total + lexicalTextLength(entry), 0)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return lexicalTextLength(record.text) + lexicalTextLength(record.children)
  }
  return 0
}

async function runSiteContentTool(call: AgentToolCall, runner: AgentToolRunner): Promise<AgentToolResult> {
  const parsed = siteContentArgs.safeParse(call.arguments)
  if (!parsed.success) return invalid(call, 'expected { op[, slug, limit, page] }', runner)
  if (!runner.siteContent) return unavailable(call, 'Site content is temporarily unavailable.', 'BROWSING SITE CONTENT…', 'site_content', parsed.data)
  const timeoutMs = runner.toolTimeoutMs
  const label = 'BROWSING SITE CONTENT…'
  if (parsed.data.op === 'list_projects') {
    const projects = await withTimeout(runner.siteContent.listProjects(), timeoutMs)
    if (projects === TOOL_TIMEOUT) {
      runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
      return unavailable(call, 'Site projects are temporarily unavailable.', label, 'site_content', parsed.data)
    }
    if (projects.length === 0) return { call, output: 'No published projects found.', status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
    const lines = projects.slice(0, 12).map((project) => `- ${project.title} (${project.slug}) — ${project.summary.slice(0, 160)}`)
    return { call, output: `Published projects (${projects.length}):\n${lines.join('\n')}`, status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
  }
  if (parsed.data.op === 'get_project') {
    if (!parsed.data.slug) return invalid(call, 'get_project requires { slug }', runner)
    const project = await withTimeout(runner.siteContent.getProject(parsed.data.slug), timeoutMs)
    if (project === TOOL_TIMEOUT) {
      runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
      return unavailable(call, 'Site projects are temporarily unavailable.', label, 'site_content', parsed.data)
    }
    if (!project) return { call, output: `No published project found for slug ${parsed.data.slug}.`, status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
    return {
      call,
      output: `${project.title} (${project.slug}): ${project.summary.slice(0, 400)} Technologies: ${project.technologies.join(', ') || 'none'}. Demo: ${project.liveUrl ?? 'none'}. Repo: ${project.repositoryUrl ?? 'none'}.`,
      status: 'completed',
      validatedArguments: parsed.data,
      sseLabel: label,
      sseName: 'site_content',
    }
  }
  if (parsed.data.op === 'list_posts') {
    const page = await withTimeout(
      runner.siteContent.listPosts({ page: parsed.data.page ?? 1, limit: parsed.data.limit ?? 5 }),
      timeoutMs,
    )
    if (page === TOOL_TIMEOUT) {
      runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
      return unavailable(call, 'Site posts are temporarily unavailable.', label, 'site_content', parsed.data)
    }
    if (page.items.length === 0) return { call, output: 'No published posts found.', status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
    const lines = page.items.slice(0, 10).map((post) => `- ${post.title} (${post.slug}) — ${post.excerpt.slice(0, 160)}`)
    return { call, output: `Recent posts (page ${page.page}/${page.totalPages}):\n${lines.join('\n')}`, status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
  }
  if (!parsed.data.slug) return invalid(call, 'get_post requires { slug }', runner)
  const post = await withTimeout(runner.siteContent.getPost(parsed.data.slug), timeoutMs)
  if (post === TOOL_TIMEOUT) {
    runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
    return unavailable(call, 'Site posts are temporarily unavailable.', label, 'site_content', parsed.data)
  }
  if (!post) return { call, output: `No published post found for slug ${parsed.data.slug}.`, status: 'completed', validatedArguments: parsed.data, sseLabel: label, sseName: 'site_content' }
  return {
    call,
    output: `${post.title} (${post.slug}): ${post.excerpt.slice(0, 400)} Content length: ${lexicalTextLength(post.content)} chars.`,
    status: 'completed',
    validatedArguments: parsed.data,
    sseLabel: label,
    sseName: 'site_content',
  }
}

function formatProjectDuration(seconds: number | null): string {
  if (seconds === null) return 'time not recorded'
  if (seconds >= 3_600) {
    const hours = Math.floor(seconds / 3_600)
    const minutes = Math.floor((seconds % 3_600) / 60)
    return `${hours} hr${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} min` : ''}`
  }
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes} min` : `${Math.floor(seconds)} sec`
}

function displayProjectKind(kind: string): string {
  const names: Record<string, string> = {
    web_app: 'web app', mobile_app: 'mobile app', desktop_app: 'desktop app', api_backend: 'API backend',
    cli_tool: 'CLI tool', library_package: 'library/package', automation_devtool: 'automation/developer tool',
    data_ml: 'data/ML', game: 'game', infrastructure_devops: 'infrastructure/DevOps',
    plugin_extension: 'plugin/extension', other: 'other software',
  }
  return names[kind] ?? kind
}

function projectEvidence(project: ProjectCatalogRecord & { mostStarred: boolean }, index: number) {
  const visibility = project.isPublic ? 'public' : 'private'
  const languages = project.languages.slice(0, 4).join(', ') || 'language unknown'
  const kinds = project.kinds.slice(0, 3).map(displayProjectKind).join(', ') || 'kind unclassified'
  const topics = [...new Set([...project.githubTopics, ...project.curatedTopics])].slice(0, 4)
  const metrics = [
    project.stars === null ? null : `${project.stars} stars`,
    project.forks === null ? null : `${project.forks} forks`,
    project.createdAt ? `created ${project.createdAt.slice(0, 10)}` : null,
    project.updatedAt ? `updated ${project.updatedAt.slice(0, 10)}` : null,
    `WakaTime ${formatProjectDuration(project.timeSpentSeconds)}`,
  ].filter(Boolean).join('; ')
  const text = [
    project.mostStarred ? 'Most starred — ' : '',
    `${project.title} (${visibility}; ${kinds}; ${languages}) — ${project.summary.slice(0, 180)}`,
    topics.length ? `Topics: ${topics.join(', ')}` : '',
    metrics,
  ].filter(Boolean).join('. ')
  return {
    id: `owned-project:${project.sourceId}`,
    citationId: `K${index + 1}`,
    text,
    isPublic: project.isPublic,
    source: {
      type: project.sourceType,
      sourceId: project.sourceId,
      title: project.title,
      url: project.url,
    },
  }
}

async function runOwnedProjectsTool(call: AgentToolCall, runner: AgentToolRunner): Promise<AgentToolResult> {
  const parsed = projectCatalogArgs.safeParse(call.arguments)
  if (!parsed.success) return invalid(call, 'expected bounded project catalogue filters', runner)
  if (runner.knowledgeEnabled !== true) return invalid(call, 'knowledge lookup is disabled', runner)
  const knowledge = runner.knowledge
  const listOwnedProjects = knowledge?.listOwnedProjects
  if (!listOwnedProjects) return unavailable(call, 'Owned project inventory is temporarily unavailable.', 'QUERYING PROJECT CATALOGUE…', 'list_owned_projects', {})

  const state = runner.projectListState ?? { clarificationAsked: false, shownProjectIds: [] }
  const continuation = /\b(?:more|next|another|continue|additional)\b/i.test(runner.message ?? '')
  const hasExplicitFilters = Object.keys(call.arguments).some((key) => key !== 'limit')
  const filters: ProjectCatalogFilters = continuation && state.shortlistStarted === true && !hasExplicitFilters && state.activeFilters
    ? state.activeFilters
    : parsed.data
  const request: ProjectCatalogQuery = {
    ...filters,
    exclude_source_ids: state.shownProjectIds.slice(0, 200),
    first_batch: state.shortlistStarted !== true,
  }
  const result = await withTimeout(listOwnedProjects.call(knowledge, request), runner.toolTimeoutMs)
  if (result === TOOL_TIMEOUT) {
    runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
    return unavailable(call, 'Owned project inventory is temporarily unavailable.', 'QUERYING PROJECT CATALOGUE…', 'list_owned_projects', {})
  }
  const evidence = result.projects.map(projectEvidence)
  const citations = evidence.map(({ citationId, source, isPublic }) => ({ id: citationId, title: source.title, url: source.url, isPublic }))
  const output = evidence.length
    ? `Owned project matches (${evidence.length}${result.hasMore ? '; more available' : ''}):\n${evidence.map(({ citationId, text }) => `- [${citationId}] ${text}`).join('\n')}\nSummary: ${evidence.length} project${evidence.length === 1 ? '' : 's'} matched${result.hasMore ? '; more matching projects are available.' : '.'}`
    : 'No unshown owned projects matched these catalogue filters.'
  return {
    call,
    output,
    status: 'completed',
    validatedArguments: {
      ...(filters.query ? { query: filters.query } : {}),
      limit: filters.limit,
      ...(filters.sort_by ? { sort_by: filters.sort_by } : {}),
    },
    sseLabel: 'QUERYING PROJECT CATALOGUE…',
    sseName: 'list_owned_projects',
    retrieval: {
      evidence,
      citations,
      projectSourceIds: result.projects.map(({ sourceId }) => sourceId),
      projectListFilters: filters,
    },
  }
}

export async function runAgentTool(call: AgentToolCall, runner: AgentToolRunner): Promise<AgentToolResult> {
  const timeoutMs = runner.toolTimeoutMs
  if (call.name === 'list_owned_projects') return runOwnedProjectsTool(call, runner)
  if (call.name === 'search_knowledge') {
    const parsed = searchKnowledgeArgs.safeParse(call.arguments)
    if (!parsed.success) return invalid(call, 'expected { query }', runner)
    if (runner.knowledgeEnabled !== true) return invalid(call, 'knowledge lookup is disabled', runner)
    if (!runner.knowledge) return unavailable(call, 'Knowledge lookup is temporarily unavailable.', 'SEARCHING MY NOTES…', 'knowledge', parsed.data)
    const result = await withTimeout(
      runner.knowledge.execute({ message: parsed.data.query, verifiedHistory: runner.verifiedHistory ?? [], topicAnchors: runner.topicAnchors ?? [] }),
      timeoutMs,
    )
    if (result === TOOL_TIMEOUT) {
      runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
      return unavailable(call, 'Knowledge lookup timed out.', 'SEARCHING MY NOTES…', 'knowledge', parsed.data)
    }
    const lines = result.evidence.slice(0, 3).map((item: { citationId: string; source: { title: string }; text: string }) => `[${item.citationId}] ${item.source.title}: ${item.text.slice(0, 500)}`)
    return {
      call,
      output: lines.length > 0
        ? `Knowledge results:\n${lines.join('\n')}`
        : 'Knowledge lookup returned no matching sources.',
      status: 'completed',
      validatedArguments: parsed.data,
      sseLabel: 'SEARCHING MY NOTES…',
      sseName: 'knowledge',
      retrieval: {
        evidence: result.evidence,
        citations: result.citations,
      },
    }
  }
  if (call.name === 'coding_stats') {
    const parsed = parseCodingStatsToolArguments(call.arguments)
    if (!parsed) return invalid(call, 'expected { category: activity | languages | editors | operating_systems | categories, range: last_7_days | last_30_days | last_year | all_time }', runner)
    if (runner.codingStatsEnabled !== true) return invalid(call, 'WakaTime public-share stats are disabled', runner)
    if (!runner.codingStats) return unavailable(call, 'WakaTime public-share stats are temporarily unavailable.', codingStatsLabel(parsed), 'coding_stats', { category: parsed.category, range: parsed.range })
    const summary = await runCodingStatsTool(parsed, runner.codingStats, { timeoutMs, logger: runner.logger })
    return {
      call,
      output: summary ?? 'WakaTime public-share stats are temporarily unavailable.',
      status: summary === null ? 'unavailable' : 'completed',
      validatedArguments: { category: parsed.category, range: parsed.range },
      sseLabel: codingStatsLabel(parsed),
      sseName: 'coding_stats',
    }
  }
  if (call.name === 'site_content') {
    return runSiteContentTool(call, runner)
  }
  const parsed = codingHistoryArgs.safeParse(call.arguments)
  if (!parsed.success) return invalid(call, 'expected { op, range } or { op, from, to[, project] }', runner)
  if (runner.codingHistoryEnabled !== true) return invalid(call, 'coding history is disabled', runner)
  if (!runner.codingHistory) return unavailable(call, 'Coding history is temporarily unavailable.', 'SEARCHING CODING HISTORY…', 'coding_history', parsed.data)
  // The zod schema above is the guardrail: op/range/project are validated
  // before any DB access, and project_time requires a project name.
  if (parsed.data.op === 'project_time' && !parsed.data.project) {
    return invalid(call, 'project_time requires { project }', runner)
  }
  const summary = await runCodingHistoryTool(
    {
      op: parsed.data.op,
      ...(parsed.data.range ? resolveCodingHistoryRange(parsed.data.range, runner.today) : { from: parsed.data.from as string, to: parsed.data.to as string }),
      ...(parsed.data.project ? { project: parsed.data.project } : {}),
    },
    runner.codingHistory,
    { timeoutMs, today: runner.today, logger: runner.logger },
  )
  // The warehouse tool emits a compact Top projects line; retain only its
  // first source-returned display name for later references.
  const referenceEntityLabel = parsed.data.op === 'by_project' && summary
    ? summary.match(/\bTop projects: 1\. (.+?) — /)?.[1]
    : undefined
  return {
    call,
    output: summary ?? 'Coding history is temporarily unavailable.',
    status: summary === null ? 'unavailable' : 'completed',
    validatedArguments: parsed.data,
    ...(referenceEntityLabel ? { referenceEntityLabel } : {}),
    sseLabel: 'SEARCHING CODING HISTORY…',
    sseName: 'coding_history',
  }
}
