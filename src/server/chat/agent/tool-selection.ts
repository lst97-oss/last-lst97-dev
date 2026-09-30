import { resolveKnowledgeQuery } from '../../knowledge/query-resolution'
import type { ChatDiagnosticsCapture } from '../../observability/chat-diagnostics'
import type { ChatServiceDependencies } from '../service-contracts'
import type { AgentToolCall, AgentToolName, AgentToolResult, AgentToolUseDecisions } from '../tools/agent-tools'
import { matchCodingHistoryRequest } from '../tools/coding-history-tool'
import { matchCodingStatsRequest } from '../tools/coding-stats-tool'
import type { ChatMessage, ChatTopicAnchor } from '../types'
import type { AgentTurnState } from './agent-loop'

const PERSONAL_KNOWLEDGE_FACT =
  /\b(?:nelson|lst97|handle|username|profile|education|educational|degree|qualification|study|school|experience|employment|career|professional|skills?|background|contributions?|contact|email|linkedin|repositories|repository|repos?|projects?|website|codebase|technology|tech stack)\b/i
const ASSISTANT_USAGE_REQUEST =
  /\b(?:chat assistant|portfolio assistant|what can you help|your capabilities|how do you (?:decide|work|process|handle|choose)|how does (?:this|your) chat|what services do you provide)\b/i
/**
 * Software-development vocabulary that the interview Q&A corpus answers from Nelson's own
 * recorded experience. Bare "ai" and "machine learning" are deliberately absent so general
 * AI chatter stays out of the knowledge route.
 */
const SOFTWARE_DEVELOPMENT_TOPIC =
  /\b(?:react|next\.js|typescript|javascript|node\.js|deno|bun|sql|postgresql|mysql|mongodb|redis|database|index|indexes|indexing|query|queries|orm|rest|restful|api|apis|http|https|graphql|websocket|authentication|authorization|idempotency|promise|async|await|middleware|component|components|state management|server|backend|frontend|full stack|fullstack|microservices|cache|caching|cdn|latency|throughput|scalability|optimization|optimisation|memory leak|security|owasp|encryption|reverse engineering|assembly|compiler|operating system|linux|kernel|regex|code review|technical debt|design pattern|architecture|scale|scaling|system design|observability|monitoring|metrics|logging|tracing|incident|email delivery|webhook|retrieval augmented|rag|vector search|embedding|prompt engineering)\b/i
const TECHNICAL_QUESTION_FRAME =
  /\b(?:how|why|what|when|where|which|explain|describe|difference|best|should|would you|do you|can you|tell me|walk me)\b/i

