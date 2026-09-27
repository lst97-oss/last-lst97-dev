import type { Logger } from './logger'

const MAX_QUEUE_RECORDS = 100
const MAX_QUERY_LENGTH = 2_000
const MAX_CONTEXT_MESSAGES = 6
const MAX_CONTEXT_MESSAGE_LENGTH = 500
const MAX_RESPONSE_LENGTH = 4_000
const MAX_RAG_RETRIEVALS = 4
const MAX_RAG_CANDIDATES = 10
const MAX_CANDIDATE_EXCERPT = 300
const MAX_MODEL_CALLS = 50
const MAX_JEV_DECISIONS = 12
const DELIVERY_TIMEOUT_MS = 5_000
const MAX_RETRY_AFTER_MS = 5_000
const MAX_EMBED_DESCRIPTION = 4_096
const MAX_EMBED_FIELD_VALUE = 1_024
const MAX_EMBED_FIELDS = 20
const MAX_EMBED_TOTAL = 6_000

interface DiscordEmbedField {
  name: string
  value: string
}

interface DiscordEmbed {
  title: string
  description?: string
  color: number
  fields?: DiscordEmbedField[]
  timestamp?: string
  footer?: { text: string }
}

interface DiscordWebhookPayload {
  embeds: [DiscordEmbed]
  allowed_mentions: { parse: [] }
}

export type ChatDiagnosticsOutcome = 'complete' | 'blocked' | 'unavailable' | 'provider_error' | 'aborted' | 'invalid_context' | 'turn_limit'
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

function clampText(value: string, maxLength: number): string {
  const text = redactDiagnosticsText(value)
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…[truncated]`
}

export function redactDiagnosticsText(value: string): string {
  return value
    .replace(/\b([a-z][a-z\d+.-]*:\/\/)[^/\s?#@]+@/gi, '$1[REDACTED_CREDENTIALS]@')
    .replace(/https?:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi, '[REDACTED_WEBHOOK_URL]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, '[REDACTED_PRIVATE_KEY]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_SECRET]')
    .replace(/\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\r\n]*)/gi, '[REDACTED_COOKIE_HEADER]')
    .replace(/\b(?:__host-)?(?:session(?:[_ -]?(?:id|token|key))?|sid|phpsessid|jsessionid|connect\.sid)\b["']?\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,"'`;]+)/gi, '[REDACTED_SESSION]')
    .replace(/\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|passwd|secret)\s*[:=]\s*["']?[^\s,"'`]+/gi, () => '[REDACTED_SECRET]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g, '[REDACTED_SECRET]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/(?<![\w.])(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\w.])/g, '[REDACTED_IP]')
    .replace(/(?<![A-F\d:])(?:[A-F\d]{0,4}:){2,7}[A-F\d]{0,4}(?![A-F\d:])/gi, (candidate) => {
      const groups = candidate.split(':').filter(Boolean)
      const compressed = candidate.includes('::')
      const validGroups = groups.every((group) => group.length <= 4)
      const validCount = compressed ? groups.length < 8 : groups.length === 8
      return candidate.includes('::') && candidate.indexOf('::') !== candidate.lastIndexOf('::') || !validGroups || !validCount
        ? candidate
        : '[REDACTED_IP]'
    })
}

function isFiniteNonNegative(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function sanitizeModelCall(call: ChatModelCallDiagnostic): ChatModelCallDiagnostic {
  const usageReported = call.usageReported ?? [call.inputTokens, call.outputTokens, call.totalTokens, call.costUsd].some(isFiniteNonNegative)
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

function sanitizeRagRetrieval(retrieval: ChatRagRetrievalDiagnostic): ChatRagRetrievalDiagnostic {
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
      ...(isFiniteNonNegative(candidate.relevanceProbability) ? { relevanceProbability: candidate.relevanceProbability } : {}),
      ...(isFiniteNonNegative(candidate.answerEvidenceProbability) ? { answerEvidenceProbability: candidate.answerEvidenceProbability } : {}),
      outcome: candidate.outcome,
      finalSelected: candidate.finalSelected,
    })),
  }
}

