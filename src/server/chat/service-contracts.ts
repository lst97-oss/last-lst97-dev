import type { ContentReader } from '../content/service'
import type { RetrieveKnowledge } from '../knowledge/retrieve'
import type { ModerationService } from '../moderation/service'
import type { ChatModerationRejectionReason } from '../moderation/types'
import type { ChatDiagnosticsSink } from '../observability/chat-diagnostics'
import type { Logger } from '../observability/logger'
import type { WakaTimeStatsClient } from '../wakatime/stats'
import type { ChatContextSigner } from './context-signer'
import type { AgentPlanner, AgentToolUseDecisions } from './tools/agent-tools'
import type { CodingHistorySource } from './tools/coding-history-tool'
import type { ChatMessage, ChatProjectListState, ChatTopicAnchor } from './types'

export interface ChatServiceDependencies {
  moderation: ModerationService
  contextSigner: ChatContextSigner
  knowledge?: Pick<RetrieveKnowledge, 'execute'> & Partial<Pick<RetrieveKnowledge, 'listOwnedProjects'>>
  knowledgeEnabled?: boolean
  codingStats?: Pick<WakaTimeStatsClient, 'fetchSummary'>
  codingStatsEnabled?: boolean
  codingHistory?: CodingHistorySource
  codingHistoryEnabled?: boolean
  siteContent?: Pick<
    ContentReader,
    | 'listProjectsPage'
    | 'getProject'
    | 'listPosts'
    | 'getPost'
    | 'listChangelogs'
    | 'getChangelog'
    | 'listTopics'
    | 'getTopic'
  >
  planner?: AgentPlanner
  /** Absolute public origin for clickable links in tool output. Defaults to localhost. */
  publicSiteUrl?: string
  today?: string
  toolTimeoutMs?: number
  maxAgentSteps?: number
  logger?: Pick<Logger, 'warn' | 'error'>
  diagnosticsSink?: ChatDiagnosticsSink
}

export type PreparedTurn =
  | { ok: false; status: 'blocked'; reason: ChatModerationRejectionReason }
  | { ok: false; status: 'unavailable' | 'invalid_context' }
  | { ok: false; status: 'contact_confirmation'; text: string; contextToken: string }
  | { ok: false; status: 'turn_limit' }
  | {
      ok: true
      message: string
      verifiedHistory: ChatMessage[]
      topicAnchors: ChatTopicAnchor[]
      projectListState: ChatProjectListState
      currentDateTimeUtc: string
      today: string
      toolDecisions?: AgentToolUseDecisions
    }

export type PreparedChatInput = Extract<PreparedTurn, { ok: true }>
