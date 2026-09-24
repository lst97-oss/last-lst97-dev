import type { KnowledgeEvidence, PublicCitation } from '../knowledge/retrieve'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export type ChatToolName = 'search_knowledge' | 'coding_stats' | 'coding_history' | 'site_content'

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

export interface ChatConversationContext {
  messages: ChatMessage[]
  topicAnchors: ChatTopicAnchor[]
}

export interface ChatInput {
  message: string
  contextToken?: string
}

export interface ChatResponderInput {
  message: string
  currentDateTimeUtc: string
  history: ChatMessage[]
  evidence?: KnowledgeEvidence[]
  knowledgeUnavailable?: boolean
  toolRoutingUnavailable?: boolean
  extraContext?: string
}

export interface ChatReply {
  text: string
  model?: string
}

export type ChatPublicCitation = PublicCitation

export interface ChatResponder {
  respond(input: ChatResponderInput): Promise<ChatReply>
}

export type ResponderStreamEvent =
  | { delta: string; model?: string }
  | { done: true; text: string; model?: string }

export interface ChatStreamingResponder extends ChatResponder {
  stream(input: ChatResponderInput, signal?: AbortSignal): AsyncGenerator<ResponderStreamEvent>
}
