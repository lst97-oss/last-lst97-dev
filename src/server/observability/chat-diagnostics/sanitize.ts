import {
  MAX_CANDIDATE_EXCERPT,
  MAX_CONTEXT_MESSAGE_LENGTH,
  MAX_CONTEXT_MESSAGES,
  MAX_JEV_DECISIONS,
  MAX_MODEL_CALLS,
  MAX_QUERY_LENGTH,
  MAX_RAG_CANDIDATES,
  MAX_RAG_RETRIEVALS,
  MAX_RESPONSE_LENGTH,
} from './limits'
import type {
  ChatDiagnosticsMetadata,
  ChatDiagnosticsRecord,
  ChatJevDecisionDiagnostic,
  ChatModelCallDiagnostic,
  ChatRagRetrievalDiagnostic,
} from './types'

// biome-ignore lint/suspicious/noControlCharactersInRegex: Strip control characters from diagnostic metadata.
const DIAGNOSTIC_CONTROL_CHARACTERS = /[\r\n\u0000-\u001f\u007f]/g

export function clampText(value: string, maxLength: number): string {
  const text = redactDiagnosticsText(value)
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…[truncated]`
}

export function redactDiagnosticsText(value: string): string {
  return value
    .replace(/\b([a-z][a-z\d+.-]*:\/\/)[^/\s?#@]+@/gi, '$1[REDACTED_CREDENTIALS]@')
    .replace(/https?:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi, '[REDACTED_WEBHOOK_URL]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, '[REDACTED_PRIVATE_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_SECRET]')
    .replace(
      /\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\r\n]*)/gi,
      '[REDACTED_COOKIE_HEADER]',
    )
    .replace(
      /\b(?:__host-)?(?:session(?:[_ -]?(?:id|token|key))?|sid|phpsessid|jsessionid|connect\.sid)\b["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,"'`;]+)/gi,
      '[REDACTED_SESSION]',
    )
    .replace(
      /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|passwd|secret)\s*[:=]\s*["']?[^\s,"'`]+/gi,
      () => '[REDACTED_SECRET]',
    )
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g,
      '[REDACTED_SECRET]',
    )
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?<![\w.])(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\w.])/g, '[REDACTED_IP]')
    .replace(/(?<![A-F\d:])(?:[A-F\d]{0,4}:){2,7}[A-F\d]{0,4}(?![A-F\d:])/gi, (candidate) => {
      const groups = candidate.split(':').filter(Boolean)
      const compressed = candidate.includes('::')
      const validGroups = groups.every((group) => group.length <= 4)
      const validCount = compressed ? groups.length < 8 : groups.length === 8
      return (candidate.includes('::') && candidate.indexOf('::') !== candidate.lastIndexOf('::')) ||
        !validGroups ||
        !validCount
        ? candidate
        : '[REDACTED_IP]'
    })
}

function isFiniteNonNegative(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function sanitizeModelCall(call: ChatModelCallDiagnostic): ChatModelCallDiagnostic {
  const usageReported =
    call.usageReported ??
    [call.inputTokens, call.outputTokens, call.totalTokens, call.costUsd].some(isFiniteNonNegative)
  return {
    provider: call.provider,
    operation: clampText(call.operation, 80),
    ...(call.model ? { model: clampText(call.model, 120) } : {}),
    status: call.status,
    ...(call.failureCategory ? { failureCategory: call.failureCategory } : {}),
    ...(!usageReported ? { usageReported: false } : {}),
    ...(isFiniteNonNegative(call.inputTokens) ? { inputTokens: Math.floor(call.inputTokens) } : {}),
    ...(isFiniteNonNegative(call.outputTokens) ? { outputTokens: Math.floor(call.outputTokens) } : {}),
    ...(isFiniteNonNegative(call.totalTokens) ? { totalTokens: Math.floor(call.totalTokens) } : {}),
    ...(isFiniteNonNegative(call.costUsd) ? { costUsd: call.costUsd } : {}),
  }
}

export function sanitizeRagRetrieval(retrieval: ChatRagRetrievalDiagnostic): ChatRagRetrievalDiagnostic {
  return {
    query: clampText(retrieval.query, MAX_QUERY_LENGTH),
    degraded: retrieval.degraded,
    candidates: retrieval.candidates.slice(0, MAX_RAG_CANDIDATES).map((candidate) => ({
      id: clampText(candidate.id, 200),
      sourceId: clampText(candidate.sourceId, 200),
      sourceType: clampText(candidate.sourceType, 80),
      title: clampText(candidate.title, 300),
      isPublic: candidate.isPublic,
      excerpt: clampText(candidate.excerpt, MAX_CANDIDATE_EXCERPT),
      retrievedRank: Math.max(0, Math.floor(candidate.retrievedRank)),
      ...(isFiniteNonNegative(candidate.rerankScore) ? { rerankScore: candidate.rerankScore } : {}),
      ...(isFiniteNonNegative(candidate.relevanceProbability)
        ? { relevanceProbability: candidate.relevanceProbability }
        : {}),
      ...(isFiniteNonNegative(candidate.answerEvidenceProbability)
        ? { answerEvidenceProbability: candidate.answerEvidenceProbability }
        : {}),
      outcome: candidate.outcome,
      finalSelected: candidate.finalSelected,
    })),
  }
}

export function sanitizeJevDecision(decision: ChatJevDecisionDiagnostic): ChatJevDecisionDiagnostic {
  return {
    stage: decision.stage,
    decisions: Object.fromEntries(
      Object.entries(decision.decisions)
        .slice(0, 20)
        .map(([name, value]) => [
          clampText(name, 80),
          {
            label: clampText(value.label, 40),
            confidence: Number.isFinite(value.confidence) ? Math.max(0, Math.min(1, value.confidence)) : 0,
          },
        ]),
    ),
  }
}

function metadataText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined
  const text = value.replace(DIAGNOSTIC_CONTROL_CHARACTERS, ' ').trim().slice(0, maxLength)
  return text || undefined
}