function sanitizeJevDecision(decision: ChatJevDecisionDiagnostic): ChatJevDecisionDiagnostic {
  return {
    stage: decision.stage,
    decisions: Object.fromEntries(Object.entries(decision.decisions).slice(0, 20).map(([name, value]) => [
      clampText(name, 80),
      { label: clampText(value.label, 40), confidence: Number.isFinite(value.confidence) ? Math.max(0, Math.min(1, value.confidence)) : 0 },
    ])),
  }
}

function metadataText(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined
  const text = value.replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength)
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

function sanitizeMetadata(metadata: ChatDiagnosticsMetadata | undefined): ChatDiagnosticsMetadata | undefined {
  if (!metadata) return undefined
  const ipAddress = metadata.ipAddress && isValidIpAddress(metadata.ipAddress) ? metadata.ipAddress : undefined
  const location = metadata.location ? {
    ...(metadataText(metadata.location.country, 12) ? { country: metadataText(metadata.location.country, 12) } : {}),
    ...(metadataText(metadata.location.region, 100) ? { region: metadataText(metadata.location.region, 100) } : {}),
    ...(metadataText(metadata.location.regionCode, 12) ? { regionCode: metadataText(metadata.location.regionCode, 12) } : {}),
    ...(metadataText(metadata.location.city, 100) ? { city: metadataText(metadata.location.city, 100) } : {}),
    ...(metadataText(metadata.location.timezone, 80) ? { timezone: metadataText(metadata.location.timezone, 80) } : {}),
  } : undefined
  const browser = metadata.browser ? {
    ...(metadataText(metadata.browser.name, 40) ? { name: metadataText(metadata.browser.name, 40) } : {}),
    ...(metadataText(metadata.browser.version, 40) ? { version: metadataText(metadata.browser.version, 40) } : {}),
    ...(metadataText(metadata.browser.operatingSystem, 40) ? { operatingSystem: metadataText(metadata.browser.operatingSystem, 40) } : {}),
    ...(metadataText(metadata.browser.device, 20) ? { device: metadataText(metadata.browser.device, 20) } : {}),
  } : undefined
  const safe: ChatDiagnosticsMetadata = {
    ...(ipAddress ? { ipAddress } : {}),
    ...(location && Object.keys(location).length > 0 ? { location } : {}),
    ...(browser && Object.keys(browser).length > 0 ? { browser } : {}),
    ...(metadataText(metadata.language, 120) ? { language: metadataText(metadata.language, 120) } : {}),
    ...(metadataText(metadata.pagePath, 300) ? { pagePath: metadataText(metadata.pagePath, 300) } : {}),
  }
  return Object.keys(safe).length > 0 ? safe : undefined
}

function sanitizeRecord(record: ChatDiagnosticsRecord): ChatDiagnosticsRecord {
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
  let modelCalls: ChatModelCallDiagnostic[] = []
  let jevDecisions: ChatJevDecisionDiagnostic[] = []
  let ragRetrievals: ChatRagRetrievalDiagnostic[] = []
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
        ...(typeof finishInput.response === 'string' ? { response: clampText(finishInput.response, MAX_RESPONSE_LENGTH) } : {}),
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

function outcomeColor(outcome: ChatDiagnosticsOutcome): number {
  switch (outcome) {
    case 'complete': return 0x39a982
    case 'blocked': return 0xe0a43a
    case 'aborted': return 0x8a929e
    case 'unavailable':
    case 'provider_error':
    case 'invalid_context':
    case 'turn_limit': return 0xd95757
  }
}

function splitText(value: string, maxLength: number): string[] {
  const chunks: string[] = []
  let remaining = value
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt < Math.floor(maxLength * 0.6)) splitAt = remaining.lastIndexOf(' ', maxLength)
    if (splitAt < Math.floor(maxLength * 0.6)) splitAt = maxLength
    chunks.push(remaining.slice(0, splitAt).trimEnd())
    remaining = remaining.slice(splitAt).trimStart()
  }
  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}

