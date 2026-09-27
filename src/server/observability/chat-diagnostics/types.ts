export interface DiscordEmbedField {
  name: string
  value: string
}

export interface DiscordEmbed {
  title: string
  description?: string
  color: number
  fields?: DiscordEmbedField[]
  timestamp?: string
  footer?: { text: string }
}

export interface DiscordWebhookPayload {
  embeds: [DiscordEmbed]
  allowed_mentions: { parse: [] }
}

export type ChatDiagnosticsOutcome =
  | 'complete'
  | 'blocked'
  | 'unavailable'
  | 'provider_error'
  | 'aborted'
  | 'invalid_context'
  | 'turn_limit'
export type ChatDiagnosticsProvider = 'jev' | 'openrouter' | 'siliconflow'
export type ChatModelCallFailureCategory =
  | 'provider_connection_failed'
  | 'provider_timeout'
  | 'provider_rejected_request'
  | 'provider_upstream_error'
  | 'provider_request_failed'
  | 'response_content_missing'
  | 'response_content_unsupported'
  | 'response_invalid_json'
  | 'response_invalid_shape'
  | 'required_field_missing'
  | 'invented_optional_content'
  | 'refined_draft_invalid'

export interface ChatModelCallDiagnostic {
  provider: ChatDiagnosticsProvider
  operation: string
  model?: string
  status: 'succeeded' | 'failed'
  failureCategory?: ChatModelCallFailureCategory
  usageReported?: boolean
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
}

export interface ChatJevDecisionDiagnostic {
  stage: 'moderation' | 'tool_routing' | 'contact_workflow'
  decisions: Record<string, { label: string; confidence: number }>
}

export interface ChatRagCandidateDiagnostic {
  id: string
  sourceId: string
  sourceType: string
  title: string
  isPublic: boolean
  excerpt: string
  retrievedRank: number
  rerankScore?: number
  relevanceProbability?: number
  answerEvidenceProbability?: number
  outcome: 'accepted' | 'rejected' | 'fallback' | 'not_ranked'
  finalSelected: boolean
}

export interface ChatRagRetrievalDiagnostic {
  query: string
  degraded: boolean
  candidates: ChatRagCandidateDiagnostic[]
}

export interface ChatDiagnosticsRecord {
  traceId: string
  startedAtUtc: string
  durationMs: number
  outcome: ChatDiagnosticsOutcome
  query: string
  metadata?: ChatDiagnosticsMetadata
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  response?: string
  modelCalls: ChatModelCallDiagnostic[]
  jevDecisions: ChatJevDecisionDiagnostic[]
  ragRetrievals: ChatRagRetrievalDiagnostic[]
}

export interface ChatDiagnosticsMetadata {
  ipAddress?: string
  location?: {
    country?: string
    region?: string
    regionCode?: string
    city?: string
    timezone?: string
  }
  browser?: {
    name?: string
    version?: string
    operatingSystem?: string
    device?: string
  }
  language?: string
  pagePath?: string
}

export interface ChatDiagnosticsSink {
  enqueue(record: ChatDiagnosticsRecord): void
}

export interface ChatDiagnosticsCapture {
  setContext(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): void
  setMetadata(metadata?: ChatDiagnosticsMetadata): void
  addModelCall(call: ChatModelCallDiagnostic): void
  addJevDecision(decision: ChatJevDecisionDiagnostic): void
  addRagRetrieval(retrieval: ChatRagRetrievalDiagnostic): void
  finish(input: { outcome: ChatDiagnosticsOutcome; response?: string }): ChatDiagnosticsRecord
}
