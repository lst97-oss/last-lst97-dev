import type { ProjectCatalogFilters } from '../../knowledge/project-catalog'
import type { KnowledgeEvidence, PublicCitation, RetrieveKnowledge } from '../../knowledge/retrieve'
import type { ChatDiagnosticsCapture } from '../../observability/chat-diagnostics'
import type { ChatStreamEvent } from '../events'
import type { ChatServiceDependencies, PreparedChatInput } from '../service-contracts'
import { runAgentTool } from '../tools/agent-tool-runner'
import type { AgentToolCall, AgentToolResult, AgentToolUseDecisions } from '../tools/agent-tools'
import { MAX_AGENT_STEPS } from '../tools/agent-tools'
import type {
  ChatConversationContext,
  ChatMessage,
  ChatProjectListState,
  ChatToolObservation,
  ChatTopicAnchor,
} from '../types'
import { createChatToolSelection } from './tool-selection'

// biome-ignore lint/suspicious/noControlCharactersInRegex: Reject control characters in a display label.
const INVALID_REFERENCE_LABEL_CHARACTERS = /[\u0000-\u001f\u007f/:?#]/

export interface AgentTurnState {
  evidence: string
  toolOutputs: string
  toolSummaries: string[]
  toolObservations: ChatToolObservation[]
  referenceEntityLabel?: string
  usedTools: Set<string>
  citations: PublicCitation[]
  knowledgeEvidence?: KnowledgeEvidence[]
  knowledgeUnavailable: boolean
  toolRoutingUnavailable: boolean
  projectSourceIds: string[]
  shortlistStarted: boolean
  trackProjectSources: boolean
  activeProjectFilters?: ProjectCatalogFilters
  catalogueToolExecutedThisStep: boolean
  catalogueFallback?: string
  ownedProjectCount?: string
}

export function createChatAgentLoop(
  dependencies: ChatServiceDependencies,
  options: { toolTimeoutMs: number; maxAgentSteps?: number },
) {
  const toolTimeoutMs = options.toolTimeoutMs
  const maxAgentSteps = Math.max(1, Math.min(8, Math.floor(options.maxAgentSteps ?? MAX_AGENT_STEPS)))
  const toolSelection = createChatToolSelection(dependencies)

  function buildNextConversationContext(
    turn: PreparedChatInput,
    agent: AgentTurnState,
    assistantText: string,
  ): ChatConversationContext {
    const currentAnchor =
      agent.toolObservations.length > 0
        ? [
            {
              question: turn.message,
              ...(agent.referenceEntityLabel ? { entityLabel: agent.referenceEntityLabel } : {}),
              observedAtUtc: turn.currentDateTimeUtc,
              tools: agent.toolObservations.slice(0, 4),
            },
          ]
        : []
    return {
      messages: [
        ...turn.verifiedHistory,
        { role: 'user', content: turn.message },
        { role: 'assistant', content: assistantText },
      ],
      topicAnchors: [...turn.topicAnchors, ...currentAnchor],
      projectListState: {
        ...turn.projectListState,
        shownProjectIds: [...new Set([...turn.projectListState.shownProjectIds, ...agent.projectSourceIds])].slice(
          0,
          200,
        ),
        shortlistStarted: turn.projectListState.shortlistStarted === true || agent.shortlistStarted,
        ...(agent.activeProjectFilters
          ? { activeFilters: agent.activeProjectFilters }
          : turn.projectListState.activeFilters
            ? { activeFilters: turn.projectListState.activeFilters }
            : {}),
      },
    }
  }

  function runnerFor(
    verifiedHistory: ChatMessage[],
    topicAnchors: ChatTopicAnchor[],
    today: string,
    projectListState: ChatProjectListState,
    message: string,
    capture?: ChatDiagnosticsCapture,
  ): Parameters<typeof runAgentTool>[1] {
    const baseKnowledge = dependencies.knowledge
    const knowledge = baseKnowledge
      ? {
          ...(typeof baseKnowledge.listOwnedProjects === 'function'
            ? { listOwnedProjects: baseKnowledge.listOwnedProjects.bind(baseKnowledge) }
            : {}),
          execute: (input: Parameters<RetrieveKnowledge['execute']>[0]) =>
            baseKnowledge.execute({
              ...input,
              diagnostics: {
                onModelCall: capture?.addModelCall,
                onRetrieval: capture?.addRagRetrieval,
              },
            }),
        }
      : undefined
    return {
      knowledge,
      knowledgeEnabled: dependencies.knowledgeEnabled === true,
      projectListState,
      message,
      codingStats: dependencies.codingStats,
      codingStatsEnabled: dependencies.codingStatsEnabled === true,
      codingHistory: dependencies.codingHistory,
      codingHistoryEnabled: dependencies.codingHistoryEnabled === true,
      siteContent: dependencies.siteContent,
      verifiedHistory,
      topicAnchors,
      today,
      toolTimeoutMs,
      logger: dependencies.logger ?? { warn() {} },
    }
  }

  function applyToolResult(state: AgentTurnState, result: AgentToolResult): void {
    const { call } = result
    if (result.status === 'completed' && call.name === 'coding_history' && result.referenceEntityLabel) {
      const label = result.referenceEntityLabel.trim()
      if (
        label.length > 0 &&
        label.length <= 80 &&
        !INVALID_REFERENCE_LABEL_CHARACTERS.test(label) &&
        !/^https?:/i.test(label)
      ) {
        state.referenceEntityLabel = label
      }
    }
    if (call.name === 'list_owned_projects' && result.status === 'completed' && result.retrieval) {
      state.shortlistStarted = true
      state.trackProjectSources = true
      state.projectSourceIds = [
        ...new Set([...state.projectSourceIds, ...(result.retrieval.projectSourceIds ?? [])]),
      ].slice(0, 200)
      state.activeProjectFilters = result.retrieval.projectListFilters
      state.catalogueToolExecutedThisStep = true
    }
    if (result.validatedArguments) {
      const arguments_ = Object.fromEntries(
        Object.entries(result.validatedArguments).filter((entry): entry is [string, string | number | boolean] => {
          const value = entry[1]
          return (
            typeof value === 'string' ||
            (typeof value === 'number' && Number.isFinite(value)) ||
            typeof value === 'boolean'
          )
        }),
      )
      state.toolObservations.push({ name: call.name, arguments: arguments_, status: result.status })
    }
    let text = result.output.slice(0, result.retrieval?.projectSourceIds ? 6_000 : 600)
    if ((call.name === 'search_knowledge' || call.name === 'list_owned_projects') && result.retrieval) {
      const citationIdMap = new Map<string, string>()
      let nextCitationNumber =
        state.citations.reduce((max, citation) => {
          const match = citation.id.match(/^K(\d+)$/)
          return match?.[1] ? Math.max(max, Number(match[1])) : max
        }, 0) + 1
      const remappedEvidence = result.retrieval.evidence.map((item) => {
        const existing = state.citations.find(
          (citation) => citation.id.startsWith('K') && citation.url === item.source.url,
        )
        const citationId = existing?.id ?? `K${nextCitationNumber++}`
        citationIdMap.set(item.citationId, citationId)
        if (!existing) {
          const sourceCitation = result.retrieval?.citations.find((citation) => citation.id === item.citationId)
          state.citations.push({
            id: citationId,
            title: sourceCitation?.title ?? item.source.title,
            url: item.source.url,
            isPublic: sourceCitation?.isPublic ?? item.isPublic,
          })
        }
        return { ...item, citationId }
      })
      for (const citation of result.retrieval.citations) {
        if (citationIdMap.has(citation.id)) continue
        const existing = state.citations.find((known) => known.id.startsWith('K') && known.url === citation.url)
        const citationId = existing?.id ?? `K${nextCitationNumber++}`
        citationIdMap.set(citation.id, citationId)
        if (!existing) state.citations.push({ ...citation, id: citationId })
      }
      state.knowledgeEvidence = [...(state.knowledgeEvidence ?? []), ...remappedEvidence]
      if (state.trackProjectSources) {
        const ownedEvidenceIds = result.retrieval.evidence
          .filter(({ source }) => source.type === 'github' || source.type === 'github-private')
          .map(({ source }) => source.sourceId)
        state.projectSourceIds = [
          ...new Set([...state.projectSourceIds, ...ownedEvidenceIds, ...(result.retrieval.projectSourceIds ?? [])]),
        ].slice(0, 200)
      }
      text = text.replace(/\[(K\d+)\]/g, (reference) => {
        const id = reference.slice(1, -1)
        return `[${citationIdMap.get(id) ?? id}]`
      })
    }
    state.toolOutputs = state.toolOutputs ? `${state.toolOutputs}\n${call.name}: ${text}` : `${call.name}: ${text}`
    if (call.name === 'list_owned_projects' && result.status === 'completed') state.catalogueFallback = text
    if (call.name !== 'list_owned_projects') state.toolSummaries.push(`${call.name}: ${text}`)
    // Count mode is the only producer of this prefix, and it is bounded to a few
    // hundred characters, so it is safe to carry without the toolSummaries cap
    // that keeps a 6,000-char catalogue dump out of the prompt.
    if (
      call.name === 'list_owned_projects' &&
      result.status === 'completed' &&
      result.output.startsWith('Owned project total:')
    )
      state.ownedProjectCount = result.output
    if (call.name === 'search_knowledge') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    } else if (call.name === 'coding_stats') {
      state.evidence = state.evidence
        ? `${state.evidence}\nLive WakaTime public share: ${text}`
        : `Live WakaTime public share: ${text}`
    } else if (call.name === 'coding_history' || call.name === 'site_content') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    }
  }

  function pushToolCitation(state: AgentTurnState, call: AgentToolCall): void {
    const citation =
      call.name === 'coding_stats'
        ? {
            id: 'W1',
            title: 'WakaTime — public-share coding activity',
            url: 'https://wakatime.com/@lst97',
            isPublic: true,
          }
        : call.name === 'coding_history'
          ? {
              id: 'W2',
              title: 'WakaTime — coding history warehouse',
              url: 'https://wakatime.com/@lst97',
              isPublic: true,
            }
          : null
    if (citation && !state.citations.some((entry) => entry.url === citation.url)) state.citations.push(citation)
  }

  async function* runAgentLoopEvents(
    message: string,
    history: ChatMessage[],
    topicAnchors: ChatTopicAnchor[],
    projectListState: ChatProjectListState,
    currentDateTimeUtc: string,
    today: string,
    initialDecisions?: AgentToolUseDecisions,
    diagnostics?: ChatDiagnosticsCapture,
  ): AsyncGenerator<ChatStreamEvent, AgentTurnState, void> {
    const state: AgentTurnState = {
      evidence: '',
      toolOutputs: '',
      toolSummaries: [],
      toolObservations: [],
      usedTools: new Set<string>(),
      citations: [],
      knowledgeUnavailable: false,
      toolRoutingUnavailable: false,
      projectSourceIds: [],
      shortlistStarted: false,
      trackProjectSources: false,
      catalogueToolExecutedThisStep: false,
    }
    state.shortlistStarted = projectListState.shortlistStarted === true
    state.projectSourceIds = projectListState.shownProjectIds
    state.activeProjectFilters = projectListState.activeFilters
    const runner = runnerFor(history, topicAnchors, today, projectListState, message, diagnostics)
    const jevRoutingRequired =
      initialDecisions !== undefined || typeof dependencies.moderation.routeTools === 'function'
    let stepsUsed = 0
    let argumentRepairUsed = false
    for (let step = 0; step < maxAgentSteps; step += 1) {
      let signalArgumentsStarted!: () => void
      const argumentPreparationStarted = new Promise<void>((resolve) => {
        signalArgumentsStarted = resolve
      })
      const selectionPromise = toolSelection.selectToolCalls(
        {
          message,
          history,
          topicAnchors,
          state,
          stepsUsed,
          currentDateTimeUtc,
          today,
          jevRoutingRequired,
          diagnostics,
          ...(step === 0 && initialDecisions !== undefined ? { initialDecisions } : {}),
        },
        signalArgumentsStarted,
      )
      const first = await Promise.race([
        selectionPromise.then((selection) => ({ kind: 'selected' as const, selection })),
        argumentPreparationStarted.then(() => ({ kind: 'preparing_arguments' as const })),
      ])
      if (first.kind === 'preparing_arguments') yield { type: 'status', status: 'preparing_arguments' }
      const selection = first.kind === 'selected' ? first.selection : await selectionPromise
      if (selection.unavailable) {
        state.toolRoutingUnavailable = true
        break
      }
      if (selection.argumentsUnavailable) state.toolRoutingUnavailable = true
      if (selection.calls.length === 0) break
      let executed = false
      for (const call of selection.calls) {
        const key = toolSelection.toolKey(call)
        if (state.usedTools.has(key)) continue
        state.usedTools.add(key)
        const progress = toolSelection.toolProgress(call)
        let name = progress.name
        yield { type: 'tool_start', ...progress }
        let result = await runAgentTool(call, runner)
        if (toolSelection.isRepairableArgumentRejection(result) && !argumentRepairUsed) {
          argumentRepairUsed = true
          yield { type: 'tool_result', name, summary: `${result.output} Retrying argument preparation once.` }
          yield { type: 'status', status: 'preparing_arguments' }
          const repairedCall = await toolSelection.repairRejectedToolCall({
            message,
            history,
            topicAnchors,
            state,
            stepsUsed,
            currentDateTimeUtc,
            call,
            rejection: result.output,
            diagnostics,
          })
          if (repairedCall) {
            const repairedProgress = toolSelection.toolProgress(repairedCall)
            yield { type: 'tool_start', name: repairedProgress.name, label: repairedProgress.label }
            state.usedTools.add(toolSelection.toolKey(repairedCall))
            result = await runAgentTool(repairedCall, runner)
            name = repairedProgress.name
          }
        }
        if (result.status === 'rejected') {
          state.toolRoutingUnavailable = true
        }
        if (call.name === 'search_knowledge' && result.output.startsWith('Knowledge lookup timed out')) {
          state.knowledgeUnavailable = true
        }
        applyToolResult(state, result)
        pushToolCitation(state, call)
        yield { type: 'tool_result', name, summary: result.output.slice(0, 400) }
        executed = true
      }
      if (!executed) break
      stepsUsed += 1
      if (!state.catalogueToolExecutedThisStep) break
      state.catalogueToolExecutedThisStep = false
      if (selection.argumentsUnavailable || state.toolRoutingUnavailable) break
    }
    return state
  }

  async function runAgentLoop(
    message: string,
    history: ChatMessage[],
    topicAnchors: ChatTopicAnchor[],
    projectListState: ChatProjectListState,
    currentDateTimeUtc: string,
    today: string,
    initialDecisions?: AgentToolUseDecisions,
    diagnostics?: ChatDiagnosticsCapture,
  ): Promise<AgentTurnState> {
    const events = runAgentLoopEvents(
      message,
      history,
      topicAnchors,
      projectListState,
      currentDateTimeUtc,
      today,
      initialDecisions,
      diagnostics,
    )
    for (;;) {
      const step = await events.next()
      if (step.done) return step.value
    }
  }

  return {
    availableToolNames: toolSelection.availableToolNames,
    buildNextConversationContext,
    runAgentLoop,
    runAgentLoopEvents,
  }
}
