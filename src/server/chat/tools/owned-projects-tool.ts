import type {
  ProjectBreakdownDimension,
  ProjectCatalogBreakdownEntry,
  ProjectCatalogQuery,
  ProjectCatalogRecord,
} from '../../knowledge/project-catalog'
import type { AgentToolCall, AgentToolResult, AgentToolRunner } from './agent-tools'
import { TOOL_TIMEOUT, unavailableToolResult, withToolTimeout } from './tool-support'

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
    web_app: 'web app',
    mobile_app: 'mobile app',
    desktop_app: 'desktop app',
    api_backend: 'API backend',
    cli_tool: 'CLI tool',
    library_package: 'library/package',
    automation_devtool: 'automation/developer tool',
    data_ml: 'data/ML',
    game: 'game',
    infrastructure_devops: 'infrastructure/DevOps',
    plugin_extension: 'plugin/extension',
    other: 'other software',
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
  ]
    .filter(Boolean)
    .join('; ')
  const text = [
    project.mostStarred ? 'Most starred — ' : '',
    `${project.title} (${visibility}; ${kinds}; ${languages}) — ${project.summary.slice(0, 180)}`,
    topics.length ? `Topics: ${topics.join(', ')}` : '',
    metrics,
  ]
    .filter(Boolean)
    .join('. ')
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

const PROJECT_COUNT_OVERLAP_NOTE = 'Topic and kind counts overlap; a project can have several of each.'

function formatProjectCount(matchingTotal: number, breakdown: ProjectCatalogBreakdownEntry[]): string {
  const byDimension = (dimension: ProjectBreakdownDimension) =>
    breakdown.filter((entry) => entry.dimension === dimension).sort((a, b) => b.count - a.count)
  const lines: string[] = []
  const visibility = byDimension('visibility')
  if (visibility.length > 0) {
    const publicCount = visibility.find((entry) => entry.key === 'true')?.count ?? 0
    const privateCount = visibility.find((entry) => entry.key === 'false')?.count ?? 0
    lines.push(`Visibility: ${publicCount} public, ${privateCount} private.`)
  }
  const kinds = byDimension('kind')
  if (kinds.length > 0)
    lines.push(`Kinds: ${kinds.map(({ key, count }) => `${displayProjectKind(key)} ${count}`).join('; ')}.`)
  const topics = byDimension('topic')
  if (topics.length > 0) lines.push(`Topics: ${topics.map(({ key, count }) => `${key} ${count}`).join('; ')}.`)
  // Total first, then visibility, then kinds, then topics: the responder is told to
  // report these verbatim, so their order must not invite picking the wrong figure.
  return [
    `Owned project total: ${matchingTotal} projects match the current filters.`,
    ...lines,
    PROJECT_COUNT_OVERLAP_NOTE,
  ].join('\n')
}

export async function runOwnedProjectsTool(
  call: AgentToolCall,
  runner: AgentToolRunner,
  requestedFilters: ProjectCatalogQuery,
): Promise<AgentToolResult> {
  const knowledge = runner.knowledge
  const listOwnedProjects = knowledge?.listOwnedProjects
  if (!listOwnedProjects) {
    return unavailableToolResult(
      call,
      'Owned project inventory is temporarily unavailable.',
      'QUERYING PROJECT CATALOGUE…',
      'list_owned_projects',
      {},
    )
  }

  const state = runner.projectListState ?? { clarificationAsked: false, shownProjectIds: [] }
  const continuation = /\b(?:more|next|another|continue|additional)\b/i.test(runner.message ?? '')
  const hasExplicitFilters = Object.keys(call.arguments).some((key) => key !== 'limit')
  // `op` is the operation, not a filter: it is absent from the filters value that
  // activeFilters round-trips through signed context, so keep it separate.
  const { op, ...requestedFilterArgs } = requestedFilters
  const filters =
    continuation && state.shortlistStarted === true && !hasExplicitFilters && state.activeFilters
      ? state.activeFilters
      : requestedFilterArgs
  const request: ProjectCatalogQuery = {
    ...filters,
    // A count is about the whole matching inventory, not the unshown remainder.
    // The exclusion list is a paging artifact, so applying it would report the
    // page-adjusted figure (101) and drop every already-shown project from the
    // visibility and topic breakdowns.
    exclude_source_ids: op === 'count' ? [] : state.shownProjectIds.slice(0, 200),
    first_batch: state.shortlistStarted !== true,
    ...(op ? { op } : {}),
  }

  const result = await withToolTimeout(listOwnedProjects.call(knowledge, request), runner.toolTimeoutMs)
  if (result === TOOL_TIMEOUT) {
    runner.logger.warn('chat.agent_tool.unavailable', { tool: call.name })
    return unavailableToolResult(
      call,
      'Owned project inventory is temporarily unavailable.',
      'QUERYING PROJECT CATALOGUE…',
      'list_owned_projects',
      {},
    )
  }

  if (op === 'count') {
    return {
      call,
      output: formatProjectCount(result.matchingTotal, result.breakdown),
      status: 'completed',
      validatedArguments: { ...(filters.query ? { query: filters.query } : {}), op: 'count' },
      sseLabel: 'COUNTING PROJECTS…',
      sseName: 'list_owned_projects',
    }
  }

  const evidence = result.projects.map(projectEvidence)
  const citations = evidence.map(({ citationId, source, isPublic }) => ({
    id: citationId,
    title: source.title,
    url: source.url,
    isPublic,
  }))
  const output = evidence.length
    ? `Owned project matches (${evidence.length} of ${result.matchingTotal}; more available):\n${evidence.map(({ citationId, text }) => `- [${citationId}] ${text}`).join('\n')}\nSummary: ${result.matchingTotal} project${result.matchingTotal === 1 ? '' : 's'} match these filters in total${result.matchingTotal > evidence.length ? `; ${evidence.length} shown in this batch, ${result.matchingTotal - evidence.length} not yet shown` : ''}.`
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
