import { MAX_EMBED_DESCRIPTION, MAX_EMBED_FIELD_VALUE, MAX_EMBED_FIELDS, MAX_EMBED_TOTAL } from './limits'
import { sanitizeRecord } from './sanitize'
import type {
  ChatDiagnosticsOutcome,
  ChatDiagnosticsRecord,
  ChatModelCallDiagnostic,
  DiscordEmbed,
  DiscordEmbedField,
  DiscordWebhookPayload,
} from './types'

function outcomeColor(outcome: ChatDiagnosticsOutcome): number {
  switch (outcome) {
    case 'complete':
      return 0x39a982
    case 'blocked':
      return 0xe0a43a
    case 'aborted':
      return 0x8a929e
    case 'unavailable':
    case 'provider_error':
    case 'invalid_context':
    case 'turn_limit':
      return 0xd95757
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
  const total =
    embed.title.length +
    (embed.description?.length ?? 0) +
    (embed.footer?.text.length ?? 0) +
    (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0)
  if (
    embed.title.length > 256 ||
    (embed.description?.length ?? 0) > MAX_EMBED_DESCRIPTION ||
    (embed.footer?.text.length ?? 0) > 2_048 ||
    (embed.fields?.length ?? 0) > 25 ||
    (embed.fields ?? []).some((field) => field.name.length > 256 || field.value.length > MAX_EMBED_FIELD_VALUE) ||
    total > MAX_EMBED_TOTAL
  )
    throw new Error('Chat diagnostics embed exceeded Discord limits')
  return { embeds: [embed], allowed_mentions: { parse: [] } }
}

function formatModelCall(call: ChatModelCallDiagnostic): string {
  const usage =
    call.usageReported === false
      ? 'Usage unreported'
      : [
          call.inputTokens !== undefined ? `input ${call.inputTokens}` : undefined,
          call.outputTokens !== undefined ? `output ${call.outputTokens}` : undefined,
          call.totalTokens !== undefined ? `total ${call.totalTokens}` : undefined,
          call.costUsd !== undefined ? `cost $${call.costUsd}` : undefined,
        ]
          .filter(Boolean)
          .join(' · ') || 'Usage unreported'
  return `**${call.status}** · ${usage}${call.model ? `\nModel: ${call.model}` : ''}${call.failureCategory ? `\nFailure: ${call.failureCategory}` : ''}`
}

export function formatChatDiagnosticMessages(record: ChatDiagnosticsRecord): DiscordWebhookPayload[] {
  const safe = sanitizeRecord(record)
  const color = outcomeColor(safe.outcome)
  const footer = { text: `Trace ${safe.traceId} · ${safe.durationMs} ms` }
  const messages: DiscordWebhookPayload[] = [
    embedPayload({
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
    }),
  ]

  if (safe.metadata) {
    const location = safe.metadata.location
    const browser = safe.metadata.browser
    const locationText = [location?.city, location?.region, location?.regionCode, location?.country, location?.timezone]
      .filter(Boolean)
      .join(' · ')
    const browserText = [browser?.name, browser?.version].filter(Boolean).join(' ')
    const fields = [
      { name: 'IP address', value: safe.metadata.ipAddress ?? 'Unavailable from trusted proxy' },
      { name: 'Approximate location', value: locationText || 'Unavailable from proxy geolocation' },
      { name: 'Browser', value: browserText || 'Unknown' },
      {
        name: 'Operating system · device',
        value: [browser?.operatingSystem, browser?.device].filter(Boolean).join(' · ') || 'Unknown',
      },
      { name: 'Browser language', value: safe.metadata.language ?? 'Unavailable' },
      { name: 'Chat page', value: safe.metadata.pagePath ?? 'Unavailable' },
    ]
    messages.push(
      embedPayload({
        title: `Visitor metadata · ${safe.traceId}`,
        color: 0x8b6ee8,
        fields,
        timestamp: safe.startedAtUtc,
        footer,
      }),
    )
  }

  if (safe.history.length > 0) {
    const fields = safe.history.map(({ role, content }, index) => ({
      name: `${role} · ${index + 1}`,
      value: content || '(empty)',
    }))
    messages.push(
      embedPayload({
        title: `Recent context · ${safe.traceId}`,
        color: 0x66758a,
        fields,
        timestamp: safe.startedAtUtc,
        footer,
      }),
    )
  }

  if (safe.response !== undefined) {
    for (const [index, description] of splitText(safe.response || '(empty)', MAX_EMBED_DESCRIPTION).entries()) {
      messages.push(
        embedPayload({
          title: `Assistant response${index > 0 ? ` · part ${index + 1}` : ''}`,
          description,
          color: 0x5865f2,
          timestamp: safe.startedAtUtc,
          footer,
        }),
      )
    }
  }

  for (const decision of safe.jevDecisions) {
    const fields = Object.entries(decision.decisions).map(([name, value]) => ({
      name: name.slice(0, 256),
      value: `**${value.label}** · confidence ${value.confidence.toFixed(2)}`,
    }))
    for (let offset = 0; offset < fields.length || offset === 0; offset += MAX_EMBED_FIELDS) {
      messages.push(
        embedPayload({
          title: `Jev decision · ${decision.stage}${offset > 0 ? ` · part ${Math.floor(offset / MAX_EMBED_FIELDS) + 1}` : ''}`,
          color: decision.stage === 'moderation' ? 0xe0a43a : 0x8b6ee8,
          fields: fields.slice(offset, offset + MAX_EMBED_FIELDS),
          timestamp: safe.startedAtUtc,
          footer,
        }),
      )
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
      ]
        .join('\n')
        .slice(0, MAX_EMBED_FIELD_VALUE),
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
      messages.push(
        embedPayload({
          title: `${retrievalLabel}${groups.length > 1 ? ` · part ${groupIndex + 1}/${groups.length}` : ''}`,
          description: `${retrieval.degraded ? '⚠️ Degraded retrieval · ' : ''}**Query:** ${retrieval.query}`.slice(
            0,
            MAX_EMBED_DESCRIPTION,
          ),
          color: retrieval.degraded ? 0xe0a43a : 0x3285a8,
          fields,
          timestamp: safe.startedAtUtc,
          footer,
        }),
      )
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
    messages.push(
      embedPayload({
        title: `Model usage${offset > 0 ? ` · part ${Math.floor(offset / 10) + 1}` : ''}`,
        color: 0x366ab3,
        fields: modelCallFields.slice(offset, offset + 10),
        timestamp: safe.startedAtUtc,
        footer,
      }),
    )
  }

  return messages
}
