import type { ChatContactTemplate } from '../../lib/chat-contact'
import type { ProjectCatalogFilters } from '../knowledge/project-catalog'
import type { KnowledgeEvidence, PublicCitation } from '../knowledge/retrieve'
import type { ChatDiagnosticsMetadata, ChatModelCallDiagnostic } from '../observability/chat-diagnostics'

export const EMPTY_VERIFIED_REPLY = 'I couldn’t form a verified answer from the available information.'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export const CHAT_TOOL_NAMES = [
  'search_knowledge',
  'list_owned_projects',
  'coding_stats',
  'coding_history',
  'site_content',
] as const

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number]
export type ChatToolProgressName = Exclude<ChatToolName, 'search_knowledge'> | 'knowledge'

export interface ChatToolObservation {
  name: ChatToolName
  arguments: Record<string, string | number | boolean>
  status: 'completed' | 'unavailable' | 'rejected'
}

export interface ChatTopicAnchor {
  question: string
  /** Safe display name returned by an approved source, used only to resolve a later reference. */
  entityLabel?: string
  observedAtUtc: string
  tools: ChatToolObservation[]
}

export interface ChatProjectListState {
  /** Retained when verifying older signed context tokens; no longer drives intent routing. */
  clarificationAsked: boolean
  shownProjectIds: string[]
  /** True after Jev selects an owned-project inventory lookup. */
  shortlistStarted?: boolean
  activeFilters?: ProjectCatalogFilters
}

export type ChatWorkflowContext =
  | { mode: 'normal'; phase: 'conversation' | 'contact_confirmation' }
  | { mode: 'contact'; phase: 'template_selection' }
  | { mode: 'contact'; phase: 'filling'; template: ChatContactTemplate }
  | {
      mode: 'contact'
      phase: 'review'
      template: ChatContactTemplate
      reviewApproval: { id: string; draftProof: string }
    }
  | { mode: 'contact'; phase: 'delivered'; template: ChatContactTemplate }

export interface ChatConversationContext {
  messages: ChatMessage[]
  topicAnchors: ChatTopicAnchor[]
  projectListState?: ChatProjectListState
  workflow?: ChatWorkflowContext
}

export interface ChatInput {
  message: string
  contextToken?: string
  /** Server-derived metadata for diagnostics only; never sent to a model or signed context. */
  diagnosticsMetadata?: ChatDiagnosticsMetadata
}

export interface ChatResponderInput {
  message: string
  currentDateTimeUtc: string
  history: ChatMessage[]
  evidence?: KnowledgeEvidence[]
  knowledgeUnavailable?: boolean
  toolRoutingUnavailable?: boolean
  extraContext?: string
  /** Compact server-rendered catalogue answer used only if the model yields no usable text. */
  catalogueFallback?: string
  /** Exact server-computed owned-project totals; the responder must report these verbatim. */
  ownedProjectCount?: string
  onModelCall?: (call: ChatModelCallDiagnostic) => void
}

export interface ChatReply {
  text: string
  model?: string
}

export type ChatPublicCitation = PublicCitation

export interface ChatResponder {
  respond(input: ChatResponderInput): Promise<ChatReply>
}

export type ResponderStreamEvent = { delta: string; model?: string } | { done: true; text: string; model?: string }

export interface ChatStreamingResponder extends ChatResponder {
  stream(input: ChatResponderInput, signal?: AbortSignal): AsyncGenerator<ResponderStreamEvent>
}