export function isValidIpAddress(value: string): boolean {
  if (!value || value.length > 45 || /[^a-f\d:.]/i.test(value)) return false
  try {
    if (value.includes(':')) {
      const hostname = new URL(`http://[${value}]/`).hostname
      return hostname.startsWith('[') && hostname.endsWith(']')
    }
    return new URL(`http://${value}/`).hostname === value
  } catch {
    return false
  }
}

export function sanitizeMetadata(metadata: ChatDiagnosticsMetadata | undefined): ChatDiagnosticsMetadata | undefined {
  if (!metadata) return undefined
  const ipAddress = metadata.ipAddress && isValidIpAddress(metadata.ipAddress) ? metadata.ipAddress : undefined
  const location = metadata.location
    ? {
        ...(metadataText(metadata.location.country, 12)
          ? { country: metadataText(metadata.location.country, 12) }
          : {}),
        ...(metadataText(metadata.location.region, 100) ? { region: metadataText(metadata.location.region, 100) } : {}),
        ...(metadataText(metadata.location.regionCode, 12)
          ? { regionCode: metadataText(metadata.location.regionCode, 12) }
          : {}),
        ...(metadataText(metadata.location.city, 100) ? { city: metadataText(metadata.location.city, 100) } : {}),
        ...(metadataText(metadata.location.timezone, 80)
          ? { timezone: metadataText(metadata.location.timezone, 80) }
          : {}),
      }
    : undefined
  const browser = metadata.browser
    ? {
        ...(metadataText(metadata.browser.name, 40) ? { name: metadataText(metadata.browser.name, 40) } : {}),
        ...(metadataText(metadata.browser.version, 40) ? { version: metadataText(metadata.browser.version, 40) } : {}),
        ...(metadataText(metadata.browser.operatingSystem, 40)
          ? { operatingSystem: metadataText(metadata.browser.operatingSystem, 40) }
          : {}),
        ...(metadataText(metadata.browser.device, 20) ? { device: metadataText(metadata.browser.device, 20) } : {}),
      }
    : undefined
  const safe: ChatDiagnosticsMetadata = {
    ...(ipAddress ? { ipAddress } : {}),
    ...(location && Object.keys(location).length > 0 ? { location } : {}),
    ...(browser && Object.keys(browser).length > 0 ? { browser } : {}),
    ...(metadataText(metadata.language, 120) ? { language: metadataText(metadata.language, 120) } : {}),
    ...(metadataText(metadata.pagePath, 300) ? { pagePath: metadataText(metadata.pagePath, 300) } : {}),
  }
  return Object.keys(safe).length > 0 ? safe : undefined
}

export function sanitizeRecord(record: ChatDiagnosticsRecord): ChatDiagnosticsRecord {
  return {
    traceId: clampText(record.traceId, 100),
    startedAtUtc: clampText(record.startedAtUtc, 40),
    durationMs: Math.max(0, Math.floor(record.durationMs)),
    outcome: record.outcome,
    query: clampText(record.query, MAX_QUERY_LENGTH),
    ...(record.metadata ? { metadata: sanitizeMetadata(record.metadata) } : {}),
    history: record.history.slice(-MAX_CONTEXT_MESSAGES).map(({ role, content }) => ({
      role,
      content: clampText(content, MAX_CONTEXT_MESSAGE_LENGTH),
    })),
    ...(typeof record.response === 'string' ? { response: clampText(record.response, MAX_RESPONSE_LENGTH) } : {}),
    modelCalls: record.modelCalls.slice(0, MAX_MODEL_CALLS).map(sanitizeModelCall),
    jevDecisions: record.jevDecisions.slice(0, MAX_JEV_DECISIONS).map(sanitizeJevDecision),
    ragRetrievals: record.ragRetrievals.slice(0, MAX_RAG_RETRIEVALS).map(sanitizeRagRetrieval),
  }
}
