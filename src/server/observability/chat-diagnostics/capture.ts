import {
  MAX_CONTEXT_MESSAGE_LENGTH,
  MAX_CONTEXT_MESSAGES,
  MAX_JEV_DECISIONS,
  MAX_MODEL_CALLS,
  MAX_QUERY_LENGTH,
  MAX_RAG_RETRIEVALS,
  MAX_RESPONSE_LENGTH,
} from './limits'
import { clampText, sanitizeJevDecision, sanitizeMetadata, sanitizeModelCall, sanitizeRagRetrieval } from './sanitize'
import type {
  ChatDiagnosticsCapture,
  ChatDiagnosticsMetadata,
  ChatDiagnosticsRecord,
  ChatDiagnosticsSink,
  ChatJevDecisionDiagnostic,
  ChatModelCallDiagnostic,
  ChatRagRetrievalDiagnostic,
} from './types'

export function createChatDiagnosticsCapture(
  input: {
    traceId: string
    message: string
    metadata?: ChatDiagnosticsMetadata
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
    startedAtMs?: number
  },
  sink: ChatDiagnosticsSink,
  now: () => number = Date.now,
): ChatDiagnosticsCapture {
  const startedAtMs = input.startedAtMs ?? now()
  let message = input.message
  let metadata = input.metadata
  let history = input.history ?? []
  const modelCalls: ChatModelCallDiagnostic[] = []
  const jevDecisions: ChatJevDecisionDiagnostic[] = []
  const ragRetrievals: ChatRagRetrievalDiagnostic[] = []
  let record: ChatDiagnosticsRecord | undefined

  return {
    setContext(nextMessage, nextHistory) {
      if (record) return
      message = nextMessage
      history = nextHistory
    },
    setMetadata(nextMetadata) {
      if (!record) metadata = nextMetadata
    },
    addModelCall(call) {
      if (!record && modelCalls.length < MAX_MODEL_CALLS) modelCalls.push(sanitizeModelCall(call))
    },
    addJevDecision(decision) {
      if (record || jevDecisions.length >= MAX_JEV_DECISIONS) return
      jevDecisions.push(sanitizeJevDecision(decision))
    },
    addRagRetrieval(retrieval) {
      if (!record && ragRetrievals.length < MAX_RAG_RETRIEVALS) ragRetrievals.push(sanitizeRagRetrieval(retrieval))
    },
    finish(finishInput) {
      if (record) return record
      record = {
        traceId: clampText(input.traceId, 100),
        startedAtUtc: new Date(startedAtMs).toISOString(),
        durationMs: Math.max(0, Math.round(now() - startedAtMs)),
        outcome: finishInput.outcome,
        query: clampText(message, MAX_QUERY_LENGTH),
        ...(metadata ? { metadata: sanitizeMetadata(metadata) } : {}),
        history: history.slice(-MAX_CONTEXT_MESSAGES).map(({ role, content }) => ({
          role,
          content: clampText(content, MAX_CONTEXT_MESSAGE_LENGTH),
        })),
        ...(typeof finishInput.response === 'string'
          ? { response: clampText(finishInput.response, MAX_RESPONSE_LENGTH) }
          : {}),
        modelCalls,
        jevDecisions,
        ragRetrievals,
      }
      try {
        sink.enqueue(record)
      } catch {
        // Diagnostics are best-effort and must never alter the chat result.
      }
      return record
    },
  }
}