function embedPayload(embed: DiscordEmbed): DiscordWebhookPayload {
  const total = embed.title.length
    + (embed.description?.length ?? 0)
    + (embed.footer?.text.length ?? 0)
    + (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0)
  if (
    embed.title.length > 256
    || (embed.description?.length ?? 0) > MAX_EMBED_DESCRIPTION
    || (embed.footer?.text.length ?? 0) > 2_048
    || (embed.fields?.length ?? 0) > 25
    || (embed.fields ?? []).some((field) => field.name.length > 256 || field.value.length > MAX_EMBED_FIELD_VALUE)
    || total > MAX_EMBED_TOTAL
  ) throw new Error('Chat diagnostics embed exceeded Discord limits')
  return { embeds: [embed], allowed_mentions: { parse: [] } }
}

function formatModelCall(call: ChatModelCallDiagnostic): string {
  const usage = call.usageReported === false
    ? 'Usage unreported'
    : [
      call.inputTokens !== undefined ? `input ${call.inputTokens}` : undefined,
      call.outputTokens !== undefined ? `output ${call.outputTokens}` : undefined,
      call.totalTokens !== undefined ? `total ${call.totalTokens}` : undefined,
      call.costUsd !== undefined ? `cost $${call.costUsd}` : undefined,
    ].filter(Boolean).join(' · ') || 'Usage unreported'
  return `**${call.status}** · ${usage}${call.model ? `\nModel: ${call.model}` : ''}${call.failureCategory ? `\nFailure: ${call.failureCategory}` : ''}`
}