export function createChatToolSelection(dependencies: ChatServiceDependencies) {
  function diagnosticsObserver(capture: ChatDiagnosticsCapture | undefined) {
    return capture
      ? {
          onModelCall: capture.addModelCall,
          onJevDecision: capture.addJevDecision,
        }
      : undefined
  }

  function availableToolNames(): AgentToolName[] {
    return [
      ...(dependencies.knowledgeEnabled === true && dependencies.knowledge ? ['search_knowledge' as const] : []),
      ...(dependencies.knowledgeEnabled === true && typeof dependencies.knowledge?.listOwnedProjects === 'function'
        ? ['list_owned_projects' as const]
        : []),
      ...(dependencies.codingStatsEnabled === true && dependencies.codingStats ? ['coding_stats' as const] : []),
      ...(dependencies.codingHistoryEnabled === true && dependencies.codingHistory ? ['coding_history' as const] : []),
      ...(dependencies.siteContent ? ['site_content' as const] : []),
    ]
  }

  function requiredKnowledgeQuery(
    message: string,
    history: ChatMessage[],
    topicAnchors: ChatTopicAnchor[],
  ): string | undefined {
    const query = resolveKnowledgeQuery(message, history, topicAnchors)
    if (ASSISTANT_USAGE_REQUEST.test(message) && !/\b(?:nelson|lst97|his|him)\b/i.test(message)) return undefined
    if (!PERSONAL_KNOWLEDGE_FACT.test(query) && !SOFTWARE_DEVELOPMENT_TOPIC.test(query)) return undefined

    if (/\b(?:demo|demos|live[- ]?site|live[- ]?url|deployment|deployed)\b/i.test(query)) {
      return `Nelson's projects, live demo URLs, deployed websites, and project links. Original question: ${query}`.slice(
        0,
        1_000,
      )
    }

    const namedProject = query.match(/\b[a-z0-9]+(?:[-_.][a-z0-9]+)+\b/i)?.[0]
    if (namedProject && /\b(?:project|repository|repo|codebase)\b/i.test(query)) {
      return `Nelson's exact repository record for ${namedProject}: ownership, project purpose, visibility, technologies, files, and source evidence. Original question: ${query}`.slice(
        0,
        1_000,
      )
    }
    return query
  }

  function matchKnowledgeRequest(message: string): AgentToolCall | null {
    const text = message.toLowerCase()
    const assistantDirected =
      /\b(?:chat assistant|what can you help|who are you|how do you (?:decide|work|process|handle|choose)|your capabilities|how (?:does|do) (?:this|your) chat)\b/.test(
        text,
      )
    const aboutNelson =
      /\b(?:nelson|lst97|who am i|who is he|my (?:profile|background|work|projects?|contributions?|goals?|experience)|his (?:profile|background|work|projects?|contributions?|goals?|experience))\b/.test(
        text,
      ) ||
      (/\b(?:profile|background|experience|information|details|work|projects?)\b/.test(text) &&
        /\babout (?:me|you|nelson|lst97)\b/.test(text)) ||
      (!assistantDirected &&
        /\b(?:you|your)\b/.test(text) &&
        /\b(?:profile|background|experience|education|qualifications?|employment|skills?|contributions?|projects?|work|coding|goals?)\b/.test(
          text,
        ))
    const aboutSiteImplementation =
      /\b(?:this|the|your|my) (?:portfolio )?(?:website|site|repository|repo|codebase|implementation|architecture)\b|\bhow (?:is|does) (?:this|the|your) (?:portfolio )?(?:website|site|repository|repo|codebase)\b/.test(
        text,
      )
    const technicalQuestion = SOFTWARE_DEVELOPMENT_TOPIC.test(text) && TECHNICAL_QUESTION_FRAME.test(text)
    if (assistantDirected || (!aboutNelson && !aboutSiteImplementation && !technicalQuestion)) return null
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
    if (
      !/\b(?:want me|would you like me|shall i|can i|try pulling|try to pull|look up|check|fetch|connect)\b/i.test(
        offer,
      )
    )
      return []
    const selected = new Set(tools)
    const calls: AgentToolCall[] = []
    if (selected.has('coding_stats') && /\b(?:operating system|os)\b/i.test(offer)) {
      calls.push({
        id: 'stats-os-accepted',
        name: 'coding_stats',
        arguments: { category: 'operating_systems', range: 'all_time' },
      })
    } else if (
      selected.has('coding_stats') &&
      /\b(?:wakatime|public[- ]share|coding activity|coding hours?|total hours)\b/i.test(offer)
    ) {
      calls.push({ id: 'stats-accepted', name: 'coding_stats', arguments: { category: 'activity', range: 'all_time' } })
    }
    if (
      selected.has('coding_history') &&
      /\b(?:coding-history|coding history|warehouse|per-project|language breakdown|daily series|streak)\b/i.test(offer)
    ) {
      calls.push({
        id: 'history-accepted',
        name: 'coding_history',
        arguments: { op: 'summary', from: '2000-01-01', to: today },
      })
    }
    if (selected.has('search_knowledge') && /\b(?:knowledge|profile|repository|project details)\b/i.test(offer)) {
      calls.push({
        id: 'knowledge-accepted',
        name: 'search_knowledge',
        arguments: { query: 'the previously offered personal knowledge lookup' },
      })
    }
    if (selected.has('site_content')) {
      if (/\b(?:changelog|release notes?|releases?)\b/i.test(offer)) {
        calls.push({
          id: 'site-changelogs-accepted',
          name: 'site_content',
          arguments: { op: 'list_changelogs', limit: 5, page: 1 },
        })
      } else if (/\btopics?\b/i.test(offer)) {
        calls.push({ id: 'site-topics-accepted', name: 'site_content', arguments: { op: 'list_topics' } })
      } else if (/\b(?:published site|site content|blog post|showcase)\b/i.test(offer)) {
        calls.push({ id: 'site-accepted', name: 'site_content', arguments: { op: 'list_projects' } })
      }
    }
    return calls.slice(0, 4)
  }

  function deterministicPlans(message: string, tools: AgentToolName[], today: string): AgentToolCall[] {
    if (tools.length === 0) return []
    const selected = new Set(tools)
    const calls: AgentToolCall[] = []
    if (selected.has('list_owned_projects')) {
      const asksForCount =
        /\b(?:how many|total (?:number|count|projects?)|number of projects?|count of projects?|projects? in total|breakdown|what topics|which topics|topics (?:do|does|are|cover)|topic breakdown)\b/i.test(
          message,
        )
      calls.push({
        id: 'owned-projects',
        name: 'list_owned_projects',
        arguments: asksForCount ? { op: 'count' } : {},
      })
    }
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
    const historyQuery =
      dependencies.codingHistoryEnabled === true && dependencies.codingHistory
        ? matchCodingHistoryRequest(message, today)
        : null
    const shareQuery =
      dependencies.codingStatsEnabled === true && dependencies.codingStats ? matchCodingStatsRequest(message) : null
    const asksProjectBreakdown =
      /\bmost\b|\btop\b|\bbest\b|\bwhich project\b|\bbreakdown\b|\bdistribut|\bper[- ]project\b|\bby project\b|\beach project\b/.test(
        lower,
      )
    const arbitraryHistoricalRange = Boolean(
      historyQuery &&
        /\b20\d{2}\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
          lower,
        ),
    )
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
    } else if (
      historyQuery &&
      (arbitraryHistoricalRange || historyQuery.op === 'daily' || historyQuery.op === 'streaks' || historyQuery.project)
    ) {
      plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
    }
    if (shareQuery && (!historyQuery || !arbitraryHistoricalRange)) {
      plans.push({
        id: 'stats-1',
        name: 'coding_stats',
        arguments: { category: shareQuery.category, range: shareQuery.range },
      })
    }
    if (plans.length === 0 && historyQuery) {
      plans.push(historyPlan(historyQuery.op, historyQuery.from, historyQuery.to, historyQuery.project))
    }
    return plans.slice(0, 2)
  }

  function siteContentCollections(message: string) {
    return {
      posts: /\b(?:blog|posts?|articles?)\b/i.test(message),
      projects: /\bprojects?\b/i.test(message),
      changelogs: /\b(?:changelog|changelogs|release notes?|releases?|what'?s new|version history)\b/i.test(message),
      topics: /\b(?:topics?|tags?|categories|category)\b/i.test(message),
    }
  }

  /**
   * Orientation questions — what the site offers and where a section lives — are
   * a different axis from the content collections: they name no collection at all.
   */
  function asksForSitePages(message: string): boolean {
    return (
      /\b(?:what|which)\b.{0,40}\b(?:pages?|sections?|features?|sections of the site)\b/i.test(message) ||
      /\b(?:pages?|sections?)\b.{0,30}\b(?:does (?:this|the) site|on (?:this|the) site|available|offer)\b/i.test(
        message,
      ) ||
      /\b(?:what can (?:i|you|we) do|how do i (?:navigate|browse|find)|where (?:do|can) i (?:find|go|see)|site map|sitemap|site structure|navigation)\b/i.test(
        message,
      )
    )
  }

  function matchSiteContentPlans(message: string): AgentToolCall[] {
    if (asksForSitePages(message)) return [{ id: 'site-pages', name: 'site_content', arguments: { op: 'list_pages' } }]
    const collections = siteContentCollections(message)
    const { posts: asksPosts, projects: asksProjects, changelogs: asksChangelogs, topics: asksTopics } = collections
    // Only route to Payload when the question is really about site/blog/demo
    // content — bare "which project took most time" is a warehouse question.
    // "on this site", "in this site", or "published" scope the question to the
    // live Payload showcase rather than the owned-repository catalogue or RAG.
    const asksAboutSite =
      /\b(?:this|your)\s+(?:site|website|web\s?site|portfolio|blog)\b/i.test(message) ||
      /\b(?:on|in|for|to|of|at)\s+(?:this|your|the)\s+(?:site|website|web\s?site|portfolio|blog|changelog)\b/i.test(
        message,
      ) ||
      /\b(?:published|featured)\b/i.test(message)
    const wantsSite =
      asksPosts ||
      asksChangelogs ||
      asksTopics ||
      asksAboutSite ||
      /demo|showcase|show case|live url|live site/i.test(message) ||
      (asksProjects && /portfolio|website|showcase|demo|live|published|list|all|latest|recent|current/i.test(message))
    if (!wantsSite || !dependencies.siteContent) return []
    const detected = [asksPosts, asksProjects, asksChangelogs, asksTopics].filter(Boolean).length
    if (detected > 1) {
      // A mixed request cannot name one slug for every collection, so it
      // becomes one list call per collection in a fixed order.
      return [
        ...(asksPosts
          ? [{ id: 'site-posts', name: 'site_content' as const, arguments: { op: 'list_posts', limit: 5, page: 1 } }]
          : []),
        ...(asksProjects
          ? [{ id: 'site-projects', name: 'site_content' as const, arguments: { op: 'list_projects' } }]
          : []),
        ...(asksChangelogs
          ? [
              {
                id: 'site-changelogs',
                name: 'site_content' as const,
                arguments: { op: 'list_changelogs', limit: 5, page: 1 },
              },
            ]
          : []),
        ...(asksTopics ? [{ id: 'site-topics', name: 'site_content' as const, arguments: { op: 'list_topics' } }] : []),
      ]
    }
    const slug =
      message.match(/["“”'`「」『』]([^"“”'`「」『』]{2,120})["“”'`「」『』]/)?.[1]?.trim() ??
      message
        .match(
          /\b(?:project|post|blog|article|repo|changelog|release|topic)\s+(?:called\s+|named\s+)?([A-Za-z0-9][\w+.#-]{1,120})/i,
        )?.[1]
        ?.trim() ??
      null
    // Bare words like "demo"/"showcase" are not slugs — only treat the
    // capture as a slug when it looks like an identifier, not a stopword.
    const slugIsReal =
      slug !== null &&
      !/^(demo|demos|showcase|showcases|project|projects|post|posts|blog|blogs|article|articles|live|site|sites|portfolio|list|all|some|any|the|a|an|my|his|and|or|latest|recent|current|new|old|first|about|for|from|in|of|on|at|to|with|that|this|these|those|it|its|there|here|was|were|is|are|be|been|has|have|had|do|does|did|can|could|would|should|will|shall|may|might|must|tell|show|list|give|find|get|see|me|us|you|they|he|she|changelog|changelogs|release|releases|version|versions|notes|topic|topics|update|updates|history|tag|tags|category|categories)$/i.test(
        slug,
      )
    if (slugIsReal) {
      const op = asksChangelogs ? 'get_changelog' : asksTopics ? 'get_topic' : asksPosts ? 'get_post' : 'get_project'
      return [{ id: 'site-1', name: 'site_content', arguments: { op, slug } }]
    }
    if (asksChangelogs)
      return [{ id: 'site-changelogs', name: 'site_content', arguments: { op: 'list_changelogs', limit: 5, page: 1 } }]
    if (asksTopics) return [{ id: 'site-topics', name: 'site_content', arguments: { op: 'list_topics' } }]
    return asksPosts
      ? [{ id: 'site-posts', name: 'site_content', arguments: { op: 'list_posts', limit: 5, page: 1 } }]
      : [{ id: 'site-projects', name: 'site_content', arguments: { op: 'list_projects' } }]
  }

  function toolKey(call: AgentToolCall): string {
    return `${call.name}:${JSON.stringify(call.arguments)}`
  }

  async function selectToolCalls(
    input: {
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
    },
    onArgumentsStart?: () => void,
  ): Promise<{ calls: AgentToolCall[]; unavailable: boolean; argumentsUnavailable: boolean }> {
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
          return {
            calls:
              plan?.kind === 'tool_calls'
                ? plan.calls.filter((call) => availableTools.includes(call.name)).slice(0, 4)
                : [],
            unavailable: false,
            argumentsUnavailable: false,
          }
        } catch (error) {
          dependencies.logger?.warn('chat.agent_plan.unavailable', { error })
        }
      }
      return {
        calls: deterministicPlans(input.message, availableTools, input.today),
        unavailable: false,
        argumentsUnavailable: false,
      }
    }

    let decisions = input.stepsUsed === 0 && hasInitialDecisions ? input.initialDecisions : undefined
    if (!decisions) {
      if (typeof routeTools !== 'function') return { calls: [], unavailable: true, argumentsUnavailable: false }
      try {
        decisions = await routeTools(
          {
            message: input.message,
            currentDateTimeUtc: input.currentDateTimeUtc,
            history: input.history,
            topicAnchors: input.topicAnchors,
            projectListState: input.state.activeProjectFilters
              ? {
                  clarificationAsked: false,
                  shownProjectIds: input.state.projectSourceIds,
                  shortlistStarted: input.state.shortlistStarted,
                  activeFilters: input.state.activeProjectFilters,
                }
              : undefined,
            evidence: input.state.evidence,
            toolOutputs: input.state.toolOutputs,
            availableTools,
          },
          diagnosticsObserver(input.diagnostics),
        )
      } catch (error) {
        dependencies.logger?.warn('chat.agent_route.unavailable', { error })
        return { calls: [], unavailable: true, argumentsUnavailable: false }
      }
    }
    if (!decisions) return { calls: [], unavailable: true, argumentsUnavailable: false }

    const projectInventoryRequest =
      /\b(?:list|show|browse|see|more|all|available|count|total|many|number)\b/i.test(input.message) &&
      /\b(?:projects?|repositories|repos)\b/i.test(input.message)
    const mentionsProjects = /\b(?:projects?|repositories|repos)\b/i.test(input.message)
    const mentionsContributions = /\bcontribut(?:e|ed|ion|ions)\b/i.test(input.message)
    // Catalogue guard: bare inventory (“what are your projects?”) and counts
    // (“total number of projects”) must come from list_owned_projects even when
    // prior chat holds a partial RAG list. This mirrors the forced-RAG guard
    // below but for the catalogue, since history can never establish
    // completeness for inventory/counts. Contributions stay on search_knowledge.
    const isCatalogueInventoryRequest =
      availableTools.includes('list_owned_projects') &&
      mentionsProjects &&
      !mentionsContributions &&
      (/\b(?:how many|total|count|number|many)\b/i.test(input.message) ||
        /\b(?:list|show|browse|see|more|all|available)\b/i.test(input.message) ||
        /\b(?:what|which)\b.{0,40}\b(?:projects?|repositories|repos)\b/i.test(input.message) ||
        /\b(?:projects?|repositories|repos)\b.{0,40}\b(?:you|your|my|owned|built|did|have|total)\b/i.test(
          input.message,
        ))
    const projectDetailsRequested = /\b(?:describe|details?|purpose|how (?:does|do)|what (?:is|does|are))\b/i.test(
      input.message,
    )
    const requiredQuery =
      availableTools.includes('search_knowledge') &&
      !isCatalogueInventoryRequest &&
      !(projectInventoryRequest && !projectDetailsRequested)
        ? requiredKnowledgeQuery(input.message, input.history, input.topicAnchors)
        : undefined
    // Explicit Jev labels win even when confidence is low. Only the literal
    // uncertain label delegates that tool's routing decision to regex. For
    // owner knowledge, however, chat history cannot establish completeness:
    // every new factual request requires a fresh source lookup. Catalogue
    // inventory/counts get the symmetric guard: history can never prove a
    // partial list is the total, so force the catalogue even on Jev skip.
    let jevApprovedTools = availableTools.filter((tool) => decisions?.[tool]?.label === 'use')
    // The inventory guard is symmetric with the forced-RAG guard above, so it
    // re-fires on every step. Once the catalogue has already answered this
    // turn, re-running it would loop on the same page and strand the detail
    // lookup, so the guard only applies while the catalogue is still pending.
    const catalogueAlreadyAnswered = input.state.catalogueToolExecutedThisStep || input.stepsUsed > 0
    if (isCatalogueInventoryRequest && !catalogueAlreadyAnswered && !jevApprovedTools.includes('list_owned_projects'))
      jevApprovedTools.push('list_owned_projects')
    // Site-scoped guard: a question naming this site/website/portfolio, or asking
    // what is published/featured on it, is about live Payload content that no
    // other source can answer. Neither the owned-project catalogue nor RAG holds
    // publication state, so history and a model skip cannot stand in for it.
    const asksForOrientation = asksForSitePages(input.message)
    const isSiteScopedRequest =
      availableTools.includes('site_content') &&
      (asksForOrientation ||
        (/\b(?:projects?|posts?|articles?|changelogs?|releases?|topics?)\b/i.test(input.message) &&
          (/\b(?:this|your)\s+(?:site|website|web\s?site|portfolio|blog)\b/i.test(input.message) ||
            /\b(?:on|in|for|to|of|at)\s+(?:this|your|the)\s+(?:site|website|web\s?site|portfolio|blog|changelog)\b/i.test(
              input.message,
            ) ||
            /\b(?:published|featured)\b/i.test(input.message))))
    if (isSiteScopedRequest && !jevApprovedTools.includes('site_content')) jevApprovedTools.push('site_content')
    if (requiredQuery && !jevApprovedTools.includes('search_knowledge')) jevApprovedTools.push('search_knowledge')
    // A catalogue-plus-details request stays sequential: the catalogue runs
    // first, then the detail lookup gets its own fresh Jev decision. Collapse
    // to the catalogue only for inventory-only requests; dropping RAG here
    // would discard exactly the detail lookup `projectDetailsRequested` kept.
    // A site-scoped request still needs Payload alongside the catalogue: the
    // catalogue knows what Nelson owns, the CMS knows what is published here.
    const siteScopedKept = isSiteScopedRequest && jevApprovedTools.includes('site_content')
    if (
      !projectDetailsRequested &&
      jevApprovedTools.includes('list_owned_projects') &&
      jevApprovedTools.includes('search_knowledge')
    )
      jevApprovedTools = siteScopedKept ? ['list_owned_projects', 'site_content'] : ['list_owned_projects']
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
        const siteCollections = siteContentCollections(input.message)
        const wantsSeveralSiteCollections = Object.values(siteCollections).filter(Boolean).length > 1
        if (wantsSeveralSiteCollections && jevApprovedTools.includes('site_content')) {
          const siteFallbacks = matchSiteContentPlans(input.message)
          for (const call of siteFallbacks) {
            if (!plannerCalls.some((planned) => toolKey(planned) === toolKey(call)) && plannerCalls.length < 4)
              plannerCalls.push(call)
          }
        }
        const plannedTools = new Set(plannerCalls.map((call) => call.name))
        const missingApprovedTools = jevApprovedTools.filter((tool) => !plannedTools.has(tool))
        if (missingApprovedTools.length > 0) {
          const fallbackCalls =
            acceptedCalls.length > 0
              ? acceptedCalls.filter((call) => missingApprovedTools.includes(call.name))
              : deterministicPlans(input.message, missingApprovedTools, input.today)
          for (const call of fallbackCalls) {
            if (!plannerCalls.some((planned) => planned.name === call.name) && plannerCalls.length < 4)
              plannerCalls.push(call)
          }
        }
        // Availability is decided once, after the catalogue-first collapse
        // below: a sequentially-deferred tool is not "unavailable", it is
        // simply not this step's call. Flagging it here would strand the loop
        // on step 0 and skip the follow-up decision entirely.
        argumentsUnavailable = false
      } catch (error) {
        dependencies.logger?.warn('chat.agent_arguments.unavailable', { error })
        // Jev remains the authority on whether a source is needed. If the
        // argument model is unavailable, deterministic parsing may still
        // prepare calls for those already approved tools.
        plannerCalls =
          acceptedCalls.length > 0
            ? acceptedCalls.filter((call) => jevApprovedTools.includes(call.name))
            : deterministicPlans(input.message, jevApprovedTools, input.today)
        const preparedTools = new Set(plannerCalls.map((call) => call.name))
        argumentsUnavailable = jevApprovedTools.some((tool) => !preparedTools.has(tool))
      }
    } else if (jevApprovedTools.length > 0) {
      // Without an argument planner, use deterministic argument extraction
      // for Jev-approved tools; it cannot add or veto a tool name.
      plannerCalls =
        acceptedCalls.length > 0
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
    if (
      calls.some((call) => call.name === 'list_owned_projects') &&
      calls.some((call) => call.name === 'search_knowledge')
    ) {
      calls = calls.filter((call) => call.name === 'list_owned_projects')
    }
    const scheduledJeVTools = new Set(calls.map((call) => call.name))
    const catalogueFirst = scheduledJeVTools.has('list_owned_projects') && jevApprovedTools.includes('search_knowledge')
    if (requiredQuery) {
      argumentsUnavailable = jevApprovedTools.some(
        (tool) => !scheduledJeVTools.has(tool) && !(catalogueFirst && tool === 'search_knowledge'),
      )
    } else {
      argumentsUnavailable ||= jevApprovedTools.some(
        (tool) => !scheduledJeVTools.has(tool) && !(catalogueFirst && tool === 'search_knowledge'),
      )
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
      return (
        plan.calls.find((candidate) => candidate.id === input.call.id && candidate.name === input.call.name) ?? null
      )
    } catch (error) {
      dependencies.logger?.warn('chat.agent_arguments.repair_unavailable', { error })
      return null
    }
  }

  function isRepairableArgumentRejection(result: AgentToolResult): boolean {
    return (
      result.status === 'rejected' && /^Tool [a-z_]+ rejected: (?:expected \{|[a-z_]+ requires \{)/.test(result.output)
    )
  }

  function toolProgress(call: AgentToolCall): { name: AgentToolResult['sseName']; label: string } {
    const labels: Record<AgentToolName, string> = {
      list_owned_projects: 'QUERYING PROJECT CATALOGUE…',
      search_knowledge: 'SEARCHING MY NOTES…',
      coding_stats: 'CHECKING WAKATIME PUBLIC SHARE…',
      site_content: 'BROWSING SITE CONTENT…',
      coding_history: 'SEARCHING CODING HISTORY…',
    }
    return {
      name: call.name === 'search_knowledge' ? 'knowledge' : call.name,
      label: labels[call.name],
    }
  }

  return {
    availableToolNames,
    isRepairableArgumentRejection,
    repairRejectedToolCall,
    selectToolCalls,
    toolKey,
    toolProgress,
  }
}
