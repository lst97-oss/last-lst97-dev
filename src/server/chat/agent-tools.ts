import type { CodingHistorySource } from './coding-history-tool'
import type { WakaTimeStatsClient } from '../wakatime/stats'
import type { KnowledgeEvidence, PublicCitation, RetrieveKnowledge } from '../knowledge/retrieve'
import type { ContentReader } from '../content/service'
import type { Logger } from '../observability/logger'
import type { ChatMessage, ChatToolName, ChatTopicAnchor } from './types'

// Jev authoritatively selects tools at each step. The planner only prepares
// arguments for Jev-approved tools; every call still passes the fixed,
// read-only schemas and bounded-output runner before data leaves the server.

export type AgentToolName = ChatToolName

export type AgentToolUseLabel = 'use' | 'skip' | 'uncertain'

export interface AgentToolUseDecision {
  label: AgentToolUseLabel
  confidence: number
}

export type AgentToolUseDecisions = Partial<Record<AgentToolName, AgentToolUseDecision>>

export interface AgentToolRoutingInput {
  message: string
  currentDateTimeUtc?: string
  history: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
  evidence: string
  toolOutputs: string
  availableTools: AgentToolName[]
}

export interface AgentToolCall {
  id: string
  name: AgentToolName
  arguments: Record<string, unknown>
}

export type AgentPlan =
  | { kind: 'tool_calls'; calls: AgentToolCall[] }
  | { kind: 'final_answer'; text: string }

export interface AgentPlanner {
  planNextStep(input: {
    message: string
    currentDateTimeUtc: string
    history: ChatMessage[]
    topicAnchors?: ChatTopicAnchor[]
    evidence: string
    toolOutputs: string
    stepsUsed: number
    /** When present, Jev has already selected the tools; generate arguments only for these names. */
    allowedTools?: AgentToolName[]
  }): Promise<AgentPlan | null>
}

export interface AgentToolRunner {
  knowledge?: Pick<RetrieveKnowledge, 'execute'>
  knowledgeEnabled: boolean
  codingStats?: Pick<WakaTimeStatsClient, 'fetchSummary'>
  codingStatsEnabled: boolean
  codingHistory?: CodingHistorySource
  codingHistoryEnabled: boolean
  siteContent?: Pick<ContentReader, 'listProjects' | 'getProject' | 'listPosts' | 'getPost'>
  verifiedHistory?: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
  today: string
  toolTimeoutMs: number
  logger: Pick<Logger, 'warn'>
}

export interface AgentToolResult {
  call: AgentToolCall
  output: string
  status: 'completed' | 'unavailable' | 'rejected'
  validatedArguments?: Record<string, string | number | boolean | undefined>
  sseLabel: string
  sseName: 'coding_stats' | 'coding_history' | 'knowledge' | 'site_content'
  retrieval?: {
    evidence: KnowledgeEvidence[]
    citations: PublicCitation[]
  }
}

export const MAX_AGENT_STEPS = 4
