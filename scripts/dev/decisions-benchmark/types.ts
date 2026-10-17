import type { KnowledgeRelevancePort } from '../../../src/server/knowledge/types'
import type { ModerationClassifier } from '../../../src/server/moderation/types'
import type { ChatDiagnosticsProvider } from '../../../src/server/observability/chat-diagnostics'

export type Surface = 'chat' | 'routing' | 'contact-direct' | 'contact-workflow' | 'relevance'

export const SURFACES: Surface[] = ['chat', 'routing', 'contact-direct', 'contact-workflow', 'relevance']

/**
 * Site usage weights: how often each surface runs per production turn. Chat
 * runs once per turn; routing runs again on multi-step turns; the RAG gate
 * runs per retrieved document (top 3) when retrieval is enabled; the contact
 * surfaces are rare. Only the site-weighted aggregate uses these.
 */
export const SURFACE_WEIGHTS: Record<Surface, number> = {
  chat: 1,
  routing: 0.35,
  'contact-direct': 0.02,
  'contact-workflow': 0.02,
  relevance: 1.5,
}

export interface CapturedModelCall {
  provider: ChatDiagnosticsProvider
  operation: string
  model?: string
  status: 'succeeded' | 'failed'
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
}

export interface CapturedDecision {
  stage: string
  decisions: Record<string, { label: string; confidence: number }>
}

export interface CaseRunRecord {
  caseId: string
  surface: Surface
  armId: string
  repeat: number
  latencyMs: number
  status: 'ok' | 'error'
  errorCategory?: string
  /** Raw outcome, surface-dependent; see `scoreCase`. */
  outcome?: unknown
  modelCalls: CapturedModelCall[]
  decisions: CapturedDecision[]
}

export interface DecisionArm {
  id: string
  model: string
  provider: ChatDiagnosticsProvider
  /** USD per million input tokens; null when the provider route does not bill per token here. */
  promptUsdPerMillionTokens: number | null
  classifier: ModerationClassifier
  relevance: KnowledgeRelevancePort
}
