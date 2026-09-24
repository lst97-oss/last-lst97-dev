import type { ChatConversationContext, ChatInput, ChatMessage, ChatResponder, ChatStreamingResponder, ChatTopicAnchor, ChatToolObservation } from './types'
import type { ChatStreamEvent } from './events'
import type { ChatContextSigner } from './context-signer'
import type { ModerationService } from '../moderation/service'
import type { RetrieveKnowledge } from '../knowledge/retrieve'
import type { Logger } from '../observability/logger'
import type { KnowledgeEvidence, PublicCitation } from '../knowledge/retrieve'
import type { WakaTimeStatsClient } from '../wakatime/stats'
import { matchCodingStatsRequest } from './coding-stats-tool'
import { type CodingHistorySource, matchCodingHistoryRequest } from './coding-history-tool'
import type { AgentPlanner, AgentToolCall, AgentToolName, AgentToolUseDecisions, AgentToolResult } from './agent-tools'
import type { ContentReader } from '../content/service'
import { MAX_AGENT_STEPS } from './agent-tools'
import { runAgentTool } from './agent-tool-runner'
import { chatModerationRejectionMessage } from './moderation-rejection'
import type { ChatModerationRejectionReason } from '../moderation/types'

const MAX_MESSAGE_LENGTH = 2_000
const MAX_HISTORY_ITEMS = 12

const UNAVAILABLE_MESSAGE = 'Message screening is temporarily unavailable.'
const EXPIRED_MESSAGE = 'This conversation has expired. Please start a new conversation.'
const OFFLINE_MESSAGE = 'The assistant is offline right now.'

type ReplyFailure = {
  category: string
  message: string
  providerStatusCode?: number
}

function describeReplyFailure(error: unknown): ReplyFailure {
  const record = typeof error === 'object' && error !== null ? error as Record<string, unknown> : undefined
  const providerStatusCode = typeof record?.statusCode === 'number' ? record.statusCode : undefined
  const errorMessage = error instanceof Error ? error.message : ''

  if (providerStatusCode === 401 || providerStatusCode === 403) {
    return { category: 'provider_auth', message: 'The AI reply service is not authorized. Please contact the site owner.', providerStatusCode }
  }
  if (providerStatusCode === 402) {
    return { category: 'provider_usage_limit', message: 'The AI reply service has reached its usage limit. Please try again later.', providerStatusCode }
  }
  if (providerStatusCode === 429) {
    return { category: 'provider_rate_limit', message: 'The AI reply provider is rate-limited right now. Please try again in a moment.', providerStatusCode }
  }
  if (providerStatusCode === 404 && errorMessage.startsWith('No endpoints found for ')) {
    return { category: 'provider_model_unavailable', message: 'The configured AI model has no available OpenRouter provider right now. Please select another model or try again later.', providerStatusCode }
  }
  if (providerStatusCode === 408 || providerStatusCode === 504 || /request timed out/i.test(errorMessage)) {
    return { category: 'provider_timeout', message: 'The AI reply provider took too long to respond. Please try again.', ...(providerStatusCode ? { providerStatusCode } : {}) }
  }
  if (errorMessage === 'OpenRouter returned an empty response') {
    return { category: 'provider_empty_response', message: 'The AI reply provider returned an empty response. Please try again.' }
  }
  if (providerStatusCode !== undefined && providerStatusCode >= 500) {
    return { category: 'provider_unavailable', message: 'The AI reply provider is temporarily unavailable. Please try again shortly.', providerStatusCode }
  }
  if (providerStatusCode !== undefined && providerStatusCode >= 400) {
    return { category: 'provider_request_rejected', message: 'The AI reply provider rejected this request. Please try rephrasing your message.', providerStatusCode }
  }
  return { category: 'provider_error', message: 'The knowledge search finished, but the AI reply service could not generate a response. Please try again shortly.' }
}

