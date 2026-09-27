import type { ProjectCatalogFilters, ProjectCatalogQuery, ProjectCatalogRecord } from '../../knowledge/project-catalog'
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

export async function runOwnedProjectsTool(
  call: AgentToolCall,
  runner: AgentToolRunner,
  requestedFilters: ProjectCatalogFilters,
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
  const filters =
    continuation && state.shortlistStarted === true && !hasExplicitFilters && state.activeFilters
      ? state.activeFilters
      : requestedFilters
  const request: ProjectCatalogQuery = {
    ...filters,
    exclude_source_ids: state.shownProjectIds.slice(0, 200),
    first_batch: state.shortlistStarted !== true,
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

  const evidence = result.projects.map(projectEvidence)
  const citations = evidence.map(({ citationId, source, isPublic }) => ({
    id: citationId,
    title: source.title,
    url: source.url,
    isPublic,
  }))
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