export function formatChatDiagnosticMessages(record: ChatDiagnosticsRecord): DiscordWebhookPayload[] {
  const safe = sanitizeRecord(record)
  const color = outcomeColor(safe.outcome)
  const footer = { text: `Trace ${safe.traceId} · ${safe.durationMs} ms` }
  const messages: DiscordWebhookPayload[] = [embedPayload({
    title: `Chat turn · ${safe.outcome}`,
    description: `**USER QUERY**\n${safe.query || '(empty)'}`,
    color,
    fields: [
      { name: 'Outcome', value: safe.outcome },
      { name: 'Duration', value: `${safe.durationMs} ms` },
      { name: 'Recorded at', value: safe.startedAtUtc },
    ],
    timestamp: safe.startedAtUtc,
    footer,
  })]

  if (safe.metadata) {
    const location = safe.metadata.location
    const browser = safe.metadata.browser
    const locationText = [
      location?.city,
      location?.region,
      location?.regionCode,
      location?.country,
      location?.timezone,
    ].filter(Boolean).join(' · ')
    const browserText = [browser?.name, browser?.version].filter(Boolean).join(' ')
    const fields = [
      { name: 'IP address', value: safe.metadata.ipAddress ?? 'Unavailable from trusted proxy' },
      { name: 'Approximate location', value: locationText || 'Unavailable from proxy geolocation' },
      { name: 'Browser', value: browserText || 'Unknown' },
      { name: 'Operating system · device', value: [browser?.operatingSystem, browser?.device].filter(Boolean).join(' · ') || 'Unknown' },
      { name: 'Browser language', value: safe.metadata.language ?? 'Unavailable' },
      { name: 'Chat page', value: safe.metadata.pagePath ?? 'Unavailable' },
    ]
    messages.push(embedPayload({
      title: `Visitor metadata · ${safe.traceId}`,
      color: 0x8b6ee8,
      fields,
      timestamp: safe.startedAtUtc,
      footer,
    }))
  }

  if (safe.history.length > 0) {
    const fields = safe.history.map(({ role, content }, index) => ({
      name: `${role} · ${index + 1}`,
      value: content || '(empty)',
    }))
    messages.push(embedPayload({
      title: `Recent context · ${safe.traceId}`,
      color: 0x66758a,
      fields,
      timestamp: safe.startedAtUtc,
      footer,
    }))
  }

  if (safe.response !== undefined) {
    for (const [index, description] of splitText(safe.response || '(empty)', MAX_EMBED_DESCRIPTION).entries()) {
      messages.push(embedPayload({
        title: `Assistant response${index > 0 ? ` · part ${index + 1}` : ''}`,
        description,
        color: 0x5865f2,
        timestamp: safe.startedAtUtc,
        footer,
      }))
    }
  }

  for (const decision of safe.jevDecisions) {
    const fields = Object.entries(decision.decisions).map(([name, value]) => ({
      name: name.slice(0, 256),
      value: `**${value.label}** · confidence ${value.confidence.toFixed(2)}`,
    }))
    for (let offset = 0; offset < fields.length || offset === 0; offset += MAX_EMBED_FIELDS) {
      messages.push(embedPayload({
        title: `Jev decision · ${decision.stage}${offset > 0 ? ` · part ${Math.floor(offset / MAX_EMBED_FIELDS) + 1}` : ''}`,
        color: decision.stage === 'moderation' ? 0xe0a43a : 0x8b6ee8,
        fields: fields.slice(offset, offset + MAX_EMBED_FIELDS),
        timestamp: safe.startedAtUtc,
        footer,
      }))
      if (fields.length === 0) break
    }
  }

  for (const [retrievalIndex, retrieval] of safe.ragRetrievals.entries()) {
    const retrievalLabel = `RAG candidates · retrieval ${retrievalIndex + 1}`
    const candidates = retrieval.candidates.map((candidate) => ({
      name: `#${candidate.retrievedRank} · ${candidate.title}`.slice(0, 256),
      value: [
        `**${candidate.isPublic ? 'Public' : 'Private'}** · ${candidate.sourceType}`,
        `Source: ${candidate.sourceId}`,
        `Rerank ${candidate.rerankScore?.toFixed(3) ?? '—'} · Jev ${candidate.relevanceProbability?.toFixed(2) ?? '—'} · evidence ${candidate.answerEvidenceProbability?.toFixed(2) ?? '—'}`,
        `Decision: ${candidate.outcome} · final: ${candidate.finalSelected ? 'yes' : 'no'}`,
        `> ${candidate.excerpt || '(no excerpt)'}`,
      ].join('\n').slice(0, MAX_EMBED_FIELD_VALUE),
    }))
    const groups: DiscordEmbedField[][] = []
    let group: DiscordEmbedField[] = []
    let groupLength = retrieval.query.length + 250
    for (const field of candidates) {
      const fieldLength = field.name.length + field.value.length
      if (group.length >= 5 || groupLength + fieldLength > MAX_EMBED_TOTAL) {
        groups.push(group)
        group = []
        groupLength = 250
      }
      group.push(field)
      groupLength += fieldLength
    }
    if (group.length > 0 || groups.length === 0) groups.push(group)
    for (const [groupIndex, fields] of groups.entries()) {
      messages.push(embedPayload({
        title: `${retrievalLabel}${groups.length > 1 ? ` · part ${groupIndex + 1}/${groups.length}` : ''}`,
        description: `${retrieval.degraded ? '⚠️ Degraded retrieval · ' : ''}**Query:** ${retrieval.query}`.slice(0, MAX_EMBED_DESCRIPTION),
        color: retrieval.degraded ? 0xe0a43a : 0x3285a8,
        fields,
        timestamp: safe.startedAtUtc,
        footer,
      }))
    }
  }

  const modelCallFields = safe.modelCalls.map((call) => ({
    name: `${call.provider} · ${call.operation}`.slice(0, 256),
    value: formatModelCall(call).slice(0, MAX_EMBED_FIELD_VALUE),
  }))
  if (modelCallFields.length === 0) {
    modelCallFields.push({ name: 'Model calls', value: 'No model calls recorded.' })
  }
  for (let offset = 0; offset < modelCallFields.length; offset += 10) {
    messages.push(embedPayload({
      title: `Model usage${offset > 0 ? ` · part ${Math.floor(offset / 10) + 1}` : ''}`,
      color: 0x366ab3,
      fields: modelCallFields.slice(offset, offset + 10),
      timestamp: safe.startedAtUtc,
      footer,
    }))
  }

  return messages
}

