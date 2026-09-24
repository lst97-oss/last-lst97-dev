import { z } from 'zod'

import { runCodingHistoryTool } from './coding-history-tool'
import { codingStatsLabel, runCodingStatsTool } from './coding-stats-tool'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'

// Fixed tool schemas: the model may only call these read-only ops with
// bounded outputs. No raw rows, entities, or secrets ever leave the server.

const searchKnowledgeArgs = z.object({
  query: z.string().trim().min(1).max(2_000),
}).strict()

const codingStatsArgs = z.object({
  range: z.enum(['last_7_days', 'all_time']),
}).strict()

const codingHistoryArgs = z.object({
  op: z.enum(['summary', 'by_project', 'by_language', 'project_time', 'daily', 'streaks']),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  project: z.string().trim().min(1).max(500).optional(),
}).strict()

const siteContentArgs = z.object({
  op: z.enum(['list_projects', 'get_project', 'list_posts', 'get_post']),
  slug: z.string().trim().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(20).optional(),
  page: z.number().int().min(1).max(100).optional(),
}).strict()
const TOOL_DEFINITIONS = [
  {
    name: 'search_knowledge',
    description: 'Search Nelson\'s personal knowledge base and indexed documentation for his profile, projects, contributions, goals, repository purposes, repository last-updated dates, the current website implementation, and any indexed WakaTime snapshot. Use with coding_history when identifying a current project so repository update metadata can be compared with recent WakaTime activity; treat any WakaTime snapshot as dated evidence, not live activity.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Focused search query about Nelson or his work' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'coding_stats',
    description: 'Live WakaTime aggregates for recent coding activity (last 7 days) and current all-time coding-hour totals. Use for current/recent aggregate hour and activity questions. Use coding_history for database-backed per-project/per-language activity, explicit historical ranges, daily detail, and streaks.',
    parameters: {
      type: 'object',
      properties: { range: { type: 'string', enum: ['last_7_days', 'all_time'], description: 'last_7_days for recent activity, all_time for range-less totals' } },
      required: ['range'],
      additionalProperties: false,
    },
  },
  {
    name: 'coding_history',
    description: 'WakaTime heartbeat database for coding hours and activity: explicit years/months, per-project time, per-language breakdowns, daily series, trends, and streaks. For a question about Nelson\'s current/active project, query by_project for the trailing 30 days through today; pair with search_knowledge to compare repository purpose and last-updated dates.',
    parameters: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['summary', 'by_project', 'by_language', 'project_time', 'daily', 'streaks'] },
        from: { type: 'string', description: 'Range start YYYY-MM-DD' },
        to: { type: 'string', description: 'Range end YYYY-MM-DD' },
        project: { type: 'string', description: 'Project name hint, required for project_time' },
      },
      required: ['op', 'from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'site_content',
    description: 'Live Payload CMS projects and blog posts (published only). Use for demo/showcase links, live URLs, repositories, project summaries, and post content — data the knowledge index may not have yet.',
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

export async function runAgentTool(call: AgentToolCall, runner: AgentToolRunner): Promise<AgentToolResult> {
  const timeoutMs = runner.toolTimeoutMs
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
      output: lines.length > 0 ? `Knowledge results:\n${lines.join('\n')}` : 'Knowledge lookup returned no matching sources.',
      status: 'completed',
      validatedArguments: parsed.data,
      sseLabel: 'SEARCHING MY NOTES…',
      sseName: 'knowledge',
      retrieval: { evidence: result.evidence, citations: result.citations },
    }
  }
  if (call.name === 'coding_stats') {
    const parsed = codingStatsArgs.safeParse(call.arguments)
    if (!parsed.success) return invalid(call, 'expected { range: last_7_days | all_time }', runner)
    if (runner.codingStatsEnabled !== true) return invalid(call, 'live coding stats are disabled', runner)
    if (!runner.codingStats) return unavailable(call, 'Live coding stats are temporarily unavailable.', codingStatsLabel(parsed.data.range), 'coding_stats', parsed.data)
    const summary = await runCodingStatsTool(parsed.data.range, runner.codingStats, { timeoutMs, logger: runner.logger })
    return {
      call,
      output: summary ?? 'Live coding stats are temporarily unavailable.',
      status: summary === null ? 'unavailable' : 'completed',
      validatedArguments: parsed.data,
      sseLabel: codingStatsLabel(parsed.data.range),
      sseName: 'coding_stats',
    }
  }
  if (call.name === 'site_content') {
    return runSiteContentTool(call, runner)
  }
  const parsed = codingHistoryArgs.safeParse(call.arguments)
  if (!parsed.success) return invalid(call, 'expected { op, from, to[, project] }', runner)
  if (runner.codingHistoryEnabled !== true) return invalid(call, 'coding history is disabled', runner)
  if (!runner.codingHistory) return unavailable(call, 'Coding history is temporarily unavailable.', 'SEARCHING CODING HISTORY…', 'coding_history', parsed.data)
  // The zod schema above is the guardrail: op/range/project are validated
  // before any DB access, and project_time requires a project name.
  if (parsed.data.op === 'project_time' && !parsed.data.project) {
    return invalid(call, 'project_time requires { project }', runner)
  }
  const summary = await runCodingHistoryTool(
    { op: parsed.data.op, from: parsed.data.from, to: parsed.data.to, ...(parsed.data.project ? { project: parsed.data.project } : {}) },
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
