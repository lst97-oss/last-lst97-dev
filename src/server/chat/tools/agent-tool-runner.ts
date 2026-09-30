import { z } from 'zod'
import { projectCatalogQuerySchema } from '../../knowledge/project-catalog'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import { resolveCodingHistoryRange, runCodingHistoryTool } from './coding-history-tool'
import { codingStatsLabel, parseCodingStatsToolArguments, runCodingStatsTool } from './coding-stats-tool'
import { runOwnedProjectsTool } from './owned-projects-tool'
import { runSiteContentTool, siteContentArgsSchema } from './site-content-tool'
import {
  invalidToolResult as invalid,
  TOOL_TIMEOUT,
  unavailableToolResult as unavailable,
  withToolTimeout as withTimeout,
} from './tool-support'

// Fixed tool schemas: the model may only call these read-only ops with
// bounded outputs. No raw rows, entities, or secrets ever leave the server.

const searchKnowledgeArgs = z
  .object({
    query: z.string().trim().min(1).max(2_000),
  })
  .strict()

const codingHistoryArgs = z
  .object({
    op: z.enum(['summary', 'by_project', 'by_language', 'project_time', 'daily', 'streaks']),
    range: z.enum(['all_time', 'last_year', 'last_30_days', 'last_7_days']).optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    project: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.range && (input.from || input.to))
      context.addIssue({
        code: 'custom',
        path: ['range'],
        message: 'Use a named range or explicit from/to dates, not both',
      })
    if (!input.range && (!input.from || !input.to))
      context.addIssue({ code: 'custom', path: ['from'], message: 'Provide a named range or both from and to dates' })
    if (input.from && input.to && input.from > input.to)
      context.addIssue({ code: 'custom', path: ['from'], message: 'from must not be after to' })
  })

export async function runAgentTool(call: AgentToolCall, runner: AgentToolRunner): Promise<AgentToolResult> {
  const timeoutMs = runner.toolTimeoutMs
  if (call.name === 'list_owned_projects') {
    // The query schema is a strict superset of the filters schema: it carries `op`
    // plus the two server-owned fields, which the tool always overwrites below.
    const parsed = projectCatalogQuerySchema.safeParse(call.arguments)
    if (!parsed.success) return invalid(call, 'expected bounded project catalogue filters', runner)
    if (runner.knowledgeEnabled !== true) return invalid(call, 'knowledge lookup is disabled', runner)
    return runOwnedProjectsTool(call, runner, parsed.data)
  }
  if (call.name === 'search_knowledge') {
    const parsed = searchKnowledgeArgs.safeParse(call.arguments)
    if (!parsed.success) return invalid(call, 'expected { query }', runner)
    if (runner.knowledgeEnabled !== true) return invalid(call, 'knowledge lookup is disabled', runner)
    if (!runner.knowledge)
      return unavailable(
        call,
        'Knowledge lookup is temporarily unavailable.',
        'SEARCHING MY NOTES…',
        'knowledge',
        parsed.data,
      )
    const result = await withTimeout(
      runner.knowledge.execute({
        message: parsed.data.query,
        verifiedHistory: runner.verifiedHistory ?? [],
        topicAnchors: runner.topicAnchors ?? [],
      }),
      timeoutMs,
      runner.logger,
      { tool: call.name },
    )
    if (result === TOOL_TIMEOUT) {
      return unavailable(call, 'Knowledge lookup timed out.', 'SEARCHING MY NOTES…', 'knowledge', parsed.data)
    }
    const lines = result.evidence
      .slice(0, 3)
      .map(
        (item: { citationId: string; source: { title: string }; text: string }) =>
          `[${item.citationId}] ${item.source.title}: ${item.text.slice(0, 500)}`,
      )
    return {
      call,
      output:
        lines.length > 0 ? `Knowledge results:\n${lines.join('\n')}` : 'Knowledge lookup returned no matching sources.',
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
    if (!parsed)
      return invalid(
        call,
        'expected { category: activity | languages | editors | operating_systems | categories, range: last_7_days | last_30_days | last_year | all_time }',
        runner,
      )
    if (runner.codingStatsEnabled !== true) return invalid(call, 'WakaTime public-share stats are disabled', runner)
    if (!runner.codingStats)
      return unavailable(
        call,
        'WakaTime public-share stats are temporarily unavailable.',
        codingStatsLabel(parsed),
        'coding_stats',
        { category: parsed.category, range: parsed.range },
      )
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
    const parsed = siteContentArgsSchema.safeParse(call.arguments)
    if (!parsed.success) return invalid(call, 'expected { op[, slug, limit, page] }', runner)
    return runSiteContentTool(call, runner, parsed.data)
  }
  const parsed = codingHistoryArgs.safeParse(call.arguments)
  if (!parsed.success) return invalid(call, 'expected { op, range } or { op, from, to[, project] }', runner)
  if (runner.codingHistoryEnabled !== true) return invalid(call, 'coding history is disabled', runner)
  if (!runner.codingHistory)
    return unavailable(
      call,
      'Coding history is temporarily unavailable.',
      'SEARCHING CODING HISTORY…',
      'coding_history',
      parsed.data,
    )
  // The zod schema above is the guardrail: op/range/project are validated
  // before any DB access, and project_time requires a project name.
  if (parsed.data.op === 'project_time' && !parsed.data.project) {
    return invalid(call, 'project_time requires { project }', runner)
  }
  const summary = await runCodingHistoryTool(
    {
      op: parsed.data.op,
      ...(parsed.data.range
        ? resolveCodingHistoryRange(parsed.data.range, runner.today)
        : { from: parsed.data.from as string, to: parsed.data.to as string }),
      ...(parsed.data.project ? { project: parsed.data.project } : {}),
    },
    runner.codingHistory,
    { timeoutMs, today: runner.today, logger: runner.logger },
  )
  // The warehouse tool emits a compact Top projects line; retain only its
  // first source-returned display name for later references.
  const referenceEntityLabel =
    parsed.data.op === 'by_project' && summary ? summary.match(/\bTop projects: 1\. (.+?) — /)?.[1] : undefined
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