function webhookUrl(value: string): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'https:'
    || !['discord.com', 'discordapp.com'].includes(url.hostname)
    || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+\/?$/.test(url.pathname)
    || Boolean(url.port)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) throw new Error('Chat diagnostics webhook URL is invalid')
  url.searchParams.set('wait', 'true')
  return url
}

function pause(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}

export function createDiscordDiagnosticsSink(config: {
  webhookUrl: string
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  logger?: Pick<Logger, 'warn'>
  maxQueueRecords?: number
  timeoutMs?: number
  wait?: (durationMs: number) => Promise<void>
}): ChatDiagnosticsSink {
  const url = webhookUrl(config.webhookUrl)
  const fetcher = config.fetcher ?? fetch
  const maxQueueRecords = Math.max(1, Math.floor(config.maxQueueRecords ?? MAX_QUEUE_RECORDS))
  const timeoutMs = Math.max(1, Math.floor(config.timeoutMs ?? DELIVERY_TIMEOUT_MS))
  const wait = config.wait ?? pause
  const queue: ChatDiagnosticsRecord[] = []
  let draining = false
  let drainScheduled = false

  function scheduleDrain(): void {
    if (draining || drainScheduled) return
    drainScheduled = true
    queueMicrotask(() => {
      drainScheduled = false
      void drain()
    })
  }

  async function deliver(payload: DiscordWebhookPayload): Promise<boolean> {
    const target = new URL(url)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Response
      try {
        response = await fetcher(target, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch {
        if (attempt === 0) {
          await wait(250)
          continue
        }
        config.logger?.warn('chat.diagnostics.delivery_failed', { reason: 'network_error' })
        return false
      }
      if (response.ok) return true
      if (attempt === 0 && response.status === 429) {
        let retryAfterMs = Number(response.headers.get('retry-after')) * 1_000
        if (!Number.isFinite(retryAfterMs) || retryAfterMs <= 0) {
          try {
            const payload = await response.clone().json() as { retry_after?: unknown }
            retryAfterMs = typeof payload.retry_after === 'number' ? payload.retry_after * 1_000 : 0
          } catch {
            retryAfterMs = 0
          }
        }
        if (retryAfterMs > 0 && retryAfterMs <= MAX_RETRY_AFTER_MS) {
          await wait(retryAfterMs)
          continue
        }
      } else if (attempt === 0 && response.status >= 500) {
        await wait(250)
        continue
      }
      config.logger?.warn('chat.diagnostics.delivery_failed', { statusCode: response.status })
      return false
    }
    return false
  }

  async function drain(): Promise<void> {
    if (draining) return
    draining = true
    try {
      while (queue.length > 0) {
        const record = queue.shift()
        if (!record) continue
        for (const payload of formatChatDiagnosticMessages(record)) {
          if (!(await deliver(payload))) break
        }
      }
    } catch {
      config.logger?.warn('chat.diagnostics.delivery_failed', { reason: 'unexpected_error' })
    } finally {
      draining = false
      if (queue.length > 0) scheduleDrain()
    }
  }

  return {
    enqueue(record) {
      if (queue.length >= maxQueueRecords) {
        queue.shift()
        config.logger?.warn('chat.diagnostics.queue_saturated', { maxQueueRecords })
      }
      queue.push(sanitizeRecord(record))
      scheduleDrain()
    },
  }
}
