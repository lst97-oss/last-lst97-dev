import { EMPTY_VERIFIED_REPLY, type ChatConversationContext, type ChatInput, type ChatMessage, type ChatProjectListState, type ChatResponder, type ChatStreamingResponder, type ChatTopicAnchor, type ChatToolObservation } from './types'
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
import type { ProjectCatalogFilters } from '../knowledge/project-catalog'
import type { ContentReader } from '../content/service'
import { MAX_AGENT_STEPS } from './agent-tools'
import { runAgentTool } from './agent-tool-runner'
import { chatModerationRejectionMessage } from './moderation-rejection'
import type { ChatModerationRejectionReason } from '../moderation/types'
import { resolveKnowledgeQuery } from '../knowledge/query-resolution'
import { CHAT_TURN_LIMIT_MESSAGE, MAX_CHAT_CONTEXT_MESSAGES } from '../../lib/chat-limits'
import { createChatDiagnosticsCapture } from '../observability/chat-diagnostics'
import type { ChatDiagnosticsCapture, ChatDiagnosticsOutcome, ChatDiagnosticsSink } from '../observability/chat-diagnostics'

const MAX_MESSAGE_LENGTH = 2_000
const MAX_HISTORY_ITEMS = MAX_CHAT_CONTEXT_MESSAGES

const UNAVAILABLE_MESSAGE = 'Message screening is temporarily unavailable.'
const EXPIRED_MESSAGE = 'This conversation has expired. Please start a new conversation.'
const OFFLINE_MESSAGE = 'The assistant is offline right now.'
const CONTACT_CONFIRMATION_TEXT = 'It sounds like you want to send a message or report to Nelson by email. Starting a contact session clears this conversation, and none of its earlier messages will be included in your email. Would you like to continue?'
const PERSONAL_KNOWLEDGE_FACT = /\b(?:nelson|lst97|handle|username|profile|education|educational|degree|qualification|study|school|experience|employment|career|professional|skills?|background|contributions?|contact|email|linkedin|repositories|repository|repos?|projects?|website|codebase|technology|tech stack)\b/i
const ASSISTANT_USAGE_REQUEST = /\b(?:chat assistant|portfolio assistant|what can you help|your capabilities|how do you (?:decide|work|process|handle|choose)|how does (?:this|your) chat|what services do you provide)\b/i

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
  | { ok: false; status: 'contact_confirmation'; text: string; contextToken: string }
  | { ok: false; status: 'turn_limit' }
  | { ok: true; message: string; verifiedHistory: ChatMessage[]; topicAnchors: ChatTopicAnchor[]; projectListState: ChatProjectListState; currentDateTimeUtc: string; today: string; toolDecisions?: AgentToolUseDecisions }