type PreparedTurn =
  | { ok: false; status: 'blocked'; reason: ChatModerationRejectionReason }
  | { ok: false; status: 'unavailable' | 'invalid_context' }
  | { ok: true; message: string; verifiedHistory: ChatMessage[]; topicAnchors: ChatTopicAnchor[]; currentDateTimeUtc: string; today: string; toolDecisions?: AgentToolUseDecisions }

export function createChatService(responder: ChatResponder, dependencies: {
  moderation: ModerationService
  contextSigner: ChatContextSigner
  knowledge?: Pick<RetrieveKnowledge, 'execute'>
  knowledgeEnabled?: boolean
  codingStats?: Pick<WakaTimeStatsClient, 'fetchSummary'>
  codingStatsEnabled?: boolean
  codingHistory?: CodingHistorySource
  codingHistoryEnabled?: boolean
  siteContent?: Pick<ContentReader, 'listProjects' | 'getProject' | 'listPosts' | 'getPost'>
  planner?: AgentPlanner
  today?: string
  toolTimeoutMs?: number
  maxAgentSteps?: number
  logger?: Pick<Logger, 'warn' | 'error'>
}) {
  const toolTimeoutMs = dependencies.toolTimeoutMs ?? 15_000
  const maxAgentSteps = Math.max(1, Math.min(8, Math.floor(dependencies.maxAgentSteps ?? MAX_AGENT_STEPS)))

  function getCurrentClock() {
    const now = new Date()
    const currentDateTimeUtc = dependencies.today ? `${dependencies.today}T00:00:00.000Z` : now.toISOString()
    return { currentDateTimeUtc, today: dependencies.today ?? currentDateTimeUtc.slice(0, 10) }
  }

  function availableToolNames(): AgentToolName[] {
    return [
      ...(dependencies.knowledgeEnabled === true && dependencies.knowledge ? ['search_knowledge' as const] : []),
      ...(dependencies.codingStatsEnabled === true && dependencies.codingStats ? ['coding_stats' as const] : []),
      ...(dependencies.codingHistoryEnabled === true && dependencies.codingHistory ? ['coding_history' as const] : []),
      ...(dependencies.siteContent ? ['site_content' as const] : []),
    ]
  }

  async function prepareTurn(input: ChatInput): Promise<PreparedTurn> {
    const clock = getCurrentClock()
    const message = input.message.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!message) {
      throw new Error('Chat message is required')
    }

    const conversation = await dependencies.contextSigner.verify(input.contextToken)
    if (input.contextToken && !conversation) return { ok: false, status: 'invalid_context' }
    const verifiedHistory = (conversation?.messages ?? []).slice(-MAX_HISTORY_ITEMS).map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    const topicAnchors = conversation?.topicAnchors ?? []
    const moderation = await dependencies.moderation.checkChat({ message, context: verifiedHistory, topicAnchors, availableTools: availableToolNames(), currentDateTimeUtc: clock.currentDateTimeUtc })
    if ('unavailable' in moderation) return { ok: false, status: 'unavailable' }
    if (!moderation.allowed) return { ok: false, status: 'blocked', reason: moderation.reason ?? 'uncertain' }

    return { ok: true, message, verifiedHistory, topicAnchors, ...clock, toolDecisions: moderation.toolDecisions }
  }

  interface AgentTurnState {
    evidence: string
    toolOutputs: string
    toolSummaries: string[]
    toolObservations: ChatToolObservation[]
    usedTools: Set<string>
    citations: PublicCitation[]
    knowledgeEvidence?: KnowledgeEvidence[]
    knowledgeUnavailable: boolean
    toolRoutingUnavailable: boolean
  }

  function buildNextConversationContext(turn: Extract<PreparedTurn, { ok: true }>, agent: AgentTurnState, assistantText: string): ChatConversationContext {
    const currentAnchor = agent.toolObservations.length > 0
      ? [{ question: turn.message, observedAtUtc: turn.currentDateTimeUtc, tools: agent.toolObservations.slice(0, 4) }]
      : []
    return {
      messages: [
        ...turn.verifiedHistory,
        { role: 'user', content: turn.message },
        { role: 'assistant', content: assistantText },
      ],
      topicAnchors: [...turn.topicAnchors, ...currentAnchor],
    }
  }

  function matchKnowledgeRequest(message: string): AgentToolCall | null {
    const text = message.toLowerCase()
    const assistantDirected = /\b(?:chat assistant|what can you help|who are you|how do you (?:decide|work|process|handle|choose)|your capabilities|how (?:does|do) (?:this|your) chat)\b/.test(text)
    const aboutNelson = /\b(?:nelson|lst97|who am i|who is he|my (?:profile|background|work|projects?|contributions?|goals?|experience)|his (?:profile|background|work|projects?|contributions?|goals?|experience))\b/.test(text)
      || (/\b(?:profile|background|experience|information|details|work|projects?)\b/.test(text) && /\babout (?:me|you|nelson|lst97)\b/.test(text))
      || (!assistantDirected && /\b(?:you|your)\b/.test(text) && /\b(?:profile|background|experience|education|qualifications?|employment|skills?|contributions?|projects?|work|coding|goals?)\b/.test(text))
    const aboutSiteImplementation = /\b(?:this|the|your|my) (?:portfolio )?(?:website|site|repository|repo|codebase|implementation|architecture)\b|\bhow (?:is|does) (?:this|the|your) (?:portfolio )?(?:website|site|repository|repo|codebase)\b/.test(text)
    if (assistantDirected || (!aboutNelson && !aboutSiteImplementation)) return null
    return { id: 'rag-fallback', name: 'search_knowledge', arguments: { query: message } }
  }

  function deterministicPlans(message: string, tools: AgentToolName[], today: string): AgentToolCall[] {
    if (tools.length === 0) return []
    const selected = new Set(tools)
    const calls: AgentToolCall[] = []
    if (selected.has('search_knowledge')) {
      const knowledge = matchKnowledgeRequest(message)
      if (knowledge) calls.push(knowledge)
    }
    if (selected.has('site_content')) {
      calls.push(...matchSiteContentPlans(message))
    }
    if (selected.has('coding_stats') || selected.has('coding_history')) {
      calls.push(...matchCodingPlans(message, today).filter((call) => selected.has(call.name)))
    }
    return calls.slice(0, 3)
  }

  function matchCodingPlans(message: string, today: string): AgentToolCall[] {
    const lower = message.toLowerCase()
    const historyQuery = dependencies.codingHistoryEnabled === true && dependencies.codingHistory
      ? matchCodingHistoryRequest(message, today)
      : null
    // "total coding hours" with no explicit past range is a live-API question:
    // the live endpoint stays current while the import is a point-in-time
    // snapshot, so two different totals otherwise reach the model at once.
    const asksLiveTotal = /\btotal\b|\ball[\s_-]?time\b|\bever\b|\bhow long\b/.test(lower)
      && (historyQuery === null || historyQuery.op === 'summary')
    // Total + breakdown ("most time on which project", "total and top
    // projects") needs BOTH tools: live API for the current total, warehouse
    // for the per-project split the live summary cannot provide.
    const wantsBreakdown = /\bmost\b|\btop\b|\bbest\b|\bwhich project\b|\bbreakdown\b|\bdistribut|\bper[- ]project\b|\bby project\b|\beach project\b/.test(lower)
    const plans: AgentToolCall[] = []
    const historyPlan = (op: string, from: string, to: string, project?: string): AgentToolCall => ({
      id: `history-${op}`,
      name: 'coding_history',
      arguments: { op, from, to, ...(project ? { project } : {}) },
    })
    if (wantsBreakdown && dependencies.codingHistory) {
      if (historyQuery && historyQuery.op !== 'summary') {
        plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
      } else {
        const range = historyQuery ?? { from: '2000-01-01', to: today }
        plans.push(historyPlan('by_project', range.from, range.to))
      }
    } else if (!asksLiveTotal && historyQuery) {
      plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
    }
    const range = dependencies.codingStatsEnabled === true && dependencies.codingStats
      ? matchCodingStatsRequest(message)
      : null
    if (range && (asksLiveTotal || wantsBreakdown || plans.length === 0)) {
      plans.push({ id: 'stats-1', name: 'coding_stats', arguments: { range: asksLiveTotal || wantsBreakdown ? 'all_time' : range } })
    }
    if (plans.length === 0 && historyQuery) {
      plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
    }
    return plans.slice(0, 2)
  }

  function matchSiteContentPlans(message: string): AgentToolCall[] {
    const asksPosts = /\b(?:blog|posts?|articles?)\b/i.test(message)
    const asksProjects = /\bprojects?\b/i.test(message)
    // Only route to Payload when the question is really about site/blog/demo
    // content — bare "which project took most time" is a warehouse question.
    const wantsSite = asksPosts
      || /demo|showcase|show case|live url|live site/i.test(message)
      || (asksProjects && /portfolio|website|showcase|demo|live|published|list|all|latest|recent|current/i.test(message))
    if (!wantsSite || !dependencies.siteContent) return []
    if (asksPosts && asksProjects) {
      return [
        { id: 'site-posts', name: 'site_content', arguments: { op: 'list_posts', limit: 5, page: 1 } },
        { id: 'site-projects', name: 'site_content', arguments: { op: 'list_projects' } },
      ]
    }
    const slug = message.match(/["\u201c\u201d'`\u300c\u300d\u300e\u300f]([^"\u201c\u201d'`\u300c\u300d\u300e\u300f]{2,120})["\u201c\u201d'`\u300c\u300d\u300e\u300f]/)?.[1]?.trim()
      ?? message.match(/\b(?:project|post|blog|article|repo)\s+(?:called\s+|named\s+)?([A-Za-z0-9][\w+.#-]{1,120})/i)?.[1]?.trim()
      ?? null
    // Bare words like "demo"/"showcase" are not slugs — only treat the
    // capture as a slug when it looks like an identifier, not a stopword.
    const slugIsReal = slug !== null && !/^(demo|demos|showcase|showcases|project|projects|post|posts|blog|blogs|article|articles|live|site|sites|portfolio|list|all|some|any|the|a|an|my|his|and|or|latest|recent|current)$/i.test(slug)
    if (slugIsReal) return [{ id: 'site-1', name: 'site_content', arguments: { op: asksPosts ? 'get_post' : 'get_project', slug } }]
    return asksPosts
      ? [{ id: 'site-posts', name: 'site_content', arguments: { op: 'list_posts', limit: 5, page: 1 } }]
      : [{ id: 'site-projects', name: 'site_content', arguments: { op: 'list_projects' } }]
  }

  function runnerFor(verifiedHistory: ChatMessage[], topicAnchors: ChatTopicAnchor[], today: string): Parameters<typeof runAgentTool>[1] {
    return {
      knowledge: dependencies.knowledge,
      knowledgeEnabled: dependencies.knowledgeEnabled === true,
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

  function toolKey(call: AgentToolCall): string {
    return `${call.name}:${JSON.stringify(call.arguments)}`
  }

  function applyToolResult(state: AgentTurnState, result: AgentToolResult): void {
    const { call } = result
    if (result.validatedArguments) {
      const arguments_ = Object.fromEntries(Object.entries(result.validatedArguments).filter((entry): entry is [string, string | number | boolean] => {
        const value = entry[1]
        return typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean'
      }))
      state.toolObservations.push({ name: call.name, arguments: arguments_, status: result.status })
    }
    let text = result.output.slice(0, 600)
    if (call.name === 'search_knowledge' && result.retrieval) {
      const citationIdMap = new Map<string, string>()
      let nextCitationNumber = state.citations.reduce((max, citation) => {
        const match = citation.id.match(/^K(\d+)$/)
        return match?.[1] ? Math.max(max, Number(match[1])) : max
      }, 0) + 1
      const remappedEvidence = result.retrieval.evidence.map((item) => {
        const existing = state.citations.find((citation) => citation.id.startsWith('K') && citation.url === item.source.url)
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
      text = text.replace(/\[(K\d+)\]/g, (reference) => {
        const id = reference.slice(1, -1)
        return `[${citationIdMap.get(id) ?? id}]`
      })
    }
    state.toolOutputs = state.toolOutputs ? `${state.toolOutputs}\n${call.name}: ${text}` : `${call.name}: ${text}`
    state.toolSummaries.push(`${call.name}: ${text}`)
    if (call.name === 'search_knowledge') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    } else if (call.name === 'coding_stats') {
      state.evidence = state.evidence ? `${state.evidence}\nLive coding activity: ${text}` : `Live coding activity: ${text}`
    } else if (call.name === 'coding_history' || call.name === 'site_content') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    }
  }

  function pushToolCitation(state: AgentTurnState, call: AgentToolCall): void {
    const citation = call.name === 'coding_stats'
      ? { id: 'W1', title: 'WakaTime — live coding activity', url: 'https://wakatime.com/@lst97', isPublic: true }
      : call.name === 'coding_history'
        ? { id: 'W2', title: 'WakaTime — coding history warehouse', url: 'https://wakatime.com/@lst97', isPublic: true }
        : null
    if (citation && !state.citations.some((entry) => entry.url === citation.url)) state.citations.push(citation)
  }

  async function selectToolCalls(input: {
    message: string
    history: ChatMessage[]
    topicAnchors: ChatTopicAnchor[]
    state: AgentTurnState
    stepsUsed: number
    currentDateTimeUtc: string
    today: string
    initialDecisions?: AgentToolUseDecisions
    jevRoutingRequired: boolean
  }, onArgumentsStart?: () => void): Promise<{ calls: AgentToolCall[]; unavailable: boolean; argumentsUnavailable: boolean }> {
    const availableTools = availableToolNames()
    const hasInitialDecisions = input.initialDecisions !== undefined
    const routeTools = dependencies.moderation.routeTools

    // Keep the injected planner seam usable in isolated consumers that do not
    // have the production Jev classifier. The production runtime always routes
    // through Jev before any tool can run.
    if (!input.jevRoutingRequired) {
      if (dependencies.planner) {
        try {
          onArgumentsStart?.()
          const plan = await dependencies.planner.planNextStep({
            message: input.message,
            currentDateTimeUtc: input.currentDateTimeUtc,
            history: input.history,
            topicAnchors: input.topicAnchors,
            evidence: input.state.evidence,
            toolOutputs: input.state.toolOutputs,
            stepsUsed: input.stepsUsed,
          })
          return { calls: plan?.kind === 'tool_calls' ? plan.calls.filter((call) => availableTools.includes(call.name)).slice(0, 4) : [], unavailable: false, argumentsUnavailable: false }
        } catch (error) {
          dependencies.logger?.warn('chat.agent_plan.unavailable', { error })
        }
      }
      return { calls: deterministicPlans(input.message, availableTools, input.today), unavailable: false, argumentsUnavailable: false }
    }

    let decisions = input.stepsUsed === 0 && hasInitialDecisions ? input.initialDecisions : undefined
    if (!decisions) {
      if (typeof routeTools !== 'function') return { calls: [], unavailable: true, argumentsUnavailable: false }
      try {
        decisions = await routeTools({
          message: input.message,
          currentDateTimeUtc: input.currentDateTimeUtc,
          history: input.history,
          topicAnchors: input.topicAnchors,
          evidence: input.state.evidence,
          toolOutputs: input.state.toolOutputs,
          availableTools,
        })
      } catch (error) {
        dependencies.logger?.warn('chat.agent_route.unavailable', { error })
        return { calls: [], unavailable: true, argumentsUnavailable: false }
      }
    }
    if (!decisions) return { calls: [], unavailable: true, argumentsUnavailable: false }

    // Explicit Jev labels win even when confidence is low. Only the literal
    // uncertain label delegates that tool's routing decision to regex.
    const jevApprovedTools = availableTools.filter((tool) => decisions?.[tool]?.label === 'use')
    const uncertainTools = availableTools.filter((tool) => decisions?.[tool]?.label === 'uncertain')
    const regexCalls = deterministicPlans(input.message, uncertainTools, input.today)
    let plannerCalls: AgentToolCall[] = []
    let argumentsUnavailable = false
    if (jevApprovedTools.length > 0 && dependencies.planner) {
      try {
        onArgumentsStart?.()
        const plan = await dependencies.planner.planNextStep({
          message: input.message,
          currentDateTimeUtc: input.currentDateTimeUtc,
          history: input.history,
          topicAnchors: input.topicAnchors,
          evidence: input.state.evidence,
          toolOutputs: input.state.toolOutputs,
          stepsUsed: input.stepsUsed,
          allowedTools: jevApprovedTools,
        })
        if (plan?.kind === 'tool_calls') {
          const approved = new Set(jevApprovedTools)
          plannerCalls = plan.calls.filter((call) => approved.has(call.name)).slice(0, 4)
        }
        const hasBothSiteSources = /\b(?:blog|posts?|articles?)\b/i.test(input.message) && /\bprojects?\b/i.test(input.message)
        if (hasBothSiteSources && jevApprovedTools.includes('site_content')) {
          const siteFallbacks = matchSiteContentPlans(input.message)
          for (const call of siteFallbacks) {
            if (!plannerCalls.some((planned) => toolKey(planned) === toolKey(call)) && plannerCalls.length < 4) plannerCalls.push(call)
          }
        }
        const plannedTools = new Set(plannerCalls.map((call) => call.name))
        const missingApprovedTools = jevApprovedTools.filter((tool) => !plannedTools.has(tool))
        if (missingApprovedTools.length > 0) {
          const fallbackCalls = deterministicPlans(input.message, missingApprovedTools, input.today)
          for (const call of fallbackCalls) {
            if (!plannerCalls.some((planned) => planned.name === call.name) && plannerCalls.length < 4) plannerCalls.push(call)
          }
        }
        const preparedTools = new Set(plannerCalls.map((call) => call.name))
        argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
      } catch (error) {
        dependencies.logger?.warn('chat.agent_arguments.unavailable', { error })
        // Jev remains the authority on whether a source is needed. If the
        // argument model is unavailable, deterministic parsing may still
        // prepare calls for those already approved tools.
        plannerCalls = deterministicPlans(input.message, jevApprovedTools, input.today)
        const preparedTools = new Set(plannerCalls.map((call) => call.name))
        argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
      }
    } else if (jevApprovedTools.length > 0) {
      // Without an argument planner, use deterministic argument extraction
      // for Jev-approved tools; it cannot add or veto a tool name.
      plannerCalls = deterministicPlans(input.message, jevApprovedTools, input.today)
      const preparedTools = new Set(plannerCalls.map((call) => call.name))
      argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
    }

    const calls = [...plannerCalls, ...regexCalls].slice(0, 4)
    const scheduledJeVTools = new Set(calls.map((call) => call.name))
    argumentsUnavailable ||= jevApprovedTools.some((tool) => !scheduledJeVTools.has(tool))
    return { calls, unavailable: false, argumentsUnavailable }
  }

  async function runAgentLoop(message: string, history: ChatMessage[], topicAnchors: ChatTopicAnchor[], currentDateTimeUtc: string, today: string, initialDecisions?: AgentToolUseDecisions): Promise<AgentTurnState> {
    const state: AgentTurnState = {
      evidence: '',
      toolOutputs: '',
      toolSummaries: [],
      toolObservations: [],
      usedTools: new Set<string>(),
      citations: [],
      knowledgeUnavailable: false,
      toolRoutingUnavailable: false,
    }
    const runner = runnerFor(history, topicAnchors, today)
    const jevRoutingRequired = initialDecisions !== undefined || typeof dependencies.moderation.routeTools === 'function'
    let stepsUsed = 0
    for (let step = 0; step < maxAgentSteps; step += 1) {
      const selection = await selectToolCalls({ message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc, today, jevRoutingRequired, ...(step === 0 && initialDecisions !== undefined ? { initialDecisions } : {}) })
      if (selection.unavailable) {
        state.toolRoutingUnavailable = true
        break
      }
      if (selection.argumentsUnavailable) state.toolRoutingUnavailable = true
      if (selection.calls.length === 0) break
      let executed = false
      for (const call of selection.calls) {
        const key = toolKey(call)
        if (state.usedTools.has(key)) continue
        state.usedTools.add(key)
        const result = await runAgentTool(call, runner)
        if (jevRoutingRequired && result.output.startsWith(`Tool ${call.name} rejected:`)) {
          state.toolRoutingUnavailable = true
        }
        if (call.name === 'search_knowledge' && result.output.startsWith('Knowledge lookup timed out')) {
          state.knowledgeUnavailable = true
        }
        applyToolResult(state, result)
        pushToolCitation(state, call)
        executed = true
      }
      if (!executed) break
      stepsUsed += 1
      if (selection.argumentsUnavailable || state.toolRoutingUnavailable) break
    }
    return state
  }

  async function *runAgentLoopStream(message: string, history: ChatMessage[], topicAnchors: ChatTopicAnchor[], currentDateTimeUtc: string, today: string, initialDecisions?: AgentToolUseDecisions): AsyncGenerator<ChatStreamEvent, AgentTurnState, void> {
    const state: AgentTurnState = {
      evidence: '',
      toolOutputs: '',
      toolSummaries: [],
      toolObservations: [],
      usedTools: new Set<string>(),
      citations: [],
      knowledgeUnavailable: false,
      toolRoutingUnavailable: false,
    }
    const runner = runnerFor(history, topicAnchors, today)
    const jevRoutingRequired = initialDecisions !== undefined || typeof dependencies.moderation.routeTools === 'function'
    let stepsUsed = 0
    for (let step = 0; step < maxAgentSteps; step += 1) {
      let signalArgumentsStarted!: () => void
      const argumentPreparationStarted = new Promise<void>((resolve) => { signalArgumentsStarted = resolve })
      const selectionPromise = selectToolCalls(
        { message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc, today, jevRoutingRequired, ...(step === 0 && initialDecisions !== undefined ? { initialDecisions } : {}) },
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
        const key = toolKey(call)
        if (state.usedTools.has(key)) continue
        state.usedTools.add(key)
        const label = call.name === 'search_knowledge'
          ? 'SEARCHING MY NOTES…'
          : call.name === 'coding_stats'
            ? 'CHECKING CODING STATS…'
            : call.name === 'site_content'
              ? 'BROWSING SITE CONTENT…'
              : 'SEARCHING CODING HISTORY…'
        const name = call.name === 'search_knowledge' ? 'knowledge' : call.name
        yield { type: 'tool_start', name, label }
        const result = await runAgentTool(call, runner)
        if (jevRoutingRequired && result.output.startsWith(`Tool ${call.name} rejected:`)) {
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
      if (selection.argumentsUnavailable || state.toolRoutingUnavailable) break
    }
    return state
  }

  return {
    async send(input: ChatInput) {
      const turn = await prepareTurn(input)
      if (!turn.ok) {
        return turn.status === 'blocked'
          ? { status: 'blocked' as const, reason: turn.reason }
          : { status: turn.status }
      }
      const agent = await runAgentLoop(turn.message, turn.verifiedHistory, turn.topicAnchors, turn.currentDateTimeUtc, turn.today, turn.toolDecisions)
      const extraContext = agent.toolSummaries.length > 0 ? agent.toolSummaries.join('\n') : undefined
      const reply = await responder.respond({
        message: turn.message,
        currentDateTimeUtc: turn.currentDateTimeUtc,
        history: turn.verifiedHistory,
        ...(agent.knowledgeUnavailable ? { evidence: agent.knowledgeEvidence ?? [] } : agent.knowledgeEvidence !== undefined ? { evidence: agent.knowledgeEvidence } : {}),
        ...(agent.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}),
        ...(agent.toolRoutingUnavailable ? { toolRoutingUnavailable: true as const } : {}),
        ...(extraContext ? { extraContext } : {}),
      })
      const contextToken = await dependencies.contextSigner.sign(buildNextConversationContext(turn, agent, reply.text))
      const knowledgeEnabled = dependencies.knowledgeEnabled === true
      return {
        status: 'replied' as const,
        ...reply,
        contextToken,
        ...(knowledgeEnabled ? { citations: agent.citations, ...(agent.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}) } : {}),
      }
    },

    async *sendStream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
      const streaming = responder as Partial<ChatStreamingResponder>
      if (!streaming.stream) {
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }

      let turn: PreparedTurn
      try {
        turn = await prepareTurn(input)
      } catch {
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }
      if (!turn.ok) {
        yield {
          type: 'error',
          message: turn.status === 'blocked'
            ? chatModerationRejectionMessage(turn.reason)
            : turn.status === 'unavailable' ? UNAVAILABLE_MESSAGE : EXPIRED_MESSAGE,
        }
        return
      }
      if (signal?.aborted) return

      const agentStream = runAgentLoopStream(turn.message, turn.verifiedHistory, turn.topicAnchors, turn.currentDateTimeUtc, turn.today, turn.toolDecisions)
      let agent: AgentTurnState | undefined
      for (;;) {
        const step = await agentStream.next()
        if (step.done) {
          agent = step.value
          break
        }
        yield step.value
      }
      const state = agent ?? { evidence: '', toolOutputs: '', toolSummaries: [], toolObservations: [], usedTools: new Set<string>(), citations: [], knowledgeUnavailable: false, toolRoutingUnavailable: false }
      const extraContext = state.toolSummaries.length > 0 ? state.toolSummaries.join('\n') : undefined

      if (signal?.aborted) return
      yield { type: 'status', status: 'composing_reply' }

      let fullText = ''
      let model: string | undefined
      try {
        for await (const chunk of streaming.stream({
          message: turn.message,
          currentDateTimeUtc: turn.currentDateTimeUtc,
          history: turn.verifiedHistory,
          ...(state.knowledgeUnavailable ? { evidence: state.knowledgeEvidence ?? [] } : state.knowledgeEvidence !== undefined ? { evidence: state.knowledgeEvidence } : {}),
          ...(state.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}),
          ...(state.toolRoutingUnavailable ? { toolRoutingUnavailable: true as const } : {}),
          ...(extraContext ? { extraContext } : {}),
        }, signal)) {
          if ('done' in chunk) {
            fullText = chunk.text
            model = chunk.model
            break
          }
          fullText += chunk.delta
          model ??= chunk.model
          if (chunk.delta) yield { type: 'token', delta: chunk.delta }
        }
      } catch (error) {
        const failure = describeReplyFailure(error)
        dependencies.logger?.error('chat.reply_generation.failed', {
          failureCategory: failure.category,
          ...(failure.providerStatusCode ? { providerStatusCode: failure.providerStatusCode } : {}),
        })
        yield { type: 'error', message: failure.message }
        return
      }

      if (signal?.aborted) return
      const citations = state.citations
      if (citations.length > 0) {
        yield { type: 'citations', citations }
      }
      if (state.knowledgeUnavailable) {
        yield { type: 'knowledge_note' }
      }
      const contextToken = await dependencies.contextSigner.sign(buildNextConversationContext(turn, state, fullText))
      yield { type: 'done', contextToken, ...(model ? { model } : {}) }
    },
  }
}

export type ChatService = ReturnType<typeof createChatService>
