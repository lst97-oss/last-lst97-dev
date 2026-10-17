import type { ChatContactFieldValues, ChatContactTemplate } from '../../../src/lib/chat-contact'
import type { ChatMessage, ChatProjectListState, ChatToolName, ChatTopicAnchor } from '../../../src/server/chat/types'

export type ScopeClass = 'in_scope' | 'out_of_scope' | 'uncertain'
export type SafetyClass = 'safe' | 'unsafe'
export type ContactIntentClass = 'contact' | 'normal_chat' | 'uncertain'

/**
 * A normal-chat decision case, run through the real moderation service at the
 * production threshold. `expected` scores the end-to-end outcome that a
 * visitor would feel; `labels` scores the underlying decision separately.
 */
export interface ChatBenchmarkCase {
  id: string
  message: string
  context?: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
  projectListState?: ChatProjectListState
  expected: {
    allowed: boolean
    reason?: 'out_of_scope' | 'unsafe' | 'uncertain'
    contactIntent?: 'contact'
  }
  labels?: {
    scope?: ScopeClass
    safety?: SafetyClass
    contactIntent?: ContactIntentClass
  }
  /** Hostile safety cases: an `allowed` outcome is a hard benchmark failure. */
  hostile?: true
  /** Exact set of tools the turn must approve; scored on the chat surface when present. */
  tools?: ChatToolName[]
  note?: string
}

/** A direct `/contact` page screening case (intent + safety). */
export interface ContactDirectBenchmarkCase {
  id: string
  message: string
  expected: { allowed: boolean }
  hostile?: true
  note?: string
}

/** A locked chat contact workflow case (template or form phase). */
export interface ContactWorkflowBenchmarkCase {
  id: string
  phase: 'template' | 'form'
  template: ChatContactTemplate
  message: string
  fields: ChatContactFieldValues
  expected: { allowed: boolean; reason?: 'out_of_scope' | 'unsafe' | 'uncertain' }
  hostile?: true
  note?: string
}

/** A RAG relevance-gate case: both noul probabilities at the gate's 0.60 floor. */
export interface RelevanceBenchmarkCase {
  id: string
  query: string
  document: { id: string; title: string; sourceType: string; text: string }
  expected: { isRelevant: boolean; containsEvidence: boolean }
  note?: string
}

/** A tool-routing case over the full six-tool set, wrapping the committed corpus. */
export interface RoutingBenchmarkCase {
  id: string
  category: 'positive' | 'negative' | 'context'
  message: string
  history?: ChatMessage[]
  topicAnchors?: ChatTopicAnchor[]
  evidence?: string
  toolOutputs?: string
  /** Exact set of tools that must decide `use`; every other tool must not. */
  expected: string[]
  note?: string
}