export function createChatService(responder: ChatResponder, dependencies: {
  moderation: ModerationService
  contextSigner: ChatContextSigner
  knowledge?: Pick<RetrieveKnowledge, 'execute'> & Partial<Pick<RetrieveKnowledge, 'listOwnedProjects'>>
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
  diagnosticsSink?: ChatDiagnosticsSink
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
      ...(dependencies.knowledgeEnabled === true && typeof dependencies.knowledge?.listOwnedProjects === 'function' ? ['list_owned_projects' as const] : []),
      ...(dependencies.codingStatsEnabled === true && dependencies.codingStats ? ['coding_stats' as const] : []),
      ...(dependencies.codingHistoryEnabled === true && dependencies.codingHistory ? ['coding_history' as const] : []),
      ...(dependencies.siteContent ? ['site_content' as const] : []),
    ]
  }

  function requiredKnowledgeQuery(message: string, history: ChatMessage[], topicAnchors: ChatTopicAnchor[]): string | undefined {
    const query = resolveKnowledgeQuery(message, history, topicAnchors)
    if (ASSISTANT_USAGE_REQUEST.test(message) && !/\b(?:nelson|lst97|his|him)\b/i.test(message)) return undefined
    if (!PERSONAL_KNOWLEDGE_FACT.test(query)) return undefined

    if (/\b(?:demo|demos|live[- ]?site|live[- ]?url|deployment|deployed)\b/i.test(query)) {
      return `Nelson's projects, live demo URLs, deployed websites, and project links. Original question: ${query}`.slice(0, 1_000)
    }

    const namedProject = query.match(/\b[a-z0-9]+(?:[-_.][a-z0-9]+)+\b/i)?.[0]
    if (namedProject && /\b(?:project|repository|repo|codebase)\b/i.test(query)) {
      return `Nelson's exact repository record for ${namedProject}: ownership, project purpose, visibility, technologies, files, and source evidence. Original question: ${query}`.slice(0, 1_000)
    }
    return query
  }

  function createDiagnosticsCapture(): ChatDiagnosticsCapture | undefined {
    if (!dependencies.diagnosticsSink) return undefined
    return createChatDiagnosticsCapture({
      traceId: crypto.randomUUID(),
      message: '',
    }, dependencies.diagnosticsSink)
  }

  function finishDiagnostics(capture: ChatDiagnosticsCapture | undefined, outcome: ChatDiagnosticsOutcome, response?: string): void {
    capture?.finish({ outcome, ...(response !== undefined ? { response } : {}) })
  }

  function diagnosticsObserver(capture: ChatDiagnosticsCapture | undefined) {
    return capture ? {
      onModelCall: capture.addModelCall,
      onJevDecision: capture.addJevDecision,
    } : undefined
  }

  async function prepareTurn(input: ChatInput, capture?: ChatDiagnosticsCapture): Promise<PreparedTurn> {
    const clock = getCurrentClock()
    const message = input.message.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!message) {
      throw new Error('Chat message is required')
    }

    const conversation = await dependencies.contextSigner.verify(input.contextToken)
    if (input.contextToken && !conversation) return { ok: false, status: 'invalid_context' }
    const workflow = conversation?.workflow ?? { mode: 'normal' as const, phase: 'conversation' as const }
    if (workflow.mode !== 'normal' || workflow.phase !== 'conversation') return { ok: false, status: 'invalid_context' }
    if ((conversation?.messages.length ?? 0) >= MAX_CHAT_CONTEXT_MESSAGES) return { ok: false, status: 'turn_limit' }
    const verifiedHistory = (conversation?.messages ?? []).slice(-MAX_HISTORY_ITEMS).map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    const topicAnchors = conversation?.topicAnchors ?? []
    const projectListState = conversation?.projectListState ?? { clarificationAsked: false, shownProjectIds: [] }
    const moderation = await dependencies.moderation.checkChat({ message, context: verifiedHistory, topicAnchors, projectListState, availableTools: availableToolNames(), currentDateTimeUtc: clock.currentDateTimeUtc }, diagnosticsObserver(capture))
    if ('unavailable' in moderation) return { ok: false, status: 'unavailable' }
    if (!moderation.allowed) return { ok: false, status: 'blocked', reason: moderation.reason ?? 'uncertain' }

    if (moderation.contactIntent === 'contact') {
      const contextToken = await dependencies.contextSigner.sign({
        messages: verifiedHistory,
        topicAnchors,
        projectListState,
        workflow: { mode: 'normal', phase: 'contact_confirmation' },
      })
      return { ok: false, status: 'contact_confirmation', text: CONTACT_CONFIRMATION_TEXT, contextToken }
    }

    capture?.setContext(message, verifiedHistory)
    capture?.setMetadata(input.diagnosticsMetadata)

    return {
      ok: true,
      message,
      verifiedHistory,
      topicAnchors,
      projectListState,
      ...clock,
      toolDecisions: moderation.toolDecisions,
    }
  }

  interface AgentTurnState {
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
  }

  function buildNextConversationContext(turn: Extract<PreparedTurn, { ok: true }>, agent: AgentTurnState, assistantText: string): ChatConversationContext {
    const currentAnchor = agent.toolObservations.length > 0
      ? [{ question: turn.message, ...(agent.referenceEntityLabel ? { entityLabel: agent.referenceEntityLabel } : {}), observedAtUtc: turn.currentDateTimeUtc, tools: agent.toolObservations.slice(0, 4) }]
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
        shownProjectIds: [...new Set([...turn.projectListState.shownProjectIds, ...agent.projectSourceIds])].slice(0, 200),
        shortlistStarted: turn.projectListState.shortlistStarted === true || agent.shortlistStarted,
        ...(agent.activeProjectFilters ? { activeFilters: agent.activeProjectFilters } : turn.projectListState.activeFilters ? { activeFilters: turn.projectListState.activeFilters } : {}),
      },
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

  function isAffirmativeToolAcceptance(message: string): boolean {
    return /^(?:yes(?:,? please)?|please|sure|go ahead|try it|do it|that works)[.!]?$/i.test(message.trim())
  }

  function acceptedToolCalls(
    message: string,
    history: ChatMessage[],
    tools: AgentToolName[],
    today: string,
  ): AgentToolCall[] {
    if (!isAffirmativeToolAcceptance(message) || history.at(-1)?.role !== 'assistant') return []
    const offer = history.at(-1)?.content ?? ''
    if (!/\b(?:want me|would you like me|shall i|can i|try pulling|try to pull|look up|check|fetch|connect)\b/i.test(offer)) return []
    const selected = new Set(tools)
    const calls: AgentToolCall[] = []
    if (selected.has('coding_stats') && /\b(?:operating system|os)\b/i.test(offer)) {
      calls.push({ id: 'stats-os-accepted', name: 'coding_stats', arguments: { category: 'operating_systems', range: 'all_time' } })
    } else if (selected.has('coding_stats') && /\b(?:wakatime|public[- ]share|coding activity|coding hours?|total hours)\b/i.test(offer)) {
      calls.push({ id: 'stats-accepted', name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' } })
    }
    if (selected.has('coding_history') && /\b(?:coding-history|coding history|warehouse|per-project|language breakdown|daily series|streak)\b/i.test(offer)) {
      calls.push({ id: 'history-accepted', name: 'coding_history', arguments: { op: 'summary', from: '2000-01-01', to: today } })
    }
    if (selected.has('search_knowledge') && /\b(?:knowledge|profile|repository|project details)\b/i.test(offer)) {
      calls.push({ id: 'knowledge-accepted', name: 'search_knowledge', arguments: { query: 'the previously offered personal knowledge lookup' } })
    }
    if (selected.has('site_content') && /\b(?:published site|site content|blog post|showcase)\b/i.test(offer)) {
      calls.push({ id: 'site-accepted', name: 'site_content', arguments: { op: 'list_projects' } })
    }
    return calls.slice(0, 4)
  }

  function deterministicPlans(message: string, tools: AgentToolName[], today: string): AgentToolCall[] {
    if (tools.length === 0) return []
    const selected = new Set(tools)
    const calls: AgentToolCall[] = []
    if (selected.has('list_owned_projects')) calls.push({ id: 'owned-projects', name: 'list_owned_projects', arguments: {} })
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
    const shareQuery = dependencies.codingStatsEnabled === true && dependencies.codingStats
      ? matchCodingStatsRequest(message)
      : null
    const asksProjectBreakdown = /\bmost\b|\btop\b|\bbest\b|\bwhich project\b|\bbreakdown\b|\bdistribut|\bper[- ]project\b|\bby project\b|\beach project\b/.test(lower)
    const arbitraryHistoricalRange = Boolean(historyQuery && /\b20\d{2}\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(lower))
    const plans: AgentToolCall[] = []
    const historyPlan = (op: string, from: string, to: string, project?: string): AgentToolCall => ({
      id: `history-${op}`,
      name: 'coding_history',
      arguments: { op, from, to, ...(project ? { project } : {}) },
    })
    if (asksProjectBreakdown && dependencies.codingHistory) {
      if (historyQuery && historyQuery.op !== 'summary') {
        plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
      } else {
        plans.push(historyPlan('by_project', historyQuery?.from ?? '2000-01-01', historyQuery?.to ?? today))
      }
    } else if (historyQuery && (arbitraryHistoricalRange || historyQuery.op === 'daily' || historyQuery.op === 'streaks' || historyQuery.project)) {
      plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
    }
    if (shareQuery && (!historyQuery || !arbitraryHistoricalRange)) {
      plans.push({ id: 'stats-1', name: 'coding_stats', arguments: { category: shareQuery.category, range: shareQuery.range } })
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

  function runnerFor(verifiedHistory: ChatMessage[], topicAnchors: ChatTopicAnchor[], today: string, projectListState: ChatProjectListState, message: string, capture?: ChatDiagnosticsCapture): Parameters<typeof runAgentTool>[1] {
    const baseKnowledge = dependencies.knowledge
    const knowledge = baseKnowledge ? {
      ...(typeof baseKnowledge.listOwnedProjects === 'function' ? { listOwnedProjects: baseKnowledge.listOwnedProjects.bind(baseKnowledge) } : {}),
      execute: (input: Parameters<RetrieveKnowledge['execute']>[0]) => baseKnowledge.execute({
        ...input,
        diagnostics: {
          onModelCall: capture?.addModelCall,
          onRetrieval: capture?.addRagRetrieval,
        },
      }),
    } : undefined
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

  function toolKey(call: AgentToolCall): string {
    return `${call.name}:${JSON.stringify(call.arguments)}`
  }

  function applyToolResult(state: AgentTurnState, result: AgentToolResult): void {
    const { call } = result
    if (result.status === 'completed' && call.name === 'coding_history' && result.referenceEntityLabel) {
      const label = result.referenceEntityLabel.trim()
      if (label.length > 0 && label.length <= 80 && !/[\u0000-\u001f\u007f/:?#]/.test(label) && !/^https?:/i.test(label)) {
        state.referenceEntityLabel = label
      }
    }
    if (call.name === 'list_owned_projects' && result.status === 'completed' && result.retrieval) {
      state.shortlistStarted = true
      state.trackProjectSources = true
      state.projectSourceIds = [...new Set([...state.projectSourceIds, ...(result.retrieval.projectSourceIds ?? [])])].slice(0, 200)
      state.activeProjectFilters = result.retrieval.projectListFilters
      state.catalogueToolExecutedThisStep = true
    }
    if (result.validatedArguments) {
      const arguments_ = Object.fromEntries(Object.entries(result.validatedArguments).filter((entry): entry is [string, string | number | boolean] => {
        const value = entry[1]
        return typeof value === 'string' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'boolean'
      }))
      state.toolObservations.push({ name: call.name, arguments: arguments_, status: result.status })
    }
    let text = result.output.slice(0, result.retrieval?.projectSourceIds ? 6_000 : 600)
    if ((call.name === 'search_knowledge' || call.name === 'list_owned_projects') && result.retrieval) {
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
      if (state.trackProjectSources) {
        const ownedEvidenceIds = result.retrieval.evidence
          .filter(({ source }) => source.type === 'github' || source.type === 'github-private')
          .map(({ source }) => source.sourceId)
        state.projectSourceIds = [...new Set([
          ...state.projectSourceIds,
          ...ownedEvidenceIds,
          ...(result.retrieval.projectSourceIds ?? []),
        ])].slice(0, 200)
      }
      text = text.replace(/\[(K\d+)\]/g, (reference) => {
        const id = reference.slice(1, -1)
        return `[${citationIdMap.get(id) ?? id}]`
      })
    }
    state.toolOutputs = state.toolOutputs ? `${state.toolOutputs}\n${call.name}: ${text}` : `${call.name}: ${text}`
    if (call.name === 'list_owned_projects' && result.status === 'completed') state.catalogueFallback = text
    if (call.name !== 'list_owned_projects') state.toolSummaries.push(`${call.name}: ${text}`)
    if (call.name === 'search_knowledge') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    } else if (call.name === 'coding_stats') {
      state.evidence = state.evidence ? `${state.evidence}\nLive WakaTime public share: ${text}` : `Live WakaTime public share: ${text}`
    } else if (call.name === 'coding_history' || call.name === 'site_content') {
      state.evidence = state.evidence ? `${state.evidence}\n${text}` : text
    }
  }

  function pushToolCitation(state: AgentTurnState, call: AgentToolCall): void {
    const citation = call.name === 'coding_stats'
      ? { id: 'W1', title: 'WakaTime — public-share coding activity', url: 'https://wakatime.com/@lst97', isPublic: true }
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
    diagnostics?: ChatDiagnosticsCapture
  }, onArgumentsStart?: () => void): Promise<{ calls: AgentToolCall[]; unavailable: boolean; argumentsUnavailable: boolean }> {
    const availableTools = availableToolNames()
    const hasInitialDecisions = input.initialDecisions !== undefined
    const routeTools = dependencies.moderation.routeTools
    const acceptedCalls = acceptedToolCalls(input.message, input.history, availableTools, input.today)

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
            onModelCall: input.diagnostics?.addModelCall,
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
          projectListState: input.state.activeProjectFilters ? { clarificationAsked: false, shownProjectIds: input.state.projectSourceIds, shortlistStarted: input.state.shortlistStarted, activeFilters: input.state.activeProjectFilters } : undefined,
          evidence: input.state.evidence,
          toolOutputs: input.state.toolOutputs,
          availableTools,
        }, diagnosticsObserver(input.diagnostics))
      } catch (error) {
        dependencies.logger?.warn('chat.agent_route.unavailable', { error })
        return { calls: [], unavailable: true, argumentsUnavailable: false }
      }
    }
    if (!decisions) return { calls: [], unavailable: true, argumentsUnavailable: false }

    const projectInventoryRequest = /\b(?:list|show|browse|see|more|all|available)\b/i.test(input.message)
      && /\b(?:projects?|repositories|repos)\b/i.test(input.message)
    const projectDetailsRequested = /\b(?:describe|details?|purpose|how (?:does|do)|what (?:is|does|are))\b/i.test(input.message)
    const requiredQuery = availableTools.includes('search_knowledge') && !(projectInventoryRequest && !projectDetailsRequested)
      ? requiredKnowledgeQuery(input.message, input.history, input.topicAnchors)
      : undefined
    // Explicit Jev labels win even when confidence is low. Only the literal
    // uncertain label delegates that tool's routing decision to regex. For
    // owner knowledge, however, chat history cannot establish completeness:
    // every new factual request requires a fresh source lookup.
    let jevApprovedTools = availableTools.filter((tool) => decisions?.[tool]?.label === 'use')
    if (requiredQuery && !jevApprovedTools.includes('search_knowledge')) jevApprovedTools.push('search_knowledge')
    if (jevApprovedTools.includes('list_owned_projects') && jevApprovedTools.includes('search_knowledge')) jevApprovedTools = ['list_owned_projects']
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
          onModelCall: input.diagnostics?.addModelCall,
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
          const fallbackCalls = acceptedCalls.length > 0
            ? acceptedCalls.filter((call) => missingApprovedTools.includes(call.name))
            : deterministicPlans(input.message, missingApprovedTools, input.today)
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
        plannerCalls = acceptedCalls.length > 0
          ? acceptedCalls.filter((call) => jevApprovedTools.includes(call.name))
          : deterministicPlans(input.message, jevApprovedTools, input.today)
        const preparedTools = new Set(plannerCalls.map((call) => call.name))
        argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
      }
    } else if (jevApprovedTools.length > 0) {
      // Without an argument planner, use deterministic argument extraction
      // for Jev-approved tools; it cannot add or veto a tool name.
      plannerCalls = acceptedCalls.length > 0
        ? acceptedCalls.filter((call) => jevApprovedTools.includes(call.name))
        : deterministicPlans(input.message, jevApprovedTools, input.today)
      const preparedTools = new Set(plannerCalls.map((call) => call.name))
      argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
    }

    if (requiredQuery) {
      let replacedQuery = false
      plannerCalls = plannerCalls.map((call) => {
        if (call.name !== 'search_knowledge') return call
        replacedQuery = true
        return { ...call, arguments: { ...call.arguments, query: requiredQuery } }
      })
      if (!replacedQuery) {
        plannerCalls.unshift({
          id: 'required-owner-knowledge',
          name: 'search_knowledge',
          arguments: { query: requiredQuery },
        })
      }
    }
    let calls = [...plannerCalls, ...regexCalls].slice(0, 4)
    if (calls.some((call) => call.name === 'list_owned_projects') && calls.some((call) => call.name === 'search_knowledge')) {
      calls = calls.filter((call) => call.name === 'list_owned_projects')
    }
    const scheduledJeVTools = new Set(calls.map((call) => call.name))
    const catalogueFirst = scheduledJeVTools.has('list_owned_projects') && jevApprovedTools.includes('search_knowledge')
    if (requiredQuery) {
      argumentsUnavailable = jevApprovedTools.some((tool) => !scheduledJeVTools.has(tool) && !(catalogueFirst && tool === 'search_knowledge'))
    } else {
      argumentsUnavailable ||= jevApprovedTools.some((tool) => !scheduledJeVTools.has(tool) && !(catalogueFirst && tool === 'search_knowledge'))
    }
    return { calls, unavailable: false, argumentsUnavailable }
  }

  async function repairRejectedToolCall(input: {
    message: string
    history: ChatMessage[]
    topicAnchors: ChatTopicAnchor[]
    state: AgentTurnState
    stepsUsed: number
    currentDateTimeUtc: string
    call: AgentToolCall
    rejection: string
    diagnostics?: ChatDiagnosticsCapture
  }): Promise<AgentToolCall | null> {
    if (!dependencies.planner) return null
    try {
      const plan = await dependencies.planner.planNextStep({
        message: input.message,
        currentDateTimeUtc: input.currentDateTimeUtc,
        history: input.history,
        topicAnchors: input.topicAnchors,
        evidence: input.state.evidence,
        toolOutputs: input.state.toolOutputs,
        stepsUsed: input.stepsUsed,
        allowedTools: [input.call.name],
        repair: { call: input.call, rejection: input.rejection.slice(0, 500) },
        onModelCall: input.diagnostics?.addModelCall,
      })
      if (plan?.kind !== 'tool_calls') return null
      return plan.calls.find((candidate) => candidate.id === input.call.id && candidate.name === input.call.name) ?? null
    } catch (error) {
      dependencies.logger?.warn('chat.agent_arguments.repair_unavailable', { error })
      return null
    }
  }

  function isRepairableArgumentRejection(result: AgentToolResult): boolean {
    return result.status === 'rejected'
      && /^Tool [a-z_]+ rejected: (?:expected \{|[a-z_]+ requires \{)/.test(result.output)
  }

  async function runAgentLoop(message: string, history: ChatMessage[], topicAnchors: ChatTopicAnchor[], projectListState: ChatProjectListState, currentDateTimeUtc: string, today: string, initialDecisions?: AgentToolUseDecisions, diagnostics?: ChatDiagnosticsCapture): Promise<AgentTurnState> {
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
    const jevRoutingRequired = initialDecisions !== undefined || typeof dependencies.moderation.routeTools === 'function'
    let stepsUsed = 0
    let argumentRepairUsed = false
    for (let step = 0; step < maxAgentSteps; step += 1) {
      const selection = await selectToolCalls({ message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc, today, jevRoutingRequired, diagnostics, ...(step === 0 && initialDecisions !== undefined ? { initialDecisions } : {}) })
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
        let result = await runAgentTool(call, runner)
        if (isRepairableArgumentRejection(result) && !argumentRepairUsed) {
          argumentRepairUsed = true
          const repairedCall = await repairRejectedToolCall({
            message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc,
            call, rejection: result.output, diagnostics,
          })
          if (repairedCall) {
            state.usedTools.add(toolKey(repairedCall))
            result = await runAgentTool(repairedCall, runner)
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

  async function *runAgentLoopStream(message: string, history: ChatMessage[], topicAnchors: ChatTopicAnchor[], projectListState: ChatProjectListState, currentDateTimeUtc: string, today: string, initialDecisions?: AgentToolUseDecisions, diagnostics?: ChatDiagnosticsCapture): AsyncGenerator<ChatStreamEvent, AgentTurnState, void> {
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
    const jevRoutingRequired = initialDecisions !== undefined || typeof dependencies.moderation.routeTools === 'function'
    let stepsUsed = 0
    let argumentRepairUsed = false
    for (let step = 0; step < maxAgentSteps; step += 1) {
      let signalArgumentsStarted!: () => void
      const argumentPreparationStarted = new Promise<void>((resolve) => { signalArgumentsStarted = resolve })
      const selectionPromise = selectToolCalls(
        { message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc, today, jevRoutingRequired, diagnostics, ...(step === 0 && initialDecisions !== undefined ? { initialDecisions } : {}) },
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
        const label = call.name === 'list_owned_projects'
          ? 'QUERYING PROJECT CATALOGUE…'
          : call.name === 'search_knowledge'
          ? 'SEARCHING MY NOTES…'
          : call.name === 'coding_stats'
            ? 'CHECKING WAKATIME PUBLIC SHARE…'
            : call.name === 'site_content'
              ? 'BROWSING SITE CONTENT…'
              : 'SEARCHING CODING HISTORY…'
        let name: AgentToolResult['sseName'] = call.name === 'search_knowledge' ? 'knowledge' : call.name
        yield { type: 'tool_start', name, label }
        let result = await runAgentTool(call, runner)
        if (isRepairableArgumentRejection(result) && !argumentRepairUsed) {
          argumentRepairUsed = true
          yield { type: 'tool_result', name, summary: `${result.output} Retrying argument preparation once.` }
          yield { type: 'status', status: 'preparing_arguments' }
          const repairedCall = await repairRejectedToolCall({
            message, history, topicAnchors, state, stepsUsed, currentDateTimeUtc,
            call, rejection: result.output, diagnostics,
          })
          if (repairedCall) {
            const repairedLabel = repairedCall.name === 'list_owned_projects'
              ? 'QUERYING PROJECT CATALOGUE…'
              : repairedCall.name === 'search_knowledge'
              ? 'SEARCHING MY NOTES…'
              : repairedCall.name === 'coding_stats'
                ? 'CHECKING WAKATIME PUBLIC SHARE…'
                : repairedCall.name === 'site_content'
                  ? 'BROWSING SITE CONTENT…'
                  : 'SEARCHING CODING HISTORY…'
            const repairedName = repairedCall.name === 'search_knowledge' ? 'knowledge' : repairedCall.name
            yield { type: 'tool_start', name: repairedName, label: repairedLabel }
            state.usedTools.add(toolKey(repairedCall))
            result = await runAgentTool(repairedCall, runner)
            name = repairedName
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

  return {
    async send(input: ChatInput) {
      const diagnostics = createDiagnosticsCapture()
      let turn: PreparedTurn
      try {
        turn = await prepareTurn(input, diagnostics)
      } catch (error) {
        finishDiagnostics(diagnostics, 'unavailable', OFFLINE_MESSAGE)
        throw error
      }
      if (!turn.ok) {
        if (turn.status === 'contact_confirmation') {
          finishDiagnostics(diagnostics, 'complete', turn.text)
          return { status: 'contact_confirmation' as const, text: turn.text, contextToken: turn.contextToken }
        }
        const response = turn.status === 'blocked'
          ? chatModerationRejectionMessage(turn.reason)
          : turn.status === 'turn_limit' ? CHAT_TURN_LIMIT_MESSAGE
            : turn.status === 'unavailable' ? UNAVAILABLE_MESSAGE : EXPIRED_MESSAGE
        finishDiagnostics(diagnostics, turn.status === 'blocked' ? 'blocked' : turn.status, response)
        return turn.status === 'blocked'
          ? { status: 'blocked' as const, reason: turn.reason }
          : { status: turn.status }
      }
      try {
        const agent = await runAgentLoop(turn.message, turn.verifiedHistory, turn.topicAnchors, turn.projectListState, turn.currentDateTimeUtc, turn.today, turn.toolDecisions, diagnostics)
        const extraContext = agent.toolSummaries.length > 0 ? agent.toolSummaries.join('\n') : undefined
        const reply = await responder.respond({
          message: turn.message,
          currentDateTimeUtc: turn.currentDateTimeUtc,
          history: turn.verifiedHistory,
          ...(agent.knowledgeUnavailable ? { evidence: agent.knowledgeEvidence ?? [] } : agent.knowledgeEvidence !== undefined ? { evidence: agent.knowledgeEvidence } : {}),
          ...(agent.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}),
          ...(agent.toolRoutingUnavailable ? { toolRoutingUnavailable: true as const } : {}),
          ...(extraContext ? { extraContext } : {}),
          ...(agent.catalogueFallback ? { catalogueFallback: agent.catalogueFallback } : {}),
          onModelCall: diagnostics?.addModelCall,
        })
        const replyText = reply.text.trim()
        const finalReply = agent.catalogueFallback && (!replyText || replyText === EMPTY_VERIFIED_REPLY)
          ? { ...reply, text: agent.catalogueFallback }
          : reply
        const contextToken = await dependencies.contextSigner.sign(buildNextConversationContext(turn, agent, finalReply.text))
        const knowledgeEnabled = dependencies.knowledgeEnabled === true
        finishDiagnostics(diagnostics, 'complete', finalReply.text)
        return {
          status: 'replied' as const,
          ...finalReply,
          contextToken,
          ...(knowledgeEnabled ? { citations: agent.citations, ...(agent.knowledgeUnavailable ? { knowledgeUnavailable: true as const } : {}) } : {}),
        }
      } catch (error) {
        finishDiagnostics(diagnostics, 'provider_error')
        throw error
      }
    },

    async *sendStream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
      if (signal?.aborted) return
      const diagnostics = createDiagnosticsCapture()
      yield { type: 'status', status: 'thinking' }

      let turn: PreparedTurn
      try {
        turn = await prepareTurn(input, diagnostics)
      } catch {
        finishDiagnostics(diagnostics, 'unavailable', OFFLINE_MESSAGE)
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }
      if (!turn.ok) {
        if (turn.status === 'contact_confirmation') {
          finishDiagnostics(diagnostics, 'complete', turn.text)
          yield { type: 'contact_confirmation', text: turn.text, contextToken: turn.contextToken }
          return
        }
        const response = turn.status === 'turn_limit'
          ? CHAT_TURN_LIMIT_MESSAGE
          : turn.status === 'blocked'
            ? chatModerationRejectionMessage(turn.reason)
            : turn.status === 'unavailable' ? UNAVAILABLE_MESSAGE : EXPIRED_MESSAGE
        finishDiagnostics(diagnostics, turn.status === 'blocked' ? 'blocked' : turn.status, response)
        if (turn.status === 'turn_limit') {
          yield { type: 'error', code: 'turn_limit', message: CHAT_TURN_LIMIT_MESSAGE }
          return
        }
        yield {
          type: 'error',
          message: turn.status === 'blocked'
            ? chatModerationRejectionMessage(turn.reason)
            : turn.status === 'unavailable' ? UNAVAILABLE_MESSAGE : EXPIRED_MESSAGE,
        }
        return
      }
      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted')
        return
      }

      const streaming = responder as Partial<ChatStreamingResponder>
      if (!streaming.stream) {
        finishDiagnostics(diagnostics, 'provider_error', OFFLINE_MESSAGE)
        yield { type: 'error', message: OFFLINE_MESSAGE }
        return
      }

      const agentStream = runAgentLoopStream(turn.message, turn.verifiedHistory, turn.topicAnchors, turn.projectListState, turn.currentDateTimeUtc, turn.today, turn.toolDecisions, diagnostics)
      let agent: AgentTurnState | undefined
      for (;;) {
        const step = await agentStream.next()
        if (step.done) {
          agent = step.value
          break
        }
        yield step.value
      }
      const state = agent ?? { evidence: '', toolOutputs: '', toolSummaries: [], toolObservations: [], usedTools: new Set<string>(), citations: [], knowledgeUnavailable: false, toolRoutingUnavailable: false, projectSourceIds: [], shortlistStarted: false, trackProjectSources: false }
      const extraContext = state.toolSummaries.length > 0 ? state.toolSummaries.join('\n') : undefined

      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted')
        return
      }
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
          ...(state.catalogueFallback ? { catalogueFallback: state.catalogueFallback } : {}),
          onModelCall: diagnostics?.addModelCall,
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
        finishDiagnostics(diagnostics, 'provider_error', fullText || failure.message)
        yield { type: 'error', message: failure.message }
        return
      }

      if (signal?.aborted) {
        finishDiagnostics(diagnostics, 'aborted', fullText)
        return
      }
      const citations = state.citations
      if (citations.length > 0) {
        yield { type: 'citations', citations }
      }
      if (state.knowledgeUnavailable) {
        yield { type: 'knowledge_note' }
      }
      const contextToken = await dependencies.contextSigner.sign(buildNextConversationContext(turn, state, fullText))
      finishDiagnostics(diagnostics, 'complete', fullText)
      yield { type: 'done', contextToken, ...(model ? { model } : {}) }
    },
  }
}

export type ChatService = ReturnType<typeof createChatService>
